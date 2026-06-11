/**
 * Health API
 * 
 * Health check and status endpoints
 */

import APIClient from './client'

class HealthAPI extends APIClient {
  /**
   * Check backend health
   */
  async checkHealth(): Promise<{ status: string; version?: string }> {
    return this.get<{ status: string; version?: string }>('/health')
  }
}

export const healthAPI = new HealthAPI()
