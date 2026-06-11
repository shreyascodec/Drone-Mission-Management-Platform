"""
Mission Service
Business logic for mission management
"""

from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.models.mission import MissionCreate, MissionUpdate, MissionResponse
from app.repositories.mission_repository import MissionRepository


class MissionService:
    """Service for mission business logic"""
    
    def __init__(self, repository: Optional[MissionRepository] = None):
        self.repository = repository or MissionRepository()
    
    async def create_mission(self, request: MissionCreate) -> MissionResponse:
        """
        Create a new mission with validation
        """
        # Business logic validation
        if len(request.waypoints) < 2:
            raise ValueError("Mission must have at least 2 waypoints")
        
        # Create mission data
        mission_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        mission_data = {
            "id": mission_id,
            "name": request.name,
            "description": request.description,
            "type": request.mission_type.value,
            "status": "draft",
            "drone_id": request.drone_id,
            "altitude": request.waypoints[0].altitude if request.waypoints else 100.0,
            "speed": request.cruise_speed or 12.0,
            "waypoints": [
                {
                    "latitude": wp.latitude,
                    "longitude": wp.longitude,
                    "altitude": wp.altitude,
                }
                for wp in request.waypoints
            ],
            "progress_percent": 0.0,
            "waypoints_completed": 0,
            "total_waypoints": len(request.waypoints),
            "total_distance": None,
            "elapsed_time": None,
            "estimated_completion": None,
            "created_at": now,
            "updated_at": now,
        }
        
        # Save via repository
        return await self.repository.create(mission_data)
    
    async def get_mission(self, mission_id: str) -> MissionResponse:
        """Get a mission by ID"""
        mission = await self.repository.get_by_id(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")
        return mission
    
    async def list_missions(
        self,
        status: Optional[str] = None,
        mission_type: Optional[str] = None
    ) -> List[MissionResponse]:
        """List missions with optional filters"""
        return await self.repository.list(status=status, mission_type=mission_type)
    
    async def update_mission(
        self,
        mission_id: str,
        request: MissionUpdate
    ) -> MissionResponse:
        """Update a mission"""
        mission = await self.repository.get_by_id(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")
        
        # Update fields
        update_data = request.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        return await self.repository.update(mission_id, update_data)
    
    async def set_status(self, mission_id: str, status: str) -> MissionResponse:
        """Set a mission's lifecycle status (used by the simulation engine)"""
        mission = await self.repository.get_by_id(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")

        return await self.repository.update(mission_id, {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    async def delete_mission(self, mission_id: str) -> None:
        """Delete a mission"""
        mission = await self.repository.get_by_id(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")
        
        await self.repository.delete(mission_id)
    
    async def get_statistics(self, mission_id: str) -> dict:
        """Get mission statistics"""
        mission = await self.repository.get_by_id(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")
        
        return {
            "mission_id": mission_id,
            "progress_percent": mission.get("progress_percent", 0.0),
            "waypoints_completed": mission.get("waypoints_completed", 0),
            "total_waypoints": mission.get("total_waypoints", 0),
            "total_distance": mission.get("total_distance", 0.0),
            "elapsed_time": mission.get("elapsed_time", 0.0),
            "status": mission.get("status", "unknown"),
        }


# Singleton instance
_mission_service: Optional[MissionService] = None


def get_mission_service() -> MissionService:
    """Get singleton mission service instance"""
    global _mission_service
    if _mission_service is None:
        _mission_service = MissionService()
    return _mission_service
