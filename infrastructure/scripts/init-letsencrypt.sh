#!/usr/bin/env bash
# ==============================================================================
# SCRIPT: Automated Let's Encrypt TLS Certificate Bootstrap
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
# Solves the bootstrap chicken-and-egg problem by creating temporary self-signed
# certificates inside the shared Docker volume (ems_prod_ssl_certs) to allow
# Nginx to start, then requesting real Let's Encrypt certificates via Certbot
# (webroot HTTP-01 challenge) and reloading Nginx.
#
# Usage:
#   ./infrastructure/scripts/init-letsencrypt.sh [domain] [email] [--staging]
# Example:
#   ./infrastructure/scripts/init-letsencrypt.sh ems.eduportal.dev admin@eduportal.dev
# ==============================================================================

set -euo pipefail

# Ensure script runs from project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${ROOT_DIR}"

COMPOSE_FILE="docker-compose.prod.yml"
SSL_VOLUME="ems_prod_ssl_certs"
NGINX_CONF="infrastructure/nginx/conf.d/default.conf"

# Resolve DOMAIN from argument, .env, or interactive prompt
DOMAIN="${1:-}"
if [ -z "${DOMAIN}" ] && [ -f .env ]; then
    DOMAIN="$(grep -E '^STAGING_DOMAIN=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '\"' | tr -d '\r' || true)"
fi
if [ -z "${DOMAIN}" ]; then
    read -rp "Enter staging domain name (e.g. ems.eduportal.dev): " DOMAIN || true
fi

if [ -z "${DOMAIN}" ]; then
    echo "ERROR: Target domain name is required." >&2
    echo "Usage: $0 <domain> <email> [--staging]" >&2
    exit 1
fi

# Resolve EMAIL from argument, .env, or interactive prompt
EMAIL="${2:-}"
if [ -z "${EMAIL}" ] && [ -f .env ]; then
    EMAIL="$(grep -E '^LETSENCRYPT_EMAIL=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '\"' | tr -d '\r' || true)"
fi
if [ -z "${EMAIL}" ]; then
    read -rp "Enter contact email for Let's Encrypt registration: " EMAIL || true
fi

if [ -z "${EMAIL}" ]; then
    echo "ERROR: Contact email is required for Let's Encrypt." >&2
    echo "Usage: $0 <domain> <email> [--staging]" >&2
    exit 1
fi

STAGING_FLAG="${3:-}"
STAGING_ARG=""
if [ "${STAGING_FLAG}" == "--staging" ]; then
    STAGING_ARG="--staging"
fi

echo "=============================================================================="
echo "EMS TLS Certificate Bootstrap: https://${DOMAIN}"
echo "=============================================================================="

# Ensure Nginx configuration points to target domain
if [ -f "${NGINX_CONF}" ]; then
    echo "Synchronizing Nginx configuration for ${DOMAIN}..."
    sed -i "s|/etc/letsencrypt/live/[^/]*/|/etc/letsencrypt/live/${DOMAIN}/|g" "${NGINX_CONF}" 2>/dev/null || true
    sed -i -E "s|server_name [^ ;]+ _|server_name ${DOMAIN} _|g" "${NGINX_CONF}" 2>/dev/null || true
    sed -i -E "s|server_name [^ ;]+;|server_name ${DOMAIN};|g" "${NGINX_CONF}" 2>/dev/null || true
fi

# Ensure persistent SSL volume exists
docker volume inspect "${SSL_VOLUME}" >/dev/null 2>&1 || docker volume create "${SSL_VOLUME}" >/dev/null

# Check if trusted certificates already exist in volume
CERT_EXISTS=$(docker run --rm -v "${SSL_VOLUME}:/etc/letsencrypt" alpine sh -c \
    "[ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ] && echo 'yes' || echo 'no'")

if [ "${CERT_EXISTS}" == "yes" ]; then
    IS_DUMMY=$(docker run --rm -v "${SSL_VOLUME}:/etc/letsencrypt" nginx:alpine sh -c \
        "openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -noout -issuer 2>/dev/null | grep -c 'CN = localhost' || true")
    
    if [ "${IS_DUMMY}" -eq 0 ]; then
        echo "Valid trusted Let's Encrypt certificates already exist for ${DOMAIN}."
        echo "Reloading Nginx to apply current certificates..."
        docker compose -f "${COMPOSE_FILE}" up -d nginx
        docker compose -f "${COMPOSE_FILE}" exec nginx nginx -s reload || true
        echo "HTTPS is active and healthy for https://${DOMAIN}"
        exit 0
    else
        echo "Detected existing temporary self-signed certificate. Proceeding with Let's Encrypt issuance..."
    fi
fi

# Step 1: Generate temporary self-signed certificate in volume for Nginx bootstrap
echo "[1/4] Generating temporary self-signed certificate in volume for Nginx startup..."
docker run --rm -v "${SSL_VOLUME}:/etc/letsencrypt" nginx:alpine sh -c \
    "mkdir -p /etc/letsencrypt/live/${DOMAIN} && \
     openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
       -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
       -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
       -subj '/CN=localhost'"

# Step 2: Start Nginx to answer ACME HTTP-01 challenges on port 80
echo "[2/4] Starting Nginx reverse proxy..."
docker compose -f "${COMPOSE_FILE}" up -d nginx
sleep 3

# Verify Nginx started
if ! docker compose -f "${COMPOSE_FILE}" ps nginx | grep -qE "Up|running"; then
    echo "ERROR: Nginx failed to start with temporary bootstrap certificate." >&2
    docker compose -f "${COMPOSE_FILE}" logs nginx >&2
    exit 1
fi

# Step 3: Delete temporary certificate files so Certbot creates clean live directory (prevents -0001 suffix)
echo "[3/4] Preparing certificate directory for Certbot..."
docker run --rm -v "${SSL_VOLUME}:/etc/letsencrypt" alpine sh -c \
    "rm -rf /etc/letsencrypt/live/${DOMAIN} \
            /etc/letsencrypt/archive/${DOMAIN} \
            /etc/letsencrypt/renewal/${DOMAIN}.conf"

# Step 4: Request real Let's Encrypt certificate via Certbot
echo "[4/4] Requesting Let's Encrypt TLS certificate for ${DOMAIN}..."
set +e
docker compose -f "${COMPOSE_FILE}" run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    ${STAGING_ARG} \
    --email "${EMAIL}" \
    -d "${DOMAIN}" \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal \
    --non-interactive
CERTBOT_STATUS=$?
set -e

if [ ${CERTBOT_STATUS} -ne 0 ]; then
    echo "ERROR: Certbot failed to obtain certificate for ${DOMAIN} (exit code: ${CERTBOT_STATUS})." >&2
    echo "Restoring temporary self-signed certificate to maintain operational Nginx..." >&2
    docker run --rm -v "${SSL_VOLUME}:/etc/letsencrypt" nginx:alpine sh -c \
        "mkdir -p /etc/letsencrypt/live/${DOMAIN} && \
         openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
           -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
           -out /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
           -subj '/CN=localhost'"
    docker compose -f "${COMPOSE_FILE}" exec nginx nginx -s reload || true
    echo "Please check DNS resolution, Azure NSG inbound port 80 rule, and Certbot logs." >&2
    exit ${CERTBOT_STATUS}
fi

# Step 5: Reload Nginx with trusted certificate
echo "Reloading Nginx with new trusted certificate..."
docker compose -f "${COMPOSE_FILE}" exec nginx nginx -s reload

echo "=============================================================================="
echo "SUCCESS: Trusted HTTPS certificate is active for https://${DOMAIN}"
echo "=============================================================================="
