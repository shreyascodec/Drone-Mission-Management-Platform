/**
 * Unified API Client
 * 
 * Single source of truth for all API communication
 */

import { config } from '@/config/env'
import { performanceMonitor } from '@/lib/performanceMonitoring'
import { API_CONFIG } from '@/lib/constants'
import { APIError, NetworkError } from './errors'

// In dev, baseURL is '' and the Vite proxy forwards /api to the backend.
// In production, VITE_API_URL points at the backend origin.
const API_BASE = `${config.api.baseURL}/api/v1`

/**
 * Fetch with error handling and performance monitoring
 */
async function fetchWithError(url: string, options?: RequestInit): Promise<Response> {
  const startTime = Date.now()
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
    })

    const duration = Date.now() - startTime
    performanceMonitor.recordMetric(`api-${url}`, duration)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new APIError(
        errorData.detail || errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      )
    }

    return response
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('Request timeout - backend may be unavailable')
    }
    
    performanceMonitor.logError(error as Error, { url, method: options?.method })
    throw new NetworkError('Network error - backend may be unavailable')
  }
}

/**
 * Base API client class
 */
class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE) {
    this.baseURL = baseURL
  }

  /**
   * Generic request method
   */
  protected async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const response = await fetchWithError(url, options)
    return response.json()
  }

  /**
   * GET request
   */
  protected async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const query = params ? `?${new URLSearchParams(params)}` : ''
    return this.request<T>(`${endpoint}${query}`)
  }

  /**
   * POST request
   */
  protected async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  protected async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

export default APIClient
