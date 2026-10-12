# Database Architecture & Schema Blueprint

## 1. Relational Engine
- **RDBMS**: PostgreSQL 16+
- **Extensions**: `pgvector` (for vector embeddings, semantic retrieval, and AI tutoring)
- **ORM / Client**: Prisma ORM 5.x

## 2. Foundational Entities (Task 001)
- `system_health_checks`: Used for heartbeat verification, database latency diagnostics, and system auditing.

## 3. High-Level Schema Roadmap (Task 002+)
```mermaid
erDiagram
    SCHOOL ||--o{ USER : contains
    SCHOOL ||--o{ ACADEMIC_YEAR : defines
    ACADEMIC_YEAR ||--o{ TERM : divides
    SCHOOL ||--o{ CLASS : organizes
    CLASS ||--o{ SECTION : subdivides
    SECTION ||--o{ ENROLLMENT : contains
    USER ||--o{ ENROLLMENT : participates
    SECTION ||--o{ TIMETABLE_SLOT : schedules
    SECTION ||--o{ ATTENDANCE_RECORD : tracks
    SECTION ||--o{ EXAM : administers
    EXAM ||--o{ GRADE : evaluates
```

## 4. Tenancy & Indexing Strategy
- Every business table contains `school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE`.
- Composite indexing on `(school_id, id)` and `(school_id, created_at)` ensures efficient partition-like queries and prevents cross-tenant data leaks.
