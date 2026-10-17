#!/usr/bin/env bash
# ==============================================================================
# SCRIPT: PostgreSQL Database Restore Verification & Disaster Recovery
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
# Usage:
#   ./infrastructure/scripts/restore-db.sh <path_to_backup.dump> [--force]
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <path_to_backup.dump> [--force]"
    exit 1
fi

BACKUP_FILE="$1"
FORCE="${2:-}"

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-ems_database}"
DB_USER="${POSTGRES_USER:-ems_user}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file ${BACKUP_FILE} does not exist." >&2
    exit 1
fi

echo "=============================================================================="
echo "WARNING: YOU ARE ABOUT TO RESTORE A POSTGRESQL DATABASE BACKUP"
echo "Target Host:     ${DB_HOST}:${DB_PORT}"
echo "Target Database: ${DB_NAME}"
echo "Source File:     ${BACKUP_FILE}"
echo "=============================================================================="

if [ "${FORCE}" != "--force" ]; then
    read -p "Type 'RESTORE' to confirm operation on database [${DB_NAME}]: " CONFIRM
    if [ "${CONFIRM}" != "RESTORE" ]; then
        echo "Restore cancelled by user."
        exit 0
    fi
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Commencing database restoration..."

if command -v pg_restore >/dev/null 2>&1; then
    pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "${BACKUP_FILE}"
elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "ems-prod-postgres"; then
    cat "${BACKUP_FILE}" | docker exec -i ems-prod-postgres pg_restore -U "${DB_USER}" -d "${DB_NAME}" \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges
else
    echo "ERROR: Neither pg_restore nor running ems-prod-postgres Docker container was found." >&2
    exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Restoration completed successfully. Running verification check..."
if command -v psql >/dev/null 2>&1; then
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT count(*) AS total_schools FROM \"School\";"
fi
echo "Database verification finished."
