# Infrastructure & Container Services

This directory contains container definitions for running PostgreSQL (with `pgvector`) and Redis.

## Prerequisites
- Docker & Docker Compose (when using containerized local services)

## Starting the Database & Cache
To run PostgreSQL and Redis in the background:
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

## Stopping the Services
```bash
docker compose -f infrastructure/docker/docker-compose.yml down
```

## Note on Host Services
If you have PostgreSQL already running as a native Windows service (such as `postgresql-x64-18` on port 5432), ensure your `.env` contains the correct database user credentials (e.g. `postgres:postgres` or your local PostgreSQL password).
