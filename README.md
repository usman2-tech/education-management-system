# Educational Management System (EMS)

[![License: UNLICENSED](https://img.shields.io/badge/license-UNLICENSED-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red.svg)](https://nestjs.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-teal.svg)](https://fastapi.tiangolo.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.18-green.svg)](https://www.prisma.io/)

An institutional-grade, multi-school management and educational platform engineered with a **Modular Monolith** core backend, autonomous **FastAPI AI agents**, and a **Next.js App Router** management console.

---

## 1. Supported User Roles

1. **Platform Administrator**: Multi-school tenant governance, system accounts, licensure, security audit trails, and global infrastructure health.
2. **School Administrator**: Campus operations, teacher/student/parent directories, classroom allocations, master timetables, and examinations.
3. **Teacher**: Section rosters, daily attendance, weighted gradebooks, curriculum courseware, and AI teaching assistant.
4. **Student**: Learning dashboard, daily schedule, courses & lessons, assignment submissions, report cards, and AI personal tutor.
5. **Parent / Guardian**: Children academic profiles, attendance records, term grades, official notices, and direct teacher dialogues.

---

## 2. Monorepo Structure

```
education-management-system/
├── apps/
│   ├── web/                    # Next.js 14 App Router management portal (Port 3000)
│   ├── api/                    # NestJS modular core backend (Port 4000)
│   └── ai-service/             # FastAPI / LangGraph AI microservice (Port 8000)
├── packages/
│   ├── contracts/              # Shared TypeScript interfaces, DTOs & UserRole enums
│   ├── ui/                     # Institutional design tokens & branding constants
│   └── config/                 # Shared environment constants & defaults
├── infrastructure/
│   ├── docker/                 # PostgreSQL (pgvector) & Redis 7 Docker compose
│   └── deployment/             # Deployment configurations
├── docs/
│   ├── architecture/           # System design & multi-tenancy blueprints
│   ├── database/               # Relational schemas & ER diagrams
│   ├── modules/                # Module registry & scope matrix
│   ├── implementation-log/     # Chronological development audit trail
│   └── testing/                # Manual test guides & automated test records
└── AGENTS.md                   # Permanent architectural and engineering directives
```

---

## 3. Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, `next-themes` (Light/Dark/System), TanStack Table, React Hook Form, Zod, Recharts, Lucide React.
- **Main Backend**: NestJS 10, TypeScript, Prisma ORM 5.x, PostgreSQL, Redis 7, Swagger/OpenAPI.
- **AI Microservice**: Python 3.14, FastAPI, Uvicorn, LangGraph-ready workflow layout, pgvector integration.
- **Testing**: Jest, Supertest, Pytest, React Testing Library.

---

## 4. Quick Start Guide

### Prerequisites
- Node.js `20.18.0`+
- npm `10.8.2`+
- Python `3.11`+ (tested on `3.14.3`)
- PostgreSQL 16+ & Redis 7 (via Docker Compose or local service)

### 1. Environment Setup
```bash
# Copy environment configuration
cp .env.example .env
```

### 2. Install Dependencies
```bash
# Install npm monorepo workspaces
npm install

# Setup Python AI service virtual environment
cd apps/ai-service
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cd ../..
```

### 3. Start Database & Redis
**Native Windows Setup (Default):**
```powershell
# Start Redis (Port 6379)
& "infrastructure\redis\redis-server.exe" "infrastructure\redis\redis.windows.conf"

# Start Dedicated PostgreSQL Instance (Port 5433 - conflict-free)
& "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "infrastructure/postgres/data" -p 5433
```

**Docker Compose Setup (Alternative when Docker is available):**
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### 4. Build Shared Contracts & Push Prisma Schema
```bash
npm run build:packages
npx prisma db push --schema=apps/api/prisma/schema.prisma
```

### 5. Launch Development Services
Run each service in separate terminals:

```bash
# Terminal 1: NestJS Core Backend (Port 4000)
npm run dev:api

# Terminal 2: Next.js Frontend Portal (Port 3000)
npm run dev:web

# Terminal 3: FastAPI AI Service (Port 8000)
cd apps/ai-service
.venv\Scripts\activate
uvicorn src.main:app --port 8000 --reload
```

---

## 5. Service Endpoints & Documentation

| Service | URL | Description |
|---|---|---|
| **Web Portal** | [http://localhost:3000](http://localhost:3000) | Management dashboard & role-aware shell |
| **Main API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Core REST API prefix |
| **Backend Health** | [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health) | Live component health telemetry |
| **NestJS Swagger** | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) | Interactive OpenAPI documentation |
| **AI Microservice** | [http://localhost:8000/health](http://localhost:8000/health) | AI service health check |
| **FastAPI Swagger** | [http://localhost:8000/docs](http://localhost:8000/docs) | AI OpenAPI documentation |

---

## 6. Running Automated Tests

```bash
# Run NestJS unit tests
npm run test --workspace=apps/api

# Run Python AI service tests
cd apps/ai-service && .venv\Scripts\pytest -v && cd ../..
```

---

## 7. Development & Branching Rules
See [AGENTS.md](AGENTS.md) for mandatory architectural principles, school isolation boundaries, Zero Fabrication directives, and Git workflow rules.
