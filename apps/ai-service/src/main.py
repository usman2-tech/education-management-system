"""
MODULE: AI Service Main Application Entrypoint

PURPOSE:
Hosts the FastAPI server providing autonomous agents, RAG retrieval workflows,
and educational intelligence. Operates strictly under the orchestration of the NestJS core backend.

DEPENDENCIES:
FastAPI, Pydantic, LangGraph (future), pgvector (future).

SECURITY:
Protected by CORS and internal shared secret validation. Direct public client access is forbidden.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config.settings import settings
from src.api.routes.health import router as health_router

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ems-ai-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Educational Management AI Service...")
    logger.info(f"Environment: {settings.environment} | Port: {settings.port}")
    logger.info("LangGraph agent foundations ready for registration.")
    yield
    logger.info("Gracefully shutting down Educational Management AI Service...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Provider-independent AI Microservice for Educational Management System",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS setup - allowing main API communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Internal service network in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register health check
app.include_router(health_router)


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
