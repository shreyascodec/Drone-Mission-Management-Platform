/**
 * Type definitions for Drone Mission Control
 */

// ============================================================================
// Position & Location Types
// ============================================================================

export interface Position {
  longitude: number
  latitude: number
  altitude: number
  speed: number
  heading: number
  vertical_speed: number
}

export interface Waypoint {
  id?: string
  sequence: number
  longitude: number
  latitude: number
  altitude: number
  action?: string
  dwell_time?: number
  status?: 'pending' | 'reached' | 'skipped'
}

/** Waypoint shape stored on a mission (as returned by the backend) */
export interface MissionWaypoint {
  latitude: number
  longitude: number
  altitude: number
}

// ============================================================================
// Mission Types
// ============================================================================

export type MissionStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'active' 
  | 'paused' 
  | 'completed' 
  | 'aborted' 
  | 'failed'

export type MissionType = 
  | 'survey' 
  | 'inspection' 
  | 'delivery' 
  | 'monitoring' 
  | 'emergency'

export interface Mission {
  id: string
  name: string
  description?: string
  type: MissionType
  status: MissionStatus
  drone_id?: string
  
  // Scheduling
  scheduled_start?: string
  scheduled_end?: string
  started_at?: string
  completed_at?: string
  
  // Flight plan
  waypoints?: MissionWaypoint[]

  // Progress
  progress_percent: number
  waypoints_completed: number
  total_waypoints: number

  // Statistics
  total_distance?: number
  elapsed_time?: number
  estimated_completion?: string

  // Metadata
  created_at: string
  updated_at: string
  created_by?: string
}

export interface MissionWithWaypoints extends Mission {
  waypoints: Waypoint[]
}

export interface MissionProgress {
  percent: number
  waypoints_completed: number
  total_waypoints: number
  distance_to_next: number
}

// ============================================================================
// Drone Types
// ============================================================================

export type DroneStatus = 
  | 'idle' 
  | 'active' 
  | 'charging' 
  | 'maintenance' 
  | 'error' 
  | 'offline'

export interface Drone {
  id: string
  name: string
  serial_number: string
  model: string
  status: DroneStatus
  
  // Current state
  current_mission_id?: string
  position?: Position
  battery_percent: number
  battery_voltage?: number
  
  // Specifications
  max_speed: number
  max_altitude: number
  max_range: number
  battery_capacity: number
  
  // Statistics
  total_flight_time?: number
  total_distance?: number
  missions_completed?: number
  health_score?: number
  
  // Metadata
  last_seen?: string
  created_at: string
  updated_at: string
}

// ============================================================================
// Simulation Types
// ============================================================================

export interface SimulationState {
  mission_id: string
  status: 'idle' | 'active' | 'paused' | 'completed' | 'aborted'
  
  position: Position
  
  target_waypoint: number
  waypoints_completed: number
  total_waypoints: number
  progress_percent: number
  
  total_distance_traveled: number
  distance_to_next_waypoint: number
  
  battery_percent: number
  battery_voltage: number
  
  elapsed_time: number
  average_speed: number
  max_speed_reached: number
  max_altitude_reached: number
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type WebSocketMessageType = 
  | 'initial_state'
  | 'update'
  | 'event'
  | 'command_response'
  | 'error'

export type SimulationEventType = 
  | 'mission_started'
  | 'mission_paused'
  | 'mission_resumed'
  | 'mission_completed'
  | 'mission_aborted'
  | 'waypoint_reached'
  | 'battery_low'
  | 'battery_critical'
  | 'position_update'
  | 'progress_update'
  | 'error'

export interface WebSocketMessage {
  type: WebSocketMessageType
  mission_id?: string
  timestamp: string
  data?: any
  event_type?: SimulationEventType
  message?: string
}

export interface SimulationUpdate {
  position: Position
  progress: MissionProgress
  battery: {
    percent: number
    voltage: number
  }
  status: string
  elapsed_time: number
  total_distance: number
}

// ============================================================================
// Event Types
// ============================================================================

export interface MissionEvent {
  id: string
  mission_id: string
  event_type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  data?: any
  timestamp: string
}

// ============================================================================
// Telemetry Types
// ============================================================================

export interface Telemetry {
  drone_id: string
  mission_id?: string
  
  position: Position
  
  battery_percent: number
  battery_voltage: number
  battery_current?: number
  
  signal_strength?: number
  gps_satellites?: number
  gps_accuracy?: number
  
  temperature?: number
  humidity?: number
  
  timestamp: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// Filter & Query Types
// ============================================================================

export interface MissionFilters {
  status?: MissionStatus[]
  type?: MissionType[]
  drone_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface DroneFilters {
  status?: DroneStatus[]
  search?: string
  available_only?: boolean
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface DashboardStats {
  total_missions: number
  active_missions: number
  completed_missions: number
  total_drones: number
  active_drones: number
  available_drones: number
  total_flight_time: number
  total_distance: number
}

export interface MissionStatistics {
  total: number
  by_status: Record<MissionStatus, number>
  by_type: Record<MissionType, number>
  avg_duration: number
  success_rate: number
}

// ============================================================================
// Map Types
// ============================================================================

export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch?: number
  bearing?: number
}

export interface MapMarker {
  id: string
  type: 'drone' | 'waypoint' | 'home' | 'poi'
  position: [number, number] // [lng, lat]
  data?: any
}

// ============================================================================
// Theme Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system'

// ============================================================================
// User Preferences
// ============================================================================

export interface UserPreferences {
  theme: Theme
  map_style: string
  show_flight_paths: boolean
  show_telemetry: boolean
  auto_follow_drone: boolean
  notifications_enabled: boolean
}
