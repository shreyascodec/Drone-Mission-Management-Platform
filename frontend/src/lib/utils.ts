import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistance as formatRelativeDistance, intervalToDuration } from 'date-fns'

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, formatStr: string = 'PPp'): string {
  return format(new Date(date), formatStr)
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: string | Date): string {
  return formatRelativeDistance(new Date(date), new Date(), { addSuffix: true })
}

/**
 * Format duration in seconds to human readable
 */
export function formatDurationSeconds(seconds: number): string {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 })
  
  const parts: string[] = []
  
  if (duration.hours) parts.push(`${duration.hours}h`)
  if (duration.minutes) parts.push(`${duration.minutes}m`)
  if (duration.seconds) parts.push(`${duration.seconds}s`)
  
  return parts.join(' ') || '0s'
}

/**
 * Format distance in meters
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(0)}m`
  }
  
  return `${(meters / 1000).toFixed(2)}km`
}

/**
 * Format speed in m/s
 */
export function formatSpeed(metersPerSecond: number): string {
  return `${metersPerSecond.toFixed(1)} m/s`
}

/**
 * Format altitude
 */
export function formatAltitude(meters: number): string {
  return `${meters.toFixed(1)}m`
}

/**
 * Format battery percentage
 */
export function formatBattery(percent: number): string {
  return `${percent.toFixed(1)}%`
}

/**
 * Get battery color based on percentage
 */
export function getBatteryColor(percent: number): string {
  if (percent > 50) return 'text-green-500'
  if (percent > 20) return 'text-yellow-500'
  return 'text-red-500'
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-500',
    idle: 'text-gray-500',
    paused: 'text-yellow-500',
    completed: 'text-blue-500',
    aborted: 'text-red-500',
    failed: 'text-red-500',
    charging: 'text-blue-400',
    maintenance: 'text-orange-500',
    error: 'text-red-600',
    offline: 'text-gray-400',
  }
  
  return colors[status.toLowerCase()] || 'text-gray-500'
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Download data as JSON file
 */
export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}
