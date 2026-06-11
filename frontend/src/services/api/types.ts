/**
 * API Request/Response Types
 * 
 * Type definitions for all API endpoints
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiErrorResponse {
  detail?: string
  message?: string
  error?: string
  status?: number
}

// ============================================================================
// Mission Types
// ============================================================================

export interface CreateMissionRequest {
  name: string
  description?: string
  type: string
  altitude: number
  speed: number
  waypoints: Array<{
    latitude: number
    longitude: number
    altitude: number
  }>
  forward_overlap?: number
  side_overlap?: number
  data_collection_frequency?: number
  sensors?: string[]
}

export interface UpdateMissionRequest {
  name?: string
  description?: string
  status?: string
  progress_percent?: number
  waypoints_completed?: number
}

export interface MissionListParams {
  status?: string
  type?: string
}

// ============================================================================
// Drone Types
// ============================================================================

export interface CreateDroneRequest {
  name: string
  serial_number: string
  model: string
  specs?: {
    max_speed?: number
    max_altitude?: number
    max_range?: number
    battery_capacity?: number
  }
}

export interface UpdateDroneRequest {
  name?: string
  status?: string
  battery_percent?: number
  position?: {
    latitude: number
    longitude: number
    altitude: number
  }
}

export interface DroneListParams {
  status?: string
}

// ============================================================================
// Simulation Types
// ============================================================================

export interface StartSimulationRequest {
  mission_id: string
}

export interface SimulationResponse {
  simulation_id: string
  status: string
  current_position?: {
    lat: number
    lon: number
    altitude: number
  }
  progress?: number
  battery_percent?: number
}

// ============================================================================
// Waypoint Types
// ============================================================================

export interface CreateWaypointsRequest {
  waypoints: Array<{
    latitude: number
    longitude: number
    altitude: number
    sequence?: number
    action?: string
    dwell_time?: number
  }>
}

// ============================================================================
// Event Types
// ============================================================================

export interface CreateEventRequest {
  mission_id: string
  type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  data?: Record<string, unknown>
}

export interface EventListParams {
  mission_id?: string
  type?: string
}
