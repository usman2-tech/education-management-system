# Infrastructure & Database Services

This directory provides infrastructure configurations for both **Containerized (Docker Compose)** and **Native Windows Local Development** modes.

---

## Mode A: Native Windows Development Setup (Active Setup)
When Docker Desktop is unavailable or when preserving existing native host databases, EMS runs with native local services:

### 1. Dedicated PostgreSQL Instance (Port 5433)
- **Engine**: PostgreSQL 18
- **Port**: `5433` (isolated from any default port 5432 instance to eliminate port conflicts)
- **Data Directory**: `infrastructure/postgres/data` (git-ignored)
- **Database**: `ems_database`
- **Start Command**:
  ```powershell
  & "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "infrastructure/postgres/data" -p 5433
  ```

### 2. Native Redis Cache & Queue Server (Port 6379)
- **Engine**: Redis 5.0 for Windows (standalone, lightweight binary)
- **Directory**: `infrastructure/redis/`
- **Port**: `6379`
- **Start Command**:
  ```powershell
  & "infrastructure\redis\redis-server.exe" "infrastructure\redis\redis.windows.conf"
  ```
- **CLI Ping**:
  ```powershell
  & "infrastructure\redis\redis-cli.exe" ping
  ```

---

## Mode B: Containerized Development (Docker Compose)
When Docker Desktop is installed, start containerized PostgreSQL (with `pgvector`) and Redis 7 in one command:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### Stopping Containers
```bash
docker compose -f infrastructure/docker/docker-compose.yml down
```

---

## Connectivity Verification Script
Run the automated Jest infrastructure integration test:
```bash
npx jest --config apps/api/package.json
```
This tests:
1. Live PostgreSQL connection and transactional write/read/delete of disposable audit data.
2. Live Redis TCP socket communication on port 6379.
