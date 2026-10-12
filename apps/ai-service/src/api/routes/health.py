"""
MODULE: AI Service Health Check Endpoint

PURPOSE:
Provides service health, runtime metadata, and status checks for orchestration by NestJS
and container orchestrators.
"""

from fastapi import APIRouter
from datetime import datetime, timezone
from src.config.settings import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """
    Returns AI microservice operational status and readiness indicators.
    """
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "framework": "FastAPI",
        "langgraph_ready": settings.langgraph_enabled,
    }
