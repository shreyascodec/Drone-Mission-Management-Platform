/**
 * Simulations API
 *
 * The backend flow is: create a simulation for a mission (waypoints are
 * loaded server-side from the mission), then start it.
 */

import APIClient from './client'
import { APIError } from './errors'
import type { SimulationResponse } from './types'

interface SimulationStatusResponse {
  mission_id: string
  status: string
  message: string
}

class SimulationsAPI extends APIClient {
  /**
   * Create and start a simulation for a mission
   */
  async startSimulation(missionId: string): Promise<SimulationStatusResponse> {
    try {
      await this.post<SimulationStatusResponse>('/simulations', { mission_id: missionId })
    } catch (error) {
      // 409 = a simulation is already running for this mission
      if (!(error instanceof APIError && error.status === 409)) {
        throw error
      }
    }
    return this.post<SimulationStatusResponse>(`/simulations/${missionId}/start`)
  }

  /**
   * Get simulation state
   */
  async getSimulation(id: string): Promise<SimulationResponse> {
    return this.get<SimulationResponse>(`/simulations/${id}`)
  }

  /**
   * Pause a simulation
   */
  async pauseSimulation(id: string): Promise<SimulationStatusResponse> {
    return this.post(`/simulations/${id}/pause`)
  }

  /**
   * Resume a simulation
   */
  async resumeSimulation(id: string): Promise<SimulationStatusResponse> {
    return this.post(`/simulations/${id}/resume`)
  }

  /**
   * Stop a simulation
   */
  async stopSimulation(id: string): Promise<SimulationStatusResponse> {
    return this.post(`/simulations/${id}/stop`)
  }

  /**
   * Alias for getSimulation (kept for callers expecting explicit state)
   */
  async getSimulationState(id: string): Promise<SimulationResponse> {
    return this.getSimulation(id)
  }
}

export const simulationsAPI = new SimulationsAPI()
