/**
 * Leaflet Map View
 *
 * Fullscreen OpenStreetMap view that renders the selected mission:
 * - Planned flight path and numbered waypoints
 * - Live drone marker driven by the simulation WebSocket stream
 * - Auto-fit to the mission area, optional drone following
 */

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap, Marker, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { useAppStore } from '@/store/appStore'
import { useMissionsStore } from '@/store/missionsStore'
import { useSimulationTelemetry } from '@/hooks/useSimulationTelemetry'
import {
  OSM_TILE_LAYER,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  createDroneIcon,
  getBatteryTextColor,
  getStatusTextColor,
} from '@/lib/leaflet'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with bundlers
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

const WAYPOINT_COLORS = {
  completed: '#10b981',
  current: '#3b82f6',
  pending: '#6b7280',
}

/**
 * Fits the map to the selected mission's waypoints and optionally
 * follows the live drone position.
 */
function MapEffects({
  waypointPositions,
  dronePosition,
  missionId,
}: {
  waypointPositions: [number, number][]
  dronePosition: [number, number] | null
  missionId?: string
}) {
  const map = useMap()
  const followDrone = useAppStore((state) => state.followDrone)

  // Fit bounds when a different mission is selected
  useEffect(() => {
    if (waypointPositions.length >= 2) {
      map.fitBounds(L.latLngBounds(waypointPositions), { padding: [60, 60] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, map])

  // Follow the drone when enabled
  useEffect(() => {
    if (followDrone && dronePosition) {
      map.panTo(dronePosition, { animate: true })
    }
  }, [followDrone, dronePosition, map])

  return null
}

/**
 * Renders the selected mission: planned path, waypoints, live drone.
 */
function MissionLayer() {
  const selectedMissionId = useAppStore((state) => state.selectedMission?.id)
  const mission = useMissionsStore((state) =>
    selectedMissionId ? state.missions.get(selectedMissionId) : undefined
  )
  const { telemetry, isConnected } = useSimulationTelemetry(selectedMissionId)

  const missionWaypoints = mission?.waypoints
  const waypointPositions = useMemo(
    () => (missionWaypoints ?? []).map((wp) => [wp.latitude, wp.longitude] as [number, number]),
    [missionWaypoints]
  )

  const dronePosition: [number, number] | null =
    telemetry?.position
      ? [telemetry.position.latitude, telemetry.position.longitude]
      : null

  const waypointsCompleted =
    telemetry?.waypointsCompleted ?? mission?.waypoints_completed ?? 0

  const droneStatus = telemetry?.status ?? 'idle'
  const droneIcon = useMemo(
    () => createDroneIcon(droneStatus, telemetry?.position?.heading ?? 0, 32),
    [droneStatus, telemetry?.position?.heading]
  )

  return (
    <>
      <MapEffects
        waypointPositions={waypointPositions}
        dronePosition={dronePosition}
        missionId={selectedMissionId}
      />

      {/* Planned flight path */}
      {waypointPositions.length >= 2 && (
        <Polyline
          positions={waypointPositions}
          pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.8, dashArray: '6 8' }}
        />
      )}

      {/* Waypoint markers */}
      {waypointPositions.map((position, index) => {
        const status =
          index < waypointsCompleted
            ? 'completed'
            : index === waypointsCompleted
              ? 'current'
              : 'pending'
        return (
          <CircleMarker
            key={index}
            center={position}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: WAYPOINT_COLORS[status],
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="center" className="waypoint-label" opacity={1}>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}>
                {index + 1}
              </span>
            </Tooltip>
          </CircleMarker>
        )
      })}

      {/* Live drone marker */}
      {dronePosition && telemetry && (
        <Marker position={dronePosition} icon={droneIcon}>
          <Tooltip>
            <div className="p-2">
              <h3 className="font-bold text-sm mb-1">{mission?.name ?? 'Drone'}</h3>
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${getStatusTextColor(droneStatus)}`}>
                    {droneStatus}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Battery:</span>
                  <span className={`font-medium ${getBatteryTextColor(telemetry.batteryPercent)}`}>
                    {telemetry.batteryPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Altitude:</span>
                  <span className="font-medium">
                    {telemetry.position!.altitude.toFixed(1)}m
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Speed:</span>
                  <span className="font-medium">
                    {telemetry.position!.speed.toFixed(1)} m/s
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">
                    {telemetry.progressPercent.toFixed(0)}% ({telemetry.waypointsCompleted}/
                    {telemetry.totalWaypoints})
                  </span>
                </div>
                {!isConnected && (
                  <div className="text-yellow-600">Reconnecting…</div>
                )}
              </div>
            </div>
          </Tooltip>
        </Marker>
      )}
    </>
  )
}

/**
 * Main MapView component
 */
export default function MapView() {
  const [mapLoaded, setMapLoaded] = useState(false)

  return (
    <div className="w-full h-full relative" style={{ position: 'absolute', inset: 0 }}>
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-[1000]">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        attributionControl={true}
        whenReady={() => setMapLoaded(true)}
      >
        {/* OpenStreetMap tile layer (no API key required) */}
        <TileLayer
          url={OSM_TILE_LAYER.url}
          attribution={OSM_TILE_LAYER.attribution}
          maxZoom={OSM_TILE_LAYER.maxZoom}
          minZoom={OSM_TILE_LAYER.minZoom}
        />

        <MissionLayer />
      </MapContainer>

      {/* Custom CSS for waypoint labels and drone marker */}
      <style>{`
        .waypoint-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          text-align: center;
          pointer-events: none;
        }

        .waypoint-label::before {
          display: none !important;
        }

        .leaflet-tooltip-top:before,
        .leaflet-tooltip-bottom:before,
        .leaflet-tooltip-left:before,
        .leaflet-tooltip-right:before {
          border: none !important;
        }

        .custom-drone-marker {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-tooltip {
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 4px 8px;
          white-space: nowrap;
        }

        .leaflet-control-zoom {
          margin-right: 10px !important;
          margin-bottom: 10px !important;
        }
      `}</style>
    </div>
  )
}
