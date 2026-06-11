"""
Simulation lifecycle API tests

Simulations run in the app's event loop (TestClient runs it on a
background thread), so short real-time sleeps let telemetry advance.
"""

import time


def create_simulation(client, mission_id, **overrides):
    payload = {"mission_id": mission_id, **overrides}
    return client.post("/api/v1/simulations", json=payload)


def test_create_simulation_loads_mission_waypoints(client, mission):
    response = create_simulation(client, mission["id"])
    assert response.status_code == 201
    assert "3 waypoints" in response.json()["message"]


def test_create_simulation_for_missing_mission_returns_404(client):
    response = create_simulation(client, "does-not-exist")
    assert response.status_code == 404


def test_start_unknown_simulation_returns_404(client):
    response = client.post("/api/v1/simulations/nope/start")
    assert response.status_code == 404


def test_full_simulation_lifecycle(client, mission):
    mission_id = mission["id"]

    assert create_simulation(client, mission_id).status_code == 201
    assert client.post(f"/api/v1/simulations/{mission_id}/start").status_code == 200

    # Mission record must reflect the running simulation
    assert client.get(f"/api/v1/missions/{mission_id}").json()["status"] == "active"

    # Telemetry advances in real time
    time.sleep(1.5)
    state = client.get(f"/api/v1/simulations/{mission_id}").json()
    assert state["status"] in ("active", "completed")
    assert state["elapsed_time"] > 0
    assert state["total_waypoints"] == 3

    # Pause / resume
    assert client.post(f"/api/v1/simulations/{mission_id}/pause").status_code == 200
    assert client.get(f"/api/v1/missions/{mission_id}").json()["status"] == "paused"
    assert client.post(f"/api/v1/simulations/{mission_id}/resume").status_code == 200
    assert client.get(f"/api/v1/missions/{mission_id}").json()["status"] == "active"

    # Stop
    assert client.post(f"/api/v1/simulations/{mission_id}/stop").status_code == 200
    assert client.get(f"/api/v1/missions/{mission_id}").json()["status"] == "aborted"


def test_simulation_list(client, mission):
    create_simulation(client, mission["id"])
    data = client.get("/api/v1/simulations").json()
    assert data["total"] == 1
    assert data["simulations"][0]["mission_id"] == mission["id"]


def test_websocket_streams_initial_state(client, mission):
    mission_id = mission["id"]
    create_simulation(client, mission_id)

    with client.websocket_connect(f"/api/v1/ws/simulations/{mission_id}") as ws:
        message = ws.receive_json()
        assert message["type"] == "initial_state"
        assert message["mission_id"] == mission_id
        assert message["data"]["total_waypoints"] == 3
