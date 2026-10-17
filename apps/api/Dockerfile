# ==============================================================================
# PRODUCTION DOCKERFILE: NestJS Backend API (@ems/api)
# Multi-stage, security-hardened, non-root Alpine container
# ==============================================================================

# STAGE 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root workspace manifests
COPY package*.json ./
COPY packages/contracts/package*.json ./packages/contracts/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install all workspace dependencies
RUN npm ci

# Copy contracts source and build
COPY packages/contracts/ ./packages/contracts/
RUN npm run build --workspace=packages/contracts

# Copy API source and Prisma schema
COPY apps/api/ ./apps/api/

# Generate Prisma Client and build API
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=apps/api

# Prune devDependencies for production
RUN npm prune --production

# ------------------------------------------------------------------------------
# STAGE 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install curl for healthchecks
RUN apk add --no-cache curl

# Create non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Create uploads storage directories
RUN mkdir -p /app/apps/api/uploads/documents /app/apps/api/uploads/student-photos && \
    chown -R nestjs:nodejs /app/apps/api/uploads

# Copy built artifacts and production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/package.json ./package.json

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/apps/api/src/main.js"]
