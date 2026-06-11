"""
Simulation Control API Endpoints

REST API for controlling mission simulations. Simulations are created
from an existing mission (waypoints are loaded automatically) and stream
live telemetry over the /ws/simulations WebSocket endpoints.
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel

from app.simulation.simulation_manager import get_simulation_manager
from app.services.mission_service import get_mission_service
from app.models.enums import MissionStatus

router = APIRouter(prefix="/simulations", tags=["Simulations"])


# Request/Response Models
class SimulationCreateRequest(BaseModel):
    """Request to create a new simulation"""
    mission_id: str
    waypoints: Optional[List[dict]] = None  # Defaults to the mission's waypoints
    drone_config: Optional[dict] = None


class SimulationStatusResponse(BaseModel):
    """Simulation status response"""
    mission_id: str
    status: str
    message: str


class SimulationStateResponse(BaseModel):
    """Complete simulation state"""
    mission_id: str
    status: str
    position: dict
    target_waypoint: int
    waypoints_completed: int
    total_waypoints: int
    progress_percent: float
    total_distance_traveled: float
    distance_to_next_waypoint: float
    battery_percent: float
    battery_voltage: float
    elapsed_time: float
    average_speed: float
    max_speed_reached: float
    max_altitude_reached: float


class SimulationListResponse(BaseModel):
    """List of all simulations"""
    total: int
    active: int
    simulations: List[SimulationStateResponse]


async def _set_mission_status(mission_id: str, mission_status: MissionStatus) -> None:
    """Keep the mission record in sync with its simulation lifecycle."""
    try:
        await get_mission_service().set_status(mission_id, mission_status.value)
    except ValueError:
        # Simulation may exist without a stored mission (e.g. ad-hoc waypoints)
        pass


@router.post(
    "",
    response_model=SimulationStatusResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_simulation(request: SimulationCreateRequest):
    """
    Create a simulation for a mission.

    If waypoints are omitted, they are loaded from the mission itself.
    An existing finished simulation for the mission is replaced.
    """
    manager = get_simulation_manager()

    waypoints = request.waypoints
    if not waypoints:
        try:
            mission = await get_mission_service().get_mission(request.mission_id)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        waypoints = mission.get("waypoints") or []

    if len(waypoints) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Simulation requires at least 2 waypoints"
        )

    # Replace any previous, non-running simulation for this mission
    existing = manager.get_simulation(request.mission_id)
    if existing:
        if existing.running:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Simulation already running for mission {request.mission_id}"
            )
        await manager.remove_simulation(request.mission_id)

    try:
        await manager.create_simulation(
            mission_id=request.mission_id,
            waypoints=waypoints,
            drone_config=request.drone_config
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return SimulationStatusResponse(
        mission_id=request.mission_id,
        status="created",
        message=f"Simulation created with {len(waypoints)} waypoints"
    )


@router.post("/{mission_id}/start", response_model=SimulationStatusResponse)
async def start_simulation(mission_id: str):
    """Start a created simulation. Marks the mission as active."""
    manager = get_simulation_manager()

    try:
        await manager.start_simulation(mission_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation not found for mission {mission_id}"
        )

    await _set_mission_status(mission_id, MissionStatus.ACTIVE)

    return SimulationStatusResponse(
        mission_id=mission_id,
        status="started",
        message="Simulation started successfully"
    )


@router.post("/{mission_id}/pause", response_model=SimulationStatusResponse)
async def pause_simulation(mission_id: str):
    """Pause a running simulation."""
    manager = get_simulation_manager()
    _require_simulation(manager, mission_id)

    await manager.pause_simulation(mission_id)
    await _set_mission_status(mission_id, MissionStatus.PAUSED)

    return SimulationStatusResponse(
        mission_id=mission_id,
        status="paused",
        message="Simulation paused"
    )


@router.post("/{mission_id}/resume", response_model=SimulationStatusResponse)
async def resume_simulation(mission_id: str):
    """Resume a paused simulation."""
    manager = get_simulation_manager()
    _require_simulation(manager, mission_id)

    await manager.resume_simulation(mission_id)
    await _set_mission_status(mission_id, MissionStatus.ACTIVE)

    return SimulationStatusResponse(
        mission_id=mission_id,
        status="resumed",
        message="Simulation resumed"
    )


@router.post("/{mission_id}/stop", response_model=SimulationStatusResponse)
async def stop_simulation(mission_id: str, reason: str = "user_requested"):
    """Stop a simulation. Marks the mission as aborted."""
    manager = get_simulation_manager()
    _require_simulation(manager, mission_id)

    await manager.stop_simulation(mission_id, reason)
    await _set_mission_status(mission_id, MissionStatus.ABORTED)

    return SimulationStatusResponse(
        mission_id=mission_id,
        status="stopped",
        message=f"Simulation stopped: {reason}"
    )


@router.delete("/{mission_id}", response_model=SimulationStatusResponse)
async def remove_simulation(mission_id: str):
    """Remove a simulation (stops it first if running)."""
    manager = get_simulation_manager()
    _require_simulation(manager, mission_id)

    await manager.remove_simulation(mission_id)

    return SimulationStatusResponse(
        mission_id=mission_id,
        status="removed",
        message="Simulation removed"
    )


@router.get("/{mission_id}", response_model=SimulationStateResponse)
async def get_simulation_state(mission_id: str):
    """Get current state of a simulation."""
    manager = get_simulation_manager()
    simulator = _require_simulation(manager, mission_id)

    return SimulationStateResponse(**simulator.get_state())


@router.get("", response_model=SimulationListResponse)
async def list_simulations():
    """List all simulations with their current states."""
    manager = get_simulation_manager()

    all_sims = manager.get_all_simulations()

    return SimulationListResponse(
        total=len(all_sims),
        active=manager.get_active_count(),
        simulations=[SimulationStateResponse(**state) for state in all_sims.values()]
    )


def _require_simulation(manager, mission_id: str):
    """Return the simulator for a mission or raise 404."""
    simulator = manager.get_simulation(mission_id)
    if not simulator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation not found for mission {mission_id}"
        )
    return simulator
