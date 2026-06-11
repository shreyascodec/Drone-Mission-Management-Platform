"""
Mission Simulation Package

Provides real-time drone mission simulation with:
- Physics-based movement
- Realistic battery modeling
- Progress tracking
- Event emission
"""

from .mission_simulator import (
    MissionSimulator,
    SimulationEvent,
    Position,
    Waypoint,
    SimulationState,
    BatteryModel,
    PhysicsEngine
)

__all__ = [
    "MissionSimulator",
    "SimulationEvent",
    "Position",
    "Waypoint",
    "SimulationState",
    "BatteryModel",
    "PhysicsEngine"
]
