/**
 * Missions API
 * 
 * Mission-related API endpoints
 */

import APIClient from './client'
import type { Mission } from '@/types'
import type {
  CreateMissionRequest,
  UpdateMissionRequest,
  MissionListParams,
} from './types'

class MissionsAPI extends APIClient {
  /**
   * Get all missions
   */
  async getMissions(params?: MissionListParams): Promise<Mission[]> {
    return this.get<Mission[]>('/missions', params as Record<string, string>)
  }

  /**
   * Get a single mission by ID
   */
  async getMission(id: string): Promise<Mission> {
    return this.get<Mission>(`/missions/${id}`)
  }

  /**
   * Create a new mission
   */
  async createMission(data: CreateMissionRequest): Promise<Mission> {
    return this.post<Mission>('/missions', data)
  }

  /**
   * Update a mission
   */
  async updateMission(id: string, data: UpdateMissionRequest): Promise<Mission> {
    return this.put<Mission>(`/missions/${id}`, data)
  }

  /**
   * Delete a mission
   */
  async deleteMission(id: string): Promise<void> {
    return this.delete<void>(`/missions/${id}`)
  }

  /**
   * Get mission statistics
   */
  async getMissionStatistics(id: string): Promise<{
    mission_id: string
    progress_percent: number
    waypoints_completed: number
    total_waypoints: number
    total_distance: number
    elapsed_time: number
    status: string
  }> {
    return this.get(`/missions/${id}/statistics`)
  }
}

export const missionsAPI = new MissionsAPI()
