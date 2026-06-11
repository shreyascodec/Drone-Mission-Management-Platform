/**
 * Flight Parameters Component
 * 
 * Altitude, speed, and overlap configuration
 */

import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'

interface FlightParametersProps {
  altitude: number
  speed: number
  forwardOverlap: number
  sideOverlap: number
  onAltitudeChange: (altitude: number) => void
  onSpeedChange: (speed: number) => void
  onForwardOverlapChange: (overlap: number) => void
  onSideOverlapChange: (overlap: number) => void
}

export function FlightParameters({
  altitude,
  speed,
  forwardOverlap,
  sideOverlap,
  onAltitudeChange,
  onSpeedChange,
  onForwardOverlapChange,
  onSideOverlapChange,
}: FlightParametersProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Flight Parameters</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs text-muted-foreground">Altitude</label>
            <span className="text-xs font-medium">{altitude}m</span>
          </div>
          <Slider
            value={[altitude]}
            onValueChange={([val]) => onAltitudeChange(val)}
            min={50}
            max={400}
            step={10}
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs text-muted-foreground">Speed</label>
            <span className="text-xs font-medium">{speed} m/s</span>
          </div>
          <Slider
            value={[speed]}
            onValueChange={([val]) => onSpeedChange(val)}
            min={5}
            max={25}
            step={1}
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs text-muted-foreground">Forward Overlap</label>
            <span className="text-xs font-medium">{forwardOverlap}%</span>
          </div>
          <Slider
            value={[forwardOverlap]}
            onValueChange={([val]) => onForwardOverlapChange(val)}
            min={50}
            max={90}
            step={5}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Overlap between consecutive photos
          </p>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs text-muted-foreground">Side Overlap</label>
            <span className="text-xs font-medium">{sideOverlap}%</span>
          </div>
          <Slider
            value={[sideOverlap]}
            onValueChange={([val]) => onSideOverlapChange(val)}
            min={50}
            max={90}
            step={5}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Overlap between flight lines
          </p>
        </div>
      </div>
    </Card>
  )
}
