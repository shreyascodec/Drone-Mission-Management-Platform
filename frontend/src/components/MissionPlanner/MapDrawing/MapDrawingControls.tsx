/**
 * Map Drawing Controls Component
 * 
 * Handles interactive polygon drawing using Leaflet Draw
 */

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { DrawControl, DrawEvents, isDrawAvailable } from '@/lib/leafletDraw'
import { COLORS } from '@/lib/constants'

interface MapDrawingControlsProps {
  onAreaChange: (area: [number, number][]) => void
  initialArea?: [number, number][]
}

export function MapDrawingControls({ 
  onAreaChange,
  initialArea
}: MapDrawingControlsProps) {
  const map = useMap()
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  const initialPolygonRef = useRef<L.Polygon | null>(null)

  useEffect(() => {
    if (!map) return

    // Check if Draw is available
    if (!isDrawAvailable()) {
      console.error('Leaflet Draw not available. Drawing features disabled.')
      return
    }
    
    // Initialize feature group for drawn items
    if (!drawnItemsRef.current) {
      drawnItemsRef.current = new L.FeatureGroup()
      map.addLayer(drawnItemsRef.current)
    }

    // Initialize draw control
    if (!drawControlRef.current) {
      drawControlRef.current = new DrawControl({
        position: 'topright',
        draw: {
          polygon: false, // Disabled - only rectangle allowed
          rectangle: {
            shapeOptions: {
              color: COLORS.PRIMARY,
              fillColor: COLORS.PRIMARY,
              fillOpacity: 0.2,
              weight: 2,
            },
          },
          polyline: false,
          marker: false,
          circle: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItemsRef.current,
          remove: true,
        },
      })
      try {
        map.addControl(drawControlRef.current)
        setTimeout(() => {
          map.invalidateSize()
        }, 100)
      } catch (error) {
        console.error('Failed to add Draw control to map:', error)
      }
    }
    
    // Add initial rectangle AFTER draw control is initialized
    if (initialArea && initialArea.length >= 3 && !initialPolygonRef.current && drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
      
      const lats = initialArea.map(p => p[0])
      const lons = initialArea.map(p => p[1])
      const north = Math.max(...lats)
      const south = Math.min(...lats)
      const east = Math.max(...lons)
      const west = Math.min(...lons)
      
      const initialRectangle = L.rectangle([[south, west], [north, east]], {
        color: COLORS.PRIMARY,
        fillColor: COLORS.PRIMARY,
        fillOpacity: 0.2,
        weight: 2,
      })
      drawnItemsRef.current.addLayer(initialRectangle)
      initialPolygonRef.current = initialRectangle as any
    }

    // Handle drawing events
    const handleDrawCreated = (e: L.DrawEvents.Created) => {
      const layer = e.layer
      
      drawnItemsRef.current?.clearLayers()
      drawnItemsRef.current?.addLayer(layer)
      
      if (layer instanceof L.Rectangle) {
        const bounds = (layer as L.Rectangle).getBounds()
        const coordinates: [number, number][] = [
          [bounds.getNorth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()],
          [bounds.getSouth(), bounds.getEast()],
          [bounds.getSouth(), bounds.getWest()],
        ]
        onAreaChange(coordinates)
      } else if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[]
        const coordinates: [number, number][] = latlngs.map(ll => [ll.lat, ll.lng])
        onAreaChange(coordinates)
      }
    }

    const handleDrawEdited = (e: L.DrawEvents.Edited) => {
      const layers = e.layers
      layers.eachLayer((layer) => {
        if (layer instanceof L.Rectangle) {
          const bounds = (layer as L.Rectangle).getBounds()
          const coordinates: [number, number][] = [
            [bounds.getNorth(), bounds.getWest()],
            [bounds.getNorth(), bounds.getEast()],
            [bounds.getSouth(), bounds.getEast()],
            [bounds.getSouth(), bounds.getWest()],
          ]
          onAreaChange(coordinates)
        } else if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[]
          const coordinates: [number, number][] = latlngs.map(ll => [ll.lat, ll.lng])
          onAreaChange(coordinates)
        }
      })
    }

    const handleDrawDeleted = () => {
      onAreaChange([])
    }

    map.on(DrawEvents.CREATED, handleDrawCreated as L.LeafletEventHandlerFn)
    map.on(DrawEvents.EDITED, handleDrawEdited as L.LeafletEventHandlerFn)
    map.on(DrawEvents.DELETED, handleDrawDeleted)

    return () => {
      map.off(DrawEvents.CREATED, handleDrawCreated as L.LeafletEventHandlerFn)
      map.off(DrawEvents.EDITED, handleDrawEdited as L.LeafletEventHandlerFn)
      map.off(DrawEvents.DELETED, handleDrawDeleted)
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current)
      }
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current)
      }
    }
  }, [map, onAreaChange, initialArea])

  return null
}
