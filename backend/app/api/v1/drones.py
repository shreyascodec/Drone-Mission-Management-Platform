"""
Drone Management API Endpoints

Provides REST API for managing drones.
Uses in-memory storage (can be replaced with database later).
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/drones", tags=["Drones"])

# In-memory drone storage (replace with database later)
drones_store: dict[str, dict] = {}


# Request/Response Models
class DroneCreateRequest(BaseModel):
    """Request to create a new drone"""
    name: str
    serial_number: str
    model: str
    specs: Optional[dict] = None


class DroneResponse(BaseModel):
    """Drone response model"""
    id: str
    name: str
    serial_number: str
    model: str
    status: str
    battery_percent: float
    battery_voltage: Optional[float] = None
    position: Optional[dict] = None
    total_flights: int = 0
    flight_time_minutes: int = 0
    isConnected: bool = False
    lastSeen: str
    created_at: str
    updated_at: str
    specs: Optional[dict] = None


class DroneUpdateRequest(BaseModel):
    """Request to update a drone"""
    name: Optional[str] = None
    status: Optional[str] = None
    battery_percent: Optional[float] = None
    position: Optional[dict] = None
    isConnected: Optional[bool] = None


@router.get("", response_model=List[DroneResponse])
async def get_drones(status: Optional[str] = None):
    """Get all drones, optionally filtered by status"""
    drones = list(drones_store.values())
    
    if status:
        drones = [d for d in drones if d.get("status") == status]
    
    return drones


@router.get("/{drone_id}", response_model=DroneResponse)
async def get_drone(drone_id: str):
    """Get a specific drone by ID"""
    drone = drones_store.get(drone_id)
    
    if not drone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone {drone_id} not found"
        )
    
    return drone


@router.post("", response_model=DroneResponse, status_code=status.HTTP_201_CREATED)
async def create_drone(request: DroneCreateRequest):
    """Create a new drone"""
    drone_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    drone = {
        "id": drone_id,
        "name": request.name,
        "serial_number": request.serial_number,
        "model": request.model,
        "status": "idle",
        "battery_percent": 100.0,
        "battery_voltage": None,
        "position": None,
        "total_flights": 0,
        "flight_time_minutes": 0,
        "isConnected": False,
        "lastSeen": now,
        "created_at": now,
        "updated_at": now,
        "specs": request.specs or {},
    }
    
    drones_store[drone_id] = drone
    
    return drone


@router.put("/{drone_id}", response_model=DroneResponse)
async def update_drone(drone_id: str, request: DroneUpdateRequest):
    """Update a drone"""
    drone = drones_store.get(drone_id)
    
    if not drone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone {drone_id} not found"
        )
    
    # Update fields
    if request.name is not None:
        drone["name"] = request.name
    if request.status is not None:
        drone["status"] = request.status
    if request.battery_percent is not None:
        drone["battery_percent"] = request.battery_percent
    if request.position is not None:
        drone["position"] = request.position
    if request.isConnected is not None:
        drone["isConnected"] = request.isConnected
    
    drone["lastSeen"] = datetime.now(timezone.utc).isoformat()
    drone["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    return drone


@router.delete("/{drone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_drone(drone_id: str):
    """Delete a drone"""
    if drone_id not in drones_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drone {drone_id} not found"
        )
    
    del drones_store[drone_id]
    return None
