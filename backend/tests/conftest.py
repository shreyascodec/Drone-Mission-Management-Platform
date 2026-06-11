"""
Shared test fixtures.

Every test gets a TestClient backed by fresh in-memory state.
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from app.repositories import mission_repository
from app.api.v1.drones import drones_store
from app.simulation import simulation_manager as sim_module


SQUARE_WAYPOINTS = [
    {"latitude": 37.7749, "longitude": -122.4194, "altitude": 100},
    {"latitude": 37.7750, "longitude": -122.4193, "altitude": 100},
    {"latitude": 37.7751, "longitude": -122.4194, "altitude": 100},
]

SURVEY_POLYGON = {
    "type": "Polygon",
    "coordinates": [[
        [-122.4194, 37.7749],
        [-122.4174, 37.7749],
        [-122.4174, 37.7765],
        [-122.4194, 37.7765],
        [-122.4194, 37.7749],
    ]],
}


@pytest.fixture()
def client():
    # Reset all in-memory state between tests
    mission_repository._missions_store.clear()
    drones_store.clear()
    sim_module._manager = None

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def mission(client):
    """A created mission with three waypoints"""
    response = client.post("/api/v1/missions", json={
        "name": "Test Survey",
        "type": "survey",
        "altitude": 100,
        "speed": 12,
        "waypoints": SQUARE_WAYPOINTS,
    })
    assert response.status_code == 201
    return response.json()
