"""
Mission Simulation Engine

Simulates drone flight through waypoints with:
- Physics-based movement
- Realistic battery drain
- Distance tracking
- Progress calculation
- Event emission

Mathematical models:
- Linear interpolation for position updates
- Haversine formula for distance calculations
- Battery drain based on speed, altitude, and maneuvers
- Progress as percentage of waypoints completed
"""

import asyncio
import math
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Callable, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class SimulationEvent(str, Enum):
    """Events emitted during simulation"""
    MISSION_STARTED = "mission_started"
    MISSION_PAUSED = "mission_paused"
    MISSION_RESUMED = "mission_resumed"
    MISSION_COMPLETED = "mission_completed"
    MISSION_ABORTED = "mission_aborted"
    WAYPOINT_REACHED = "waypoint_reached"
    BATTERY_LOW = "battery_low"
    BATTERY_CRITICAL = "battery_critical"
    POSITION_UPDATE = "position_update"
    PROGRESS_UPDATE = "progress_update"
    ERROR = "error"


@dataclass
class Position:
    """3D position with velocity and heading"""
    longitude: float
    latitude: float
    altitude: float  # meters above ground
    
    # Motion state
    speed: float = 0.0  # m/s
    heading: float = 0.0  # degrees (0-360)
    vertical_speed: float = 0.0  # m/s (positive = ascending)
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            "longitude": self.longitude,
            "latitude": self.latitude,
            "altitude": self.altitude,
            "speed": self.speed,
            "heading": self.heading,
            "vertical_speed": self.vertical_speed
        }


@dataclass
class Waypoint:
    """Mission waypoint"""
    longitude: float
    latitude: float
    altitude: float
    sequence: int
    action: Optional[str] = None
    dwell_time: float = 0.0  # seconds to hover


@dataclass
class SimulationState:
    """Complete simulation state"""
    mission_id: str
    status: str  # "idle", "active", "paused", "completed", "aborted"
    
    # Position and motion
    position: Position
    target_waypoint_index: int = 0
    
    # Progress tracking
    waypoints_completed: int = 0
    total_waypoints: int = 0
    progress_percent: float = 0.0
    
    # Distance tracking
    total_distance_traveled: float = 0.0  # meters
    distance_to_next_waypoint: float = 0.0  # meters
    
    # Battery state
    battery_percent: float = 100.0
    battery_voltage: float = 12.6  # volts (full charge)
    estimated_remaining_time: float = 0.0  # seconds
    
    # Timing
    start_time: Optional[datetime] = None
    elapsed_time: float = 0.0  # seconds
    estimated_completion_time: Optional[datetime] = None
    
    # Statistics
    average_speed: float = 0.0  # m/s
    max_speed_reached: float = 0.0  # m/s
    max_altitude_reached: float = 0.0  # meters


