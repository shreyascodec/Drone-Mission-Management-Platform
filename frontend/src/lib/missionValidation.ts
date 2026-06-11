/**
 * Mission Planning Validation & Presets
 * 
 * Comprehensive validation and quick preset configurations
 * for mission planning parameters
 */

export interface MissionValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface MissionPreset {
  id: string
  name: string
  description: string
  icon: string
  parameters: {
    altitude: number
    speed: number
    forwardOverlap: number
    sideOverlap: number
    pattern: 'grid' | 'crosshatch' | 'perimeter'
    gimbalAngle: number
  }
  suitableFor: string[]
}

// Quick presets for common scenarios
export const MISSION_PRESETS: MissionPreset[] = [
  {
    id: 'high-detail',
    name: 'High Detail Survey',
    description: 'Maximum detail for construction sites, archaeology',
    icon: '🔍',
    parameters: {
      altitude: 50,
      speed: 8,
      forwardOverlap: 80,
      sideOverlap: 75,
      pattern: 'crosshatch',
      gimbalAngle: -90,
    },
    suitableFor: ['construction', 'archaeology', 'inspection'],
  },
  {
    id: 'fast-survey',
    name: 'Fast Survey',
    description: 'Quick overview for large areas',
    icon: '⚡',
    parameters: {
      altitude: 120,
      speed: 15,
      forwardOverlap: 70,
      sideOverlap: 60,
      pattern: 'grid',
      gimbalAngle: -90,
    },
    suitableFor: ['agriculture', 'mapping', 'monitoring'],
  },
  {
    id: 'balanced',
    name: 'Balanced Survey',
    description: 'Good balance of speed and quality',
    icon: '⚖️',
    parameters: {
      altitude: 80,
      speed: 12,
      forwardOverlap: 75,
      sideOverlap: 70,
      pattern: 'grid',
      gimbalAngle: -90,
    },
    suitableFor: ['general', 'real-estate', 'solar'],
  },
  {
    id: 'oblique',
    name: 'Oblique Imagery',
    description: 'For building facades and vertical surfaces',
    icon: '📐',
    parameters: {
      altitude: 70,
      speed: 10,
      forwardOverlap: 75,
      sideOverlap: 70,
      pattern: 'crosshatch',
      gimbalAngle: -60,
    },
    suitableFor: ['buildings', 'infrastructure', 'inspection'],
  },
  {
    id: 'perimeter-only',
    name: 'Perimeter Scan',
    description: 'Boundary survey without interior',
    icon: '🔲',
    parameters: {
      altitude: 60,
      speed: 12,
      forwardOverlap: 75,
      sideOverlap: 70,
      pattern: 'perimeter',
      gimbalAngle: -90,
    },
    suitableFor: ['boundary', 'perimeter', 'fencing'],
  },
  {
    id: 'ultra-high-res',
    name: 'Ultra High Resolution',
    description: 'Maximum resolution for critical details',
    icon: '🎯',
    parameters: {
      altitude: 30,
      speed: 6,
      forwardOverlap: 85,
      sideOverlap: 80,
      pattern: 'crosshatch',
      gimbalAngle: -90,
    },
    suitableFor: ['precision', 'inspection', 'forensics'],
  },
]

// Validation rules
export const VALIDATION_RULES = {
  altitude: {
    min: 15,
    max: 150,
    optimal: { min: 40, max: 120 },
    unit: 'meters',
  },
  speed: {
    min: 3,
    max: 20,
    optimal: { min: 8, max: 15 },
    unit: 'm/s',
  },
  forwardOverlap: {
    min: 60,
    max: 90,
    optimal: { min: 70, max: 85 },
    unit: '%',
  },
  sideOverlap: {
    min: 50,
    max: 85,
    optimal: { min: 60, max: 80 },
    unit: '%',
  },
  gimbalAngle: {
    min: -90,
    max: 0,
    optimal: { min: -90, max: -45 },
    unit: 'degrees',
  },
}

