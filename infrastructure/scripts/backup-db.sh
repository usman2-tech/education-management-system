#!/usr/bin/env bash
# ==============================================================================
# SCRIPT: PostgreSQL Database Backup Automation
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
# Usage:
#   ./infrastructure/scripts/backup-db.sh [backup_dir]
# Or configure as a cron job:
#   0 2 * * * /path/to/backup-db.sh /var/backups/ems >> /var/log/ems-backup.log 2>&1
# ==============================================================================

set -euo pipefail

# Configuration with environment defaults
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-ems_database}"
DB_USER="${POSTGRES_USER:-ems_user}"
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups/postgres}}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# Verify pg_dump or docker command availability
DATE_STAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ems_${DB_NAME}_${DATE_STAMP}.dump"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting automated backup for database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}..."

# Ensure target directory exists
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

# Execute pg_dump with custom binary compression format (-Fc)
if command -v pg_dump >/dev/null 2>&1; then
    pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges \
        --file="${BACKUP_FILE}"
elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "ems-prod-postgres"; then
    echo "Using Docker container pg_dump..."
    docker exec ems-prod-postgres pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges > "${BACKUP_FILE}"
else
    echo "ERROR: Neither pg_dump nor running ems-prod-postgres Docker container was found." >&2
    exit 1
fi

# Verify backup size and creation
if [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup successful! File: ${BACKUP_FILE} (Size: ${BACKUP_SIZE})"
else
    echo "ERROR: Backup file ${BACKUP_FILE} is empty or was not created." >&2
    exit 1
fi

# Rotate backups older than retention window
echo "Cleaning up backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -name "ems_${DB_NAME}_*.dump" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} +
echo "Backup and rotation completed successfully."