class BatteryModel:
    """
    Realistic battery drain model
    
    Battery consumption factors:
    1. Base consumption (hovering)
    2. Speed-based consumption (proportional to speed²)
    3. Altitude change (climbing costs more)
    4. Temperature effects
    5. Battery age/health
    
    Mathematical model:
    drain_rate = base_rate + speed_factor × v² + altitude_factor × Δh
    
    Where:
    - base_rate: Power for hovering (typically 20-30% of max)
    - speed_factor: Drag increases with square of velocity
    - altitude_factor: Potential energy gain
    """
    
    def __init__(
        self,
        capacity_mah: int = 5000,
        voltage: float = 12.6,
        base_drain_rate: float = 0.015,  # %/second at hover
        speed_factor: float = 0.0008,     # Additional drain per (m/s)²
        climb_factor: float = 0.003,      # Additional drain per m/s climb
        temperature: float = 20.0         # Celsius
    ):
        """
        Initialize battery model
        
        Args:
            capacity_mah: Battery capacity in mAh
            voltage: Nominal voltage
            base_drain_rate: Base drain rate (%/second) at hover
            speed_factor: Additional drain coefficient for speed
            climb_factor: Additional drain coefficient for climbing
            temperature: Ambient temperature (affects efficiency)
        """
        self.capacity_mah = capacity_mah
        self.nominal_voltage = voltage
        self.base_drain_rate = base_drain_rate
        self.speed_factor = speed_factor
        self.climb_factor = climb_factor
        self.temperature = temperature
        
        # Temperature efficiency factor
        # Batteries perform worse in cold/hot weather
        self.temp_factor = self._calculate_temperature_factor()
    
    def _calculate_temperature_factor(self) -> float:
        """
        Calculate efficiency factor based on temperature
        
        Optimal temperature: 20-25°C
        Cold (<0°C): Reduced capacity (up to 20% loss)
        Hot (>40°C): Accelerated degradation
        
        Returns:
            Factor between 0.8 (cold) and 1.0 (optimal)
        """
        if 20 <= self.temperature <= 25:
            return 1.0
        elif self.temperature < 0:
            # Linear decrease below 0°C
            return max(0.8, 1.0 + self.temperature / 100)
        elif self.temperature > 40:
            # Decrease above 40°C
            return max(0.85, 1.0 - (self.temperature - 40) / 200)
        else:
            # Mild effect between 0-20 and 25-40
            return 0.95
    
    def calculate_drain(
        self,
        speed: float,
        vertical_speed: float,
        delta_time: float
    ) -> float:
        """
        Calculate battery drain for a time step
        
        Formula breakdown:
        
        1. Base consumption (hovering):
           P_base = base_rate × Δt
        
        2. Speed consumption (drag ∝ v²):
           P_speed = speed_factor × v² × Δt
        
        3. Climbing consumption (potential energy):
           P_climb = climb_factor × |v_vertical| × Δt (only if climbing)
        
        4. Temperature adjustment:
           P_total = (P_base + P_speed + P_climb) × temp_factor
        
        Args:
            speed: Horizontal speed (m/s)
            vertical_speed: Vertical speed (m/s, positive = climbing)
            delta_time: Time step (seconds)
        
        Returns:
            Battery drain percentage for this time step
        """
        # Base consumption
        base_drain = self.base_drain_rate * delta_time
        
        # Speed-based consumption (drag increases with v²)
        # More realistic than linear relationship
        speed_drain = self.speed_factor * (speed ** 2) * delta_time
        
        # Climbing consumption (only when ascending)
        # Descending uses little to no extra power
        climb_drain = 0.0
        if vertical_speed > 0:
            climb_drain = self.climb_factor * vertical_speed * delta_time
        
        # Total drain with temperature adjustment
        total_drain = (base_drain + speed_drain + climb_drain) * self.temp_factor
        
        return total_drain
    
    def calculate_voltage(self, battery_percent: float) -> float:
        """
        Calculate battery voltage based on charge level
        
        Typical LiPo discharge curve:
        - 100%: 4.2V per cell (12.6V for 3S)
        - 80%:  4.0V per cell (12.0V)
        - 50%:  3.8V per cell (11.4V)
        - 20%:  3.6V per cell (10.8V)
        - 0%:   3.0V per cell (9.0V, cutoff)
        
        Args:
            battery_percent: Current battery level (0-100)
        
        Returns:
            Voltage in volts
        """
        # Non-linear discharge curve (more realistic than linear)
        if battery_percent > 80:
            # Slow drop from 100% to 80%
            voltage = 12.6 - (100 - battery_percent) * 0.03
        elif battery_percent > 20:
            # Linear drop from 80% to 20%
            voltage = 12.0 - (80 - battery_percent) * 0.02
        else:
            # Faster drop below 20%
            voltage = 10.8 - (20 - battery_percent) * 0.09
        
        return max(9.0, voltage)  # Never below cutoff


