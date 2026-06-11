"""
Health check endpoints
"""

from fastapi import APIRouter, status
from app.models.health import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Check if the API is running"
)
async def health_check():
    """
    Health check endpoint
    Returns basic service information
    """
    return HealthResponse(
        status="healthy",
        service=settings.APP_NAME,
        version=settings.APP_VERSION
    )


@router.get(
    "/health/ready",
    status_code=status.HTTP_200_OK,
    summary="Readiness Check",
    description="Check if the API is ready to accept requests"
)
async def readiness_check():
    """
    Readiness check for Kubernetes/container orchestration
    """
    # Add checks for database, redis, etc.
    return {
        "status": "ready",
        "checks": {
            "database": "ok",
            "websocket": "ok"
        }
    }


@router.get(
    "/health/live",
    status_code=status.HTTP_200_OK,
    summary="Liveness Check",
    description="Check if the API is alive"
)
async def liveness_check():
    """
    Liveness check for Kubernetes/container orchestration
    """
    return {"status": "alive"}
