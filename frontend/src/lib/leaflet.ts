/**
 * Leaflet utilities and configuration
 * 
 * Provider-agnostic mapping utilities using Leaflet + OpenStreetMap.
 * No API keys or paid services required.
 */

import L from 'leaflet'

// ==================== CONFIGURATION ====================

/**
 * OpenStreetMap tile layer configuration
 * Free, no API key required
 */
export const OSM_TILE_LAYER = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  minZoom: 1,
}

/**
 * Default map center (San Francisco)
 */
export const DEFAULT_CENTER: [number, number] = [37.7749, -122.4194]

/**
 * Default zoom level
 */
export const DEFAULT_ZOOM = 13

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate bearing between two points (in degrees)
 * Used for drone heading calculations
 */
export function calculateBearing(
  from: [number, number],
  to: [number, number]
): number {
  const [lat1, lon1] = from
  const [lat2, lon2] = to

  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const lat1Rad = (lat1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180

  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI

  return (bearing + 360) % 360
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const lngDir = lng >= 0 ? 'E' : 'W'
  const latDir = lat >= 0 ? 'N' : 'S'

  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`
}

/**
 * Create a custom drone icon for Leaflet markers
 */
export function createDroneIcon(
  status: string,
  heading: number = 0,
  size: number = 32
): L.DivIcon {
  const color = getStatusColor(status)
  
  return L.divIcon({
    className: 'custom-drone-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transform: rotate(${heading}deg);
        transition: transform 0.3s ease;
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="white">
          <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

/**
 * Create a styled polyline for flight paths
 */
export function createFlightPathPolyline(
  coordinates: L.LatLngExpression[],
  color: string = '#3b82f6',
  options?: L.PolylineOptions
): L.Polyline {
  return L.polyline(coordinates, {
    color,
    weight: 3,
    opacity: 0.8,
    smoothFactor: 1,
    ...options,
  })
}

/**
 * Create a styled polygon for survey areas
 */
export function createSurveyPolygon(
  coordinates: L.LatLngExpression[],
  options?: L.PolylineOptions
): L.Polygon {
  return L.polygon(coordinates, {
    color: '#3b82f6',
    weight: 2,
    opacity: 0.8,
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    ...options,
  })
}

/**
 * Create a waypoint circle marker
 */
export function createWaypointMarker(
  position: L.LatLngExpression,
  sequence: number,
  status: 'completed' | 'current' | 'pending' = 'pending'
): L.CircleMarker {
  const colors = {
    completed: '#10b981',
    current: '#3b82f6',
    pending: '#6b7280',
  }

  const marker = L.circleMarker(position, {
    radius: 8,
    color: '#ffffff',
    weight: 2,
    fillColor: colors[status],
    fillOpacity: 1,
  })

  // Add sequence number as tooltip
  marker.bindTooltip(`${sequence}`, {
    permanent: true,
    direction: 'center',
    className: 'waypoint-label',
  })

  return marker
}

/**
 * Calculate bounds for a set of coordinates
 */
export function calculateBounds(coordinates: [number, number][]): L.LatLngBounds {
  if (coordinates.length === 0) {
    return L.latLngBounds(DEFAULT_CENTER, DEFAULT_CENTER)
  }

  return L.latLngBounds(coordinates)
}

/**
 * Animate marker along a path
 * Returns a function to stop the animation
 */
export function animateMarkerAlongPath(
  marker: L.Marker,
  path: [number, number][],
  duration: number,
  onProgress?: (progress: number) => void,
  onComplete?: () => void
): () => void {
  if (path.length < 2) {
    onComplete?.()
    return () => {}
  }

  let animationFrame: number
  let startTime: number | null = null
  let isAnimating = true

  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Calculate current position along path
    const segmentLength = 1 / (path.length - 1)
    const segmentIndex = Math.floor(progress / segmentLength)
    const segmentProgress = (progress % segmentLength) / segmentLength

    if (segmentIndex < path.length - 1) {
      const start = path[segmentIndex]
      const end = path[segmentIndex + 1]
      
      // Linear interpolation
      const lat = start[0] + (end[0] - start[0]) * segmentProgress
      const lng = start[1] + (end[1] - start[1]) * segmentProgress
      
      marker.setLatLng([lat, lng])

      // Calculate and update heading
      const heading = calculateBearing([start[0], start[1]], [end[0], end[1]])
      updateMarkerHeading(marker, heading)

      onProgress?.(progress)
    }

    if (progress < 1 && isAnimating) {
      animationFrame = requestAnimationFrame(animate)
    } else {
      onComplete?.()
    }
  }

  animationFrame = requestAnimationFrame(animate)

  // Return stop function
  return () => {
    isAnimating = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  }
}

/**
 * Update marker heading (rotation)
 */
export function updateMarkerHeading(marker: L.Marker, heading: number): void {
  const icon = marker.getElement()
  if (!icon) return

  const innerDiv = icon.querySelector('div') as HTMLDivElement
  if (innerDiv) {
    innerDiv.style.transform = `rotate(${heading}deg)`
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get status color for markers
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#10b981',
    idle: '#6b7280',
    error: '#ef4444',
    offline: '#9ca3af',
    paused: '#f59e0b',
  }
  return colors[status.toLowerCase()] || '#3b82f6'
}

/**
 * Get battery text color class
 */
export function getBatteryTextColor(battery: number): string {
  if (battery > 50) return 'text-green-600'
  if (battery > 20) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Get status text color class
 */
export function getStatusTextColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-600',
    idle: 'text-gray-600',
    error: 'text-red-600',
    offline: 'text-gray-400',
    paused: 'text-yellow-600',
  }
  return colors[status.toLowerCase()] || 'text-blue-600'
}
