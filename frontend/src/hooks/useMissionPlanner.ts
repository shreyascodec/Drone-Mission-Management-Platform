/**
 * Mission Planner Hook
 * 
 * Business logic for mission planning:
 * - Mission creation
 * - Waypoint generation
 * - Validation
 * - Mission estimates
 */

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMissionsStore } from '@/store/missionsStore'
import { useAppStore } from '@/store/appStore'
import { useDronesStore } from '@/store/dronesStore'
import { estimateFlightTime, estimateBatteryUsage } from '@/lib/coverage'
import { validateMissionParameters } from '@/lib/missionValidation'
import type { Waypoint } from '@/types'
import type { CreateMissionRequest } from '@/services/api/types'
import { DEFAULT_VALUES } from '@/lib/constants'

export interface MissionPlannerState {
  // Mission info
  missionName: string
  missionType: 'survey' | 'inspection' | 'mapping' | 'emergency'
  
  // Flight parameters
  altitude: number
  speed: number
  forwardOverlap: number
  sideOverlap: number
  
  // Survey pattern
  pattern: 'grid' | 'crosshatch' | 'perimeter'
  
  // Data collection
  dataCollectionFrequency: number
  selectedSensors: {
    gps: boolean
    compass: boolean
    barometer: boolean
    camera: boolean
  }
}

export interface MissionEstimates {
  waypoints: number
  flightTime: string
  distance: string
  battery: string
  coverage: string
}

export function useMissionPlanner(surveyArea: [number, number][]) {
  const navigate = useNavigate()
  const { createMissionOnBackend, startMissionSimulation, setSelectedMission: setSelectedMissionId } = useMissionsStore()
  const { setSelectedMission } = useAppStore()
  const { getConnectedDrones } = useDronesStore()
  
  const [state, setState] = useState<MissionPlannerState>({
    missionName: 'New Survey Mission',
    missionType: 'survey',
    altitude: DEFAULT_VALUES.DEFAULT_ALTITUDE,
    speed: DEFAULT_VALUES.DEFAULT_SPEED,
    forwardOverlap: 75,
    sideOverlap: 70,
    pattern: 'grid',
    dataCollectionFrequency: 10,
    selectedSensors: {
      gps: true,
      compass: true,
      barometer: true,
      camera: true,
    },
  })
  
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate waypoints from survey area
  const generateWaypoints = useCallback((pattern: 'grid' | 'crosshatch' | 'perimeter'): Waypoint[] => {
    if (surveyArea.length < 3) return []
    
    const waypoints: Waypoint[] = []
    const baseLat = surveyArea[0][0]
    const baseLon = surveyArea[0][1]
    
    if (pattern === 'grid') {
      // Grid pattern: 4x6 grid
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 6; j++) {
          waypoints.push({
            sequence: waypoints.length + 1,
            latitude: baseLat + (i * 0.002),
            longitude: baseLon + (j * 0.002),
            altitude: state.altitude,
          })
        }
      }
    } else if (pattern === 'crosshatch') {
      // Crosshatch: double grid
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          waypoints.push({
            sequence: waypoints.length + 1,
            latitude: baseLat + (i * 0.0015),
            longitude: baseLon + (j * 0.0015),
            altitude: state.altitude,
          })
        }
      }
    } else {
      // Perimeter: follow polygon edges
      surveyArea.forEach((point, idx) => {
        waypoints.push({
          sequence: idx + 1,
          latitude: point[0],
          longitude: point[1],
          altitude: state.altitude,
        })
      })
    }
    
    return waypoints
  }, [surveyArea, state.altitude])

  // Calculate mission estimates
  const missionEstimates = useMemo((): MissionEstimates => {
    const waypoints = generateWaypoints(state.pattern)
    
    // Calculate survey area from polygon
    let surveyAreaKm2 = 0
    if (surveyArea.length >= 3) {
      const lats = surveyArea.map(p => p[0])
      const lons = surveyArea.map(p => p[1])
      const latDiff = Math.max(...lats) - Math.min(...lats)
      const lonDiff = Math.max(...lons) - Math.min(...lons)
      // Rough area calculation (degrees to km²)
      surveyAreaKm2 = (latDiff * 111) * (lonDiff * 111 * Math.cos((Math.max(...lats) + Math.min(...lats)) / 2 * Math.PI / 180))
    }
    
    // Calculate flight distance and time
    const totalDistance = waypoints.length * 0.5 // km estimate (0.5km per waypoint)
    const flightTime = estimateFlightTime(totalDistance, state.speed)
    const batteryEstimate = estimateBatteryUsage(flightTime)
    
    return {
      waypoints: waypoints.length,
      flightTime: Math.round(flightTime).toString(),
      distance: totalDistance.toFixed(1),
      battery: Math.round(batteryEstimate).toString(),
      coverage: surveyAreaKm2 > 0 ? surveyAreaKm2.toFixed(2) : '0.00',
    }
  }, [surveyArea, state, generateWaypoints])

  // Validate mission parameters
  const validation = useMemo(() => {
    return validateMissionParameters({
      name: state.missionName,
      altitude: state.altitude,
      speed: state.speed,
      forwardOverlap: state.forwardOverlap,
      sideOverlap: state.sideOverlap,
      area: missionEstimates.coverage ? parseFloat(missionEstimates.coverage) * 1000000 : 0,
      waypoints: missionEstimates.waypoints,
    })
  }, [state, missionEstimates])

  // Create mission request
  const createMissionRequest = useCallback((): CreateMissionRequest => {
    const waypoints = generateWaypoints(state.pattern)
    
    return {
      name: state.missionName,
      description: `${state.missionType} mission`,
      type: state.missionType,
      altitude: state.altitude,
      speed: state.speed,
      forward_overlap: state.forwardOverlap,
      side_overlap: state.sideOverlap,
      data_collection_frequency: state.dataCollectionFrequency,
      sensors: Object.entries(state.selectedSensors)
        .filter(([_, enabled]) => enabled)
        .map(([sensor]) => sensor),
      waypoints: waypoints.map(wp => ({
        latitude: wp.latitude,
        longitude: wp.longitude,
        altitude: wp.altitude,
      })),
    }
  }, [state, generateWaypoints])

  // Save mission as draft
  const handleSaveMission = useCallback(async () => {
    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }
    
    setIsCreating(true)
    setError(null)
    
    try {
      await createMissionOnBackend(createMissionRequest())
      navigate('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create mission'
      setError(errorMessage)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [validation, createMissionRequest, createMissionOnBackend, navigate])

  // Start mission immediately
  const handleStartMission = useCallback(async () => {
    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }
    
    const availableDrones = getConnectedDrones().filter(d => d.status === 'idle')
    if (availableDrones.length === 0) {
      setError('No available drones. Please ensure at least one drone is idle.')
      return
    }
    
    setIsCreating(true)
    setError(null)
    
    try {
      const mission = await createMissionOnBackend(createMissionRequest())
      await startMissionSimulation(mission.id)
      
      setSelectedMissionId(mission.id)
      setSelectedMission(mission as any)
      
      navigate('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start mission'
      setError(errorMessage)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [validation, createMissionRequest, createMissionOnBackend, startMissionSimulation, getConnectedDrones, setSelectedMissionId, setSelectedMission, navigate])

  return {
    state,
    setState,
    missionEstimates,
    validation,
    isCreating,
    error,
    handleSaveMission,
    handleStartMission,
  }
}
