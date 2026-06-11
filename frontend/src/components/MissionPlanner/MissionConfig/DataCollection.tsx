/**
 * Data Collection Component
 * 
 * Collection frequency and sensor selection
 */

import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Radio, Compass, Navigation, Camera } from 'lucide-react'

interface DataCollectionProps {
  frequency: number
  sensors: {
    gps: boolean
    compass: boolean
    barometer: boolean
    camera: boolean
  }
  onFrequencyChange: (frequency: number) => void
  onSensorChange: (sensor: keyof DataCollectionProps['sensors'], enabled: boolean) => void
}

export function DataCollection({
  frequency,
  sensors,
  onFrequencyChange,
  onSensorChange,
}: DataCollectionProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Data Collection</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs text-muted-foreground">Collection Frequency</label>
            <span className="text-xs font-medium">{frequency} Hz</span>
          </div>
          <Slider
            value={[frequency]}
            onValueChange={([val]) => onFrequencyChange(val)}
            min={1}
            max={60}
            step={1}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Data points per second
          </p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Active Sensors</label>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4" />
                <span className="text-xs">GPS</span>
              </div>
              <Switch
                checked={sensors.gps}
                onCheckedChange={(checked) => onSensorChange('gps', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4" />
                <span className="text-xs">Compass</span>
              </div>
              <Switch
                checked={sensors.compass}
                onCheckedChange={(checked) => onSensorChange('compass', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                <span className="text-xs">Barometer</span>
              </div>
              <Switch
                checked={sensors.barometer}
                onCheckedChange={(checked) => onSensorChange('barometer', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-secondary/50 rounded">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                <span className="text-xs">Camera</span>
              </div>
              <Switch
                checked={sensors.camera}
                onCheckedChange={(checked) => onSensorChange('camera', checked)}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
