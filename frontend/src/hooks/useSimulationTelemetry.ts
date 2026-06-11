/**
 * Live Simulation Telemetry Hook
 *
 * Connects to the backend's per-mission WebSocket stream
 * (/api/v1/ws/simulations/{missionId}) and:
 * - exposes the latest drone telemetry for rendering (map, panels)
 * - syncs mission status/progress into the missions store
 *
 * The connection stays open while a mission is selected, so telemetry
 * starts flowing the moment its simulation is started.
 */

import { useEffect, useState } from 'react'
import { config } from '@/config/env'
import { useMissionsStore } from '@/store/missionsStore'
import type { Position, MissionStatus } from '@/types'

export interface LiveTelemetry {
  position: Position | null
  batteryPercent: number
  batteryVoltage: number
  progressPercent: number
  waypointsCompleted: number
  totalWaypoints: number
  status: string
  elapsedTime: number
  totalDistance: number
}

interface UseSimulationTelemetryReturn {
  telemetry: LiveTelemetry | null
  isConnected: boolean
}

const SIM_TO_MISSION_STATUS: Record<string, MissionStatus> = {
  active: 'active',
  paused: 'paused',
  completed: 'completed',
  aborted: 'aborted',
}

export function useSimulationTelemetry(
  missionId: string | undefined
): UseSimulationTelemetryReturn {
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    setTelemetry(null)
    if (!missionId) return

    let ws: WebSocket | null = null
    let closed = false
    let retryTimer: number | undefined
    let attempts = 0

    const syncMissionStore = (
      status: string,
      progressPercent: number,
      waypointsCompleted: number
    ) => {
      const missionStatus = SIM_TO_MISSION_STATUS[status]
      useMissionsStore.getState().updateMission(missionId, {
        ...(missionStatus ? { status: missionStatus } : {}),
        progress_percent: progressPercent,
        waypoints_completed: waypointsCompleted,
      })
    }

    const handleMessage = (message: any) => {
      switch (message.type) {
        case 'initial_state': {
          const d = message.data
          if (!d) break
          setTelemetry({
            position: d.position ?? null,
            batteryPercent: d.battery_percent ?? 100,
            batteryVoltage: d.battery_voltage ?? 0,
            progressPercent: d.progress_percent ?? 0,
            waypointsCompleted: d.waypoints_completed ?? 0,
            totalWaypoints: d.total_waypoints ?? 0,
            status: d.status ?? 'idle',
            elapsedTime: d.elapsed_time ?? 0,
            totalDistance: d.total_distance_traveled ?? 0,
          })
          syncMissionStore(d.status, d.progress_percent ?? 0, d.waypoints_completed ?? 0)
          break
        }

        case 'update': {
          const d = message.data
          if (!d) break
          setTelemetry({
            position: d.position ?? null,
            batteryPercent: d.battery?.percent ?? 100,
            batteryVoltage: d.battery?.voltage ?? 0,
            progressPercent: d.progress?.percent ?? 0,
            waypointsCompleted: d.progress?.waypoints_completed ?? 0,
            totalWaypoints: d.progress?.total_waypoints ?? 0,
            status: d.status ?? 'idle',
            elapsedTime: d.elapsed_time ?? 0,
            totalDistance: d.total_distance ?? 0,
          })
          syncMissionStore(d.status, d.progress?.percent ?? 0, d.progress?.waypoints_completed ?? 0)
          break
        }

        case 'simulation_event':
        case 'event': {
          // Completion/abort events arrive faster than the 1 Hz update
          const eventType = message.event ?? message.event_type
          if (eventType === 'mission_completed' || eventType === 'mission_aborted') {
            const status = eventType === 'mission_completed' ? 'completed' : 'aborted'
            useMissionsStore.getState().updateMission(missionId, { status })
          }
          break
        }

        default:
          break
      }
    }

    const connect = () => {
      ws = new WebSocket(`${config.websocket.baseURL}/api/v1/ws/simulations/${missionId}`)

      ws.onopen = () => {
        setIsConnected(true)
        attempts = 0
      }

      ws.onmessage = (event) => {
        try {
          handleMessage(JSON.parse(event.data))
        } catch {
          // Ignore malformed frames
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        if (!closed && attempts < config.websocket.maxReconnectAttempts) {
          attempts += 1
          retryTimer = window.setTimeout(connect, config.websocket.reconnectInterval)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      closed = true
      window.clearTimeout(retryTimer)
      ws?.close()
    }
  }, [missionId])

  return { telemetry, isConnected }
}
