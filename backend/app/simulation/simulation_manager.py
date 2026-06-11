"""
Simulation Manager

Manages multiple concurrent mission simulations.
Handles lifecycle, broadcasting, and coordination.
"""

import asyncio
import logging
from typing import Dict, Optional, Callable, Any
from datetime import datetime

from .mission_simulator import MissionSimulator, SimulationEvent

logger = logging.getLogger(__name__)


class SimulationManager:
    """
    Central manager for all mission simulations
    
    Responsibilities:
    - Create and track multiple simulators
    - Route events to WebSocket manager
    - Provide global status
    - Handle simulator lifecycle
    """
    
    def __init__(self, broadcast_callback: Optional[Callable] = None):
        """
        Initialize simulation manager
        
        Args:
            broadcast_callback: Function to broadcast events to WebSocket clients
                               Signature: callback(topic, message)
        """
        self.simulators: Dict[str, MissionSimulator] = {}
        self.broadcast_callback = broadcast_callback
        
        logger.info("Simulation manager initialized")
    
    async def create_simulation(
        self,
        mission_id: str,
        waypoints: list,
        drone_config: Optional[dict] = None
    ) -> MissionSimulator:
        """
        Create a new mission simulation
        
        Args:
            mission_id: Unique mission identifier
            waypoints: List of waypoint dictionaries
            drone_config: Drone configuration
        
        Returns:
            Created simulator instance
        
        Raises:
            ValueError: If mission already has active simulation
        """
        if mission_id in self.simulators:
            raise ValueError(f"Simulation already exists for mission {mission_id}")
        
        logger.info(f"Creating simulation for mission {mission_id}")
        
        # Create simulator
        simulator = MissionSimulator(
            mission_id=mission_id,
            waypoints=waypoints,
            drone_config=drone_config
        )
        
        # Register event handler
        simulator.on_event(self._handle_simulation_event)
        
        # Store simulator
        self.simulators[mission_id] = simulator
        
        logger.info(f"Simulation created for mission {mission_id} "
                   f"with {len(waypoints)} waypoints")
        
        return simulator
    
    async def start_simulation(self, mission_id: str):
        """
        Start a simulation
        
        Args:
            mission_id: Mission identifier
        
        Raises:
            KeyError: If simulation doesn't exist
        """
        simulator = self.simulators.get(mission_id)
        if not simulator:
            raise KeyError(f"No simulation found for mission {mission_id}")
        
        logger.info(f"Starting simulation for mission {mission_id}")
        await simulator.start()
    
    async def pause_simulation(self, mission_id: str):
        """
        Pause a simulation
        
        Args:
            mission_id: Mission identifier
        """
        simulator = self.simulators.get(mission_id)
        if simulator:
            logger.info(f"Pausing simulation for mission {mission_id}")
            await simulator.pause()
    
    async def resume_simulation(self, mission_id: str):
        """
        Resume a paused simulation
        
        Args:
            mission_id: Mission identifier
        """
        simulator = self.simulators.get(mission_id)
        if simulator:
            logger.info(f"Resuming simulation for mission {mission_id}")
            await simulator.resume()
    
    async def stop_simulation(self, mission_id: str, reason: str = "aborted"):
        """
        Stop a simulation
        
        Args:
            mission_id: Mission identifier
            reason: Stop reason
        """
        simulator = self.simulators.get(mission_id)
        if simulator:
            logger.info(f"Stopping simulation for mission {mission_id}: {reason}")
            await simulator.stop(reason)
    
    async def remove_simulation(self, mission_id: str):
        """
        Remove a simulation (must be stopped first)
        
        Args:
            mission_id: Mission identifier
        """
        simulator = self.simulators.get(mission_id)
        if simulator:
            if simulator.running:
                await simulator.stop("removed")
            
            del self.simulators[mission_id]
            logger.info(f"Removed simulation for mission {mission_id}")
    
    def get_simulation(self, mission_id: str) -> Optional[MissionSimulator]:
        """
        Get a simulation by mission ID
        
        Args:
            mission_id: Mission identifier
        
        Returns:
            Simulator instance or None
        """
        return self.simulators.get(mission_id)
    
    def get_all_simulations(self) -> Dict[str, dict]:
        """
        Get status of all simulations
        
        Returns:
            Dictionary mapping mission_id to state
        """
        return {
            mission_id: simulator.get_state()
            for mission_id, simulator in self.simulators.items()
        }
    
    def get_active_count(self) -> int:
        """
        Get count of active simulations
        
        Returns:
            Number of running simulations
        """
        return sum(
            1 for sim in self.simulators.values()
            if sim.running and not sim.paused
        )
    
    def _handle_simulation_event(self, event_type: SimulationEvent, data: dict):
        """
        Handle events from simulators and broadcast to clients
        
        Args:
            event_type: Type of simulation event
            data: Event data
        """
        mission_id = data.get("mission_id")
        
        logger.debug(f"Simulation event for {mission_id}: {event_type.value}")
        
        # Prepare WebSocket message
        ws_message = {
            "type": "simulation_event",
            "event": event_type.value,
            "data": data
        }
        
        # Broadcast to appropriate topic
        if self.broadcast_callback:
            # Mission-specific topic
            mission_topic = f"mission.{mission_id}"
            self.broadcast_callback(mission_topic, ws_message)
            
            # Global simulation topic
            self.broadcast_callback("simulations", ws_message)
        
        # Keep the mission record in sync with flight progress
        if event_type == SimulationEvent.WAYPOINT_REACHED:
            asyncio.create_task(self._sync_mission_progress(
                mission_id,
                progress=data.get("progress", 0.0),
                waypoints_completed=data.get("waypoints_completed", 0),
            ))

        # Propagate final outcome and auto-clean finished simulations
        if event_type in [SimulationEvent.MISSION_COMPLETED,
                          SimulationEvent.MISSION_ABORTED]:
            status = (
                "completed" if event_type == SimulationEvent.MISSION_COMPLETED
                else "aborted"
            )
            asyncio.create_task(self._sync_mission_status(mission_id, status))
            asyncio.create_task(self._cleanup_after_delay(mission_id, 30))

    async def _sync_mission_status(self, mission_id: str, status: str):
        """Propagate a finished simulation's outcome to the mission record"""
        from app.services.mission_service import get_mission_service

        try:
            await get_mission_service().set_status(mission_id, status)
        except ValueError:
            pass  # Simulation without a stored mission

    async def _sync_mission_progress(
        self,
        mission_id: str,
        progress: float,
        waypoints_completed: int,
    ):
        """Mirror simulation progress onto the mission record"""
        from app.repositories.mission_repository import get_mission_repository

        repository = get_mission_repository()
        if await repository.get_by_id(mission_id):
            await repository.update(mission_id, {
                "progress_percent": round(progress, 2),
                "waypoints_completed": waypoints_completed,
            })
    
    async def _cleanup_after_delay(self, mission_id: str, delay: int):
        """
        Clean up simulation after delay
        
        Args:
            mission_id: Mission to clean up
            delay: Delay in seconds
        """
        await asyncio.sleep(delay)
        
        if mission_id in self.simulators:
            simulator = self.simulators[mission_id]
            if simulator.state.status in ["completed", "aborted"]:
                logger.info(f"Auto-removing completed simulation for {mission_id}")
                await self.remove_simulation(mission_id)
    
    async def shutdown(self):
        """Shutdown all simulations"""
        logger.info(f"Shutting down {len(self.simulators)} simulations")
        
        # Stop all simulators
        tasks = [
            self.stop_simulation(mission_id, "shutdown")
            for mission_id in list(self.simulators.keys())
        ]
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        # Clear all
        self.simulators.clear()
        
        logger.info("All simulations shut down")


# Global simulation manager instance
_manager: Optional[SimulationManager] = None


def get_simulation_manager() -> SimulationManager:
    """
    Get or create global simulation manager
    
    Returns:
        Global SimulationManager instance
    """
    global _manager
    if _manager is None:
        _manager = SimulationManager()
    return _manager


def set_broadcast_callback(callback: Callable):
    """
    Set broadcast callback for simulation events
    
    Args:
        callback: Function to broadcast events
    """
    manager = get_simulation_manager()
    manager.broadcast_callback = callback
    logger.info("Broadcast callback registered with simulation manager")
