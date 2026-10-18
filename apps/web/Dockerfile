# ==============================================================================
# PRODUCTION DOCKERFILE: Next.js Frontend (@ems/web)
# Multi-stage, security-hardened, non-root Alpine container
# ==============================================================================

# STAGE 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Copy root workspace manifests
COPY package*.json ./
COPY packages/contracts/package*.json ./packages/contracts/
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/

# Install workspace dependencies
RUN npm ci

# Copy contracts source and build
COPY packages/contracts/ ./packages/contracts/
RUN npm run build --workspace=packages/contracts

# Copy frontend source
COPY apps/web/ ./apps/web/

# Build Next.js application
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_APP_NAME="Samahat Taibah Educational Management System"
ARG NEXT_PUBLIC_AI_SERVICE_URL=/ai
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_AI_SERVICE_URL=$NEXT_PUBLIC_AI_SERVICE_URL
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/web

# Prune devDependencies for production runtime
RUN npm prune --production

# ------------------------------------------------------------------------------
# STAGE 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Install curl for container healthchecks
RUN apk add --no-cache curl

# Create non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy runtime files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.mjs ./apps/web/next.config.mjs

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "start", "--workspace=apps/web"]
