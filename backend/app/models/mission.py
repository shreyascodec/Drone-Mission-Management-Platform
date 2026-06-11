"""
Mission data models with validation
"""

from pydantic import BaseModel, Field, field_validator, model_validator, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from .enums import MissionStatus, MissionType, WaypointType, WaypointAction, WaypointStatus


class WaypointBase(BaseModel):
    """
    Base waypoint model
    """
    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Longitude in degrees",
        examples=[-122.4194]
    )
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Latitude in degrees",
        examples=[37.7749]
    )
    altitude: float = Field(
        ...,
        ge=0,
        le=6000,
        description="Altitude in meters above ground",
        examples=[100.0]
    )
    
    @field_validator('altitude')
    @classmethod
    def validate_altitude(cls, v: float) -> float:
        """Validate altitude is within safe range"""
        if v > 6000:
            raise ValueError("Altitude cannot exceed 6000 meters")
        if v < 0:
            raise ValueError("Altitude cannot be negative")
        return v


class WaypointCreate(WaypointBase):
    """
    Model for creating a waypoint
    """
    waypoint_type: WaypointType = Field(
        default=WaypointType.TRANSIT,
        description="Type of waypoint"
    )
    action: Optional[WaypointAction] = Field(
        None,
        description="Action to perform at waypoint"
    )
    action_parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters for the action",
        examples=[{"hover_duration": 10, "photos": 3}]
    )
    dwell_time: int = Field(
        default=0,
        ge=0,
        le=600,
        description="Time to spend at waypoint in seconds"
    )
    approach_speed: Optional[float] = Field(
        None,
        gt=0,
        le=30,
        description="Approach speed in m/s"
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Additional notes"
    )
    
    @field_validator('action_parameters')
    @classmethod
    def validate_action_parameters(cls, v: Dict[str, Any], info) -> Dict[str, Any]:
        """Validate action parameters based on action type"""
        if not v:
            return {}
        
        # Add validation logic based on action type
        # For example, if action is CAPTURE_PHOTO, ensure valid parameters
        return v


class WaypointResponse(WaypointBase):
    """
    Waypoint response model
    """
    id: str
    mission_id: str
    sequence_order: int = Field(..., ge=0, description="Order in mission path")
    waypoint_type: WaypointType
    action: Optional[WaypointAction] = None
    action_parameters: Dict[str, Any] = Field(default_factory=dict)
    dwell_time: int = Field(default=0, ge=0)
    
    # Status tracking
    status: WaypointStatus = Field(default=WaypointStatus.PENDING)
    completed: bool = Field(default=False)
    estimated_arrival_time: Optional[datetime] = None
    actual_arrival_time: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Speed control
    approach_speed: Optional[float] = None
    departure_speed: Optional[float] = None
    
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    @computed_field
    @property
    def is_completed(self) -> bool:
        """Check if waypoint is completed"""
        return self.status == WaypointStatus.REACHED and self.completed
    
    class Config:
        from_attributes = True


