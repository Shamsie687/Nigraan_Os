"""
Health check endpoint.

Used by load balancers, orchestrators, and monitoring systems
to verify the service is running.
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Return basic service health status."""
    return {"status": "ok"}
