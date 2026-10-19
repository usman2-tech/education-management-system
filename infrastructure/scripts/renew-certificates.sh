#!/usr/bin/env bash
# ==============================================================================
# SCRIPT: Manual & Cron Let's Encrypt Certificate Renewal
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
# Performs an automated or manual check of Let's Encrypt certificates,
# renews any certificates within 30 days of expiry, and gracefully reloads Nginx.
#
# Usage:
#   ./infrastructure/scripts/renew-certificates.sh [--dry-run]
# ==============================================================================

set -euo pipefail

# Ensure script runs from project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT_DIR}"

COMPOSE_FILE="docker-compose.prod.yml"
DRY_RUN_ARG=""

if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN_ARG="--dry-run"
    echo "Running certificate renewal in DRY-RUN mode..."
fi

echo "=============================================================================="
echo "EMS TLS Certificate Renewal Check"
echo "=============================================================================="

docker compose -f "${COMPOSE_FILE}" run --rm certbot renew \
    --webroot -w /var/www/certbot \
    ${DRY_RUN_ARG}

echo "Reloading Nginx to apply any updated certificates..."
docker compose -f "${COMPOSE_FILE}" exec nginx nginx -s reload || true

echo "=============================================================================="
echo "Certificate check and Nginx reload completed successfully."
echo "=============================================================================="
