/**
 * Coverage Calculation Utilities
 * 
 * Calculates survey coverage area based on:
 * - Camera sensor specs (width, height, focal length)
 * - Flight altitude
 * - Overlap percentage (forward and side)
 * - Survey pattern (grid, crosshatch, perimeter)
 * 
 * Uses standard photogrammetry formulas:
 * - Ground Sample Distance (GSD) = (sensor_width * altitude) / (focal_length * image_width)
 * - Coverage width = sensor_width * altitude / focal_length
 * - Coverage height = sensor_height * altitude / focal_length
 * - Flight line spacing = coverage_width * (1 - side_overlap)
 * - Photo interval = coverage_height * (1 - forward_overlap) / speed
 */

export interface CameraSpecs {
  sensorWidth: number        // mm
  sensorHeight: number       // mm
  focalLength: number        // mm
  imageWidth: number         // pixels
  imageHeight: number        // pixels
}

export interface MissionParameters {
  altitude: number           // meters
  speed: number             // m/s
  forwardOverlap: number    // percentage (0-100)
  sideOverlap: number       // percentage (0-100)
  pattern: 'grid' | 'crosshatch' | 'perimeter'
  surveyArea?: GeoJSON.Polygon  // Survey boundary
}

export interface CoverageMetrics {
  gsd: number                    // Ground Sample Distance (cm/pixel)
  footprintWidth: number         // meters
  footprintHeight: number        // meters
  flightLineSpacing: number      // meters
  photoInterval: number          // seconds
  estimatedPhotos: number
  estimatedFlightTime: number    // minutes
  estimatedDistance: number      // kilometers
  surveyArea: number            // square kilometers
  batteryEstimate: number       // percentage needed
}

/**
 * Default camera specifications (DJI Phantom 4 Pro as reference)
 */
export const DEFAULT_CAMERA: CameraSpecs = {
  sensorWidth: 13.2,      // mm (1" sensor)
  sensorHeight: 8.8,      // mm
  focalLength: 8.8,       // mm
  imageWidth: 5472,       // pixels (20MP)
  imageHeight: 3648,      // pixels
}

/**
 * Calculate Ground Sample Distance (GSD)
 * 
 * GSD = (sensor_width * altitude) / (focal_length * image_width)
 * 
 * Lower GSD = higher resolution imagery
 */
export function calculateGSD(
  camera: CameraSpecs,
  altitude: number
): number {
  // Convert to cm/pixel
  const gsd = (camera.sensorWidth * altitude * 100) / 
              (camera.focalLength * camera.imageWidth)
  return Math.round(gsd * 100) / 100
}

/**
 * Calculate camera footprint at given altitude
 * 
 * Footprint = (sensor_dimension * altitude) / focal_length
 */
export function calculateFootprint(
  camera: CameraSpecs,
  altitude: number
): { width: number; height: number } {
  const width = (camera.sensorWidth * altitude) / camera.focalLength
  const height = (camera.sensorHeight * altitude) / camera.focalLength
  
  return {
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  }
}

/**
 * Calculate flight line spacing based on overlap
 * 
 * Spacing = footprint_width * (1 - side_overlap / 100)
 */
export function calculateFlightLineSpacing(
  footprintWidth: number,
  sideOverlap: number
): number {
  const spacing = footprintWidth * (1 - sideOverlap / 100)
  return Math.round(spacing * 100) / 100
}

/**
 * Calculate photo capture interval
 * 
 * Interval = (footprint_height * (1 - forward_overlap / 100)) / speed
 */
export function calculatePhotoInterval(
  footprintHeight: number,
  forwardOverlap: number,
  speed: number
): number {
  const interval = (footprintHeight * (1 - forwardOverlap / 100)) / speed
  return Math.round(interval * 100) / 100
}

/**
 * Calculate total survey area from polygon
 */
