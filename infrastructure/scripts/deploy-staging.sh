#!/usr/bin/env bash
# ==============================================================================
# SCRIPT: Staging Deployment Orchestrator
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
# Builds and launches the complete EMS stack on an Azure Ubuntu VM.
# Usage:
#   ./infrastructure/scripts/deploy-staging.sh [--seed]
# ==============================================================================

set -euo pipefail

# Ensure script runs from project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT_DIR}"

COMPOSE_FILE="docker-compose.prod.yml"
SEED_DATA=false

if [[ "${1:-}" == "--seed" ]]; then
    SEED_DATA=true
fi

echo "=============================================================================="
echo "SAMAHAT TAIBAH INSTITUTION - EMS STAGING DEPLOYMENT"
echo "=============================================================================="

# 1. Check for .env file
if [ ! -f .env ]; then
    echo "ERROR: .env file not found." >&2
    echo "Run ./infrastructure/scripts/generate-staging-env.sh to generate one." >&2
    exit 1
fi

# 2. Check Docker and Docker Compose
if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker is not installed. Please install Docker Engine first." >&2
    exit 1
fi

# 3. Build Docker images
echo "[1/6] Building production Docker images..."
docker compose -f "${COMPOSE_FILE}" build

# 4. Start database and cache
echo "[2/6] Starting PostgreSQL and Redis..."
docker compose -f "${COMPOSE_FILE}" up -d postgres redis

# 5. Wait for database healthcheck
echo "[3/6] Waiting for PostgreSQL to become healthy..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' ems-prod-postgres 2>/dev/null || true)" == "healthy" ]; do
    sleep 2
    printf "."
done
echo " PostgreSQL is healthy."

# 6. Apply Prisma database migrations
echo "[4/6] Applying Prisma database migrations..."
docker compose -f "${COMPOSE_FILE}" run --rm api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# 7. Optionally seed synthetic demo fixtures
if [ "${SEED_DATA}" = true ]; then
    echo "[4b/6] Seeding synthetic demo data (schools, teachers, students, parents)..."
    docker compose -f "${COMPOSE_FILE}" run --rm api npx ts-node apps/api/prisma/seed.ts || true
fi

# 8. Check SSL certificate readiness before launching Nginx
DOMAIN="${STAGING_DOMAIN:-$(grep -E '^STAGING_DOMAIN=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '\"' | tr -d '\r' || true)}"
if [ -z "${DOMAIN}" ]; then
    DOMAIN="ems.eduportal.dev"
fi

SSL_VOLUME="ems_prod_ssl_certs"
docker volume inspect "${SSL_VOLUME}" >/dev/null 2>&1 || docker volume create "${SSL_VOLUME}" >/dev/null
CERT_EXISTS=$(docker run --rm -v "${SSL_VOLUME}:/etc/letsencrypt" alpine sh -c \
    "[ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ] && echo 'yes' || echo 'no'" 2>/dev/null || echo "no")

if [ "${CERT_EXISTS}" != "yes" ]; then
    echo "NOTICE: SSL certificates for ${DOMAIN} not found in volume."
    echo "Creating temporary bootstrap certificate to enable Nginx startup for ACME challenges..."
    docker run --rm -v "${SSL_VOLUME}:/etc/letsencrypt" nginx:alpine sh -c \
        "mkdir -p /etc/letsencrypt/live/${DOMAIN} && \
         openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
           -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
           -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
           -subj '/CN=localhost'" >/dev/null 2>&1 || true
    echo "Bootstrap certificate created. Run ./infrastructure/scripts/init-letsencrypt.sh to obtain trusted Let's Encrypt certificates."
fi

# 9. Start full application stack
echo "[5/6] Starting application services (api, ai-service, web, nginx, certbot)..."
docker compose -f "${COMPOSE_FILE}" up -d api ai-service web nginx certbot

# 9. Verify container statuses
echo "[6/6] Verifying running containers..."
docker compose -f "${COMPOSE_FILE}" ps

echo "=============================================================================="
echo "DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "Check logs with: docker compose -f ${COMPOSE_FILE} logs -f"
echo "=============================================================================="
