# Educational Management System (EMS) — System Architecture Overview

## 1. High-Level Architecture

The Educational Management System is structured as a **Modular Monolith** core backend paired with a specialized **AI Agent Microservice** and a modern **Next.js Frontend Portal**.

```
+-------------------------------------------------------------------------+
|                              Next.js Web                                |
|  - App Router, Tailwind CSS, shadcn/ui, next-themes                     |
|  - Role-aware institutional layout (5 Roles)                            |
|  - Real-time telemetry, forms (Zod), tables (TanStack)                  |
+--------------------+----------------------------------------------------+
                     |
                     | HTTPS / REST / Socket.IO
                     v
+--------------------+----------------------------------------------------+
|                         NestJS Backend API                              |
|  - Modular architecture with school boundary isolation                  |
|  - Global validation pipe, standardized exception envelopes             |
|  - Swagger/OpenAPI documentation (/api/docs)                            |
|  - Prisma ORM 5.x for transactional PostgreSQL operations               |
|  - Redis 7.x / BullMQ for async jobs and caching                        |
+---------+----------------------------------+----------------------------+
          |                                  |
          | Prisma / SQL                     | Internal HTTP (Shared Secret)
          v                                  v
+---------+--------------+       +-----------+----------------------------+
|   PostgreSQL 16        |       |            FastAPI AI Service          |
|   - Multi-tenant data  |       |   - Python 3.14 / FastAPI / Uvicorn    |
|   - pgvector extension |<------+   - LangGraph agent workflows          |
|   - Normalized schemas |  RAG  |   - Study Tutor, Lesson Summarizer     |
+------------------------+       +----------------------------------------+
```

## 2. Multi-Tenancy & School Isolation Model
- **Institutional Boundary**: Every business entity (Students, Teachers, Classes, Exams, Attendance) is strictly indexed and bounded by `schoolId`.
- **Authorization Enforcement**: NestJS guards inspect user session JWT claims and verify tenancy before allowing queries or mutations.
- **Cross-School Governance**: Only `PLATFORM_ADMIN` users possess privileges to inspect cross-school aggregates.

## 3. Communication Protocol
- **Client to API**: HTTPS REST requests prefixed with `/api/v1` and WebSocket connections for real-time notifications.
- **API to AI Service**: Internal HTTP requests authorized by `INTERNAL_SERVICE_SECRET`. Clients cannot call the AI microservice directly.
- **AI Service to Storage**: Vector similarity searches query PostgreSQL using `pgvector`.
