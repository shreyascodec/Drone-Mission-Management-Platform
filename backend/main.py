"""
Drone Mission Control - FastAPI Backend
Application entry point: app factory, middleware, router wiring.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.api.v1 import api_router
from app.api.v1.websocket_simulation import router as ws_simulation_router
from app.websocket import get_websocket_handler
from app.simulation.simulation_manager import get_simulation_manager, set_broadcast_callback


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Wire the simulation engine to WebSocket broadcasting on startup."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    ws_handler = get_websocket_handler()
    sim_manager = get_simulation_manager()

    def broadcast_simulation_events(topic: str, message: dict):
        import asyncio
        asyncio.create_task(ws_handler.broadcast_event(message))

    set_broadcast_callback(broadcast_simulation_events)
    logger.info("Application startup complete")

    yield

    await sim_manager.shutdown()
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real-time drone survey mission management system",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "internal_error"},
    )


app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_simulation_router, prefix="/api/v1")


@app.get("/", tags=["root"], summary="Root Endpoint")
async def root():
    """Basic service information."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "websocket": {
            "mission": "/api/v1/ws/simulations/{mission_id}",
            "global": "/api/v1/ws/simulations",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
