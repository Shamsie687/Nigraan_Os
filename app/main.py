"""
NigraanOS Backend — FastAPI Application Entry Point.

This module initializes the FastAPI application, registers routers,
and configures middleware. It is the single entry point for the
backend API server.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.assistant import router as assistant_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.intelligence import router as intelligence_router
from app.api.reports import router as reports_router
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="NigraanOS API",
    description="AI-powered civic intelligence platform for Pakistan.",
    version="0.1.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# CORS — permissive for local development (Expo web runs on
# http://localhost:8082). Starlette echoes the request Origin when
# allow_credentials=True, so credentialed requests still work.
# Restrict origins before production deployment (see SECURITY.md).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(intelligence_router)
app.include_router(reports_router)
app.include_router(assistant_router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {"service": "NigraanOS API", "version": "0.1.0"}


def run() -> None:
    """Start the backend server (entry point for `nigraanos-api` script)."""
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    run()
