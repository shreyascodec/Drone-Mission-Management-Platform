"""
WebSocket handler for mission simulations

Provides real-time streaming of:
- Drone position updates
- Mission progress
- Battery status
- Event notifications

Handles commands:
- pause: Pause simulation
- resume: Resume simulation
- abort: Stop simulation
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect

from app.simulation.simulation_manager import get_simulation_manager
from app.simulation import SimulationEvent

logger = logging.getLogger(__name__)


class SimulationWebSocketHandler:
    """
    Handles WebSocket connections for mission simulations
    
    Features:
    - Real-time position streaming (1 Hz)
    - Mission progress updates
    - Battery status monitoring
    - Command handling (pause/resume/abort)
    - Event broadcasting
    """
    
    def __init__(self):
        """Initialize handler"""
        # Active connections by mission_id
        self.connections: Dict[str, Set[WebSocket]] = {}
        
        # Global connections (receive all simulation events)
        self.global_connections: Set[WebSocket] = set()
        
        # Update task tracking
        self.update_tasks: Dict[str, asyncio.Task] = {}
        
        logger.info("SimulationWebSocketHandler initialized")
    
    async def connect(
        self,
        websocket: WebSocket,
        mission_id: Optional[str] = None
    ):
        """
        Connect a WebSocket client
        
        Args:
            websocket: WebSocket connection
            mission_id: Mission to subscribe to (None = all missions)
        """
        await websocket.accept()
        
        if mission_id:
            # Mission-specific connection
            if mission_id not in self.connections:
                self.connections[mission_id] = set()
            
            self.connections[mission_id].add(websocket)
            
            logger.info(f"Client connected to mission {mission_id}")
            
            # Send initial state
            await self._send_initial_state(websocket, mission_id)
            
            # Start update stream if not already running
            if mission_id not in self.update_tasks:
                self.update_tasks[mission_id] = asyncio.create_task(
                    self._stream_updates(mission_id)
                )
        
        else:
            # Global connection
            self.global_connections.add(websocket)
            logger.info("Client connected to global simulation stream")
            
            # Send list of active simulations
            await self._send_simulation_list(websocket)
    
    async def disconnect(
        self,
        websocket: WebSocket,
        mission_id: Optional[str] = None
    ):
        """
        Disconnect a WebSocket client
        
        Args:
            websocket: WebSocket connection
            mission_id: Mission subscribed to
        """
        if mission_id and mission_id in self.connections:
            self.connections[mission_id].discard(websocket)
            
            # Clean up if no more connections
            if not self.connections[mission_id]:
                del self.connections[mission_id]
                
                # Cancel update task
                if mission_id in self.update_tasks:
                    self.update_tasks[mission_id].cancel()
                    del self.update_tasks[mission_id]
            
            logger.info(f"Client disconnected from mission {mission_id}")
        
        else:
            self.global_connections.discard(websocket)
            logger.info("Client disconnected from global stream")
    
    async def _send_initial_state(
        self,
        websocket: WebSocket,
        mission_id: str
    ):
        """
        Send initial simulation state to client
        
        Args:
            websocket: WebSocket connection
            mission_id: Mission identifier
        """
        manager = get_simulation_manager()
        simulator = manager.get_simulation(mission_id)
        
        if simulator:
            state = simulator.get_state()
            
            message = {
                "type": "initial_state",
                "mission_id": mission_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": state
            }
            
            await websocket.send_json(message)
        else:
            # Send error
            error_message = {
                "type": "error",
                "mission_id": mission_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": f"Simulation not found for mission {mission_id}"
            }
            
            await websocket.send_json(error_message)
    
    async def _send_simulation_list(self, websocket: WebSocket):
        """
        Send list of active simulations
        
        Args:
            websocket: WebSocket connection
        """
        manager = get_simulation_manager()
        all_sims = manager.get_all_simulations()
        
        message = {
            "type": "simulation_list",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "total": len(all_sims),
                "active": manager.get_active_count(),
                "simulations": list(all_sims.keys())
            }
        }
        
        await websocket.send_json(message)
    
    async def _stream_updates(self, mission_id: str):
        """
        Stream periodic updates for a mission
        
        Sends updates every second with:
        - Position
        - Progress
        - Battery status
        
        Args:
            mission_id: Mission identifier
        """
        logger.info(f"Starting update stream for mission {mission_id}")
        
        manager = get_simulation_manager()
        
        try:
            while mission_id in self.connections:
                # Get simulator
                simulator = manager.get_simulation(mission_id)
                
                if not simulator:
                    # No simulation yet (or it was cleaned up).
                    # Keep the stream alive so updates resume when one starts.
                    await asyncio.sleep(1.0)
                    continue
                
                # Get current state
                state = simulator.get_state()
                
                # Create update message
                message = {
                    "type": "update",
                    "mission_id": mission_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "data": {
                        "position": state["position"],
                        "progress": {
                            "percent": state["progress_percent"],
                            "waypoints_completed": state["waypoints_completed"],
                            "total_waypoints": state["total_waypoints"],
                            "distance_to_next": state["distance_to_next_waypoint"]
                        },
                        "battery": {
                            "percent": state["battery_percent"],
                            "voltage": state["battery_voltage"]
                        },
                        "status": state["status"],
                        "elapsed_time": state["elapsed_time"],
                        "total_distance": state["total_distance_traveled"]
                    }
                }
                
                # Broadcast to all connected clients
                await self._broadcast_to_mission(mission_id, message)
                
                # Wait 1 second before next update
                await asyncio.sleep(1.0)
        
        except asyncio.CancelledError:
            logger.info(f"Update stream cancelled for mission {mission_id}")
        
        except Exception as e:
            logger.error(f"Error in update stream for mission {mission_id}: {e}")
    
    async def _broadcast_to_mission(
        self,
        mission_id: str,
        message: dict
    ):
        """
        Broadcast message to all clients subscribed to a mission
        
        Args:
            mission_id: Mission identifier
            message: Message to broadcast
        """
        if mission_id not in self.connections:
            return
        
        # Get all connections for this mission
        connections = list(self.connections[mission_id])
        
        # Send to each connection
        disconnected = []
        
        for websocket in connections:
            try:
                await websocket.send_json(message)
            
            except WebSocketDisconnect:
                disconnected.append(websocket)
            
            except Exception as e:
                logger.error(f"Error sending to client: {e}")
                disconnected.append(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected:
            await self.disconnect(websocket, mission_id)
    
    async def _broadcast_global(self, message: dict):
        """
        Broadcast message to all global connections
        
        Args:
            message: Message to broadcast
        """
        disconnected = []
        
        for websocket in list(self.global_connections):
            try:
                await websocket.send_json(message)
            
            except WebSocketDisconnect:
                disconnected.append(websocket)
            
            except Exception as e:
                logger.error(f"Error sending to global client: {e}")
                disconnected.append(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected:
            await self.disconnect(websocket)
    
    async def handle_command(
        self,
        websocket: WebSocket,
        mission_id: str,
        command: dict
    ):
        """
        Handle command from client
        
        Commands:
        - pause: Pause simulation
        - resume: Resume simulation
        - abort: Stop simulation
        - get_state: Get current state
        
        Args:
            websocket: WebSocket connection
            mission_id: Mission identifier
            command: Command data
        """
        command_type = command.get("command")
        
        logger.info(f"Received command for mission {mission_id}: {command_type}")
        
        manager = get_simulation_manager()
        
        try:
            if command_type == "pause":
                await manager.pause_simulation(mission_id)
                
                response = {
                    "type": "command_response",
                    "mission_id": mission_id,
                    "command": "pause",
                    "status": "success",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "message": "Simulation paused"
                }
            
            elif command_type == "resume":
                await manager.resume_simulation(mission_id)
                
                response = {
                    "type": "command_response",
                    "mission_id": mission_id,
                    "command": "resume",
                    "status": "success",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "message": "Simulation resumed"
                }
            
            elif command_type == "abort":
                await manager.stop_simulation(mission_id, reason="user_aborted")
                
                response = {
                    "type": "command_response",
                    "mission_id": mission_id,
                    "command": "abort",
                    "status": "success",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "message": "Simulation aborted"
                }
            
            elif command_type == "get_state":
                simulator = manager.get_simulation(mission_id)
                
                if simulator:
                    state = simulator.get_state()
                    
                    response = {
                        "type": "command_response",
                        "mission_id": mission_id,
                        "command": "get_state",
                        "status": "success",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "data": state
                    }
                else:
                    response = {
                        "type": "command_response",
                        "mission_id": mission_id,
                        "command": "get_state",
                        "status": "error",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "message": "Simulation not found"
                    }
            
            else:
                response = {
                    "type": "command_response",
                    "mission_id": mission_id,
                    "command": command_type,
                    "status": "error",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "message": f"Unknown command: {command_type}"
                }
            
            # Send response
            await websocket.send_json(response)
        
        except Exception as e:
            logger.error(f"Error handling command {command_type}: {e}")
            
            error_response = {
                "type": "command_response",
                "mission_id": mission_id,
                "command": command_type,
                "status": "error",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": str(e)
            }
            
            await websocket.send_json(error_response)
    
    async def broadcast_event(
        self,
        event_type_or_message: any,
        event_data: Optional[dict] = None
    ):
        """
        Broadcast simulation event to connected clients
        
        Called by simulation manager when events occur
        
        Args:
            event_type_or_message: Either SimulationEvent or complete message dict
            event_data: Event data (if first arg is SimulationEvent)
        """
        # Handle both call signatures
        if isinstance(event_type_or_message, dict):
            # Called with complete message from simulation_manager
            message = event_type_or_message
            mission_id = message.get("data", {}).get("mission_id")
        else:
            # Called with separate event_type and data
            event_type = event_type_or_message
            mission_id = event_data.get("mission_id") if event_data else None
            
            message = {
                "type": "event",
                "event_type": event_type.value if hasattr(event_type, 'value') else str(event_type),
                "mission_id": mission_id,
                "timestamp": event_data.get("timestamp") if event_data else datetime.now(timezone.utc).isoformat(),
                "data": event_data or {}
            }
        
        # Broadcast to mission-specific connections
        if mission_id:
            await self._broadcast_to_mission(mission_id, message)
        
        # Broadcast to global connections
        await self._broadcast_global(message)


# Global handler instance
_handler: Optional[SimulationWebSocketHandler] = None


def get_websocket_handler() -> SimulationWebSocketHandler:
    """
    Get or create global WebSocket handler
    
    Returns:
        Global SimulationWebSocketHandler instance
    """
    global _handler
    if _handler is None:
        _handler = SimulationWebSocketHandler()
    return _handler
