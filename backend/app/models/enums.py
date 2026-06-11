"""
Enums for the Drone Mission Control system
"""

from enum import Enum


class DroneStatus(str, Enum):
    """
    Drone operational status
    """
    AVAILABLE = "available"      # Ready for assignment
    IN_USE = "in_use"           # Currently on a mission
    MAINTENANCE = "maintenance"  # Under maintenance
    CHARGING = "charging"       # Battery charging
    RETIRED = "retired"         # No longer in service
    ERROR = "error"             # Error state


class MissionStatus(str, Enum):
    """
    Mission lifecycle status
    """
    PLANNING = "planning"       # Being planned
    SCHEDULED = "scheduled"     # Scheduled for future
    ACTIVE = "active"          # Currently executing
    PAUSED = "paused"          # Temporarily paused
    COMPLETED = "completed"    # Successfully completed
    ABORTED = "aborted"        # Manually aborted
    FAILED = "failed"          # Failed with error


class MissionType(str, Enum):
    """
    Types of missions
    """
    SURVEY = "survey"           # Area survey
    INSPECTION = "inspection"   # Infrastructure inspection
    MAPPING = "mapping"        # Aerial mapping
    DELIVERY = "delivery"      # Package delivery
    SURVEILLANCE = "surveillance"  # Security surveillance
    OTHER = "other"            # Custom mission type


class WaypointType(str, Enum):
    """
    Types of waypoints
    """
    TAKEOFF = "takeoff"        # Takeoff point
    TRANSIT = "transit"        # Simple waypoint
    SURVEY = "survey"          # Survey point
    PHOTO = "photo"            # Photo capture point
    VIDEO = "video"            # Video recording point
    HOVER = "hover"            # Hover in place
    INSPECTION = "inspection"  # Inspection point
    LANDING = "landing"        # Landing point


class WaypointAction(str, Enum):
    """
    Actions to perform at waypoints
    """
    NONE = "none"              # No action
    CAPTURE_PHOTO = "capture_photo"
    START_VIDEO = "start_video"
    STOP_VIDEO = "stop_video"
    HOVER = "hover"
    SCAN = "scan"
    MEASURE = "measure"


class WaypointStatus(str, Enum):
    """
    Waypoint completion status
    """
    PENDING = "pending"        # Not yet reached
    REACHED = "reached"        # Successfully reached
    SKIPPED = "skipped"        # Skipped
    FAILED = "failed"          # Failed to reach
