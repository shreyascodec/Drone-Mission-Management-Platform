/**
 * API Error Classes
 * 
 * Centralized error handling for API calls
 */

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'APIError'
    Object.setPrototypeOf(this, APIError.prototype)
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error - backend may be unavailable') {
    super(message)
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404
    )
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}
