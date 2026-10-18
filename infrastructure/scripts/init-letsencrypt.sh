#!/usr/bin/env bash
# ==============================================================================
# SCRIPT: Automated Let's Encrypt TLS Certificate Bootstrap
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
# Solves the bootstrap chicken-and-egg problem by creating temporary self-signed
# certificates to allow Nginx to start, then requesting real Let's Encrypt
# certificates via Certbot and reloading Nginx.
# Usage:
#   ./infrastructure/scripts/init-letsencrypt.sh <domain> <email> [--staging]
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
STAGING_FLAG="${3:-}"

if [ -z "${DOMAIN}" ] || [ -z "${EMAIL}" ]; then
    echo "Usage: $0 <domain> <email> [--staging]"
    echo "Example: $0 ems.yourdomain.com admin@yourdomain.com"
    exit 1
fi

COMPOSE_FILE="docker-compose.prod.yml"
CERT_DIR="./infrastructure/nginx/ssl/live/${DOMAIN}"

echo "=============================================================================="
echo "EMS TLS Certificate Bootstrap: ${DOMAIN}"
echo "=============================================================================="

# Check if certificates already exist
if [ -d "${CERT_DIR}" ] && [ -f "${CERT_DIR}/fullchain.pem" ]; then
    echo "Certificates already exist for ${DOMAIN} at ${CERT_DIR}."
    read -p "Do you want to overwrite existing certificates? (y/N): " OVERWRITE
    if [[ ! "${OVERWRITE}" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Step 1: Create dummy certificate for Nginx bootstrap
echo "[1/4] Generating temporary self-signed certificate for Nginx startup..."
mkdir -p "${CERT_DIR}"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "${CERT_DIR}/privkey.pem" \
    -out "${CERT_DIR}/fullchain.pem" \
    -subj "/CN=localhost"

# Step 2: Start Nginx container
echo "[2/4] Starting Nginx reverse proxy..."
docker compose -f "${COMPOSE_FILE}" up -d nginx

# Step 3: Delete dummy certificate and request real certificate
echo "[3/4] Requesting Let's Encrypt TLS certificate for ${DOMAIN}..."
rm -rf "${CERT_DIR}"

STAGING_ARG=""
if [ "${STAGING_FLAG}" == "--staging" ]; then
    STAGING_ARG="--staging"
fi

docker compose -f "${COMPOSE_FILE}" run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    ${STAGING_ARG} \
    --email "${EMAIL}" \
    -d "${DOMAIN}" \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal \
    --non-interactive

# Step 4: Reload Nginx with trusted certificate
echo "[4/4] Reloading Nginx with new certificate..."
docker compose -f "${COMPOSE_FILE}" exec nginx nginx -s reload

echo "=============================================================================="
echo "SUCCESS: HTTPS is active for https://${DOMAIN}"
echo "=============================================================================="
