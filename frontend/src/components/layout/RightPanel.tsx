/**
 * Right Slide-in Panel
 * 
 * Displays:
 * - Drone details
 * - Real-time telemetry
 * - Battery status
 * - System health
 * - Mission telemetry (if mission active)
 */

import { motion } from 'framer-motion'
import { X, Battery, Gauge, MapPin, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TelemetryPanel from '@/components/Mission/TelemetryPanel'
import { 
  formatAltitude, 
  formatSpeed, 
  formatBattery,
  getBatteryColor,
  getStatusColor 
} from '@/lib/utils'
import { useMissionsStore } from '@/store/missionsStore'
import { useAppStore } from '@/store/appStore'
import type { Drone } from '@/types'

interface RightPanelProps {
  onClose: () => void
  selectedDrone?: Drone | null
}

export default function RightPanel({ onClose, selectedDrone }: RightPanelProps) {
  const { selectedMission } = useAppStore()
  const { getMission } = useMissionsStore()
  
  // Get active mission if any
  const activeMission = selectedMission || getMission(selectedDrone?.id || '')
  
  // Mock drone data
  const drone: Drone = selectedDrone || {
    id: 'drone-1',
    name: 'Alpha-01',
    serial_number: 'DRN-2024-001',
    model: 'Phantom X Pro',
    status: 'active',
    battery_percent: 78,
    battery_voltage: 12.2,
    position: {
      longitude: -122.4195,
      latitude: 37.7750,
      altitude: 125.5,
      speed: 15.2,
      heading: 45,
      vertical_speed: 0.5,
    },
    max_speed: 21,
    max_altitude: 500,
    max_range: 10000,
    battery_capacity: 5000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-16 right-0 bottom-0 z-30 w-96"
    >
      <div className="h-full glass-effect border-l border-border/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold text-foreground">{drone.name}</h2>
            <p className="text-xs text-muted-foreground">{drone.serial_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline"
              className={getStatusColor(drone.status)}
            >
              {drone.status}
            </Badge>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <Tabs defaultValue="telemetry" className="w-full">
            <TabsList className="w-full rounded-none border-b">
              {activeMission && (
                <TabsTrigger value="telemetry" className="flex-1">
                  Mission Telemetry
                </TabsTrigger>
              )}
              <TabsTrigger value="drone" className="flex-1">
                Drone Details
              </TabsTrigger>
            </TabsList>
            
            {/* Mission Telemetry Tab */}
            {activeMission && (
              <TabsContent value="telemetry" className="p-4 mt-0">
                <TelemetryPanel
                  mission={activeMission}
                  realtime={{
                    altitude: drone.position?.altitude || 0,
                    speed: drone.position?.speed || 0,
                    battery: drone.battery_percent || 0,
                    signal: 85,
                    heading: drone.position?.heading || 0,
                    verticalSpeed: drone.position?.vertical_speed || 0,
                    windSpeed: 5,
                    temperature: 22,
                    satellites: 12,
                  }}
                />
              </TabsContent>
            )}
            
            {/* Drone Details Tab */}
            <TabsContent value="drone" className="p-4 mt-0">
          <div className="space-y-4">
            {/* Battery Section */}
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Battery className={`h-5 w-5 ${getBatteryColor(drone.battery_percent)}`} />
                    <span className="font-semibold text-sm">Battery</span>
                  </div>
                  <span className={`text-lg font-bold ${getBatteryColor(drone.battery_percent)}`}>
                    {formatBattery(drone.battery_percent)}
                  </span>
                </div>
                
                <Progress value={drone.battery_percent} className="h-2" />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Voltage: {drone.battery_voltage?.toFixed(2)}V</span>
                  <span>Capacity: {drone.battery_capacity}mAh</span>
                </div>
              </div>
            </Card>

            {/* Position & Telemetry */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Position & Telemetry
              </h3>
              <div className="space-y-2">
                <TelemetryRow 
                  label="Altitude" 
                  value={formatAltitude(drone.position?.altitude || 0)}
                />
                <TelemetryRow 
                  label="Speed" 
                  value={formatSpeed(drone.position?.speed || 0)}
                />
                <TelemetryRow 
                  label="Heading" 
                  value={`${drone.position?.heading?.toFixed(0)}°`}
                />
                <TelemetryRow 
                  label="V-Speed" 
                  value={`${drone.position?.vertical_speed?.toFixed(1)} m/s`}
                />
                <TelemetryRow 
                  label="Latitude" 
                  value={drone.position?.latitude.toFixed(6) || 'N/A'}
                />
                <TelemetryRow 
                  label="Longitude" 
                  value={drone.position?.longitude.toFixed(6) || 'N/A'}
                />
              </div>
            </Card>

            {/* Performance */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Performance
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Speed</span>
                    <span className="text-foreground">
                      {drone.position?.speed.toFixed(1)} / {drone.max_speed} m/s
                    </span>
                  </div>
                  <Progress 
                    value={(drone.position?.speed || 0) / drone.max_speed * 100} 
                    className="h-1.5" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Altitude</span>
                    <span className="text-foreground">
                      {drone.position?.altitude.toFixed(0)} / {drone.max_altitude}m
                    </span>
                  </div>
                  <Progress 
                    value={(drone.position?.altitude || 0) / drone.max_altitude * 100} 
                    className="h-1.5" 
                  />
                </div>
              </div>
            </Card>

            {/* Connection */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Radio className="h-4 w-4" />
                Connection
              </h3>
              <div className="space-y-2">
                <TelemetryRow 
                  label="Signal" 
                  value="Strong (95%)"
                  valueColor="text-green-500"
                />
                <TelemetryRow 
                  label="Latency" 
                  value="12ms"
                />
                <TelemetryRow 
                  label="GPS Satellites" 
                  value="18"
                />
                <TelemetryRow 
                  label="Last Update" 
                  value="0.2s ago"
                />
              </div>
            </Card>

            {/* Specifications */}
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Specifications</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="text-foreground">{drone.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Speed</span>
                  <span className="text-foreground">{drone.max_speed} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Altitude</span>
                  <span className="text-foreground">{drone.max_altitude}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Range</span>
                  <span className="text-foreground">{(drone.max_range / 1000).toFixed(1)}km</span>
                </div>
              </div>
            </Card>
          </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </div>
    </motion.div>
  )
}

// Telemetry Row Component
function TelemetryRow({ 
  label, 
  value, 
  valueColor = 'text-foreground' 
}: { 
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueColor}`}>{value}</span>
    </div>
  )
}
