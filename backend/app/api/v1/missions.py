"""
Mission Management API Endpoints

Thin route handlers that delegate to the service layer.
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.mission import MissionCreate, MissionUpdate, WaypointCreate
from app.models.enums import MissionType
from app.services.mission_service import get_mission_service
from app.utils.waypoint_generator import WaypointGenerator

router = APIRouter(prefix="/missions", tags=["Missions"])


# Request/Response Models
class MissionCreateRequest(BaseModel):
    """Request to create a new mission"""
    name: str
    description: Optional[str] = None
    type: str = "survey"
    altitude: float = 100.0
    speed: float = 12.0
    drone_id: Optional[str] = None
    waypoints: List[dict] = []


class MissionResponse(BaseModel):
    """Mission response model"""
    id: str
    name: str
    description: Optional[str] = None
    type: str
    status: str
    altitude: float
    speed: float
    waypoints: List[dict]
    progress_percent: float = 0.0
    waypoints_completed: int = 0
    total_waypoints: int = 0
    total_distance: Optional[float] = None
    elapsed_time: Optional[float] = None
    estimated_completion: Optional[str] = None
    created_at: str
    updated_at: str
    drone_id: Optional[str] = None


class MissionUpdateRequest(BaseModel):
    """Request to update a mission"""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class WaypointGenerationRequest(BaseModel):
    """Request to generate survey waypoints for a GeoJSON polygon"""
    polygon: dict = Field(..., description="GeoJSON Polygon of the survey area")
    altitude: float = Field(default=100.0, gt=0, le=6000)
    pattern: str = Field(default="grid", description="grid | crosshatch | perimeter")
    overlap_percent: float = Field(default=70.0, ge=0, lt=95)
    angle: float = Field(default=0.0, ge=-180, le=180)


class WaypointGenerationResponse(BaseModel):
    """Generated waypoints plus mission statistics"""
    waypoints: List[dict]
    statistics: dict


def _to_mission_type(value: str) -> MissionType:
    try:
        return MissionType(value)
    except ValueError:
        return MissionType.OTHER


@router.post("/generate-waypoints", response_model=WaypointGenerationResponse)
async def generate_waypoints(request: WaypointGenerationRequest):
    """
    Generate survey waypoints for a polygon area.

    Supports grid (lawnmower), crosshatch, and perimeter flight patterns
    with configurable photo overlap and flight-line angle.
    """
    try:
        generator = WaypointGenerator(
            polygon=request.polygon,
            altitude=request.altitude,
        )
        waypoints = generator.generate_waypoints(
            pattern=request.pattern,
            overlap_percent=request.overlap_percent,
            angle=request.angle,
        )
        stats = generator.calculate_mission_stats(waypoints)
    except (ValueError, KeyError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid waypoint generation request: {e}"
        )

    return WaypointGenerationResponse(
        waypoints=[wp.to_dict() for wp in waypoints],
        statistics=stats,
    )


@router.get("", response_model=List[MissionResponse])
async def get_missions(
    status: Optional[str] = None,
    type: Optional[str] = None
):
    """Get all missions, optionally filtered by status or type"""
    service = get_mission_service()
    return await service.list_missions(status=status, mission_type=type)


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission(mission_id: str):
    """Get a specific mission by ID"""
    service = get_mission_service()
    try:
        return await service.get_mission(mission_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
async def create_mission(request: MissionCreateRequest):
    """Create a new mission"""
    service = get_mission_service()

    waypoints = [
        WaypointCreate(
            latitude=wp.get("latitude", 0),
            longitude=wp.get("longitude", 0),
            altitude=wp.get("altitude", request.altitude),
        )
        for wp in request.waypoints
    ]

    try:
        mission_create = MissionCreate(
            name=request.name,
            description=request.description,
            mission_type=_to_mission_type(request.type),
            drone_id=request.drone_id or "default-drone",
            cruise_speed=request.speed,
            waypoints=waypoints,
        )
        return await service.create_mission(mission_create)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{mission_id}", response_model=MissionResponse)
async def update_mission(mission_id: str, request: MissionUpdateRequest):
    """Update a mission"""
    service = get_mission_service()
    try:
        # Only forward fields the client actually sent
        update_data = MissionUpdate(**request.model_dump(exclude_none=True))
        return await service.update_mission(mission_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mission(mission_id: str):
    """Delete a mission"""
    service = get_mission_service()
    try:
        await service.delete_mission(mission_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{mission_id}/statistics")
async def get_mission_statistics(mission_id: str):
    """Get statistics for a mission"""
    service = get_mission_service()
    try:
        return await service.get_statistics(mission_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
