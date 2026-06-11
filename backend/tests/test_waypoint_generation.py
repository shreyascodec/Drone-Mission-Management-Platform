"""
Waypoint generation engine tests (unit + API)
"""

from shapely.geometry import Point, Polygon

from app.utils.waypoint_generator import WaypointGenerator
from tests.conftest import SURVEY_POLYGON


def make_generator(**overrides):
    params = {"polygon": SURVEY_POLYGON, "altitude": 100.0, **overrides}
    return WaypointGenerator(**params)


def polygon_shape() -> Polygon:
    return Polygon(SURVEY_POLYGON["coordinates"][0])


def test_grid_pattern_generates_waypoints_inside_area():
    generator = make_generator()
    waypoints = generator.generate_waypoints(pattern="grid", overlap_percent=70)

    assert len(waypoints) >= 4
    # All waypoints stay within (a small buffer of) the survey polygon
    area = polygon_shape().buffer(0.0005)
    assert all(area.contains(Point(wp.longitude, wp.latitude)) for wp in waypoints)
    # Sequence numbers are contiguous
    assert [wp.sequence for wp in waypoints] == list(range(len(waypoints)))


def test_crosshatch_has_two_passes():
    generator = make_generator()
    grid = generator.generate_waypoints(pattern="grid", overlap_percent=70)
    crosshatch = generator.generate_waypoints(pattern="crosshatch", overlap_percent=70)

    # Crosshatch = horizontal pass + perpendicular pass
    assert len(crosshatch) > len(grid)
    area = polygon_shape().buffer(0.0005)
    assert all(area.contains(Point(wp.longitude, wp.latitude)) for wp in crosshatch)


def test_perimeter_pattern_follows_boundary():
    generator = make_generator()
    waypoints = generator.generate_waypoints(pattern="perimeter", num_points=8)

    assert len(waypoints) == 8
    boundary = polygon_shape().exterior
    for wp in waypoints:
        assert boundary.distance(Point(wp.longitude, wp.latitude)) < 1e-6


def test_higher_overlap_means_more_waypoints():
    generator = make_generator()
    sparse = generator.generate_waypoints(pattern="grid", overlap_percent=40)
    dense = generator.generate_waypoints(pattern="grid", overlap_percent=85)
    assert len(dense) > len(sparse)


def test_mission_stats():
    generator = make_generator()
    waypoints = generator.generate_waypoints(pattern="grid", overlap_percent=70)
    stats = generator.calculate_mission_stats(waypoints)

    assert stats["total_waypoints"] == len(waypoints)
    assert stats["total_distance"] > 0
    assert stats["estimated_time"] > 0
    assert stats["area_covered"] > 0


def test_unknown_pattern_raises():
    generator = make_generator()
    try:
        generator.generate_waypoints(pattern="spiral")
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_generate_waypoints_endpoint(client):
    response = client.post("/api/v1/missions/generate-waypoints", json={
        "polygon": SURVEY_POLYGON,
        "altitude": 100,
        "pattern": "grid",
        "overlap_percent": 70,
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["waypoints"]) >= 4
    assert data["statistics"]["total_distance"] > 0


def test_generate_waypoints_endpoint_rejects_bad_polygon(client):
    response = client.post("/api/v1/missions/generate-waypoints", json={
        "polygon": {"type": "Point", "coordinates": [0, 0]},
    })
    assert response.status_code == 400
