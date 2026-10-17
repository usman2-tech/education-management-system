# Samahat Taibah Institution Educational Management System (EMS)

> **Enterprise-Grade Multi-Tenant Institutional Platform & AI Copilot Suite**  
> Proof of Concept (POC) Architecture, Operational Guide & Technical Specification  
> Repository: [https://github.com/usman2-tech/education-management-system](https://github.com/usman2-tech/education-management-system)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Choices](#3-technology-choices)
4. [Setup](#4-setup)
5. [Environment Variables](#5-environment-variables)
6. [Database](#6-database)
7. [Running the Application](#7-running-the-application)
8. [API Documentation](#8-api-documentation)
9. [Test Accounts](#9-test-accounts)
10. [Deployment](#10-deployment)
11. [Scalability](#11-scalability)
12. [Security](#12-security)
13. [Known Limitations & Future Roadmap](#13-known-limitations--future-roadmap)

---

## 1. Project Overview

### 1.1 Institutional Challenge & Purpose
Modern educational institutions face severe operational friction caused by fragmented systems: student information systems, academic gradebooks, fee trackers, attendance registers, parent communications, and learning management tools are frequently isolated across disconnected software silos. 

The **Samahat Taibah Institution Educational Management System (EMS)** is an enterprise-ready, multi-school digital platform engineered to unify institutional administration, pedagogical workflows, real-time communications, student safety, and generative artificial intelligence into a single cohesive, high-performance ecosystem.

### 1.2 Scope of the Proof of Concept (POC)
This repository delivers an end-to-end, fully verified Proof of Concept (POC). The system demonstrates:
- **Strict Multi-School Data Isolation:** Complete logical tenant boundaries where every institutional asset (students, staff, classes, fees, grades, documents, bus routes) is scoped by `schoolId`.
- **Role-Based Workflows Across 5 Distinct Personas:** Dedicated user experiences for Platform Administrators, School Administrators, Teachers, Students, and Parents/Guardians.
- **Deep AI Integration:** Google Gemini-powered pedagogical copilots, autonomous student tutors, parent assistants, and grounded institutional document search.
- **Real-Time Event Dispatch:** WebSockets (Socket.IO) for instant messaging, broadcast alerts, and vehicle GPS tracking.
- **Zero Fabrication Principle:** All dashboard metrics, attendance registers, report cards, fee summaries, and AI document citations derive strictly from verified database records.

### 1.3 Supported User Roles
1. **Platform Administrator:** Global governance, tenant lifecycle provisioning, institutional licensure, global audit logs, and infrastructure health observability.
2. **School Administrator:** Campus academic calendar, faculty directory, student enrollment, classroom allocations, master timetable scheduling, fee structures, and administrative notice broadcasts.
3. **Teacher:** Assigned section rosters, period/daily attendance tracking, weighted gradebook assessments, curriculum homework management, exam grading, and the AI Teacher Copilot suite.
4. **Student:** Academic courseware, daily schedule, homework submissions, exam taking, fee ledger, library book searches, bus tracking, and the AI Socratic Tutor.
5. **Parent / Guardian:** Verified multi-child portal, academic progress tracking, attendance logs, tuition fee payment history, direct teacher messaging, bus location tracking, and the AI Parent Assistant.

### 1.4 Implemented Modules & Current Status

| Module Domain | Task Reference | Implementation Status | Functional Capabilities |
|---|---|---|---|
| **Multi-Tenant Governance** | TASK 001–003 | **COMPLETED** | School tenant isolation, academic calendar, term structures. |
| **User Directory & RBAC** | TASK 002, 004, 005 | **COMPLETED** | Passport JWT authentication, refresh tokens, role guards. |
| **Parent Linkages** | TASK 006 | **COMPLETED** | Verified multi-child parent portal, emergency contacts. |
| **Academic Structure** | TASK 007 | **COMPLETED** | Classes, grade levels, sections, subjects, weekly timetable. |
| **Attendance & NFC** | TASK 008, 017 | **COMPLETED** | Daily & period attendance, status codes, simulated NFC gate. |
| **Grades & Assessments** | TASK 009 | **COMPLETED** | Weighted gradebook (Quiz/Midterm/Final), letter scales, GPA. |
| **Homework & Submissions** | TASK 010 | **COMPLETED** | Curriculum homework, file attachments, late detection. |
| **Examinations** | TASK 011 | **COMPLETED** | Online test-taking engine, question banks, auto-evaluation. |
| **Subscriptions & Licensure** | TASK 012 | **COMPLETED** | Institutional tier plans, bulk activation codes redemption. |
| **Communications & Notices** | TASK 013, 014, 030 | **COMPLETED** | Broadcast notices, direct messaging, Socket.IO notifications. |
| **Student Fee Management** | TASK 021 | **COMPLETED** | Fee categories, student fee ledgers, manual payment recording. |
| **Gemini AI Foundation** | TASK 022 | **COMPLETED** | Gemini 3.8 Flash SDK, conversation history, token tracking. |
| **AI Teacher Copilot** | TASK 023 | **COMPLETED** | 6 Pedagogical tools (Lesson Plans, Quizzes, Rubrics, etc.). |
| **AI Student Tutor** | TASK 024 | **COMPLETED** | Socratic learning mode, practice quizzes, concept explainer. |
| **AI Parent Assistant** | TASK 024 | **COMPLETED** | Student academic summaries, absence guidance, policy Q&A. |
| **AI Document Intelligence** | TASK 026 | **COMPLETED** | Markdown policy chunking, grounded search with citations. |
| **Unified AI Workflows** | TASK 026.1 | **COMPLETED** | Role-tailored AI chat interfaces with zero metric fabrication. |
| **Transport & Live GPS** | TASK 027 | **COMPLETED** | Bus routes, driver geolocation transmission, student stops. |
| **Library Management** | TASK 028 | **COMPLETED** | Book catalog, ISBN lookup, circulation lending/return rules. |
| **UI/UX Performance** | TASK 019 | **COMPLETED** | Pre-fetched fast client navigation (10–20ms route shifts). |
| **Deployment Preparation** | TASK 020 | **COMPLETED** | Production Dockerfiles, Nginx SSL/WSS, migrations, backups. |
| **AI Analytics & Insights** | TASK 025 | *SKIPPED* | Skipped by project directive; roadmap feature. |
| **Institutional Rebranding** | TASK 029 | *SKIPPED* | Skipped by project directive; Samahat Taibah branding preserved. |

---

## 2. Architecture

### 2.1 System Architecture Overview
The EMS is designed as an enterprise **Modular Monolith** paired with an autonomous **Python AI Microservice**. This architecture balances high developer productivity, unified transactions, and strong type safety, while isolating compute-heavy LLM agent processing and embedding generation.

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer (Browser & Mobile Web)"]
        Browser["User Browser / Client App<br/>(React 18 / Next.js Client Components)"]
    end

    subgraph EdgeLayer["Edge & Reverse Proxy Layer"]
        Nginx["Nginx Reverse Proxy & SSL Termination<br/>(Port 80 / 443)<br/>• Security Headers & Compression<br/>• WebSocket Upgrade for /socket.io/<br/>• API Routing to /api/v1/"]
    end

    subgraph FrontendApp["Frontend Application Server"]
        NextServer["Next.js 14 App Router Server<br/>(Port 3000)<br/>• Server-Side Rendering (SSR)<br/>• Static Route Optimization<br/>• Fast Prefetching Engine"]
    end

    subgraph BackendCore["Core Backend Application Server"]
        NestApp["NestJS 10 Modular API<br/>(Port 4000)<br/>• JWT Authentication & RBAC Guards<br/>• School Isolation Interceptors<br/>• Global Validation Pipes<br/>• Socket.IO Gateway (Messaging & GPS)<br/>• BullMQ Task Queue Orchestrator"]
    end

    subgraph AIService["AI & Intelligence Microservice"]
        FastAPIApp["FastAPI Microservice (Python 3.11)<br/>(Port 8000)<br/>• Google Gemini 3.8 Flash SDK<br/>• RAG Retrieval & Policy Grounding<br/>• Socratic Tutoring Agents<br/>• HMAC Secret Authorization"]
    end

    subgraph PersistenceLayer["Data & Persistence Layer"]
        PostgresDB[("PostgreSQL 16 + pgvector<br/>(Port 5432 / 5433)<br/>• Relational Institutional Entities<br/>• Vector Embeddings for Documents<br/>• Foreign Key Cascades & Constraints")]
        RedisCache[("Redis 7 (Alpine)<br/>(Port 6379)<br/>• In-Memory Cache<br/>• BullMQ Job Queues<br/>• Socket.IO Pub/Sub Adapter")]
        FileStorage[("Persistent Volume Storage<br/>(/app/apps/api/uploads)<br/>• Documents & Policy PDFs<br/>• Student Profile Images")]
    end

    subgraph ExternalServices["External Cloud Providers"]
        GeminiCloud["Google Gemini AI Platform<br/>(gemini-3.8-flash)"]
    end

    Browser -->|"HTTPS (Port 443)"| Nginx
    Browser -->|"WSS WebSockets (/socket.io/)"| Nginx

    Nginx -->|"Proxy /"| NextServer
    Nginx -->|"Proxy /api/v1/"| NestApp
    Nginx -->|"Proxy /socket.io/"| NestApp

    NextServer -.->|"Internal HTTP"| NestApp
    NestApp -->|"Prisma ORM"| PostgresDB
    NestApp -->|"TCP Ping / Queues"| RedisCache
    NestApp -->|"Local FS Write"| FileStorage
    NestApp -->|"Internal REST (HMAC Auth)"| FastAPIApp

    FastAPIApp -->|"google-genai SDK"| GeminiCloud
    FastAPIApp -.->|"RAG Context Sync"| NestApp
```

### 2.2 Core Request Flows

1. **Standard Authenticated REST Flow:**
   - Client sends HTTP request with `Authorization: Bearer <JWT>` to `https://ems.yourdomain.com/api/v1/...`.
   - Nginx terminates TLS and proxies to NestJS on port 4000.
   - NestJS `JwtAuthGuard` validates token signature and extracts `sub` (userId), `role`, and `schoolId`.
   - NestJS `SchoolIsolationGuard` enforces query boundaries ensuring tenant data cannot be queried across schools.
   - Prisma ORM executes typed SQL queries against PostgreSQL 16.
   - Standardized envelope `ApiSuccessResponse<T>` is returned to the client.

2. **AI Copilot & Socratic Tutoring Flow:**
   - Teacher or Student initiates a prompt from the Next.js interface.
   - NestJS API validates user session, checks institutional AI usage quotas, and signs an internal HMAC request token.
   - Request is forwarded to the FastAPI microservice (`http://ai-service:8000`).
   - The FastAPI agent retrieves grounded curriculum chunks or document context, constructs structured prompts, and calls Google Gemini API.
   - Gemini response is validated via Pydantic models and returned through NestJS to the client.

3. **Real-Time GPS Tracking & Messaging Flow:**
   - Driver starts route and emits geolocation coordinates via WebSocket (`driver:location:update`).
   - NestJS Socket.IO gateway authenticates driver token and verifies active trip assignment.
   - Coordinates are broadcast exclusively to parents and students subscribed to that specific route room (`transport:route:<id>`).
   - Redis Socket.IO adapter distributes broadcasts across multiple server instances.

---

## 3. Technology Choices

| Technology | Purpose | Why It Was Selected |
|---|---|---|
| **Next.js 14** | Web Frontend Portal | React Server Components (RSC) and App Router provide fast page rendering, streaming SSR, and automated code-splitting. |
| **TypeScript 5.5** | Language Standard | End-to-end type safety between frontend, backend API, and shared DTO contracts (`@ems/contracts`). |
| **Tailwind CSS & shadcn/ui** | Styling & UI System | Utility-first CSS and accessible Radix primitives enable a responsive, accessible interface with instant Dark/Light theme switching. |
| **NestJS 10** | Core Backend Framework | Modular architecture, strict dependency injection, built-in validation pipes, and enterprise lifecycle guards. |
| **Prisma ORM 5.18** | Database Modeling & Access | Type-safe query builder, declarative schema definitions, automated migrations (`prisma migrate deploy`), and database seeding. |
| **PostgreSQL 16 (pgvector)** | Relational & Vector Persistence | ACID compliance, relational integrity, row-level constraints, and vector extension support for document embedding storage. |
| **Python 3.11 / FastAPI** | AI Microservice | Lightweight, asynchronous HTTP runtime with native Pydantic validation, well-suited for Python LLM frameworks and AI agent workflows. |
| **Google Gemini (`gemini-3.8-flash`)** | Generative AI Engine | High reasoning accuracy, sub-second latency, 1M+ token context window, and native structured JSON outputs via official `google-genai` SDK. |
| **Redis 7 (Alpine)** | Cache, Queues & WebSockets | Sub-millisecond latency for session caching, BullMQ asynchronous job scheduling, and Socket.IO multi-node clustering. |
| **Socket.IO 4** | Real-Time Transport | Bi-directional WebSocket communication with automated fallback to HTTP long-polling, room subscriptions, and reconnection management. |
| **Docker & Docker Compose** | Containerization | Multi-stage, non-root Alpine container builds providing deterministic production parity across operating systems. |
| **Nginx** | Reverse Proxy & SSL | High-throughput SSL termination, HTTP/2 multiplexing, gzip compression, and WebSocket connection upgrades. |
| **Jest & Pytest** | Automated Testing | Comprehensive unit and integration test coverage across TypeScript services and Python AI routes. |

---

## 4. Setup

### 4.1 Prerequisites
Ensure the following runtimes and tools are installed:
- **Node.js:** `>= 20.18.0 LTS`
- **npm:** `>= 10.8.2`
- **Python:** `3.10`, `3.11`, or `3.12`
- **PostgreSQL:** Version 16 or 18 (installed locally or running via Docker)
- **Redis:** Version 7.x (installed locally or running via Docker)
- **Git:** Version 2.30+
- **Google Gemini API Key:** Required for live AI Copilot interactions (free tier available at [Google AI Studio](https://aistudio.google.com/)).

---

### 4.2 Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/usman2-tech/education-management-system.git
cd education-management-system
```

#### 2. Install Node.js Workspace Dependencies
```bash
# Installs packages across apps/web, apps/api, and packages/contracts
npm install
```

#### 3. Setup Python AI Microservice Virtual Environment
**On Windows (PowerShell):**
```powershell
cd apps/ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
cd ../..
```

**On Linux / macOS (Bash):**
```bash
cd apps/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ../..
```

#### 4. Configure Environment Files
```bash
# Copy root environment template
cp .env.example .env

# Copy app-specific environment templates
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/ai-service/.env.example apps/ai-service/.env
```
*(In development, the default placeholder secrets work out of the box. In production, review [Section 5](#5-environment-variables).)*

#### 5. Prepare Database & Redis Services
**Option A: Using Docker (Recommended for cross-platform):**
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

**Option B: Using Native Windows Local Services:**
```powershell
# In Terminal 1 - Start Redis Server:
& "infrastructure\redis\redis-server.exe" "infrastructure\redis\redis.windows.conf"

# In Terminal 2 - Start PostgreSQL:
& "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "infrastructure/postgres/data" -p 5433
```

#### 6. Build Shared Packages & Apply Database Schema
```bash
# 1. Build TypeScript Contracts package
npm run build:packages

# 2. Generate Prisma Client code
npm run prisma:generate --workspace=apps/api

# 3. Apply Prisma baseline migration to local database
npm run prisma:deploy

# 4. Seed development database with institutional demo data
npm run prisma:seed --workspace=apps/api
```

---

## 5. Environment Variables

All sensitive values must be configured using environment variables. Never commit `.env` or production credentials to version control.

| Variable Name | Target Service | Required? | Description | Example / Default Value |
|---|---|---|---|---|
| `NODE_ENV` | Global / API / Web | Yes | Environment execution mode (`development`, `production`, `test`). | `development` |
| `PORT` | API | Yes | Port on which the NestJS backend listens. | `4000` |
| `API_PREFIX` | API | Yes | Global URI path prefix for all REST endpoints. | `api/v1` |
| `DATABASE_URL` | API | Yes | Full PostgreSQL connection string with schema parameter. | `postgresql://postgres:postgres@127.0.0.1:5433/ems_database?schema=public` |
| `JWT_SECRET` | API | Yes | Cryptographic HMAC secret for signing access JWTs. | `replace_with_min_32_char_secret` |
| `JWT_EXPIRES_IN` | API | No | Access token expiration duration. | `1h` |
| `JWT_REFRESH_SECRET` | API | Yes | Cryptographic secret for signing long-lived refresh tokens. | `replace_with_min_32_char_secret` |
| `JWT_REFRESH_EXPIRES_IN`| API | No | Refresh token expiration window. | `7d` |
| `CORS_ORIGIN` | API | Yes | Comma-separated list of permitted web browser origins. | `http://localhost:3000,http://127.0.0.1:3000` |
| `SWAGGER_ENABLED` | API | No | Enables OpenAPI Swagger docs (auto-disabled in prod). | `true` |
| `REDIS_HOST` | API | Yes | Hostname or IP of the Redis server. | `127.0.0.1` (or `redis` in Docker) |
| `REDIS_PORT` | API | Yes | Port on which Redis accepts TCP connections. | `6379` |
| `REDIS_PASSWORD` | API | No | Authentication password for Redis (optional). | *(empty in dev)* |
| `INTERNAL_SERVICE_SECRET`| API & AI Service | Yes | Shared token authorizing inter-service API calls. | `dev_internal_secret_key_change_in_production` |
| `UPLOAD_DIR` | API | Yes | Filesystem path for uploaded documents and images. | `/app/apps/api/uploads` (or `./uploads`) |
| `MAX_FILE_SIZE_BYTES` | API | No | Maximum allowed payload upload size in bytes (10MB). | `10485760` |
| `AI_SERVICE_URL` | API | Yes | Base URL where NestJS reaches the FastAPI service. | `http://127.0.0.1:8000` |
| `AI_SERVICE_PORT` | AI Service | Yes | Port on which FastAPI listens. | `8000` |
| `AI_SERVICE_HOST` | AI Service | Yes | Binding interface for FastAPI microservice. | `127.0.0.1` (or `0.0.0.0` in Docker) |
| `AI_SERVICE_ENV` | AI Service | Yes | Environment mode for FastAPI service. | `development` |
| `GEMINI_API_KEY` | AI Service | No* | Google Cloud / Gemini API key (*mock fallback if empty).| `AIzaSy...` |
| `GEMINI_MODEL` | AI Service | No | Google Gemini model identifier. | `gemini-3.8-flash` |
| `AI_MOCK_FALLBACK` | AI Service | No | Enables authentic mock responses when API key is unset.| `true` (dev) / `false` (prod) |
| `NEXT_PUBLIC_APP_NAME` | Frontend Web | No | Institutional display name shown in navigation shell. | `"Samahat Taibah Educational Management System"` |
| `NEXT_PUBLIC_API_URL` | Frontend Web | Yes | Public REST API URL consumed by client browser. | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_AI_SERVICE_URL`| Frontend Web | Yes | Endpoint consumed by Copilot interfaces. | `http://localhost:8000` |

> [!IMPORTANT]
> In production (`NODE_ENV=production`), the NestJS API enforces strict startup validation: if `JWT_SECRET`, `JWT_REFRESH_SECRET`, or `DATABASE_URL` use default development fallback values, the process will abort immediately with a fatal diagnostic error.

---

## 6. Database

### 6.1 Database Engine & Schema
The EMS relies on PostgreSQL 16 (or 18) with the `pgvector` extension. All relational models are declaratively defined in:
`apps/api/prisma/schema.prisma`

### 6.2 Managing Database Migrations
Prisma provides two primary modes for schema synchronization:

- **Development Schema Updates:**
  ```bash
  # Pushes schema changes directly during rapid local prototyping:
  npx prisma db push --schema=apps/api/prisma/schema.prisma
  ```

- **Production Migration Execution:**
  ```bash
  # Deterministically deploys verified migration files without resetting data:
  npm run prisma:deploy
  # Or inspect migration status:
  npm run prisma:status
  ```

> [!CAUTION]
> NEVER execute `prisma migrate reset` or `prisma db push --force-reset` on staging or production databases. Always use `npm run prisma:deploy` per the [Database Migration Runbook](file:///c:/Users/hp/Desktop/school%20managment%20system/docs/deployment/database-migration-runbook.md).

### 6.3 Database Seeding & Fixtures
To populate the database with realistic educational fixtures:
```bash
npm run prisma:seed --workspace=apps/api
```

The seed script creates:
- **2 Institutional Test Schools:**
  1. `St. Jude Institutional Academy` (Code: `st-jude`)
  2. `Apex STEM Academy` (Code: `apex-stem`)
- **1 Platform Administrator** (`platform.admin@ems.local`)
- **2 School Administrators** (`admin@stjude.ems.local`, `admin@apex.ems.local`)
- **8 Faculty Members** across Mathematics, Physics, Humanities, Computer Science, and Chemistry.
- **8 Class Sections** across Grade 10 and Grade 11.
- **8 Academic Subjects** with credit units and department assignments.
- **16 Students** enrolled with realistic academic profiles (High, Average, Low, Zero, and Missing score test cases).
- **8 Verified Parents/Guardians** (including a multi-child portal linking Liam and Sophia Chen).
- **Institutional Standard Grading Scales** (A+ through F with GPA point mappings).
- **Assessment Categories & Gradebook Entries** (Quizzes, Homework, Projects, Midterm, and Final exams).
- **Simulated NFC Cards** for campus gate attendance verification.

---

## 7. Running the Application

### 7.1 Development Mode Quickstart
Launch all components in separate terminal windows:

#### Terminal 1: Database & Redis (if running natively on Windows)
```powershell
& "infrastructure\redis\redis-server.exe" "infrastructure\redis\redis.windows.conf"
& "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "infrastructure/postgres/data" -p 5433
```

#### Terminal 2: NestJS Core Backend (Port 4000)
```powershell
npm run dev:api
```

#### Terminal 3: FastAPI AI Microservice (Port 8000)
```powershell
cd apps/ai-service
.\.venv\Scripts\Activate.ps1
uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Terminal 4: Next.js Frontend Portal (Port 3000)
```powershell
npm run dev:web
```

---

### 7.2 Production Build Execution (Local Verification)
To compile and test the optimized production bundles locally:

```powershell
# 1. Build all workspaces
npm run build:packages
npm run build:api
npm run build:web

# 2. Run backend API production server:
npm run start --workspace=apps/api

# 3. Run frontend Next.js production server:
npm run start --workspace=apps/web
```

---

### 7.3 Verified Service Endpoints

| Service Name | Verified Local URL | Health & Telemetry | Documentation |
|---|---|---|---|
| **Web Frontend** | `http://localhost:3000` | `http://localhost:3000/api/health` | [docs/modules/](file:///c:/Users/hp/Desktop/school%20managment%20system/docs/modules/) |
| **Backend REST API** | `http://localhost:4000/api/v1` | `http://localhost:4000/api/v1/health` | `http://localhost:4000/api/docs` |
| **AI Microservice** | `http://localhost:8000` | `http://localhost:8000/health` | `http://localhost:8000/docs` (Dev only) |
| **PostgreSQL Database** | `127.0.0.1:5433` (or `5432`) | `pg_isready` | [docs/database/](file:///c:/Users/hp/Desktop/school%20managment%20system/docs/database/) |
| **Redis Cache** | `127.0.0.1:6379` | `redis-cli ping` | [infrastructure/redis/](file:///c:/Users/hp/Desktop/school%20managment%20system/infrastructure/redis/) |

---

## 8. API Documentation

### 8.1 REST Architecture & Contracts
The backend exposes a structured, RESTful API versioned under `/api/v1`. All endpoints enforce:
- **Strict Data Transfer Objects (DTOs):** Validated via `class-validator` and `class-transformer`.
- **Standardized Response Envelope:**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Operation completed successfully",
    "data": { ... },
    "timestamp": "2026-10-17T22:30:00.000Z"
  }
  ```
- **Standardized Error Envelope:**
  ```json
  {
    "success": false,
    "statusCode": 403,
    "message": "Forbidden resource",
    "errors": ["User does not have permission to access records for schoolId 'st-jude'"],
    "timestamp": "2026-10-17T22:30:00.000Z",
    "path": "/api/v1/students"
  }
  ```

### 8.2 Interactive OpenAPI (Swagger) Documentation
When running in development, interactive documentation and schema definitions are accessible at:
[http://localhost:4000/api/docs](http://localhost:4000/api/docs)

> **Production Security Policy:**  
> In compliance with enterprise security directives, Swagger UI is automatically disabled when `NODE_ENV=production` unless `SWAGGER_ENABLED=true` is explicitly supplied in the production environment.

### 8.3 Example API Usage (PowerShell & curl)

#### 1. Authenticate & Obtain Bearer Token
```powershell
$LoginBody = @{
    email    = "admin@stjude.ems.local"
    password = "Password123!"
} | ConvertTo-Json

$AuthResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $LoginBody

$Token = $AuthResponse.data.accessToken
Write-Host "Authenticated successfully as School Admin! Token received."
```

#### 2. Query System Health
```bash
curl -X GET "http://localhost:4000/api/v1/health" \
  -H "Accept: application/json"
```

#### 3. Fetch School Students Roster (Role Protected)
```bash
curl -X GET "http://localhost:4000/api/v1/students" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Accept: application/json"
```

---

## 9. Test Accounts

> [!WARNING]
> **These accounts are strictly for local development, evaluation, and demonstration purposes. NEVER use demo accounts, credentials, or default fallback secrets in a production environment.**

All demo accounts are created by running `npm run prisma:seed`. The default password across all seeded accounts is:  
`Password123!`

| User Role | Seeded Login Email | Default Password | Institutional Scope & Assigned School |
|---|---|---|---|
| **Platform Administrator** | `platform.admin@ems.local` | `Password123!` | Global Governance (All Schools) |
| **School Administrator** | `admin@stjude.ems.local` | `Password123!` | St. Jude Institutional Academy |
| **School Administrator** | `admin@apex.ems.local` | `Password123!` | Apex STEM Academy |
| **Teacher (Mathematics)** | `teacher@stjude.ems.local` | `Password123!` | St. Jude Institutional Academy |
| **Teacher (Physics)** | `teacher.maya@stjude.ems.local` | `Password123!` | St. Jude Institutional Academy |
| **Teacher (Chemistry)** | `teacher@apex.ems.local` | `Password123!` | Apex STEM Academy |
| **Student (High Performer)**| `student@stjude.ems.local` | `Password123!` | Liam Chen (Grade 10A, St. Jude) |
| **Student (Avg Performer)** | `student2@stjude.ems.local` | `Password123!` | Sophia Chen (Grade 10B, St. Jude) |
| **Student (Apex Academy)** | `student.alex@apex.ems.local` | `Password123!` | Alexander Ross (Alpha Cohort, Apex) |
| **Parent (Multi-Child Portal)**| `parent@stjude.ems.local` | `Password123!` | Sarah Chen (Parent to Liam & Sophia) |
| **Parent (Single Child)** | `parent.david@stjude.ems.local`| `Password123!` | David Wright (Parent to Ethan Wright)|
| **Parent (Apex Academy)** | `parent.arthur@apex.ems.local`| `Password123!` | Arthur Ross (Parent to Alexander Ross)|

### Login & Activation Notes
- Access the web portal login at: [http://localhost:3000/login](http://localhost:3000/login).
- Clicking any of the quick-login role chips on the login page automatically populates these verified credentials.
- New users invited via the administrator portal receive an invitation token and can activate their account at `/activate?token=<token>`.

---

## 10. Deployment

### 10.1 Production Architecture & Containerization
TASK 020 provides a complete production containerization setup using multi-stage Alpine images and Docker Compose:
- **`apps/api/Dockerfile`:** Multi-stage Node 20 Alpine container with non-root user `nestjs` (UID 1001).
- **`apps/web/Dockerfile`:** Multi-stage Node 20 Alpine container with non-root user `nextjs` (UID 1001).
- **`apps/ai-service/Dockerfile`:** Python 3.11-slim container with non-root user `appuser` (UID 1001).
- **`docker-compose.prod.yml`:** Production orchestrator wiring PostgreSQL, Redis, API, AI Service, Web, and Nginx.

### 10.2 Production Deployment Quickstart
On a clean Ubuntu Linux / Docker host:

```bash
# 1. Clone the repository
git clone https://github.com/usman2-tech/education-management-system.git
cd education-management-system

# 2. Provision production environment secrets
cp .env.example .env
# Edit .env and supply secure secrets for JWT_SECRET, JWT_REFRESH_SECRET, and POSTGRES_PASSWORD

# 3. Launch all containers in production mode
docker compose -f docker-compose.prod.yml up -d --build

# 4. Execute deterministic database migrations
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# 5. (Optional on initial setup) Seed institutional demo data
docker compose -f docker-compose.prod.yml exec api npm run prisma:seed
```

### 10.3 Reverse Proxy & SSL Termination
Nginx configuration is provided under `infrastructure/nginx/`:
- **HTTPS Termination:** Modern TLS 1.2/1.3 ciphers and HSTS headers.
- **WebSocket Upgrade:** Dedicated proxy block for `/socket.io/` ensuring persistent connections for direct messaging and live GPS tracking.
- **Request Limiting:** 15MB upload ceiling for PDF documents and images.

For detailed operational procedures, refer to:
- [Production Deployment Guide](file:///c:/Users/hp/Desktop/school%20managment%20system/docs/deployment/production-deployment-guide.md)
- [Database Migration Runbook](file:///c:/Users/hp/Desktop/school%20managment%20system/docs/deployment/database-migration-runbook.md)

---

## 11. Scalability

### 11.1 Horizontal & Vertical Evolution
While the current POC is configured for single-host Docker deployment, the architecture is deliberately designed for horizontal scaling across cloud infrastructure:

1. **Stateless Backend APIs:**
   - The NestJS API stores zero user state in memory; all authentication is validated via cryptographic JWTs or Redis sessions.
   - Multiple API instances can be deployed behind a round-robin load balancer (AWS ALB, Cloudflare, or Nginx).

2. **Socket.IO Multi-Node Clustering:**
   - Real-time WebSockets utilize the Redis Pub/Sub adapter. Messages emitted on Node A are instantly broadcast to clients connected to Node B or Node C.

3. **Isolated AI Microservice Workers:**
   - The Python AI microservice scales independently based on LLM request volume without consuming CPU cycles or memory from the transactional API.

4. **Database Connection Pooling & Read Replicas:**
   - PostgreSQL scaling can incorporate connection pooling (via PgBouncer) and read replicas for analytical dashboard queries.
   - Vector indexing (`ivfflat` or `hnsw` via `pgvector`) optimizes semantic document searches as institutional archives grow.

5. **Shared File Storage:**
   - In multi-instance deployments, the local persistent volume (`/app/apps/api/uploads`) can be replaced with an S3-compatible object storage provider (AWS S3, Google Cloud Storage, or MinIO) using pre-signed upload URLs.

---

## 12. Security

### 12.1 Implemented Security Controls

- **Authentication & RBAC:**
  - Password hashing utilizing `bcryptjs` with 10 salt rounds.
  - Short-lived Access Tokens (1 hour) and cryptographically distinct Refresh Tokens (7 days) with UUID revocation tracking.
  - Role-based authorization guards on every endpoint (`@Roles(UserRole.SCHOOL_ADMIN, ...)`).

- **Multi-Tenant Data Isolation:**
  - Every institutional entity includes a mandatory `schoolId` foreign key.
  - Database queries are filtered by the authenticated user's `schoolId` at the service layer, preventing cross-tenant data access.

- **Child-Guardian Relationship Verification:**
  - Parents can only view academic, attendance, and fee data for students explicitly linked through verified `StudentGuardianRelationship` records.

- **AI Security & Server-Side Credentials:**
  - Google Gemini API keys are maintained exclusively on the server side in the AI microservice.
  - Inter-service communication between NestJS and FastAPI is validated using a shared HMAC secret.
  - Document retrieval for AI prompts strictly respects publication status and role access permissions.

- **Transport GPS Privacy:**
  - Live bus location updates are restricted to active trips. Only parents with children assigned to the specific route can subscribe to the GPS room.

- **Production Hardening:**
  - `GlobalHttpExceptionFilter` intercepts unhandled runtime exceptions, suppressing internal database error strings and stack traces in production.
  - Generous payload parsing limits (10MB) combined with Nginx body size limits (15MB) prevent denial-of-service memory exhaustion.
  - HTTP Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Referrer-Policy`) protect against clickjacking and MIME sniffing.

---

## 13. Known Limitations & Future Roadmap

### 13.1 Known Limitations (Current POC)

1. **Skipped Modules:**
   - **AI Analytics & Recommendations (TASK 025):** Skipped by project directive; automated predictive grade forecasting and student retention risk models remain planned.
   - **Institutional Branding Change (TASK 029):** Skipped by project directive; the original Samahat Taibah branding has been intentionally preserved.

2. **Simulated Hardware Integrations:**
   - **Vehicle GPS Tracking:** Currently operates via the Driver Web Portal using the browser's HTML5 Geolocation API emitting coordinates over Socket.IO. Dedicated vehicle OBD-II/CanBus GPS hardware integrations are not included.
   - **NFC Attendance:** The campus gate attendance engine includes a software-based NFC Card Simulator (`/attendance/nfc-simulator`). Physical USB/Serial NFC readers require local hardware bridge drivers.

3. **External Communications & Payments:**
   - **Email & SMS Notifications:** The system provides in-app notifications and real-time Socket.IO alerts. Direct SMS gateway dispatch (e.g. Twilio) and SMTP email delivery require configuring provider API credentials.
   - **Payment Gateways:** Student fee management provides manual payment logging and receipt reconciliation. Live credit card/Stripe/bank API integrations are not connected in the POC.

4. **Deployment Status:**
   - The repository has been prepared, containerized, and locally smoke-tested for production readiness (TASK 020). Live cloud hosting has not been provisioned as this is an evaluation submission.

---

### 13.2 Future Roadmap

#### Phase 1: POC Validation & Review (Current)
- [x] Complete core institutional modules (Tasks 001–018, 021, 027, 028, 030).
- [x] Complete Gemini AI Copilot suites (Tasks 022–024, 026, 026.1).
- [x] Complete UI/UX performance optimization (Task 019).
- [x] Complete production deployment preparation (Task 020).
- [x] Finalize evaluator-ready documentation (Task 020.1).

#### Phase 2: Production Staging & Live Infrastructure
- [ ] Deploy production Docker Compose stack to dedicated cloud host (AWS / DigitalOcean / Hetzner).
- [ ] Install Let's Encrypt automated SSL certificate issuance (`certbot`).
- [ ] Connect institutional SMTP server for automated email invitations and password resets.
- [ ] Connect SMS gateway provider for critical emergency parent notifications.

#### Phase 3: Hardware Integrations & Advanced Payments
- [ ] Integrate external online payment gateways (Stripe / Razorpay / localized bank APIs) for online tuition payments.
- [ ] Implement physical OBD-II / MQTT GPS vehicle tracking hardware integration for campus bus fleets.
- [ ] Implement physical hardware bridge for USB NFC smart-card readers at campus entry gates.

#### Phase 4: Native Mobile Applications & Advanced AI
- [ ] Package cross-platform React Native / Flutter mobile applications for iOS and Android.
- [ ] Implement TASK 025 (Automated AI Student Risk Prediction & Institutional Analytics).
- [ ] Introduce multi-lingual AI tutoring (Arabic, Urdu, French) leveraging Gemini multimodal audio capabilities.

---

## License & Attribution
- **Institution:** Samahat Taibah Institution
- **Repository:** [https://github.com/usman2-tech/education-management-system](https://github.com/usman2-tech/education-management-system)
- **Copyright:** &copy; 2026 Samahat Taibah Educational Management System Architecture Team. All rights reserved.
