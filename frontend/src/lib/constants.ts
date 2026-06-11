/**
 * Application Constants
 * 
 * Centralized constants to avoid magic numbers and strings
 */

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_VALUES = {
  ACTIVE_MISSIONS: 0,
  CONNECTED_DRONES: 0,
  DEFAULT_ALTITUDE: 100,
  DEFAULT_SPEED: 12,
  MIN_ALTITUDE: 0,
  MAX_ALTITUDE: 6000,
  MIN_SPEED: 0,
  MAX_SPEED: 30,
  LOW_BATTERY_THRESHOLD: 20,
  CRITICAL_BATTERY_THRESHOLD: 10,
} as const

// ============================================================================
// Colors
// ============================================================================

export const COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4',
} as const

// ============================================================================
// Status Values
// ============================================================================

export const MISSION_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ABORTED: 'aborted',
  FAILED: 'failed',
} as const

export const DRONE_STATUS = {
  IDLE: 'idle',
  ACTIVE: 'active',
  CHARGING: 'charging',
  MAINTENANCE: 'maintenance',
  ERROR: 'error',
  OFFLINE: 'offline',
} as const

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const

// ============================================================================
// WebSocket Configuration
// ============================================================================

export const WS_CONFIG = {
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 30000,
} as const

// ============================================================================
// Map Configuration
// ============================================================================

export const MAP_CONFIG = {
  DEFAULT_CENTER: [37.7749, -122.4194] as [number, number],
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
} as const