class MissionBase(BaseModel):
    """
    Base mission model
    """
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Mission name",
        examples=["Downtown Survey"]
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Mission description"
    )
    mission_type: MissionType = Field(
        ...,
        description="Type of mission",
        examples=[MissionType.SURVEY]
    )
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Ensure name is properly formatted"""
        v = v.strip()
        if not v:
            raise ValueError("Mission name cannot be empty")
        return v


class MissionCreate(MissionBase):
    """
    Model for creating a new mission
    """
    drone_id: str = Field(..., description="Drone ID for this mission")
    waypoints: List[WaypointCreate] = Field(
        ...,
        min_length=2,
        description="List of waypoints (minimum 2)"
    )
    
    # Mission parameters
    min_altitude: Optional[float] = Field(
        None,
        ge=0,
        le=6000,
        description="Minimum altitude in meters"
    )
    max_altitude: Optional[float] = Field(
        None,
        ge=0,
        le=6000,
        description="Maximum altitude in meters"
    )
    cruise_speed: Optional[float] = Field(
        None,
        gt=0,
        le=30,
        description="Cruise speed in m/s"
    )
    
    # Scheduling
    scheduled_start_time: Optional[datetime] = Field(
        None,
        description="When to start the mission"
    )
    
    # Priority
    priority: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Mission priority (1=highest, 5=lowest)"
    )
    
    # Additional data
    notes: Optional[str] = Field(
        None,
        max_length=2000,
        description="Mission notes"
    )
    
    @field_validator('waypoints')
    @classmethod
    def validate_waypoints(cls, v: List[WaypointCreate]) -> List[WaypointCreate]:
        """Validate waypoint list"""
        if len(v) < 2:
            raise ValueError("Mission must have at least 2 waypoints")
        
        # Check for takeoff waypoint
        has_takeoff = any(wp.waypoint_type == WaypointType.TAKEOFF for wp in v)
        if not has_takeoff and v[0].waypoint_type != WaypointType.TAKEOFF:
            # First waypoint should be takeoff
            v[0].waypoint_type = WaypointType.TAKEOFF
        
        # Check for landing waypoint
        has_landing = any(wp.waypoint_type == WaypointType.LANDING for wp in v)
        if not has_landing and v[-1].waypoint_type != WaypointType.LANDING:
            # Last waypoint should be landing
            v[-1].waypoint_type = WaypointType.LANDING
        
        return v
    
    @model_validator(mode='after')
    def validate_altitude_range(self):
        """Validate altitude constraints"""
        if self.min_altitude is not None and self.max_altitude is not None:
            if self.max_altitude < self.min_altitude:
                raise ValueError("max_altitude must be greater than min_altitude")
        
        # Validate waypoint altitudes are within bounds
        if self.min_altitude is not None or self.max_altitude is not None:
            for wp in self.waypoints:
                if self.min_altitude and wp.altitude < self.min_altitude:
                    raise ValueError(
                        f"Waypoint altitude {wp.altitude}m is below minimum {self.min_altitude}m"
                    )
                if self.max_altitude and wp.altitude > self.max_altitude:
                    raise ValueError(
                        f"Waypoint altitude {wp.altitude}m exceeds maximum {self.max_altitude}m"
                    )
        
        return self
    
    @model_validator(mode='after')
    def validate_scheduled_time(self):
        """Validate scheduled start time is in future"""
        if self.scheduled_start_time:
            scheduled = self.scheduled_start_time
            if scheduled.tzinfo is None:  # treat naive client datetimes as UTC
                scheduled = scheduled.replace(tzinfo=timezone.utc)
            if scheduled < datetime.now(timezone.utc):
                raise ValueError("Scheduled start time cannot be in the past")

        return self


class MissionUpdate(BaseModel):
    """
    Model for updating mission (partial update)
    """
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[MissionStatus] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    scheduled_start_time: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=2000)


class MissionResponse(MissionBase):
    """
    Mission response model
    """
    id: str
    drone_id: str
    status: MissionStatus
    
    # Progress tracking
    progress: float = Field(default=0.0, ge=0, le=100, description="Progress percentage")
    current_waypoint_index: int = Field(default=0, ge=0)
    waypoints_completed: int = Field(default=0, ge=0)
    waypoints_total: int = Field(default=0, ge=0)
    
    # Timing
    scheduled_start_time: Optional[datetime] = None
    scheduled_end_time: Optional[datetime] = None
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    estimated_duration: Optional[int] = None  # seconds
    actual_duration: Optional[int] = None  # seconds
    
    # Mission parameters
    min_altitude: Optional[float] = None
    max_altitude: Optional[float] = None
    cruise_speed: Optional[float] = None
    
    # Geospatial data
    total_distance: Optional[float] = None  # meters
    area_covered: Optional[float] = None  # square meters
    
    # Priority
    priority: int = Field(default=3, ge=1, le=5)
    
    # Weather conditions
    weather_conditions: Dict[str, Any] = Field(default_factory=dict)
    
    # Data collection
    data_collected: Dict[str, Any] = Field(default_factory=dict)
    images_captured: int = Field(default=0, ge=0)
    video_duration: int = Field(default=0, ge=0)  # seconds
    
    # Notes and metadata
    notes: Optional[str] = None
    failure_reason: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    
    @computed_field
    @property
    def is_active(self) -> bool:
        """Check if mission is currently active"""
        return self.status == MissionStatus.ACTIVE
    
    @computed_field
    @property
    def is_completed(self) -> bool:
        """Check if mission is completed"""
        return self.status == MissionStatus.COMPLETED
    
    @computed_field
    @property
    def can_start(self) -> bool:
        """Check if mission can be started"""
        return self.status in [MissionStatus.PLANNING, MissionStatus.SCHEDULED, MissionStatus.PAUSED]
    
    @computed_field
    @property
    def elapsed_time(self) -> Optional[int]:
        """Calculate elapsed time in seconds"""
        if not self.actual_start_time:
            return None

        start_time = self.actual_start_time
        if start_time.tzinfo is None:  # treat naive datetimes as UTC
            start_time = start_time.replace(tzinfo=timezone.utc)
        end_time = self.actual_end_time or datetime.now(timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        return int((end_time - start_time).total_seconds())
    
    @computed_field
    @property
    def estimated_completion_time(self) -> Optional[datetime]:
        """Estimate completion time based on progress"""
        if not self.actual_start_time or self.progress == 0:
            return None
        
        if self.progress >= 100:
            return self.actual_end_time
        
        elapsed = self.elapsed_time or 0
        estimated_total = elapsed / (self.progress / 100)
        return self.actual_start_time + timedelta(seconds=estimated_total)
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "660e8400-e29b-41d4-a716-446655440001",
                "name": "Downtown Survey",
                "description": "Aerial survey of downtown area",
                "mission_type": "survey",
                "drone_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "active",
                "progress": 45.5,
                "current_waypoint_index": 3,
                "waypoints_completed": 3,
                "waypoints_total": 8,
                "priority": 2,
                "scheduled_start_time": "2024-01-20T09:00:00Z",
                "actual_start_time": "2024-01-20T09:05:00Z",
                "created_at": "2024-01-19T14:30:00Z",
                "updated_at": "2024-01-20T09:15:00Z"
            }
        }


class MissionProgress(BaseModel):
    """
    Detailed mission progress information
    """
    mission_id: str
    status: MissionStatus
    progress: float = Field(..., ge=0, le=100)
    current_waypoint_index: int = Field(..., ge=0)
    waypoints_completed: int = Field(..., ge=0)
    waypoints_total: int = Field(..., ge=0)
    
    # Timing
    elapsed_time: Optional[int] = None  # seconds
    estimated_completion_time: Optional[datetime] = None
    estimated_time_remaining: Optional[int] = None  # seconds
    
    # Drone status
    drone_battery: Optional[float] = Field(None, ge=0, le=100)
    drone_position: Optional[Dict[str, float]] = None
    
    # Statistics
    distance_traveled: Optional[float] = None  # meters
    average_speed: Optional[float] = None  # m/s
    
    @computed_field
    @property
    def waypoints_remaining(self) -> int:
        """Calculate remaining waypoints"""
        return self.waypoints_total - self.waypoints_completed


class MissionStatusUpdate(BaseModel):
    """
    Model for updating mission status
    """
    status: MissionStatus = Field(..., description="New status")
    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Reason for status change"
    )
    
    @model_validator(mode='after')
    def validate_status_transition(self):
        """Validate status transitions (can be expanded)"""
        # Add logic to validate allowed status transitions
        # For example, can't go from COMPLETED to ACTIVE
        return self


class MissionListQuery(BaseModel):
    """
    Query parameters for listing missions
    """
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=1000)
    status: Optional[MissionStatus] = None
    mission_type: Optional[MissionType] = None
    drone_id: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    search: Optional[str] = Field(None, max_length=100)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    @computed_field
    @property
    def offset(self) -> int:
        """Alias for skip"""
        return self.skip


class MissionWithWaypoints(MissionResponse):
    """
    Mission response with waypoints included
    """
    waypoints: List[WaypointResponse] = Field(default_factory=list)
    
    @computed_field
    @property
    def total_distance_calculated(self) -> float:
        """Calculate total distance from waypoints"""
        if len(self.waypoints) < 2:
            return 0.0
        
        total = 0.0
        for i in range(len(self.waypoints) - 1):
            wp1 = self.waypoints[i]
            wp2 = self.waypoints[i + 1]
            
            # Simple Haversine distance (simplified)
            import math
            R = 6371000  # Earth radius in meters
            
            lat1 = math.radians(wp1.latitude)
            lat2 = math.radians(wp2.latitude)
            dlat = math.radians(wp2.latitude - wp1.latitude)
            dlon = math.radians(wp2.longitude - wp1.longitude)
            
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            distance = R * c
            
            total += distance
        
        return round(total, 2)
