"""
API version 1
"""

from fastapi import APIRouter
from .health import router as health_router
from .simulations import router as simulations_router
from .missions import router as missions_router
from .drones import router as drones_router

# Create main API router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(health_router, tags=["health"])
api_router.include_router(simulations_router)
api_router.include_router(missions_router)
api_router.include_router(drones_router)

__all__ = ["api_router"]