/**
 * Validate mission parameters
 */
export function validateMissionParameters(params: {
  name?: string
  altitude?: number
  speed?: number
  forwardOverlap?: number
  sideOverlap?: number
  gimbalAngle?: number
  area?: number
  waypoints?: number
}): MissionValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Mission name
  if (!params.name || params.name.trim().length === 0) {
    errors.push('Mission name is required')
  } else if (params.name.trim().length < 3) {
    warnings.push('Mission name should be at least 3 characters')
  }

  // Altitude
  if (params.altitude !== undefined) {
    if (params.altitude < VALIDATION_RULES.altitude.min) {
      errors.push(`Altitude too low: minimum ${VALIDATION_RULES.altitude.min}m`)
    } else if (params.altitude > VALIDATION_RULES.altitude.max) {
      errors.push(`Altitude too high: maximum ${VALIDATION_RULES.altitude.max}m`)
    } else if (
      params.altitude < VALIDATION_RULES.altitude.optimal.min ||
      params.altitude > VALIDATION_RULES.altitude.optimal.max
    ) {
      warnings.push(
        `Altitude outside optimal range (${VALIDATION_RULES.altitude.optimal.min}-${VALIDATION_RULES.altitude.optimal.max}m)`
      )
    }
  }

  // Speed
  if (params.speed !== undefined) {
    if (params.speed < VALIDATION_RULES.speed.min) {
      errors.push(`Speed too low: minimum ${VALIDATION_RULES.speed.min}m/s`)
    } else if (params.speed > VALIDATION_RULES.speed.max) {
      errors.push(`Speed too high: maximum ${VALIDATION_RULES.speed.max}m/s`)
    } else if (
      params.speed < VALIDATION_RULES.speed.optimal.min ||
      params.speed > VALIDATION_RULES.speed.optimal.max
    ) {
      warnings.push(
        `Speed outside optimal range (${VALIDATION_RULES.speed.optimal.min}-${VALIDATION_RULES.speed.optimal.max}m/s)`
      )
    }
  }

  // Forward overlap
  if (params.forwardOverlap !== undefined) {
    if (params.forwardOverlap < VALIDATION_RULES.forwardOverlap.min) {
      errors.push(`Forward overlap too low: minimum ${VALIDATION_RULES.forwardOverlap.min}%`)
    } else if (params.forwardOverlap > VALIDATION_RULES.forwardOverlap.max) {
      warnings.push(`Forward overlap very high (${params.forwardOverlap}%) - will increase flight time`)
    } else if (params.forwardOverlap < VALIDATION_RULES.forwardOverlap.optimal.min) {
      warnings.push('Consider increasing forward overlap for better coverage quality')
    }
  }

  // Side overlap
  if (params.sideOverlap !== undefined) {
    if (params.sideOverlap < VALIDATION_RULES.sideOverlap.min) {
      errors.push(`Side overlap too low: minimum ${VALIDATION_RULES.sideOverlap.min}%`)
    } else if (params.sideOverlap > VALIDATION_RULES.sideOverlap.max) {
      warnings.push(`Side overlap very high (${params.sideOverlap}%) - will increase flight time`)
    } else if (params.sideOverlap < VALIDATION_RULES.sideOverlap.optimal.min) {
      warnings.push('Consider increasing side overlap for better coverage quality')
    }
  }

  // Area checks
  if (params.area !== undefined) {
    if (params.area < 100) {
      warnings.push('Survey area is very small (<100m²)')
    } else if (params.area > 1000000) {
      warnings.push('Survey area is very large (>1km²) - consider splitting into multiple missions')
    }
  }

  // Waypoint checks
  if (params.waypoints !== undefined) {
    if (params.waypoints < 4) {
      errors.push('Mission needs at least 4 waypoints')
    } else if (params.waypoints > 500) {
      warnings.push('Very high waypoint count - mission may be complex')
    }
  }

  // Battery check (estimate based on altitude and area)
  if (params.altitude && params.area && params.speed) {
    const estimatedFlightTime = Math.sqrt(params.area) / params.speed
    if (estimatedFlightTime > 25) {
      warnings.push('Estimated flight time >25min - ensure sufficient battery')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get recommended settings based on mission type
 */
export function getRecommendedSettings(missionType: string): MissionPreset | null {
  // Map mission types to presets
  const typeMapping: Record<string, string> = {
    survey: 'balanced',
    inspection: 'high-detail',
    monitoring: 'fast-survey',
    delivery: 'fast-survey',
    emergency: 'fast-survey',
  }

  const presetId = typeMapping[missionType.toLowerCase()]
  return MISSION_PRESETS.find(p => p.id === presetId) || null
}

/**
 * Calculate optimal parameters based on requirements
 */
export function calculateOptimalParameters(requirements: {
  priority: 'speed' | 'quality' | 'balanced'
  area: number
  maxFlightTime?: number
}): Partial<MissionPreset['parameters']> {
  const { priority, area } = requirements

  // Base parameters
  let altitude = 80
  let speed = 12
  let forwardOverlap = 75
  let sideOverlap = 70

  // Adjust based on priority
  if (priority === 'speed') {
    altitude = 120
    speed = 15
    forwardOverlap = 70
    sideOverlap = 60
  } else if (priority === 'quality') {
    altitude = 50
    speed = 8
    forwardOverlap = 80
    sideOverlap = 75
  }

  // Adjust for area size
  if (area > 500000) {
    // Large area - optimize for speed
    altitude = Math.min(altitude * 1.3, 150)
    speed = Math.min(speed * 1.2, 20)
  } else if (area < 5000) {
    // Small area - optimize for quality
    altitude = Math.max(altitude * 0.7, 30)
    speed = Math.max(speed * 0.8, 6)
  }

  return {
    altitude: Math.round(altitude),
    speed: Math.round(speed),
    forwardOverlap,
    sideOverlap,
    pattern: area > 100000 ? 'grid' : 'crosshatch',
    gimbalAngle: -90,
  }
}

/**
 * Compare two parameter sets
 */
export function compareParameters(
  params1: MissionPreset['parameters'],
  params2: MissionPreset['parameters']
): {
  flightTimeDiff: number
  qualityDiff: number
  batteryDiff: number
} {
  // Simple comparison metrics
  const flightTimeDiff =
    ((params1.speed / params2.speed) * (params2.altitude / params1.altitude) - 1) * 100
  const qualityDiff =
    ((params1.forwardOverlap + params1.sideOverlap) /
      (params2.forwardOverlap + params2.sideOverlap) -
      1) *
    100
  const batteryDiff = ((params1.altitude * params1.speed) / (params2.altitude * params2.speed) - 1) * 100

  return {
    flightTimeDiff: Math.round(flightTimeDiff),
    qualityDiff: Math.round(qualityDiff),
    batteryDiff: Math.round(batteryDiff),
  }
}

/**
 * Get validation color for UI
 */
export function getValidationColor(value: number, rule: typeof VALIDATION_RULES[keyof typeof VALIDATION_RULES]): 'red' | 'yellow' | 'green' {
  if (value < rule.min || value > rule.max) return 'red'
  if (value < rule.optimal.min || value > rule.optimal.max) return 'yellow'
  return 'green'
}

/**
 * Format validation message for display
 */
export function formatValidationMessage(result: MissionValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return '✅ All parameters are optimal'
  }

  const messages: string[] = []

  if (result.errors.length > 0) {
    messages.push(`❌ ${result.errors.length} error(s)`)
    messages.push(...result.errors.map(e => `  • ${e}`))
  }

  if (result.warnings.length > 0) {
    messages.push(`⚠️ ${result.warnings.length} warning(s)`)
    messages.push(...result.warnings.map(w => `  • ${w}`))
  }

  return messages.join('\n')
}
