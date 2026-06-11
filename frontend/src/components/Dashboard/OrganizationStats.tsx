/**
 * Organization-Wide Statistics
 * 
 * Displays aggregated statistics across all missions and drones:
 * - Fleet overview
 * - Mission performance metrics
 * - Charts and trends
 * - Key performance indicators (KPIs)
 */

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import {
  Plane,
  CheckCircle,
  Clock,
  TrendingUp,
  Battery,
  MapPin,
  Activity,
} from 'lucide-react'

interface OrganizationStatsProps {
  stats: {
    // Fleet metrics
    totalDrones: number
    activeDrones: number
    inactiveDrones: number
    avgBatteryLevel: number
    
    // Mission metrics
    totalMissions: number
    activeMissions: number
    completedMissions: number
    abortedMissions: number
    pendingMissions: number
    
    // Performance metrics
    totalDistance: number // km
    totalFlightTime: number // hours
    avgEfficiency: number // percentage
    avgMissionDuration: number // minutes
    
    // Today's stats
    missionsToday: number
    distanceToday: number
    flightTimeToday: number
  }
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: string
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'text-primary' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-bold mb-1">{value}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`w-3 h-3 ${!trend.isPositive && 'rotate-180'}`} />
                <span>{Math.abs(trend.value)}% vs last week</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-muted ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export default function OrganizationStats({ stats }: OrganizationStatsProps) {
  // Calculate derived metrics
  const fleetUtilization = stats.totalDrones > 0 
    ? ((stats.activeDrones / stats.totalDrones) * 100).toFixed(1)
    : '0'
  
  const missionSuccessRate = (stats.completedMissions + stats.abortedMissions) > 0
    ? ((stats.completedMissions / (stats.completedMissions + stats.abortedMissions)) * 100).toFixed(1)
    : '100'
  
  const avgBatteryColor = stats.avgBatteryLevel > 50 
    ? 'text-green-600' 
    : stats.avgBatteryLevel > 20 
      ? 'text-amber-600' 
      : 'text-red-600'
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-1">Organization Overview</h2>
        <p className="text-muted-foreground">
          Real-time statistics across your entire drone fleet
        </p>
      </div>
      
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Missions"
          value={stats.activeMissions}
          subtitle={`${stats.totalMissions} total missions`}
          icon={Activity}
          color="text-green-600"
          trend={{ value: 12, isPositive: true }}
        />
        
        <StatCard
          title="Fleet Status"
          value={`${stats.activeDrones}/${stats.totalDrones}`}
          subtitle={`${fleetUtilization}% utilization`}
          icon={Plane}
          color="text-blue-600"
        />
        
        <StatCard
          title="Completed Today"
          value={stats.missionsToday}
          subtitle={`${stats.distanceToday.toFixed(1)} km covered`}
          icon={CheckCircle}
          color="text-purple-600"
          trend={{ value: 8, isPositive: true }}
        />
        
        <StatCard
          title="Avg Efficiency"
          value={`${stats.avgEfficiency.toFixed(1)}%`}
          subtitle="Across all missions"
          icon={TrendingUp}
          color="text-indigo-600"
        />
      </div>
      
      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mission Breakdown */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Mission Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">Active</span>
              </div>
              <span className="text-sm font-semibold">{stats.activeMissions}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm">Completed</span>
              </div>
              <span className="text-sm font-semibold">{stats.completedMissions}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm">Pending</span>
              </div>
              <span className="text-sm font-semibold">{stats.pendingMissions}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm">Aborted</span>
              </div>
              <span className="text-sm font-semibold">{stats.abortedMissions}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Success Rate</span>
              <span className="font-semibold text-green-600">{missionSuccessRate}%</span>
            </div>
          </div>
        </Card>
        
        {/* Fleet Health */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Battery className="w-4 h-4" />
            Fleet Health
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg Battery</span>
              <span className={`text-sm font-semibold ${avgBatteryColor}`}>
                {stats.avgBatteryLevel.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Drones</span>
              <span className="text-sm font-semibold">{stats.activeDrones}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Inactive</span>
              <span className="text-sm font-semibold">{stats.inactiveDrones}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Fleet</span>
              <span className="text-sm font-semibold">{stats.totalDrones}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilization</span>
              <span className="font-semibold text-blue-600">{fleetUtilization}%</span>
            </div>
          </div>
        </Card>
        
        {/* Performance Summary */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Performance Summary
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Total Distance</span>
                <span className="text-sm font-semibold">
                  {stats.totalDistance.toFixed(1)} km
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.distanceToday.toFixed(1)} km today
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Flight Time</span>
                <span className="text-sm font-semibold">
                  {stats.totalFlightTime.toFixed(1)} hrs
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.flightTimeToday.toFixed(1)} hrs today
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Avg Duration</span>
                <span className="text-sm font-semibold">
                  {stats.avgMissionDuration.toFixed(0)} min
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Per mission
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Performance Indicators */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Mission Success Rate</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">{missionSuccessRate}%</span>
              <span className="text-xs text-muted-foreground">
                {stats.completedMissions}/{stats.completedMissions + stats.abortedMissions}
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">Fleet Utilization</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">{fleetUtilization}%</span>
              <span className="text-xs text-muted-foreground">
                {stats.activeDrones}/{stats.totalDrones} active
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">Avg Efficiency</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-600">
                {stats.avgEfficiency.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                All missions
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-2">Avg Battery</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${avgBatteryColor}`}>
                {stats.avgBatteryLevel.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                Fleet average
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
