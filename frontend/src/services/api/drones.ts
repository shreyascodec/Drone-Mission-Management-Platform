/**
 * Drones API
 * 
 * Drone-related API endpoints
 */

import APIClient from './client'
import type { Drone } from '@/types'
import type {
  CreateDroneRequest,
  UpdateDroneRequest,
  DroneListParams,
} from './types'

class DronesAPI extends APIClient {
  /**
   * Get all drones
   */
  async getDrones(params?: DroneListParams): Promise<Drone[]> {
    return this.get<Drone[]>('/drones', params as Record<string, string>)
  }

  /**
   * Get a single drone by ID
   */
  async getDrone(id: string): Promise<Drone> {
    return this.get<Drone>(`/drones/${id}`)
  }

  /**
   * Create a new drone
   */
  async createDrone(data: CreateDroneRequest): Promise<Drone> {
    return this.post<Drone>('/drones', data)
  }

  /**
   * Update a drone
   */
  async updateDrone(id: string, data: UpdateDroneRequest): Promise<Drone> {
    return this.put<Drone>(`/drones/${id}`, data)
  }

  /**
   * Delete a drone
   */
  async deleteDrone(id: string): Promise<void> {
    return this.delete<void>(`/drones/${id}`)
  }
}

export const dronesAPI = new DronesAPI()
