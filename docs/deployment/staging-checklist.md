# Staging Deployment Verification Checklist
**Project:** Samahat Taibah Institution Educational Management System (EMS)  
**Target Environment:** Staging / Production Pre-Flight  
**Classification:** Operational Runbook

---

## 1. Pre-Deployment Configuration Checks
- [ ] **Environment File Provisioning:**
  - [ ] `.env` created from `.env.example`
  - [ ] `NODE_ENV=production` set for all services
  - [ ] `JWT_SECRET` generated with 32+ cryptographically random bytes
  - [ ] `JWT_REFRESH_SECRET` generated with 32+ cryptographically random bytes
  - [ ] `INTERNAL_SERVICE_SECRET` generated with 32+ cryptographically random bytes (cannot match dev fallback)
  - [ ] `POSTGRES_PASSWORD` set to a strong institutional password
  - [ ] `DATABASE_URL` configured with correct host (`postgres`), user, and password
  - [ ] `CORS_ORIGIN` matches exact staging/production domain URL
  - [ ] `SWAGGER_ENABLED=false` (or unset, defaults to disabled in production)
  - [ ] `ENABLE_DEV_AUTH_TOKENS` is unset or `false`
  - [ ] `SMTP_HOST` or `EMAIL_SERVICE_ENABLED=true` configured for password reset delivery
  - [ ] `GEMINI_API_KEY` provided and valid

- [ ] **Filesystem & Volume Permissions:**
  - [ ] Docker named volume `ems_uploads` or bind-mount path exists and is writable
  - [ ] Host backup destination directory (`/var/backups/ems`) created with `chmod 700`

---

## 2. Container Build & Orchestration Checks
- [ ] Run `docker compose -f docker-compose.prod.yml config` to validate compose syntax
- [ ] Build all multi-stage production container images:
  ```bash
  docker compose -f docker-compose.prod.yml build
  ```
- [ ] Verify image footprint:
  - [ ] `ems-web`: Next.js standalone output (< 150 MB base)
  - [ ] `ems-api`: NestJS compiled dist (< 250 MB base)
  - [ ] `ems-ai-service`: Python slim (< 300 MB base)
- [ ] Start daemonized services:
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```

---

## 3. Database Migration & Integrity Checks
- [ ] Apply baseline and incremental Prisma migrations:
  ```bash
  docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
  ```
- [ ] Verify migration status:
  ```bash
  docker compose -f docker-compose.prod.yml exec api npx prisma migrate status --schema=apps/api/prisma/schema.prisma
  ```
- [ ] For fresh staging environments, execute seed fixtures:
  ```bash
  docker compose -f docker-compose.prod.yml exec api npm run prisma:seed
  ```
- [ ] Verify database connectivity and seed integrity:
  - [ ] Super Admin account initialized
  - [ ] School records present
  - [ ] Academic years, terms, and classes populated

---

## 4. Health & Security Verification Checks
- [ ] **HTTP Health Endpoints:**
  - [ ] `GET /health` on Next.js frontend returns HTTP 200 `{ status: "ok" }`
  - [ ] `GET /api/v1/health` on NestJS API returns HTTP 200 with database, redis, and ai-service checks
  - [ ] `GET /health` on AI microservice returns HTTP 200 `{ status: "healthy" }`
- [ ] **Security Checks (SEC-001 & SEC-002):**
  - [ ] Attempt `POST /api/v1/auth/forgot-password` with valid email:
    - [ ] Response contains ONLY generic success message
    - [ ] Response NEVER contains `resetToken`, `devToken`, or `devResetLink`
  - [ ] Attempt `POST /api/v1/ai/internal/tools/query_grades` without header:
    - [ ] Rejection with HTTP 401 Unauthorized
  - [ ] Attempt `POST /api/v1/ai/internal/tools/query_grades` with development secret (`dev_internal_secret_key_change_in_production`):
    - [ ] Rejection with HTTP 401 Unauthorized
  - [ ] Verify Swagger docs are inaccessible:
    - [ ] `GET /api/docs` returns HTTP 404 or redirect

---

## 5. Functional Smoke Tests Across All 5 Roles
- [ ] **Super Administrator:** Log in, access institutions dashboard, verify school tenant list.
- [ ] **School Administrator:** Log in, view institution metrics, student enrollment, fee collection summaries.
- [ ] **Teacher:** Log in, view assigned classes, attendance tracker, gradebook, and Teacher Copilot.
- [ ] **Student:** Log in, view enrolled courses, homework assignments, attendance percentage, and Student Tutor Copilot.
- [ ] **Parent:** Log in, view linked children, fee payment status, academic performance, and Parent Copilot.
- [ ] **Real-Time Communication:** Verify Socket.IO notifications dispatch upon message transmission.
- [ ] **Document Storage:** Upload test document attachment and verify file is written to `/app/apps/api/uploads/documents/`.

---

## 6. Backup & Restore Dry-Run
- [ ] Execute database backup test:
  ```bash
  ./infrastructure/scripts/backup-db.sh /tmp/ems-test-backup
  ```
- [ ] Verify backup archive creation: `.dump` file non-empty and compressed.
- [ ] Confirm retention pruning functionality.
