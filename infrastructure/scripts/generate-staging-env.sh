#!/usr/bin/env bash
# ==============================================================================
# SCRIPT: Staging Environment Generator
# Samahat Taibah Educational Management System (EMS)
# ==============================================================================
# Generates a secure, production-grade .env file with randomized cryptographic
# secrets for Azure Ubuntu VM deployment.
# Usage:
#   ./infrastructure/scripts/generate-staging-env.sh [domain_name]
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-}"

if [ -z "${DOMAIN}" ]; then
    read -p "Enter your staging domain or Azure VM Public IP (e.g., ems.yourdomain.com or 20.xx.xx.xx): " DOMAIN
fi

if [ -z "${DOMAIN}" ]; then
    echo "ERROR: Domain or IP address is required." >&2
    exit 1
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Generating secure staging environment configuration for: ${DOMAIN}..."

# Generate high-entropy cryptographic secrets
JWT_SECRET=$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
JWT_REFRESH_SECRET=$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
INTERNAL_SERVICE_SECRET=$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
POSTGRES_PASSWORD=$(openssl rand -base64 36 | tr -dc 'a-zA-Z0-9' | fold -w 24 | head -n 1)

# Format protocol based on whether domain is an IP or FQDN
if [[ "${DOMAIN}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    PROTOCOL="http"
    CORS_ORIGIN="http://${DOMAIN}"
    API_URL="http://${DOMAIN}/api/v1"
    AI_URL="http://${DOMAIN}/ai"
else
    PROTOCOL="https"
    CORS_ORIGIN="https://${DOMAIN}"
    API_URL="https://${DOMAIN}/api/v1"
    AI_URL="https://${DOMAIN}/ai"
fi

ENV_FILE=".env"

cat > "${ENV_FILE}" <<EOF
# ==============================================================================
# SAMAHAT TAIBAH INSTITUTION - EMS STAGING ENVIRONMENT
# Generated on: $(date -u +"%Y-%m-%dT%H:%M:%SZ") for ${DOMAIN}
# ==============================================================================

NODE_ENV=production
APP_NAME="Samahat Taibah Educational Management System"
APP_VERSION=1.0.0

# ------------------------------------------------------------------------------
# Backend API (NestJS)
# ------------------------------------------------------------------------------
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=${CORS_ORIGIN}
SWAGGER_ENABLED=true
LOG_LEVEL=info

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=7d
INTERNAL_SERVICE_SECRET=${INTERNAL_SERVICE_SECRET}

UPLOAD_DIR=/app/apps/api/uploads
MAX_FILE_SIZE_BYTES=10485760

# ------------------------------------------------------------------------------
# PostgreSQL Database (Internal Network)
# ------------------------------------------------------------------------------
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=ems_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=ems_database
DATABASE_URL=postgresql://ems_user:${POSTGRES_PASSWORD}@postgres:5432/ems_database?schema=public

# ------------------------------------------------------------------------------
# Redis Cache & Queues (Internal Network)
# ------------------------------------------------------------------------------
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# ------------------------------------------------------------------------------
# Frontend Application (Next.js)
# ------------------------------------------------------------------------------
NEXT_PUBLIC_APP_NAME="Samahat Taibah Educational Management System"
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=/ai
PORT=3000

# ------------------------------------------------------------------------------
# AI Microservice (FastAPI & Gemini)
# ------------------------------------------------------------------------------
AI_SERVICE_ENV=production
AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8000
AI_LOG_LEVEL=info
MAIN_API_INTERNAL_URL=http://api:4000/api/v1
AI_SERVICE_URL=http://ai-service:8000

# Add your Google Gemini API key below:
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
GEMINI_REQUEST_TIMEOUT=30
GEMINI_MAX_RETRIES=3
AI_MOCK_FALLBACK=true

# ------------------------------------------------------------------------------
# Domain & SSL Settings
# ------------------------------------------------------------------------------
STAGING_DOMAIN=${DOMAIN}
EOF

chmod 600 "${ENV_FILE}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] .env created successfully with secure permissions (chmod 600)."
echo "Database Password: ${POSTGRES_PASSWORD}"
echo "Staging Domain:    ${DOMAIN} (${PROTOCOL})"
echo "AI Mock Fallback:  true (Set GEMINI_API_KEY to activate live Gemini AI)"
