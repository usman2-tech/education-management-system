# Database Migration Runbook — Samahat Taibah EMS
**Project:** Samahat Taibah Institution Educational Management System (EMS)  
**Document Classification:** Standard Operating Procedure (SOP)  
**Database Engine:** PostgreSQL 16 (with pgvector)  
**ORM / Migration Tool:** Prisma ORM 5.18.0

---

## 1. Migration Protocol & Philosophy
- **Zero Data Loss:** We NEVER execute `prisma migrate reset` or `prisma db push --accept-data-loss` in staging or production environments.
- **Deterministic Deployment:** In production, schema migrations are applied strictly using `prisma migrate deploy`.
- **Pre-Migration Snapshot:** A full database backup MUST be created immediately prior to executing any schema change.
- **Backward Compatibility:** All migrations must be designed to avoid breaking running API instances during blue/green or rolling updates.

---

## 2. Pre-Deployment Verification Checklist
Before applying any migration to production:
1. [ ] Check migration status to identify pending migrations:
   ```bash
   npm run prisma:status
   ```
2. [ ] Review migration SQL files in `apps/api/prisma/migrations/`:
   - Inspect whether any `DROP TABLE`, `DROP COLUMN`, or `NOT NULL` constraints on existing columns are present.
   - For any new non-nullable columns, verify that a `DEFAULT` value is specified.
3. [ ] Perform a mandatory pre-migration database backup:
   ```bash
   ./infrastructure/scripts/backup-db.sh /var/backups/ems/pre-migration
   ```
4. [ ] Verify PostgreSQL connection and health:
   ```bash
   curl -f http://localhost:4000/api/v1/health
   ```

---

## 3. Production Migration Execution

### Step 3.1: Apply Migrations
Run the standard production deployment script:

```bash
# On host environment:
npm run prisma:deploy

# OR inside Docker container:
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

### Step 3.2: Verify Migration Status
Verify that all migrations have been recorded in the `_prisma_migrations` table:

```bash
npm run prisma:status
```
Expected output:
```
Database schema is up to date!
```

---

## 4. Migration History & Chronological Order
The EMS database migrations are stored under `apps/api/prisma/migrations/`:

| Migration Directory | Name | Purpose | Risk Assessment |
|---------------------|------|---------|-----------------|
| `20261017000000_init_ems_production` | Initial Institutional EMS Schema | Creates base enums, multi-tenant tables, foreign keys, and indexes for Tasks 001–030. | Low (Additive, initial baseline) |

---

## 5. Rollback & Emergency Recovery Protocol
Prisma does not support automatic down-migrations. If a migration fails during execution:

### Scenario A: Migration Failed Mid-Execution
1. Identify the failed migration:
   ```bash
   npx prisma migrate status --schema=apps/api/prisma/schema.prisma
   ```
2. If the migration was partially applied, inspect `_prisma_migrations` and mark as rolled back if necessary:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name> --schema=apps/api/prisma/schema.prisma
   ```
3. Restore from the pre-migration snapshot:
   ```bash
   ./infrastructure/scripts/restore-db.sh /var/backups/ems/pre-migration/ems_ems_database_<timestamp>.dump --force
   ```

### Scenario B: Accidental Table Drift on Existing Database
If an existing development database already has the schema applied outside of migrations:
```bash
npx prisma migrate resolve --applied 20261017000000_init_ems_production --schema=apps/api/prisma/schema.prisma
```
This registers the migration in `_prisma_migrations` without re-running DDL statements or modifying tables.
