"""
Waypoint Generation Engine for Drone Survey Missions

Generates ordered waypoints for different survey patterns over a given area.
Supports grid, crosshatch, and perimeter patterns with configurable overlap.

Mathematical concepts:
- GeoJSON polygon processing
- Bounding box calculation
- Grid generation with overlap
- Line-polygon intersection
- Great circle distance calculations
- Optimal path ordering
"""

import math
from typing import List, Tuple, Dict, Optional, Literal
from dataclasses import dataclass
from shapely import affinity
from shapely.geometry import Polygon, Point, LineString, MultiLineString
from shapely.ops import transform

EARTH_RADIUS_M = 6_371_000.0

# Type definitions
Coordinate = Tuple[float, float]  # (longitude, latitude)
PatternType = Literal["grid", "crosshatch", "perimeter"]


@dataclass
class Waypoint:
    """
    Represents a single waypoint
    """
    longitude: float
    latitude: float
    altitude: float
    sequence: int
    action: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary format"""
        return {
            "longitude": self.longitude,
            "latitude": self.latitude,
            "altitude": self.altitude,
            "sequence": self.sequence,
            "action": self.action
        }


class WaypointGenerator:
    """
    Generates survey waypoints for different flight patterns
    
    Key concepts:
    1. Camera footprint: Ground area visible in one photo
    2. Overlap: Percentage of overlap between adjacent photos
    3. Flight lines: Parallel lines the drone follows
    4. Sidelap: Overlap between adjacent flight lines
    5. Frontlap: Overlap along a single flight line
    """
    
    def __init__(
        self,
        polygon: Dict,  # GeoJSON polygon
        altitude: float,  # meters above ground
        camera_fov_horizontal: float = 73.0,  # degrees (DJI Mavic 3 example)
        camera_fov_vertical: float = 53.0,   # degrees
        image_width: int = 5280,  # pixels
        image_height: int = 3956,  # pixels
    ):
        """
        Initialize waypoint generator
        
        Args:
            polygon: GeoJSON polygon defining survey area
            altitude: Flight altitude in meters
            camera_fov_horizontal: Horizontal field of view in degrees
            camera_fov_vertical: Vertical field of view in degrees
            image_width: Image width in pixels
            image_height: Image height in pixels
        """
        self.altitude = altitude
        self.camera_fov_h = camera_fov_horizontal
        self.camera_fov_v = camera_fov_vertical
        self.image_width = image_width
        self.image_height = image_height
        
        # Parse GeoJSON polygon
        self.polygon = self._parse_geojson(polygon)
        
        # Calculate camera footprint on ground
        self.footprint_width, self.footprint_height = self._calculate_footprint()
        
        # Calculate centroid for projection
        self.centroid = self.polygon.centroid
    
    def _parse_geojson(self, geojson: Dict) -> Polygon:
        """
        Parse GeoJSON polygon into Shapely Polygon
        
        GeoJSON format:
        {
            "type": "Polygon",
            "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
        }
        
        Note: GeoJSON uses [longitude, latitude] order (opposite of typical lat/lon)
        """
        if geojson.get("type") != "Polygon":
            raise ValueError("GeoJSON must be of type 'Polygon'")
        
        coords = geojson.get("coordinates", [[]])[0]  # Get exterior ring
        
        if len(coords) < 4:  # Polygon must have at least 3 points + closing point
            raise ValueError("Polygon must have at least 3 vertices")
        
        return Polygon(coords)
    
    def _calculate_footprint(self) -> Tuple[float, float]:
        """
        Calculate camera footprint on the ground
        
        Mathematical derivation:
        
        For a camera at altitude h with field of view θ:
        
        Ground footprint dimension = 2 * h * tan(θ/2)
        
        Where:
        - h = altitude (meters)
        - θ = field of view angle (radians)
        - tan(θ/2) = ratio of half-width to altitude
        
        Example:
        - Altitude: 100m
        - FOV: 73° horizontal
        - Footprint width = 2 * 100 * tan(73°/2) = 2 * 100 * tan(36.5°)
        -                 = 2 * 100 * 0.738 = 147.6 meters
        
        Returns:
            (width_meters, height_meters)
        """
        # Convert degrees to radians
        fov_h_rad = math.radians(self.camera_fov_h)
        fov_v_rad = math.radians(self.camera_fov_v)
        
        # Calculate ground footprint using trigonometry
        width = 2 * self.altitude * math.tan(fov_h_rad / 2)
        height = 2 * self.altitude * math.tan(fov_v_rad / 2)
        
        return width, height
    
    def _calculate_line_spacing(self, overlap_percent: float) -> float:
        """
        Calculate spacing between flight lines
        
        Mathematical concept:
        
        If we want X% overlap between adjacent photos:
        
        Effective coverage per photo = footprint_width * (1 - overlap/100)
        
        Example:
        - Footprint width: 150m
        - Desired overlap: 70%
        - Effective coverage: 150 * (1 - 0.70) = 150 * 0.30 = 45m
        - So we need flight lines 45m apart
        
        This ensures 70% of each photo overlaps with the adjacent photo.
        
        Args:
            overlap_percent: Desired overlap percentage (0-100)
            
        Returns:
            Spacing in meters
        """
        if not 0 <= overlap_percent <= 95:
            raise ValueError("Overlap must be between 0 and 95 percent")
        
        # Calculate effective coverage (non-overlapping portion)
        spacing = self.footprint_width * (1 - overlap_percent / 100)
        
        return spacing
    
    def _calculate_photo_spacing(self, overlap_percent: float) -> float:
        """
        Calculate spacing between photos along a flight line (frontlap)
        
        Same principle as line spacing but using footprint height:
        
        Spacing = footprint_height * (1 - overlap/100)
        
        Args:
            overlap_percent: Desired overlap percentage (0-100)
            
        Returns:
            Spacing in meters
        """
        if not 0 <= overlap_percent <= 95:
            raise ValueError("Overlap must be between 0 and 95 percent")
        
        spacing = self.footprint_height * (1 - overlap_percent / 100)
        
        return spacing
    
    def _get_local_transformer(self):
        """
        Create coordinate transformers between WGS84 and a local tangent
        plane centered on the polygon centroid.

        Why project at all?
        - Latitude/longitude (WGS84) is a geographic coordinate system
        - Distances are not uniform (degrees of longitude shrink with latitude)
        - An equirectangular projection around the survey centroid gives
          meter-based coordinates accurate to within centimeters for
          survey-sized areas (a few kilometers across)

        Returns:
            (to_local, to_wgs84) transformer functions compatible with
            shapely.ops.transform
        """
        lon0 = self.centroid.x
        lat0 = self.centroid.y

        m_per_deg_lat = math.pi / 180.0 * EARTH_RADIUS_M
        m_per_deg_lon = m_per_deg_lat * math.cos(math.radians(lat0))

        def to_local(lon, lat):
            return (lon - lon0) * m_per_deg_lon, (lat - lat0) * m_per_deg_lat

        def to_wgs84(x, y):
            return x / m_per_deg_lon + lon0, y / m_per_deg_lat + lat0

        return to_local, to_wgs84
    
    def _calculate_bounding_box_with_rotation(
        self,
        angle: float = 0
    ) -> Tuple[float, float, float, float]:
        """
        Calculate bounding box of polygon, optionally rotated
        
        Mathematical concept:
        
        To rotate a point (x, y) by angle θ around origin:
        x' = x * cos(θ) - y * sin(θ)
        y' = x * sin(θ) + y * cos(θ)
        
        For minimum bounding box, we try different rotation angles
        and find the one that gives the smallest area.
        
        Args:
            angle: Rotation angle in degrees
            
        Returns:
            (min_x, min_y, max_x, max_y) in meters (local coordinates)
        """
        to_local, _ = self._get_local_transformer()

        # Transform polygon to local meters
        polygon_local = transform(to_local, self.polygon)

        if angle != 0:
            # Rotate polygon around its centroid
            polygon_local = affinity.rotate(
                polygon_local,
                angle,
                origin=polygon_local.centroid
            )

        # Get bounding box
        bounds = polygon_local.bounds  # (minx, miny, maxx, maxy)

        return bounds
    
    def generate_grid_pattern(
        self,
        overlap_percent: float = 70,
        angle: float = 0
    ) -> List[Waypoint]:
        """
        Generate grid (lawnmower) pattern waypoints
        
        Pattern visualization:
        
        ╔═══════════════════════╗
        ║ →→→→→→→→→→→→→→→→→→→ ║  Flight line 1 (west to east)
        ║ ←←←←←←←←←←←←←←←←←←← ║  Flight line 2 (east to west)
        ║ →→→→→→→→→→→→→→→→→→→ ║  Flight line 3 (west to east)
        ║ ←←←←←←←←←←←←←←←←←←← ║  Flight line 4 (east to west)
        ╚═══════════════════════╝
        
        Algorithm:
        1. Calculate line spacing based on overlap
        2. Generate parallel lines across bounding box
        3. Intersect lines with polygon
        4. Create waypoints along intersections
        5. Alternate direction for efficiency (no long returns)
        
        Args:
            overlap_percent: Sidelap percentage (0-95)
            angle: Flight line angle in degrees (0 = east-west)
            
        Returns:
            List of ordered waypoints
        """
        # Calculate spacing between flight lines
        line_spacing = self._calculate_line_spacing(overlap_percent)
        photo_spacing = self._calculate_photo_spacing(overlap_percent)
        
        # Get coordinate transformers
        to_local, to_wgs84 = self._get_local_transformer()

        # Transform polygon to local meters for accurate distance calculations
        polygon_local = transform(to_local, self.polygon)

        # Rotate if needed (waypoints are rotated back before output)
        rotation_origin = polygon_local.centroid
        if angle != 0:
            polygon_local = affinity.rotate(
                polygon_local,
                angle,
                origin=rotation_origin
            )

        # Get bounding box
        minx, miny, maxx, maxy = polygon_local.bounds
        
        # Generate flight lines
        waypoints = []
        sequence = 0
        reverse = False  # Alternate direction
        
        # Calculate number of lines needed
        width = maxx - minx
        num_lines = int(math.ceil(width / line_spacing)) + 1
        
        for i in range(num_lines):
            # Calculate line x-coordinate
            x = minx + i * line_spacing
            
            # Create vertical line spanning the polygon
            line = LineString([(x, miny - 100), (x, maxy + 100)])
            
            # Intersect with polygon
            intersection = line.intersection(polygon_local)
            
            if intersection.is_empty:
                continue
            
            # Handle different intersection types
            if isinstance(intersection, LineString):
                segments = [intersection]
            elif isinstance(intersection, MultiLineString):
                segments = list(intersection.geoms)
            else:
                continue
            
            # Process each segment
            for segment in segments:
                # Get start and end points
                coords = list(segment.coords)
                
                # Reverse direction on alternating lines (boustrophedon pattern)
                if reverse:
                    coords = coords[::-1]
                
                # Generate waypoints along the segment
                start_point = Point(coords[0])
                end_point = Point(coords[-1])
                
                # Calculate segment length
                segment_length = segment.length
                
                # Calculate number of photos needed
                num_photos = int(math.ceil(segment_length / photo_spacing)) + 1
                
                # Generate waypoints
                for j in range(num_photos):
                    # Calculate position along segment (0.0 to 1.0)
                    if num_photos > 1:
                        t = j / (num_photos - 1)
                    else:
                        t = 0.5  # Center of very short segment
                    
                    # Interpolate point along segment
                    point = segment.interpolate(t, normalized=True)

                    # Undo the flight-line rotation before projecting back
                    if angle != 0:
                        point = affinity.rotate(point, -angle, origin=rotation_origin)

                    # Transform back to WGS84
                    lon, lat = to_wgs84(point.x, point.y)
                    
                    waypoints.append(Waypoint(
                        longitude=lon,
                        latitude=lat,
                        altitude=self.altitude,
                        sequence=sequence,
                        action="capture_photo"
                    ))
                    sequence += 1
            
            # Alternate direction for next line
            reverse = not reverse
        
        return waypoints
    
    def generate_crosshatch_pattern(
        self,
        overlap_percent: float = 70
    ) -> List[Waypoint]:
        """
        Generate crosshatch pattern (two perpendicular grid passes)
        
        Pattern visualization:
        
        ╔═══════════════════════╗
        ║ →→→→→→→→→→→→→→→→→→→ ║  Pass 1: horizontal lines
        ║ ←←←←←←←←←←←←←←←←←←← ║
        ║ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓  ║  Pass 2: vertical lines
        ║ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓  ║  (perpendicular to pass 1)
        ╚═══════════════════════╝
        
        Use case:
        - Higher overlap/redundancy for important sites
        - Better 3D reconstruction
        - Reduced gaps in coverage
        
        Algorithm:
        1. Generate grid at 0° (horizontal)
        2. Generate grid at 90° (vertical)
        3. Combine both sets of waypoints
        
        Args:
            overlap_percent: Overlap percentage for both passes
            
        Returns:
            List of ordered waypoints (horizontal pass, then vertical pass)
        """
        # Generate horizontal pass (0 degrees)
        horizontal_waypoints = self.generate_grid_pattern(
            overlap_percent=overlap_percent,
            angle=0
        )
        
        # Generate vertical pass (90 degrees)
        vertical_waypoints = self.generate_grid_pattern(
            overlap_percent=overlap_percent,
            angle=90
        )
        
        # Renumber sequences for second pass
        offset = len(horizontal_waypoints)
        for wp in vertical_waypoints:
            wp.sequence += offset
        
        # Combine both passes
        return horizontal_waypoints + vertical_waypoints
    
    def generate_perimeter_pattern(
        self,
        num_points: Optional[int] = None,
        spacing: Optional[float] = None
    ) -> List[Waypoint]:
        """
        Generate waypoints along polygon perimeter
        
        Pattern visualization:
        
        ╔═══════════════════════╗
        ║ →→→→→→→→→→→→→→→→→→↓ ║  Follow the boundary
        ║                    ↓ ║
        ║ ↑←←←←←←←←←←←←←←←←←←┘ ║
        ╚═══════════════════════╝
        
        Use case:
        - Facade inspection
        - Perimeter security
        - Boundary documentation
        
        Algorithm:
        1. Get polygon boundary
        2. Calculate total perimeter length
        3. Distribute waypoints evenly or by spacing
        4. Interpolate points along boundary
        
        Args:
            num_points: Specific number of waypoints (overrides spacing)
            spacing: Distance between waypoints in meters
            
        Returns:
            List of ordered waypoints around perimeter
        """
        if num_points is None and spacing is None:
            # Default: use photo spacing
            spacing = self._calculate_photo_spacing(70)
        
        # Get coordinate transformers
        to_local, to_wgs84 = self._get_local_transformer()

        # Transform polygon to local meters
        polygon_local = transform(to_local, self.polygon)

        # Get exterior boundary
        boundary = polygon_local.exterior
        
        # Calculate total perimeter length
        perimeter_length = boundary.length
        
        # Determine number of waypoints
        if num_points is not None:
            n_points = num_points
        else:
            n_points = int(math.ceil(perimeter_length / spacing))
        
        # Generate waypoints
        waypoints = []
        
        for i in range(n_points):
            # Calculate distance along perimeter (0.0 to 1.0)
            t = i / n_points
            
            # Interpolate point along boundary
            point = boundary.interpolate(t, normalized=True)
            
            # Transform back to WGS84
            lon, lat = to_wgs84(point.x, point.y)
            
            waypoints.append(Waypoint(
                longitude=lon,
                latitude=lat,
                altitude=self.altitude,
                sequence=i,
                action="capture_photo"
            ))
        
        return waypoints
    
    def generate_waypoints(
        self,
        pattern: PatternType = "grid",
        overlap_percent: float = 70,
        angle: float = 0,
        **kwargs
    ) -> List[Waypoint]:
        """
        Main method to generate waypoints for any pattern
        
        Args:
            pattern: Pattern type ("grid", "crosshatch", "perimeter")
            overlap_percent: Overlap percentage (0-95)
            angle: Flight line angle for grid patterns (degrees)
            **kwargs: Additional pattern-specific parameters
            
        Returns:
            List of ordered waypoints
        """
        if pattern == "grid":
            return self.generate_grid_pattern(overlap_percent, angle)
        
        elif pattern == "crosshatch":
            return self.generate_crosshatch_pattern(overlap_percent)
        
        elif pattern == "perimeter":
            return self.generate_perimeter_pattern(
                num_points=kwargs.get("num_points"),
                spacing=kwargs.get("spacing")
            )
        
        else:
            raise ValueError(f"Unknown pattern type: {pattern}")
    
    def calculate_mission_stats(
        self,
        waypoints: List[Waypoint]
    ) -> Dict[str, float]:
        """
        Calculate statistics for the generated mission
        
        Returns:
            Dictionary with mission statistics:
            - total_waypoints: Number of waypoints
            - total_distance: Total flight distance (meters)
            - estimated_time: Estimated flight time (seconds)
            - area_covered: Approximate area covered (square meters)
            - num_photos: Estimated number of photos
        """
        if not waypoints:
            return {
                "total_waypoints": 0,
                "total_distance": 0,
                "estimated_time": 0,
                "area_covered": 0,
                "num_photos": 0
            }
        
        # Calculate total distance using Haversine formula
        total_distance = 0.0
        
        for i in range(len(waypoints) - 1):
            wp1 = waypoints[i]
            wp2 = waypoints[i + 1]
            
            distance = self._haversine_distance(
                wp1.latitude, wp1.longitude,
                wp2.latitude, wp2.longitude
            )
            total_distance += distance
        
        # Estimate flight time (assume 15 m/s cruise speed + photo time)
        cruise_speed = 15.0  # m/s
        photo_time = 2.0  # seconds per photo
        
        flight_time = total_distance / cruise_speed
        photo_count = len([wp for wp in waypoints if wp.action == "capture_photo"])
        total_time = flight_time + (photo_count * photo_time)
        
        # Calculate area (polygon area)
        to_local, _ = self._get_local_transformer()
        polygon_local = transform(to_local, self.polygon)
        area = polygon_local.area
        
        return {
            "total_waypoints": len(waypoints),
            "total_distance": round(total_distance, 2),
            "estimated_time": round(total_time, 2),
            "area_covered": round(area, 2),
            "num_photos": photo_count
        }
    
    @staticmethod
    def _haversine_distance(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate distance between two points using Haversine formula
        
        Mathematical derivation:
        
        The Haversine formula calculates the great-circle distance between
        two points on a sphere given their longitudes and latitudes.
        
        Formula:
        a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
        c = 2 * atan2(√a, √(1-a))
        d = R * c
        
        Where:
        - φ = latitude in radians
        - λ = longitude in radians
        - R = Earth's radius (6,371,000 meters)
        - d = distance in meters
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
            
        Returns:
            Distance in meters
        """
        R = 6371000  # Earth's radius in meters
        
        # Convert degrees to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = math.sin(delta_lat/2)**2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        distance = R * c
        
        return distance


def create_example_polygon() -> Dict:
    """
    Create an example GeoJSON polygon for testing
    
    Returns a rectangular area in San Francisco
    """
    return {
        "type": "Polygon",
        "coordinates": [[
            [-122.4200, 37.7750],  # Southwest corner
            [-122.4180, 37.7750],  # Southeast corner
            [-122.4180, 37.7770],  # Northeast corner
            [-122.4200, 37.7770],  # Northwest corner
            [-122.4200, 37.7750]   # Close the polygon
        ]]
    }
