"""
Mission CRUD API tests
"""

from tests.conftest import SQUARE_WAYPOINTS


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_mission(client, mission):
    assert mission["name"] == "Test Survey"
    assert mission["status"] == "draft"
    assert mission["total_waypoints"] == 3
    assert mission["speed"] == 12


def test_create_mission_requires_two_waypoints(client):
    response = client.post("/api/v1/missions", json={
        "name": "Too Few",
        "waypoints": SQUARE_WAYPOINTS[:1],
    })
    assert response.status_code == 400


def test_get_mission(client, mission):
    response = client.get(f"/api/v1/missions/{mission['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == mission["id"]


def test_get_missing_mission_returns_404(client):
    response = client.get("/api/v1/missions/does-not-exist")
    assert response.status_code == 404


def test_list_missions_with_status_filter(client, mission):
    assert len(client.get("/api/v1/missions").json()) == 1
    assert len(client.get("/api/v1/missions?status=draft").json()) == 1
    assert len(client.get("/api/v1/missions?status=active").json()) == 0


def test_update_mission(client, mission):
    response = client.put(f"/api/v1/missions/{mission['id']}", json={
        "name": "Renamed Survey",
    })
    assert response.status_code == 200
    updated = response.json()
    assert updated["name"] == "Renamed Survey"
    # Fields not sent must be preserved
    assert updated["status"] == "draft"


def test_delete_mission(client, mission):
    assert client.delete(f"/api/v1/missions/{mission['id']}").status_code == 204
    assert client.get(f"/api/v1/missions/{mission['id']}").status_code == 404


def test_mission_statistics(client, mission):
    response = client.get(f"/api/v1/missions/{mission['id']}/statistics")
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_waypoints"] == 3
    assert stats["status"] == "draft"
