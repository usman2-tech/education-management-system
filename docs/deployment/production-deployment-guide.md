# Production Deployment Guide — Samahat Taibah EMS
**Project:** Samahat Taibah Institution Educational Management System (EMS)  
**Document Classification:** Enterprise Architecture & Operations  
**Target Environment:** Production (Docker Compose / Containerized Linux / Nginx)

---

## 1. System Architecture Overview
The EMS operates as an enterprise modular monolith composed of five primary services orchestrated with data and network isolation:
1. **Frontend (`@ems/web`):** Next.js 14 App Router, dynamic server rendering and static route optimization, TailwindCSS, Lucide icons (runs on internal port 3000).
2. **Core Backend API (`@ems/api`):** NestJS 10, Prisma ORM 5, Passport JWT RBAC, Socket.IO gateway, BullMQ queues (runs on internal port 4000).
3. **AI Microservice (`apps/ai-service`):** Python 3.11 FastAPI, Google Gemini LLM API, Pydantic validation, inter-service HMAC security (runs on internal port 8000).
4. **Persistence Layer:**
   - **PostgreSQL 16 with pgvector:** Multi-tenant relational storage with schema migrations.
   - **Redis 7 Alpine:** Real-time Socket.IO pub/sub, in-memory caching, and BullMQ task queues.
   - **Persistent File Storage:** Volume-mounted uploads (`/app/apps/api/uploads`) for student documents and profile images.
5. **Reverse Proxy:** Nginx with SSL/TLS termination, HTTP/2, WebSocket connection upgrades (`/socket.io/`), security headers, and request rate/size throttling.

```
                           [ HTTPS / Port 443 ]
                                    │
                                    ▼
                         ┌───────────────────────┐
                         │   Nginx Reverse Proxy  │
                         └───────┬───────┬───────┘
                     /           │       │          /api/ & /socket.io/
           ┌─────────┘           │       └───────────┐
           ▼                     ▼                   ▼
    ┌─────────────┐       ┌─────────────┐     ┌─────────────┐
    │  Next.js    │       │   FastAPI   │     │   NestJS    │
    │  Web App    │       │ AI Service  │     │ Backend API │
    │ (Port 3000) │       │ (Port 8000) │     │ (Port 4000) │
    └─────────────┘       └─────────────┘     └──────┬──────┘
                                                     │
                                            ┌────────┴────────┐
                                            ▼                 ▼
                                    ┌──────────────┐   ┌──────────────┐
                                    │  PostgreSQL  │   │    Redis     │
                                    │  (Port 5432) │   │  (Port 6379) │
                                    └──────────────┘   └──────────────┘
```

---

## 2. Infrastructure & System Requirements
- **Host OS:** Linux (Ubuntu 22.04 LTS or 24.04 LTS recommended) or Windows Server 2022 with Docker Desktop / WSL2.
- **Compute:** Minimum 4 vCPUs, 8 GB RAM (16 GB recommended for high concurrent active student/exam sessions).
- **Disk Storage:** Minimum 50 GB NVMe SSD with automated snapshot backups.
- **Runtime Dependencies:**
  - Docker Engine >= 24.0.0
  - Docker Compose >= 2.20.0
  - OpenSSL (for key generation)

---

## 3. Environment Variable Provisioning
Before starting the containers, create the production environment file (`.env`) in the root directory:

```bash
cp .env.example .env
```

Ensure the following variables are strictly customized with high-entropy cryptographic keys:
- `JWT_SECRET`: Generate using `openssl rand -base64 32` (minimum 32 characters; dev fallbacks will cause startup abort)
- `JWT_REFRESH_SECRET`: Generate using `openssl rand -base64 32` (minimum 32 characters)
- `INTERNAL_SERVICE_SECRET`: Generate using `openssl rand -base64 32` (SEC-002: Minimum 16 characters; cannot match dev fallback; validated at startup and compared with timing-safe evaluation)
- `POSTGRES_PASSWORD`: Strong master password for the database
- `DATABASE_URL`: `postgresql://ems_user:<password>@postgres:5432/ems_database?schema=public`
- `CORS_ORIGIN`: Exact production domain, e.g., `https://ems.yourdomain.com`
- `SWAGGER_ENABLED`: `false` (default disabled in production; prevents administrative API schema exposure)
- `SMTP_HOST` / `EMAIL_SERVICE_ENABLED`: (SEC-001: Required for institutional password recovery; production responses omit reset tokens and fail closed if unconfigured)
- `ENABLE_DEV_AUTH_TOKENS`: Must be unset or `false` in production
- `GEMINI_API_KEY`: Institutional Google Gemini API production key

> **Security & Readiness References:**
> - Complete Security Hardening & Remediation Audit: [docs/security/hardening.md](file:///docs/security/hardening.md)
> - Staging Deployment Verification Checklist: [docs/deployment/staging-checklist.md](file:///docs/deployment/staging-checklist.md)

---

## 4. Production Deployment Execution

### Step 4.1: Build and Launch Containers
Run Docker Compose in production mode using the production compose file:

```bash
# Build images with multi-stage caching and start daemonized
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 4.2: Execute Database Migrations
On fresh environments or during zero-downtime upgrades, run the deterministic migration deployer:

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### Step 4.3: Initial School & Administrator Provisioning
If deploying to a fresh database, run the institutional seed script to initialize roles, default schools, and platform administration:

```bash
docker compose -f docker-compose.prod.yml exec api npm run prisma:seed
```

---

## 5. Persistent Storage & Backup Management

### Volume Mounts
All user uploads (student documents, registration attachments, identity photos) are preserved across container updates inside the persistent volume `ems_uploads` mapped to `/app/apps/api/uploads`.

### Automated Nightly Database Backup
Configure a cron job on the host machine to execute `backup-db.sh` daily at 02:00 AM UTC:

```bash
chmod +x infrastructure/scripts/backup-db.sh
0 2 * * * /path/to/ems/infrastructure/scripts/backup-db.sh /var/backups/ems >> /var/log/ems-backup.log 2>&1
```

Backups are compressed with gzip/custom binary format (`-Fc`) and automatically purged after 14 days.

---

## 6. Health Checks & Monitoring
The deployment exposes automated container healthchecks:
- **Web Frontend:** `http://localhost:3000/api/health`
- **Backend API:** `http://localhost:4000/api/v1/health` (queries PostgreSQL, Redis, and AI microservice)
- **AI Microservice:** `http://localhost:8000/health`

Monitor container health with:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 7. Safe Zero-Downtime Update Procedure
1. Pull latest tested release tag:
   ```bash
   git fetch --tags && git checkout tags/v1.0.0
   ```
2. Build new container images:
   ```bash
   docker compose -f docker-compose.prod.yml build
   ```
3. Run pending database migrations:
   ```bash
   docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   ```
4. Restart services gracefully:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps api web ai-service
   ```

---

## 8. Rollback Procedure
If a critical failure occurs during deployment:
1. Revert to previous Docker image or Git commit:
   ```bash
   git checkout <previous_stable_commit>
   docker compose -f docker-compose.prod.yml up -d --build
   ```
2. If database restoration is required:
   ```bash
   chmod +x infrastructure/scripts/restore-db.sh
   ./infrastructure/scripts/restore-db.sh /var/backups/ems/ems_ems_database_<timestamp>.dump --force
   ```
