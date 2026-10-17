# ==============================================================================
# PRODUCTION DOCKERFILE: FastAPI AI Microservice
# Lightweight, security-hardened, non-root Python 3.11 container
# ==============================================================================

FROM python:3.11-slim AS runner

WORKDIR /app

# Set production Python flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AI_SERVICE_ENV=production \
    AI_SERVICE_HOST=0.0.0.0 \
    AI_SERVICE_PORT=8000

# Install curl for container healthcheck
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser

# Copy and install dependencies
COPY apps/ai-service/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy AI service source code
COPY apps/ai-service/src ./src

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
