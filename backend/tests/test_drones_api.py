"""
Drone fleet API tests
"""


def create_drone(client, name="Alpha One"):
    return client.post("/api/v1/drones", json={
        "name": name,
        "serial_number": "DRN-001",
        "model": "DJI Mavic 3",
    })


def test_create_drone(client):
    response = create_drone(client)
    assert response.status_code == 201
    drone = response.json()
    assert drone["name"] == "Alpha One"
    assert drone["status"] == "idle"
    assert drone["battery_percent"] == 100.0


def test_list_and_filter_drones(client):
    create_drone(client)
    assert len(client.get("/api/v1/drones").json()) == 1
    assert len(client.get("/api/v1/drones?status=idle").json()) == 1
    assert len(client.get("/api/v1/drones?status=flying").json()) == 0


def test_update_drone(client):
    drone_id = create_drone(client).json()["id"]
    response = client.put(f"/api/v1/drones/{drone_id}", json={
        "status": "flying",
        "battery_percent": 80.0,
    })
    assert response.status_code == 200
    assert response.json()["status"] == "flying"


def test_delete_drone(client):
    drone_id = create_drone(client).json()["id"]
    assert client.delete(f"/api/v1/drones/{drone_id}").status_code in (200, 204)
    assert client.get(f"/api/v1/drones/{drone_id}").status_code == 404
