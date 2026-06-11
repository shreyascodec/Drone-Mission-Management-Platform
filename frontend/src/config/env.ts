/**
 * Environment Configuration
 * 
 * Centralized configuration for API endpoints
 */

const getAPIBaseURL = () => {
  // In development, Vite proxy handles this
  // In production, use environment variable or same origin
  if (import.meta.env.DEV) {
    return '' // Proxy handles /api → localhost:8000/api
  }
  
  return import.meta.env.VITE_API_URL || ''
}

const getWSBaseURL = () => {
  if (import.meta.env.DEV) {
    return 'ws://localhost:8000'
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`
}

export const config = {
  api: {
    baseURL: getAPIBaseURL(),
    timeout: 30000,
  },
  websocket: {
    baseURL: getWSBaseURL(),
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  },
  features: {
    useBackend: import.meta.env.VITE_USE_BACKEND !== 'false', // Default true
    simulateProgress: import.meta.env.VITE_SIMULATE_PROGRESS === 'true', // Default false when backend connected
  }
}

export default config
