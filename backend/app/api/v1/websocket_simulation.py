"""
FastAPI WebSocket endpoint for mission simulations

Provides real-time streaming of drone position, progress, and battery status.
Handles commands for pause, resume, and abort.
"""

import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional

from app.websocket.simulation_handler import get_websocket_handler

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/simulations/{mission_id}")
async def simulation_websocket(
    websocket: WebSocket,
    mission_id: str
):
    """
    WebSocket endpoint for mission-specific simulation updates
    
    Streams every second:
    - Drone position (lat, lon, alt, speed, heading)
    - Mission progress (%, waypoints completed)
    - Battery status (%, voltage)
    - Elapsed time
    - Total distance
    
    Receives commands:
    - {"command": "pause"} - Pause simulation
    - {"command": "resume"} - Resume simulation
    - {"command": "abort"} - Abort simulation
    - {"command": "get_state"} - Get current state
    
    Args:
        websocket: WebSocket connection
        mission_id: Mission identifier
    
    Example client code (JavaScript):
        const ws = new WebSocket('ws://localhost:8000/api/v1/ws/simulations/mission-123');
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received:', data);
        };
        
        // Send command
        ws.send(JSON.stringify({command: 'pause'}));
    
    Message types received:
    
    1. Initial state:
        {
            "type": "initial_state",
            "mission_id": "mission-123",
            "timestamp": "2024-01-22T10:30:00.000Z",
            "data": { ... complete state ... }
        }
    
    2. Periodic update (every 1 second):
        {
            "type": "update",
            "mission_id": "mission-123",
            "timestamp": "2024-01-22T10:30:01.000Z",
            "data": {
                "position": {
                    "longitude": -122.4195,
                    "latitude": 37.7750,
                    "altitude": 100.0,
                    "speed": 15.0,
                    "heading": 45.0,
                    "vertical_speed": 2.0
                },
                "progress": {
                    "percent": 50.0,
                    "waypoints_completed": 2,
                    "total_waypoints": 5,
                    "distance_to_next": 45.2
                },
                "battery": {
                    "percent": 85.3,
                    "voltage": 12.2
                },
                "status": "active",
                "elapsed_time": 30.5,
                "total_distance": 245.5
            }
        }
    
    3. Event notification:
        {
            "type": "event",
            "event_type": "waypoint_reached",
            "mission_id": "mission-123",
            "timestamp": "2024-01-22T10:30:05.000Z",
            "data": {
                "waypoint": {
                    "sequence": 2,
                    "longitude": -122.4195,
                    "latitude": 37.7750,
                    "altitude": 100
                },
                "progress": 50.0
            }
        }
    
    4. Command response:
        {
            "type": "command_response",
            "mission_id": "mission-123",
            "command": "pause",
            "status": "success",
            "timestamp": "2024-01-22T10:30:10.000Z",
            "message": "Simulation paused"
        }
    """
    handler = get_websocket_handler()
    
    # Connect client
    await handler.connect(websocket, mission_id)
    
    logger.info(f"WebSocket client connected for mission {mission_id}")
    
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            
            try:
                command = json.loads(data)
                
                # Handle command
                await handler.handle_command(websocket, mission_id, command)
            
            except json.JSONDecodeError:
                # Invalid JSON
                error_response = {
                    "type": "error",
                    "mission_id": mission_id,
                    "message": "Invalid JSON"
                }
                await websocket.send_json(error_response)
            
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                error_response = {
                    "type": "error",
                    "mission_id": mission_id,
                    "message": str(e)
                }
                await websocket.send_json(error_response)
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected from mission {mission_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for mission {mission_id}: {e}")
    
    finally:
        # Disconnect client
        await handler.disconnect(websocket, mission_id)


@router.websocket("/ws/simulations")
async def global_simulation_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for all simulation updates
    
    Receives events from all active simulations.
    Use this for dashboard views that monitor multiple missions.
    
    Args:
        websocket: WebSocket connection
    
    Message types received:
    
    1. Simulation list:
        {
            "type": "simulation_list",
            "timestamp": "2024-01-22T10:30:00.000Z",
            "data": {
                "total": 5,
                "active": 3,
                "simulations": ["mission-1", "mission-2", "mission-3", ...]
            }
        }
    
    2. Events from all simulations:
        {
            "type": "event",
            "event_type": "mission_completed",
            "mission_id": "mission-123",
            "timestamp": "2024-01-22T10:30:00.000Z",
            "data": { ... event data ... }
        }
    """
    handler = get_websocket_handler()
    
    # Connect client
    await handler.connect(websocket, mission_id=None)
    
    logger.info("WebSocket client connected to global simulation stream")
    
    try:
        while True:
            # Keep connection alive
            # Just receive any messages (can be used for commands in future)
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # Could handle global commands here
                # For now, just acknowledge
                response = {
                    "type": "ack",
                    "timestamp": message.get("timestamp")
                }
                await websocket.send_json(response)
            
            except json.JSONDecodeError:
                pass
    
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected from global stream")
    
    except Exception as e:
        logger.error(f"Global WebSocket error: {e}")
    
    finally:
        await handler.disconnect(websocket, mission_id=None)