class PhysicsEngine:
    """
    Physics calculations for drone movement
    
    Handles:
    - Position interpolation between waypoints
    - Distance calculations (Haversine formula)
    - Bearing/heading calculations
    - Speed and acceleration
    """
    
    EARTH_RADIUS = 6371000  # meters
    
    @staticmethod
    def calculate_distance(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate great-circle distance using Haversine formula
        
        Formula:
        a = sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)
        c = 2 × atan2(√a, √(1-a))
        d = R × c
        
        Args:
            lat1, lon1: Start point (degrees)
            lat2, lon2: End point (degrees)
        
        Returns:
            Distance in meters
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = PhysicsEngine.EARTH_RADIUS * c
        
        return distance
    
    @staticmethod
    def calculate_bearing(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate bearing from point 1 to point 2
        
        Formula:
        θ = atan2(sin(Δλ) × cos(φ₂),
                  cos(φ₁) × sin(φ₂) - sin(φ₁) × cos(φ₂) × cos(Δλ))
        
        Args:
            lat1, lon1: Start point (degrees)
            lat2, lon2: End point (degrees)
        
        Returns:
            Bearing in degrees (0-360, 0=North, 90=East)
        """
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)
        
        x = math.sin(delta_lon) * math.cos(lat2_rad)
        y = (math.cos(lat1_rad) * math.sin(lat2_rad) -
             math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon))
        
        bearing = math.atan2(x, y)
        
        # Convert to degrees and normalize to 0-360
        bearing_deg = (math.degrees(bearing) + 360) % 360
        
        return bearing_deg
    
    @staticmethod
    def interpolate_position(
        start: Position,
        end_lat: float,
        end_lon: float,
        end_alt: float,
        speed: float,
        delta_time: float
    ) -> Position:
        """
        Calculate new position moving toward target
        
        Uses linear interpolation for simplicity and performance.
        For production, could use more sophisticated path following.
        
        Args:
            start: Current position
            end_lat, end_lon, end_alt: Target coordinates
            speed: Desired speed (m/s)
            delta_time: Time step (seconds)
        
        Returns:
            New position after time step
        """
        # Calculate distance to target
        distance_2d = PhysicsEngine.calculate_distance(
            start.latitude, start.longitude,
            end_lat, end_lon
        )
        
        # Calculate altitude difference
        altitude_diff = end_alt - start.altitude
        
        # Calculate 3D distance
        distance_3d = math.sqrt(distance_2d ** 2 + altitude_diff ** 2)
        
        # Calculate how far we can move in this time step
        max_distance = speed * delta_time
        
        # If we can reach the target, return target position
        if max_distance >= distance_3d:
            return Position(
                longitude=end_lon,
                latitude=end_lat,
                altitude=end_alt,
                speed=speed,
                heading=PhysicsEngine.calculate_bearing(
                    start.latitude, start.longitude,
                    end_lat, end_lon
                ),
                vertical_speed=altitude_diff / delta_time if delta_time > 0 else 0
            )
        
        # Otherwise, interpolate
        # Calculate fraction of distance to travel
        fraction = max_distance / distance_3d if distance_3d > 0 else 0
        
        # Interpolate 2D position
        # For small distances, simple linear interpolation is accurate enough
        new_lat = start.latitude + (end_lat - start.latitude) * fraction
        new_lon = start.longitude + (end_lon - start.longitude) * fraction
        
        # Interpolate altitude
        new_alt = start.altitude + altitude_diff * fraction
        
        # Calculate heading
        heading = PhysicsEngine.calculate_bearing(
            start.latitude, start.longitude,
            end_lat, end_lon
        )
        
        # Calculate vertical speed
        vertical_speed = altitude_diff / (distance_3d / speed) if distance_3d > 0 else 0
        
        return Position(
            longitude=new_lon,
            latitude=new_lat,
            altitude=new_alt,
            speed=speed,
            heading=heading,
            vertical_speed=vertical_speed
        )


class MissionSimulator:
    """
    Main mission simulation engine
    
    Orchestrates:
    - Physics calculations
    - Battery simulation
    - Progress tracking
    - Event emission
    - State management
    """
    
    def __init__(
        self,
        mission_id: str,
        waypoints: List[Dict],
        drone_config: Optional[Dict] = None,
        update_rate: int = 60  # Updates per second
    ):
        """
        Initialize mission simulator
        
        Args:
            mission_id: Unique mission identifier
            waypoints: List of waypoint dictionaries
            drone_config: Drone configuration (speed, battery, etc.)
            update_rate: Simulation update frequency (Hz)
        """
        self.mission_id = mission_id
        self.update_rate = update_rate
        self.update_interval = 1.0 / update_rate
        
        # Parse waypoints
        self.waypoints = [
            Waypoint(
                longitude=wp.get("longitude", wp.get("lng", 0)),
                latitude=wp.get("latitude", wp.get("lat", 0)),
                altitude=wp.get("altitude", wp.get("alt", 0)),
                sequence=wp.get("sequence", i),
                action=wp.get("action"),
                dwell_time=wp.get("dwell_time", 0)
            )
            for i, wp in enumerate(waypoints)
        ]
        
        if not self.waypoints:
            raise ValueError("Mission must have at least one waypoint")
        
        # Drone configuration
        config = drone_config or {}
        self.cruise_speed = config.get("cruise_speed", 15.0)  # m/s
        self.max_speed = config.get("max_speed", 21.0)  # m/s
        
        # Initialize components
        self.battery = BatteryModel(
            capacity_mah=config.get("battery_capacity", 5000),
            voltage=config.get("battery_voltage", 12.6)
        )
        
        self.physics = PhysicsEngine()
        
        # Initialize state
        first_wp = self.waypoints[0]
        self.state = SimulationState(
            mission_id=mission_id,
            status="idle",
            position=Position(
                longitude=first_wp.longitude,
                latitude=first_wp.latitude,
                altitude=first_wp.altitude
            ),
            target_waypoint_index=0,
            total_waypoints=len(self.waypoints)
        )
        
        # Event callbacks
        self.event_callbacks: List[Callable] = []
        
        # Simulation control
        self.running = False
        self.paused = False
        self._simulation_task: Optional[asyncio.Task] = None
        
        # Performance tracking
        self._last_update_time = 0.0
        self._update_count = 0
    
    def on_event(self, callback: Callable[[SimulationEvent, Dict[str, Any]], None]):
        """
        Register event callback
        
        Args:
            callback: Function to call on events
                     Signature: callback(event_type, event_data)
        """
        self.event_callbacks.append(callback)
    
    def _emit_event(self, event_type: SimulationEvent, data: Optional[Dict] = None):
        """
        Emit event to all registered callbacks
        
        Args:
            event_type: Type of event
            data: Event data (optional)
        """
        event_data = {
            "mission_id": self.mission_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type.value,
            **(data or {})
        }
        
        for callback in self.event_callbacks:
            try:
                callback(event_type, event_data)
            except Exception as e:
                logger.error(f"Error in event callback: {e}")
    
    async def start(self):
        """Start mission simulation"""
        if self.running:
            logger.warning("Simulation already running")
            return
        
        self.running = True
        self.paused = False
        self.state.status = "active"
        self.state.start_time = datetime.now(timezone.utc)
        self._last_update_time = time.time()
        
        logger.info(f"Starting mission simulation: {self.mission_id}")
        
        self._emit_event(SimulationEvent.MISSION_STARTED, {
            "total_waypoints": len(self.waypoints),
            "start_position": self.state.position.to_dict()
        })
        
        # Start simulation loop
        self._simulation_task = asyncio.create_task(self._simulation_loop())
    
    async def pause(self):
        """Pause mission simulation"""
        if not self.running or self.paused:
            return
        
        self.paused = True
        self.state.status = "paused"
        
        logger.info(f"Pausing mission: {self.mission_id}")
        
        self._emit_event(SimulationEvent.MISSION_PAUSED, {
            "progress": self.state.progress_percent,
            "waypoint": self.state.target_waypoint_index
        })
    
    async def resume(self):
        """Resume paused mission"""
        if not self.running or not self.paused:
            return
        
        self.paused = False
        self.state.status = "active"
        self._last_update_time = time.time()
        
        logger.info(f"Resuming mission: {self.mission_id}")
        
        self._emit_event(SimulationEvent.MISSION_RESUMED, {
            "progress": self.state.progress_percent
        })
    
    async def stop(self, reason: str = "aborted"):
        """Stop mission simulation"""
        if not self.running:
            return
        
        self.running = False
        self.state.status = reason
        
        logger.info(f"Stopping mission {self.mission_id}: {reason}")
        
        if self._simulation_task:
            self._simulation_task.cancel()
            try:
                await self._simulation_task
            except asyncio.CancelledError:
                pass
        
        event_type = (SimulationEvent.MISSION_COMPLETED 
                     if reason == "completed" 
                     else SimulationEvent.MISSION_ABORTED)
        
        self._emit_event(event_type, {
            "reason": reason,
            "final_progress": self.state.progress_percent,
            "waypoints_completed": self.state.waypoints_completed,
            "total_distance": self.state.total_distance_traveled,
            "elapsed_time": self.state.elapsed_time
        })
    
    async def _simulation_loop(self):
        """
        Main simulation loop
        
        Runs at specified update_rate (default 60 Hz)
        Updates position, battery, progress each iteration
        """
        logger.info(f"Simulation loop started at {self.update_rate} Hz")
        
        try:
            while self.running:
                # Wait if paused
                if self.paused:
                    await asyncio.sleep(0.1)
                    continue
                
                # Calculate delta time
                current_time = time.time()
                delta_time = current_time - self._last_update_time
                self._last_update_time = current_time
                
                # Update simulation
                await self._update(delta_time)
                
                # Maintain update rate
                await asyncio.sleep(self.update_interval)
                
                self._update_count += 1
        
        except asyncio.CancelledError:
            logger.info("Simulation loop cancelled")
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
            self._emit_event(SimulationEvent.ERROR, {
                "error": str(e)
            })
    
    async def _update(self, delta_time: float):
        """
        Update simulation state for one time step
        
        Args:
            delta_time: Time since last update (seconds)
        """
        # Check if mission complete
        if self.state.target_waypoint_index >= len(self.waypoints):
            await self.stop("completed")
            return
        
        # Get target waypoint
        target_wp = self.waypoints[self.state.target_waypoint_index]
        
        # Calculate distance to target
        distance_to_target = self.physics.calculate_distance(
            self.state.position.latitude,
            self.state.position.longitude,
            target_wp.latitude,
            target_wp.longitude
        )
        
        self.state.distance_to_next_waypoint = distance_to_target
        
        # Check if waypoint reached (within 2 meters)
        if distance_to_target < 2.0:
            await self._handle_waypoint_reached(target_wp)
            return
        
        # Update position
        old_position = self.state.position
        
        self.state.position = self.physics.interpolate_position(
            start=self.state.position,
            end_lat=target_wp.latitude,
            end_lon=target_wp.longitude,
            end_alt=target_wp.altitude,
            speed=self.cruise_speed,
            delta_time=delta_time
        )
        
        # Calculate distance traveled this step
        distance_moved = self.physics.calculate_distance(
            old_position.latitude,
            old_position.longitude,
            self.state.position.latitude,
            self.state.position.longitude
        )
        
        self.state.total_distance_traveled += distance_moved
        
        # Update battery
        battery_drain = self.battery.calculate_drain(
            speed=self.state.position.speed,
            vertical_speed=self.state.position.vertical_speed,
            delta_time=delta_time
        )
        
        self.state.battery_percent = max(0, self.state.battery_percent - battery_drain)
        self.state.battery_voltage = self.battery.calculate_voltage(
            self.state.battery_percent
        )
        
        # Check battery levels
        await self._check_battery_levels()
        
        # Update statistics
        self.state.elapsed_time += delta_time
        self.state.average_speed = (
            self.state.total_distance_traveled / self.state.elapsed_time
            if self.state.elapsed_time > 0 else 0
        )
        self.state.max_speed_reached = max(
            self.state.max_speed_reached,
            self.state.position.speed
        )
        self.state.max_altitude_reached = max(
            self.state.max_altitude_reached,
            self.state.position.altitude
        )
        
        # Emit position update (throttled to 10 Hz)
        if self._update_count % 6 == 0:  # 60 Hz / 6 = 10 Hz
            self._emit_event(SimulationEvent.POSITION_UPDATE, {
                "position": self.state.position.to_dict(),
                "battery": self.state.battery_percent,
                "distance_traveled": self.state.total_distance_traveled
            })
    
    async def _handle_waypoint_reached(self, waypoint: Waypoint):
        """
        Handle waypoint reached event
        
        Args:
            waypoint: The waypoint that was reached
        """
        logger.info(f"Waypoint {waypoint.sequence} reached")
        
        # Update state
        self.state.waypoints_completed += 1
        self.state.progress_percent = (
            100.0 * self.state.waypoints_completed / self.state.total_waypoints
        )
        
        # Emit waypoint reached event
        self._emit_event(SimulationEvent.WAYPOINT_REACHED, {
            "waypoint": {
                "sequence": waypoint.sequence,
                "longitude": waypoint.longitude,
                "latitude": waypoint.latitude,
                "altitude": waypoint.altitude,
                "action": waypoint.action
            },
            "progress": self.state.progress_percent,
            "waypoints_completed": self.state.waypoints_completed
        })
        
        # Emit progress update
        self._emit_event(SimulationEvent.PROGRESS_UPDATE, {
            "progress": self.state.progress_percent,
            "waypoints_completed": self.state.waypoints_completed,
            "total_waypoints": self.state.total_waypoints
        })
        
        # Handle dwell time (hover at waypoint)
        if waypoint.dwell_time > 0:
            logger.info(f"Dwelling at waypoint for {waypoint.dwell_time}s")
            await asyncio.sleep(waypoint.dwell_time)
        
        # Move to next waypoint
        self.state.target_waypoint_index += 1
    
    async def _check_battery_levels(self):
        """Check and emit battery warnings"""
        if self.state.battery_percent <= 5 and not hasattr(self, '_critical_emitted'):
            self._critical_emitted = True
            self._emit_event(SimulationEvent.BATTERY_CRITICAL, {
                "battery_percent": self.state.battery_percent,
                "message": "Battery critical! Return to launch recommended."
            })
        
        elif self.state.battery_percent <= 20 and not hasattr(self, '_low_emitted'):
            self._low_emitted = True
            self._emit_event(SimulationEvent.BATTERY_LOW, {
                "battery_percent": self.state.battery_percent,
                "message": "Battery low. Consider returning to base."
            })
    
    def get_state(self) -> Dict:
        """
        Get current simulation state
        
        Returns:
            Complete state dictionary
        """
        return {
            "mission_id": self.state.mission_id,
            "status": self.state.status,
            "position": self.state.position.to_dict(),
            "target_waypoint": self.state.target_waypoint_index,
            "waypoints_completed": self.state.waypoints_completed,
            "total_waypoints": self.state.total_waypoints,
            "progress_percent": round(self.state.progress_percent, 2),
            "total_distance_traveled": round(self.state.total_distance_traveled, 2),
            "distance_to_next_waypoint": round(self.state.distance_to_next_waypoint, 2),
            "battery_percent": round(self.state.battery_percent, 2),
            "battery_voltage": round(self.state.battery_voltage, 2),
            "elapsed_time": round(self.state.elapsed_time, 2),
            "average_speed": round(self.state.average_speed, 2),
            "max_speed_reached": round(self.state.max_speed_reached, 2),
            "max_altitude_reached": round(self.state.max_altitude_reached, 2)
        }