export function calculatePolygonArea(polygon: GeoJSON.Polygon): number {
  if (!polygon.coordinates || polygon.coordinates.length === 0) {
    return 0
  }

  const coords = polygon.coordinates[0]
  let area = 0

  // Shoelace formula for polygon area
  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i]
    const [x2, y2] = coords[i + 1]
    area += x1 * y2 - x2 * y1
  }

  area = Math.abs(area) / 2

  // Convert from degrees to square meters (approximate)
  // 1 degree latitude ≈ 111km, 1 degree longitude ≈ 111km * cos(latitude)
  const avgLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
  const latToMeters = 111000
  const lonToMeters = 111000 * Math.cos((avgLat * Math.PI) / 180)
  
  const areaMeters = area * latToMeters * lonToMeters
  const areaKm = areaMeters / 1000000
  
  return Math.round(areaKm * 100) / 100
}

/**
 * Calculate estimated number of photos
 */
export function estimatePhotoCount(
  surveyArea: number,        // km²
  footprintWidth: number,    // meters
  footprintHeight: number,   // meters
  forwardOverlap: number,    // percentage
  sideOverlap: number        // percentage
): number {
  // Effective coverage per photo after overlap
  const effectiveWidth = footprintWidth * (1 - sideOverlap / 100)
  const effectiveHeight = footprintHeight * (1 - forwardOverlap / 100)
  const effectiveAreaPerPhoto = (effectiveWidth * effectiveHeight) / 1000000 // km²
  
  const photoCount = Math.ceil(surveyArea / effectiveAreaPerPhoto)
  return photoCount
}

/**
 * Calculate estimated flight distance
 */
export function estimateFlightDistance(
  surveyArea: number,           // km²
  flightLineSpacing: number,    // meters
  pattern: 'grid' | 'crosshatch' | 'perimeter'
): number {
  // Rough estimation based on pattern
  const spacingKm = flightLineSpacing / 1000
  
  let distance: number
  
  switch (pattern) {
    case 'grid':
      // Distance ≈ sqrt(area) / spacing * sqrt(area)
      distance = Math.sqrt(surveyArea) / spacingKm * Math.sqrt(surveyArea)
      break
    case 'crosshatch':
      // Double the grid distance (two perpendicular passes)
      distance = 2 * (Math.sqrt(surveyArea) / spacingKm * Math.sqrt(surveyArea))
      break
    case 'perimeter':
      // Just the perimeter
      distance = 4 * Math.sqrt(surveyArea)
      break
    default:
      distance = 0
  }
  
  return Math.round(distance * 100) / 100
}

/**
 * Calculate estimated flight time
 */
export function estimateFlightTime(
  distance: number,  // km
  speed: number      // m/s
): number {
  const speedKmH = speed * 3.6
  const timeHours = distance / speedKmH
  const timeMinutes = timeHours * 60
  
  return Math.round(timeMinutes * 10) / 10
}

/**
 * Estimate battery consumption
 * 
 * Based on:
 * - Flight time
 * - Average consumption rate (simplified model)
 */
export function estimateBatteryUsage(
  flightTimeMinutes: number,
  avgBatteryLife: number = 25  // Average drone battery life in minutes
): number {
  const batteryPercent = (flightTimeMinutes / avgBatteryLife) * 100
  return Math.min(Math.round(batteryPercent), 100)
}

/**
 * Calculate comprehensive coverage metrics
 */
export function calculateCoverageMetrics(
  camera: CameraSpecs,
  params: MissionParameters
): CoverageMetrics {
  // Calculate GSD
  const gsd = calculateGSD(camera, params.altitude)
  
  // Calculate footprint
  const { width: footprintWidth, height: footprintHeight } = 
    calculateFootprint(camera, params.altitude)
  
  // Calculate flight line spacing
  const flightLineSpacing = calculateFlightLineSpacing(
    footprintWidth,
    params.sideOverlap
  )
  
  // Calculate photo interval
  const photoInterval = calculatePhotoInterval(
    footprintHeight,
    params.forwardOverlap,
    params.speed
  )
  
  // Calculate survey area
  const surveyArea = params.surveyArea 
    ? calculatePolygonArea(params.surveyArea)
    : 0
  
  // Estimate photos
  const estimatedPhotos = surveyArea > 0
    ? estimatePhotoCount(
        surveyArea,
        footprintWidth,
        footprintHeight,
        params.forwardOverlap,
        params.sideOverlap
      )
    : 0
  
  // Estimate distance
  const estimatedDistance = surveyArea > 0
    ? estimateFlightDistance(surveyArea, flightLineSpacing, params.pattern)
    : 0
  
  // Estimate flight time
  const estimatedFlightTime = estimateFlightTime(estimatedDistance, params.speed)
  
  // Estimate battery
  const batteryEstimate = estimateBatteryUsage(estimatedFlightTime)
  
  return {
    gsd,
    footprintWidth,
    footprintHeight,
    flightLineSpacing,
    photoInterval,
    estimatedPhotos,
    estimatedFlightTime,
    estimatedDistance,
    surveyArea,
    batteryEstimate,
  }
}

