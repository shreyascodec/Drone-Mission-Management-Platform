/**
 * Performance Monitoring
 * 
 * Track and monitor application performance:
 * - Page load times
 * - Component render times
 * - API response times
 * - User interactions
 * - Error tracking
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

interface ErrorLog {
  message: string
  stack?: string
  timestamp: number
  context?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private errors: ErrorLog[] = []
  private maxMetrics = 1000
  private maxErrors = 100

  /**
   * Mark a performance event
   */
  mark(name: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(name)
    }
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark: string): number | null {
    if (typeof performance === 'undefined') return null

    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name, 'measure')[0]
      const duration = measure?.duration || 0

      this.recordMetric(name, duration)
      return duration
    } catch (error) {
      console.warn('Performance measurement failed:', error)
      return null
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log slow operations
    if (value > 1000) {
      console.warn(`Slow operation detected: ${name} took ${value}ms`)
    }
  }

  /**
   * Log an error
   */
  logError(error: Error | string, context?: Record<string, any>) {
    const errorLog: ErrorLog = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: Date.now(),
      context,
    }

    this.errors.push(errorLog)

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    console.error('Error logged:', errorLog)

    // TODO: Send to monitoring service
    // this.sendToMonitoringService(errorLog)
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name)
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string): number | null {
    const metrics = this.getMetricsByName(name)
    if (metrics.length === 0) return null

    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return sum / metrics.length
  }

  /**
   * Get all errors
   */
  getErrors(): ErrorLog[] {
    return [...this.errors]
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = []
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = []
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const metricsByName = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = []
      }
      acc[metric.name].push(metric.value)
      return acc
    }, {} as Record<string, number[]>)

    const summary = Object.entries(metricsByName).map(([name, values]) => ({
      name,
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    }))

    return {
      metrics: summary,
      totalMetrics: this.metrics.length,
      totalErrors: this.errors.length,
      recentErrors: this.errors.slice(-5),
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Hook-like function to measure component render time
 */
export function measureRender(componentName: string) {
  const startMark = `${componentName}-render-start`
  const endMark = `${componentName}-render-end`
  const measureName = `${componentName}-render`

  performanceMonitor.mark(startMark)

  return () => {
    performanceMonitor.mark(endMark)
    performanceMonitor.measure(measureName, startMark, endMark)
  }
}

/**
 * Measure async operation
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now()

  try {
    const result = await operation()
    const duration = Date.now() - start
    performanceMonitor.recordMetric(name, duration)
    return result
  } catch (error) {
    const duration = Date.now() - start
    performanceMonitor.recordMetric(`${name}-error`, duration)
    performanceMonitor.logError(error as Error, { operation: name })
    throw error
  }
}

/**
 * Measure API call
 */
export async function measureAPICall<T>(
  endpoint: string,
  request: () => Promise<T>
): Promise<T> {
  return measureAsync(`api-${endpoint}`, request)
}

/**
 * Log page navigation
 */
export function logPageNavigation(from: string, to: string) {
  performanceMonitor.recordMetric('page-navigation', Date.now(), { from, to })
}

/**
 * Log user interaction
 */
export function logUserInteraction(action: string, target: string, metadata?: Record<string, any>) {
  performanceMonitor.recordMetric('user-interaction', Date.now(), {
    action,
    target,
    ...metadata,
  })
}

/**
 * Get Web Vitals (if available)
 */
export function getWebVitals() {
  if (typeof performance === 'undefined') return null

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const paint = performance.getEntriesByType('paint')

  return {
    // Time to First Byte
    ttfb: navigation?.responseStart - navigation?.requestStart,
    // First Contentful Paint
    fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
    // DOM Content Loaded
    domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
    // Load Complete
    loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
    // DOM Interactive
    domInteractive: navigation?.domInteractive,
  }
}

/**
 * Start performance monitoring
 */
export function startPerformanceMonitoring() {
  // Monitor page load
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      const vitals = getWebVitals()
      if (vitals) {
        Object.entries(vitals).forEach(([name, value]) => {
          if (value) {
            performanceMonitor.recordMetric(`web-vitals-${name}`, value)
          }
        })
      }
    })

    // Monitor unhandled errors
    window.addEventListener('error', (event) => {
      performanceMonitor.logError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      performanceMonitor.logError(
        event.reason instanceof Error ? event.reason : String(event.reason),
        { type: 'unhandledRejection' }
      )
    })

    console.log('✅ Performance monitoring started')
  }
}

/**
 * Get performance report
 */
export function getPerformanceReport() {
  const summary = performanceMonitor.getSummary()
  const vitals = getWebVitals()

  return {
    summary,
    vitals,
    timestamp: new Date().toISOString(),
  }
}

export default performanceMonitor
