/**
 * Unified API Service
 * 
 * Single entry point for all API calls
 * Replaces both api.ts and backendAPI.ts
 */

// Export all API modules
export { missionsAPI } from './missions'
export { dronesAPI } from './drones'
export { simulationsAPI } from './simulations'
export { healthAPI } from './health'

// Export error classes
export {
  APIError,
  NetworkError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from './errors'

// Export types
export type * from './types'

// Default export for backward compatibility
import { healthAPI } from './health'
import { missionsAPI } from './missions'
import { dronesAPI } from './drones'
import { simulationsAPI } from './simulations'

const api = {
  // Health
  checkHealth: () => healthAPI.checkHealth(),

  // Missions
  getMissions: (params?: { status?: string; type?: string }) =>
    missionsAPI.getMissions(params),
  getMission: (id: string) => missionsAPI.getMission(id),
  createMission: (data: Parameters<typeof missionsAPI.createMission>[0]) =>
    missionsAPI.createMission(data),
  updateMission: (id: string, data: Parameters<typeof missionsAPI.updateMission>[1]) =>
    missionsAPI.updateMission(id, data),
  deleteMission: (id: string) => missionsAPI.deleteMission(id),
  getMissionStatistics: (id: string) => missionsAPI.getMissionStatistics(id),

  // Drones
  getDrones: (params?: { status?: string }) => dronesAPI.getDrones(params),
  getDrone: (id: string) => dronesAPI.getDrone(id),
  createDrone: (data: Parameters<typeof dronesAPI.createDrone>[0]) =>
    dronesAPI.createDrone(data),
  updateDrone: (id: string, data: Parameters<typeof dronesAPI.updateDrone>[1]) =>
    dronesAPI.updateDrone(id, data),
  deleteDrone: (id: string) => dronesAPI.deleteDrone(id),

  // Simulations
  startSimulation: (missionId: string) => simulationsAPI.startSimulation(missionId),
  getSimulation: (id: string) => simulationsAPI.getSimulation(id),
  pauseSimulation: (id: string) => simulationsAPI.pauseSimulation(id),
  resumeSimulation: (id: string) => simulationsAPI.resumeSimulation(id),
  stopSimulation: (id: string) => simulationsAPI.stopSimulation(id),
  getSimulationState: (id: string) => simulationsAPI.getSimulationState(id),
}

export default api