/**
 * Generate coverage preview grid cells
 * 
 * Creates a grid of rectangles showing coverage overlap
 */
export function generateCoverageGrid(
  polygon: GeoJSON.Polygon,
  footprintWidth: number,   // meters
  footprintHeight: number,  // meters
  sideOverlap: number,      // percentage
  forwardOverlap: number    // percentage
): GeoJSON.Feature<GeoJSON.Polygon>[] {
  if (!polygon.coordinates || polygon.coordinates.length === 0) {
    return []
  }

  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = []
  const coords = polygon.coordinates[0]
  
  // Calculate bounds
  const lngs = coords.map(c => c[0])
  const lats = coords.map(c => c[1])
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const avgLat = (minLat + maxLat) / 2
  
  // Convert meters to degrees (approximate)
  const latToMeters = 111000
  const lonToMeters = 111000 * Math.cos((avgLat * Math.PI) / 180)
  
  const cellWidthDeg = (footprintWidth * (1 - sideOverlap / 100)) / lonToMeters
  const cellHeightDeg = (footprintHeight * (1 - forwardOverlap / 100)) / latToMeters
  
  // Generate grid cells
  let cellId = 0
  for (let lng = minLng; lng < maxLng; lng += cellWidthDeg) {
    for (let lat = minLat; lat < maxLat; lat += cellHeightDeg) {
      const cell: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[
          [lng, lat],
          [lng + cellWidthDeg, lat],
          [lng + cellWidthDeg, lat + cellHeightDeg],
          [lng, lat + cellHeightDeg],
          [lng, lat],
        ]],
      }
      
      features.push({
        type: 'Feature',
        properties: {
          cellId: cellId++,
          type: 'coverage-cell',
        },
        geometry: cell,
      })
    }
  }
  
  return features.slice(0, 500) // Limit to 500 cells for performance
}

/**
 * Format metrics for display
 */
export function formatCoverageMetrics(metrics: CoverageMetrics): {
  [key: string]: { label: string; value: string; unit: string }
} {
  return {
    gsd: {
      label: 'Ground Sample Distance',
      value: metrics.gsd.toFixed(2),
      unit: 'cm/pixel',
    },
    footprint: {
      label: 'Image Footprint',
      value: `${metrics.footprintWidth.toFixed(1)} × ${metrics.footprintHeight.toFixed(1)}`,
      unit: 'm',
    },
    spacing: {
      label: 'Flight Line Spacing',
      value: metrics.flightLineSpacing.toFixed(1),
      unit: 'm',
    },
    interval: {
      label: 'Photo Interval',
      value: metrics.photoInterval.toFixed(1),
      unit: 's',
    },
    photos: {
      label: 'Estimated Photos',
      value: metrics.estimatedPhotos.toString(),
      unit: 'photos',
    },
    distance: {
      label: 'Flight Distance',
      value: metrics.estimatedDistance.toFixed(1),
      unit: 'km',
    },
    time: {
      label: 'Flight Time',
      value: metrics.estimatedFlightTime.toFixed(1),
      unit: 'min',
    },
    area: {
      label: 'Survey Area',
      value: metrics.surveyArea.toFixed(2),
      unit: 'km²',
    },
    battery: {
      label: 'Battery Usage',
      value: metrics.batteryEstimate.toString(),
      unit: '%',
    },
  }
}
