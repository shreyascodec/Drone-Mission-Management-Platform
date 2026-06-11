"""
Mission Repository
Data access layer for missions
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

# In-memory storage (replace with database later)
_missions_store: Dict[str, Dict[str, Any]] = {}


class MissionRepository:
    """Repository for mission data access"""
    
    def __init__(self):
        self.store = _missions_store
    
    async def create(self, mission_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new mission"""
        mission_id = mission_data["id"]
        self.store[mission_id] = mission_data
        return mission_data
    
    async def get_by_id(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Get a mission by ID"""
        return self.store.get(mission_id)
    
    async def list(
        self,
        status: Optional[str] = None,
        mission_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List missions with optional filters"""
        missions = list(self.store.values())
        
        if status:
            missions = [m for m in missions if m.get("status") == status]
        if mission_type:
            missions = [m for m in missions if m.get("type") == mission_type]
        
        return missions
    
    async def update(
        self,
        mission_id: str,
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a mission"""
        if mission_id not in self.store:
            raise ValueError(f"Mission {mission_id} not found")
        
        mission = self.store[mission_id]
        mission.update(update_data)
        mission["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        return mission
    
    async def delete(self, mission_id: str) -> None:
        """Delete a mission"""
        if mission_id not in self.store:
            raise ValueError(f"Mission {mission_id} not found")
        
        del self.store[mission_id]


# Singleton instance
_mission_repository: Optional[MissionRepository] = None


def get_mission_repository() -> MissionRepository:
    """Get singleton mission repository instance"""
    global _mission_repository
    if _mission_repository is None:
        _mission_repository = MissionRepository()
    return _mission_repository
