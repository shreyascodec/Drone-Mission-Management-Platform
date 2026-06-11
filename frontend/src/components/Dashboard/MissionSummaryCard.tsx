/**
 * Mission Summary Card
 * 
 * Displays key metrics for a single mission in a compact card format.
 * Used in dashboard overview and mission lists.
 */

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Calendar,
  MapPin,
  Clock,
  Battery,
  TrendingUp,
  Navigation,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type MissionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'aborted' | 'error'

interface MissionSummary {
  id: string
  name: string
  status: MissionStatus
  startTime?: string
  duration?: string
  distance?: number
  coverage?: number
  battery?: number
  efficiency?: number
  waypoints?: {
    completed: number
    total: number
  }
  droneId?: string
}

interface MissionSummaryCardProps {
  mission: MissionSummary
  variant?: 'default' | 'compact'
}

export default function MissionSummaryCard({ 
  mission, 
  variant = 'default' 
}: MissionSummaryCardProps) {
  const navigate = useNavigate()
  
  // Status configuration
  const statusConfig = {
    pending: { color: 'bg-gray-500', textColor: 'text-gray-700', label: 'Pending' },
    active: { color: 'bg-green-500', textColor: 'text-green-700', label: 'Active' },
    paused: { color: 'bg-amber-500', textColor: 'text-amber-700', label: 'Paused' },
    completed: { color: 'bg-blue-500', textColor: 'text-blue-700', label: 'Completed' },
    aborted: { color: 'bg-red-500', textColor: 'text-red-700', label: 'Aborted' },
    error: { color: 'bg-red-500', textColor: 'text-red-700', label: 'Error' },
  }
  
  const config = statusConfig[mission.status]
  
  // Metric color based on value
  const getMetricColor = (value: number, thresholds = { good: 70, warning: 40 }) => {
    if (value >= thresholds.good) return 'text-green-600'
    if (value >= thresholds.warning) return 'text-amber-600'
    return 'text-red-600'
  }
  
  const handleClick = () => {
    navigate(`/missions/${mission.id}`)
  }
  
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={handleClick}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{mission.name}</h3>
              <p className="text-xs text-muted-foreground">ID: {mission.id.slice(0, 8)}</p>
            </div>
            <Badge variant="outline" className={`${config.textColor} border-current ml-2`}>
              {config.label}
            </Badge>
          </div>
          
          {mission.coverage !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{mission.coverage}%</span>
              </div>
              <Progress value={mission.coverage} className="h-1.5" />
            </div>
          )}
        </Card>
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={handleClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1 truncate">{mission.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="w-3 h-3" />
              <span>{mission.droneId || 'Unassigned'}</span>
            </div>
          </div>
          
          <Badge variant="outline" className={`${config.textColor} border-current`}>
            <div className={`w-2 h-2 rounded-full ${config.color} mr-2`} />
            {config.label}
          </Badge>
        </div>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Duration */}
          {mission.duration && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold">{mission.duration}</p>
              </div>
            </div>
          )}
          
          {/* Distance */}
          {mission.distance !== undefined && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Distance</p>
                <p className="text-sm font-semibold">{mission.distance.toFixed(2)} km</p>
              </div>
            </div>
          )}
          
          {/* Battery */}
          {mission.battery !== undefined && (
            <div className="flex items-center gap-2">
              <Battery className={`w-4 h-4 ${getMetricColor(mission.battery, { good: 50, warning: 20 })}`} />
              <div>
                <p className="text-xs text-muted-foreground">Battery</p>
                <p className={`text-sm font-semibold ${getMetricColor(mission.battery, { good: 50, warning: 20 })}`}>
                  {mission.battery}%
                </p>
              </div>
            </div>
          )}
          
          {/* Efficiency */}
          {mission.efficiency !== undefined && (
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${getMetricColor(mission.efficiency)}`} />
              <div>
                <p className="text-xs text-muted-foreground">Efficiency</p>
                <p className={`text-sm font-semibold ${getMetricColor(mission.efficiency)}`}>
                  {mission.efficiency}%
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        {mission.coverage !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mission Progress</span>
              <span className="font-semibold">{mission.coverage}%</span>
            </div>
            <Progress value={mission.coverage} className="h-2" />
            {mission.waypoints && (
              <p className="text-xs text-muted-foreground">
                Waypoint {mission.waypoints.completed} of {mission.waypoints.total}
              </p>
            )}
          </div>
        )}
        
        {/* Timestamp */}
        {mission.startTime && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Started {new Date(mission.startTime).toLocaleString()}</span>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
