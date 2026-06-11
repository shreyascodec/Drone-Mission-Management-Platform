/**
 * Telemetry Panel
 * 
 * Real-time telemetry display for active missions
 * - Live charts for altitude, speed, battery
 * - Waypoint ETA
 * - Signal strength
 * - Flight metrics
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Battery,
  Gauge,
  Navigation,
  Signal,
  Wifi,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Wind,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Mission } from '@/types'

interface TelemetryPanelProps {
  mission: Mission
  realtime?: {
    altitude: number
    speed: number
    battery: number
    signal: number
    heading: number
    verticalSpeed: number
    windSpeed?: number
    temperature?: number
    satellites?: number
  }
}

export default function TelemetryPanel({ mission, realtime }: TelemetryPanelProps) {
  // Calculate ETA
  const eta = useMemo(() => {
    if (!mission.estimated_completion) return null
    const now = new Date()
    const completion = new Date(mission.estimated_completion)
    const diffMs = completion.getTime() - now.getTime()
    const diffMins = Math.max(0, Math.floor(diffMs / 60000))
    
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }, [mission.estimated_completion])

  // Calculate remaining waypoints
  const remainingWaypoints = mission.total_waypoints - mission.waypoints_completed

  // Default telemetry if not provided
  const telemetry = realtime || {
    altitude: 80,
    speed: 12,
    battery: 75,
    signal: 85,
    heading: 180,
    verticalSpeed: 0,
    windSpeed: 5,
    temperature: 22,
    satellites: 12,
  }

  // Get trend indicator
  const getTrend = (value: number) => {
    if (value > 0.5) return <TrendingUp className="h-3 w-3 text-green-500" />
    if (value < -0.5) return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-gray-500" />
  }

  // Get battery color
  const getBatteryColor = (level: number) => {
    if (level < 20) return 'text-red-500'
    if (level < 50) return 'text-yellow-500'
    return 'text-green-500'
  }

  // Get signal color
  const getSignalColor = (strength: number) => {
    if (strength < 30) return 'text-red-500'
    if (strength < 70) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={Gauge}
          label="Altitude"
          value={`${Math.round(telemetry.altitude)}m`}
          color="text-blue-500"
          trend={getTrend(telemetry.verticalSpeed)}
        />
        <MetricCard
          icon={Activity}
          label="Speed"
          value={`${Math.round(telemetry.speed)} m/s`}
          color="text-purple-500"
        />
        <MetricCard
          icon={Battery}
          label="Battery"
          value={`${Math.round(telemetry.battery)}%`}
          color={getBatteryColor(telemetry.battery)}
          progress={telemetry.battery}
        />
        <MetricCard
          icon={Signal}
          label="Signal"
          value={`${Math.round(telemetry.signal)}%`}
          color={getSignalColor(telemetry.signal)}
          progress={telemetry.signal}
        />
      </div>

      {/* Mission Progress */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Mission Progress</span>
            <span className="font-medium">{mission.progress_percent}%</span>
          </div>
          <Progress value={mission.progress_percent} className="h-2" />
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Waypoints</div>
              <div className="font-medium">
                {mission.waypoints_completed}/{mission.total_waypoints}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Remaining</div>
              <div className="font-medium">{remainingWaypoints}</div>
            </div>
            <div>
              <div className="text-muted-foreground">ETA</div>
              <div className="font-medium">{eta || 'Calculating...'}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Info */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Heading</span>
          </div>
          <div className="text-2xl font-bold">{Math.round(telemetry.heading)}°</div>
          <div className="text-xs text-muted-foreground">
            {getCardinalDirection(telemetry.heading)}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Next Waypoint</span>
          </div>
          <div className="text-2xl font-bold">{mission.waypoints_completed + 1}</div>
          <div className="text-xs text-muted-foreground">
            {remainingWaypoints} remaining
          </div>
        </Card>
      </div>

      {/* Flight Conditions */}
      {(telemetry.windSpeed !== undefined ||
        telemetry.temperature !== undefined ||
        telemetry.satellites !== undefined) && (
        <Card className="p-4">
          <div className="text-sm font-medium mb-3">Flight Conditions</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {telemetry.windSpeed !== undefined && (
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Wind className="h-3 w-3" />
                  <span>Wind</span>
                </div>
                <div className="font-medium">{telemetry.windSpeed} m/s</div>
              </div>
            )}
            {telemetry.temperature !== undefined && (
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Zap className="h-3 w-3" />
                  <span>Temp</span>
                </div>
                <div className="font-medium">{telemetry.temperature}°C</div>
              </div>
            )}
            {telemetry.satellites !== undefined && (
              <div>
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Wifi className="h-3 w-3" />
                  <span>GPS</span>
                </div>
                <div className="font-medium">{telemetry.satellites} sats</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Status Indicators */}
      <div className="flex flex-wrap gap-2">
        <StatusBadge
          icon={Battery}
          label={telemetry.battery > 30 ? 'Battery Good' : 'Low Battery'}
          variant={telemetry.battery > 30 ? 'success' : 'warning'}
        />
        <StatusBadge
          icon={Signal}
          label={telemetry.signal > 50 ? 'Signal Strong' : 'Weak Signal'}
          variant={telemetry.signal > 50 ? 'success' : 'warning'}
        />
        {telemetry.satellites !== undefined && (
          <StatusBadge
            icon={Wifi}
            label={telemetry.satellites >= 8 ? 'GPS Lock' : 'GPS Weak'}
            variant={telemetry.satellites >= 8 ? 'success' : 'warning'}
          />
        )}
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
  progress,
}: {
  icon: typeof Activity
  label: string
  value: string
  color: string
  trend?: React.ReactNode
  progress?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <Icon className={cn('h-4 w-4', color)} />
          {trend}
        </div>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {progress !== undefined && (
          <Progress value={progress} className="h-1 mt-2" />
        )}
      </Card>
    </motion.div>
  )
}

// Status Badge Component
function StatusBadge({
  icon: Icon,
  label,
  variant,
}: {
  icon: typeof Activity
  label: string
  variant: 'success' | 'warning' | 'error'
}) {
  const colors = {
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
  }

  return (
    <Badge variant="outline" className={cn('flex items-center gap-1', colors[variant])}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

// Get cardinal direction from heading
function getCardinalDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(heading / 45) % 8
  return directions[index]
}
