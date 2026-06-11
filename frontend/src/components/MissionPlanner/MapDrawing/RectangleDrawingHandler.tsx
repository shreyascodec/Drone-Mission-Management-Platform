/**
 * Rectangle Drawing Handler Component
 * 
 * Handles click-and-drag rectangle drawing on the map
 */

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { COLORS } from '@/lib/constants'

interface RectangleDrawingHandlerProps {
  isDrawing: boolean
  onRectangleComplete: (bounds: L.LatLngBounds) => void
  onRectangleUpdate?: (bounds: L.LatLngBounds) => void
}

export function RectangleDrawingHandler({
  isDrawing,
  onRectangleComplete,
  onRectangleUpdate = () => {},
}: RectangleDrawingHandlerProps) {
  const map = useMap()
  const startPointRef = useRef<L.LatLng | null>(null)
  const rectangleRef = useRef<L.Rectangle | null>(null)

  useEffect(() => {
    if (!map || !isDrawing) return

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!startPointRef.current) {
        startPointRef.current = e.latlng
      } else {
        const bounds = L.latLngBounds([startPointRef.current, e.latlng])
        onRectangleComplete(bounds)
        startPointRef.current = null
      }
    }

    const handleMapMove = (e: L.LeafletMouseEvent) => {
      if (!startPointRef.current) return

      const bounds = L.latLngBounds([startPointRef.current, e.latlng])
      
      if (rectangleRef.current) {
        rectangleRef.current.setBounds(bounds)
      } else {
        rectangleRef.current = L.rectangle(bounds, {
          color: COLORS.PRIMARY,
          fillColor: COLORS.PRIMARY,
          fillOpacity: 0.2,
          weight: 2,
        })
        map.addLayer(rectangleRef.current)
      }
      
      onRectangleUpdate(bounds)
    }

    if (isDrawing) {
      map.on('click', handleMapClick)
      map.on('mousemove', handleMapMove)
      map.getContainer().style.cursor = 'crosshair'
    }

    return () => {
      map.off('click', handleMapClick)
      map.off('mousemove', handleMapMove)
      map.getContainer().style.cursor = ''
      if (rectangleRef.current) {
        map.removeLayer(rectangleRef.current)
        rectangleRef.current = null
      }
    }
  }, [map, isDrawing, onRectangleComplete, onRectangleUpdate])

  return null
}
