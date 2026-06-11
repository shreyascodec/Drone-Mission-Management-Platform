/**
 * Survey Area Display Component
 * 
 * Displays rectangle with draggable corner points
 */

import { Polygon, Polyline, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { COLORS } from '@/lib/constants'

interface SurveyAreaDisplayProps {
  surveyArea: [number, number][]
  onAreaChange: (area: [number, number][]) => void
}

export function SurveyAreaDisplay({ surveyArea, onAreaChange }: SurveyAreaDisplayProps) {
  if (surveyArea.length < 4) return null

  const handlePointDrag = (index: number, newPos: L.LatLng) => {
    const updatedArea = [...surveyArea]
    updatedArea[index] = [newPos.lat, newPos.lng]
    onAreaChange(updatedArea)
  }

  return (
    <>
      {/* Rectangle Polygon */}
      <Polygon
        positions={[...surveyArea, surveyArea[0]]} // Close the rectangle
        pathOptions={{
          color: COLORS.PRIMARY,
          fillColor: COLORS.PRIMARY,
          fillOpacity: 0.2,
          weight: 2,
        }}
      />
      
      {/* Connecting Path (Polyline) */}
      <Polyline
        positions={[...surveyArea, surveyArea[0]]} // Close the path
        pathOptions={{
          color: COLORS.PRIMARY,
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 5',
        }}
      />
      
      {/* 4 Corner Points as Markers */}
      {surveyArea.map((point, index) => (
        <Marker
          key={`corner-${index}`}
          position={point}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target as L.Marker
              handlePointDrag(index, marker.getLatLng())
            },
          }}
          icon={L.divIcon({
            className: 'custom-corner-marker',
            html: `
              <div style="
                width: 24px;
                height: 24px;
                background: ${COLORS.PRIMARY};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 11px;
                cursor: move;
              ">
                ${index + 1}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}
        >
          <Tooltip permanent>
            Point {index + 1}<br />
            {point[0].toFixed(6)}, {point[1].toFixed(6)}
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}
