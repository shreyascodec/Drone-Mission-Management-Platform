/**
 * Drones Page - Fleet Management Dashboard
 * 
 * Displays:
 * - Drone inventory grid
 * - Status indicators
 * - Battery levels
 * - Last activity
 * - Filters and search
 */

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Battery, 
  BatteryCharging, 
  BatteryLow,
  Circle,
  Wifi,
  WifiOff,
  MapPin,
  Clock,
  AlertTriangle,
  Settings,
  Activity
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useDronesStore } from '@/store/dronesStore'
import { useMissionsStore } from '@/store/missionsStore'
import type { DroneStatus } from '@/types'

// Status colors and labels
const STATUS_CONFIG: Record<DroneStatus, { color: string; label: string; icon: typeof Circle }> = {
  idle: { color: 'bg-green-500', label: 'Available', icon: Circle },
  active: { color: 'bg-blue-500', label: 'In Mission', icon: Activity },
  charging: { color: 'bg-yellow-500', label: 'Charging', icon: BatteryCharging },
  maintenance: { color: 'bg-orange-500', label: 'Maintenance', icon: Settings },
  error: { color: 'bg-red-500', label: 'Error', icon: AlertTriangle },
  offline: { color: 'bg-gray-500', label: 'Offline', icon: WifiOff },
}

// Battery icon based on level
const getBatteryIcon = (level: number, isCharging: boolean) => {
  if (isCharging) return BatteryCharging
  if (level < 20) return BatteryLow
  return Battery
}

// Battery color based on level
const getBatteryColor = (level: number) => {
  if (level < 20) return 'text-red-500'
  if (level < 50) return 'text-yellow-500'
  return 'text-green-500'
}

export default function DronesPage() {
  const { drones, getConnectedDrones, getDronesByStatus, isLoading, error, loadDronesFromBackend } = useDronesStore()
  const { missions } = useMissionsStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DroneStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'battery' | 'status' | 'lastSeen'>('name')
  
  // Load drones on mount if empty
  useEffect(() => {
    if (drones.size === 0 && !isLoading) {
      loadDronesFromBackend().catch(console.error)
    }
  }, [drones.size, isLoading, loadDronesFromBackend])
  
  // Convert Map to Array with safe defaults
  const dronesArray = useMemo(() => {
    return Array.from(drones.values()).map(drone => {
      // Map backend properties to component expectations
      const totalFlights = (drone as any).total_flights ?? (drone as any).missions_completed ?? 0
      const flightTimeMinutes = (drone as any).flight_time_minutes ?? 
        ((drone as any).total_flight_time ? Math.round((drone as any).total_flight_time / 60) : 0)
      
      return {
        ...drone,
        battery_percent: drone.battery_percent ?? 0,
        total_flights: totalFlights,
        flight_time_minutes: flightTimeMinutes,
        isConnected: drone.isConnected ?? false,
        lastSeen: drone.lastSeen instanceof Date 
          ? drone.lastSeen 
          : (drone as any).last_seen
            ? new Date((drone as any).last_seen) 
            : new Date(),
        status: drone.status ?? 'offline',
        model: drone.model ?? 'Unknown',
        serial_number: drone.serial_number ?? '',
        name: drone.name ?? 'Unnamed Drone',
      }
    })
  }, [drones])
  
  // Filter drones
  const filteredDrones = useMemo(() => {
    let filtered = dronesArray
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(drone => 
        drone.name.toLowerCase().includes(query) ||
        drone.serial_number.toLowerCase().includes(query) ||
        drone.model.toLowerCase().includes(query)
      )
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(drone => drone.status === statusFilter)
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'battery':
          return (b.battery_percent || 0) - (a.battery_percent || 0)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'lastSeen':
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })
    
    return filtered
  }, [dronesArray, searchQuery, statusFilter, sortBy])
  
  // Fleet statistics - with safe fallbacks
  const fleetStats = useMemo(() => {
    const total = dronesArray.length
    const available = (getDronesByStatus?.('idle') || []).length
    const active = (getDronesByStatus?.('active') || []).length
    const charging = (getDronesByStatus?.('charging') || []).length
    const maintenance = (getDronesByStatus?.('maintenance') || []).length
    const offline = (getDronesByStatus?.('offline') || []).length
    const connected = (getConnectedDrones?.() || []).length
    const avgBattery = dronesArray.length > 0
      ? dronesArray.reduce((sum, d) => sum + (d.battery_percent || 0), 0) / dronesArray.length
      : 0
    
    return { total, available, active, charging, maintenance, offline, connected, avgBattery }
  }, [dronesArray, getDronesByStatus, getConnectedDrones])
  
  // Get mission for drone - safe lookup
  const getMissionForDrone = (droneId: string) => {
    try {
      if (!missions || missions.size === 0) return null
      return Array.from(missions.values()).find(
        m => m?.drone_id === droneId && (m.status === 'active' || m.status === 'paused')
      ) || null
    } catch (error) {
      console.error('Error getting mission for drone:', error)
      return null
    }
  }
  
  // Show loading state
  if (isLoading && drones.size === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading drone fleet...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error && drones.size === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold mb-2">Failed to Load Drones</h2>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => loadDronesFromBackend()} variant="default">
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Drone Fleet</h1>
        <p className="text-muted-foreground">Monitor and manage your drone inventory</p>
      </div>
      
      {/* Fleet Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard
          label="Total"
          value={fleetStats.total}
          icon={Circle}
          color="text-blue-500"
        />
        <StatCard
          label="Available"
          value={fleetStats.available}
          icon={Circle}
          color="text-green-500"
        />
        <StatCard
          label="Active"
          value={fleetStats.active}
          icon={Activity}
          color="text-blue-500"
        />
        <StatCard
          label="Charging"
          value={fleetStats.charging}
          icon={BatteryCharging}
          color="text-yellow-500"
        />
        <StatCard
          label="Maintenance"
          value={fleetStats.maintenance}
          icon={Settings}
          color="text-orange-500"
        />
        <StatCard
          label="Offline"
          value={fleetStats.offline}
          icon={WifiOff}
          color="text-gray-500"
        />
        <StatCard
          label="Connected"
          value={fleetStats.connected}
          icon={Wifi}
          color="text-green-500"
        />
        <StatCard
          label="Avg Battery"
          value={`${Math.round(fleetStats.avgBattery)}%`}
          icon={Battery}
          color={getBatteryColor(fleetStats.avgBattery)}
        />
      </div>
      
      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, serial number, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({dronesArray.length})
            </Button>
            {(Object.keys(STATUS_CONFIG) as DroneStatus[]).map((status) => {
              const count = getDronesByStatus?.(status)?.length || 0
              return (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {STATUS_CONFIG[status].label} ({count})
                </Button>
              )
            })}
          </div>
          
          {/* Sort */}
          <div className="flex gap-2">
            <Filter className="h-5 w-5 text-muted-foreground self-center" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
            >
              <option value="name">Name</option>
              <option value="battery">Battery</option>
              <option value="status">Status</option>
              <option value="lastSeen">Last Seen</option>
            </select>
          </div>
        </div>
      </Card>
      
      {/* Drones Grid */}
      <ScrollArea className="flex-1">
        {filteredDrones.length === 0 ? (
          <div className="text-center py-12">
            <Circle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No drones found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Add drones to your fleet to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {filteredDrones.map((drone, index) => (
              <DroneCard
                key={drone.id}
                drone={drone}
                mission={getMissionForDrone(drone.id)}
                index={index}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string
  value: number | string
  icon: typeof Circle
  color: string 
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
    </Card>
  )
}

// Drone Card Component
function DroneCard({ 
  drone, 
  mission,
  index 
}: { 
  drone: any
  mission: any
  index: number 
}) {
  // Safe status handling
  const droneStatus = (drone.status || 'offline') as DroneStatus
  const statusConfig = STATUS_CONFIG[droneStatus] || STATUS_CONFIG.offline
  const StatusIcon = statusConfig.icon
  const BatteryIcon = getBatteryIcon(drone.battery_percent || 0, drone.status === 'charging')
  
  // Time since last seen - safe date handling
  const lastSeenText = useMemo(() => {
    try {
      const now = new Date()
      const lastSeen = drone.lastSeen instanceof Date 
        ? drone.lastSeen 
        : typeof drone.lastSeen === 'string' 
          ? new Date(drone.lastSeen) 
          : new Date()
      
      if (isNaN(lastSeen.getTime())) {
        return 'Unknown'
      }
      
      const diffMs = now.getTime() - lastSeen.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ago`
    } catch (error) {
      return 'Unknown'
    }
  }, [drone.lastSeen])
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground truncate">{drone.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{drone.serial_number}</p>
          </div>
          <Badge 
            variant="outline" 
            className={cn('flex items-center gap-1', statusConfig.color, 'text-white border-transparent')}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
        
        {/* Model */}
        <div className="text-sm text-muted-foreground mb-3">
          {drone.model}
        </div>
        
        {/* Battery */}
        <div className="flex items-center justify-between mb-3 p-2 bg-secondary/50 rounded">
          <div className="flex items-center gap-2">
            <BatteryIcon className={cn('h-4 w-4', getBatteryColor(drone.battery_percent || 0))} />
            <span className="text-sm font-medium">{drone.battery_percent || 0}%</span>
          </div>
          <div className="flex-1 mx-3 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full',
                drone.battery_percent < 20 ? 'bg-red-500' :
                drone.battery_percent < 50 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${drone.battery_percent || 0}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            />
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 mb-2">
          {drone.isConnected ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-muted-foreground">Disconnected</span>
            </>
          )}
        </div>
        
        {/* Last Seen */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{lastSeenText}</span>
        </div>
        
        {/* Current Mission */}
        {mission && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium text-foreground truncate">
                {mission.name}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {mission.progress_percent}% complete
            </div>
          </div>
        )}
        
        {/* Flight Stats */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs">
          <div>
            <div className="text-muted-foreground">Total Flights</div>
            <div className="font-medium">{(drone as any).total_flights ?? (drone as any).missions_completed ?? 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Flight Time</div>
            <div className="font-medium">
              {(drone as any).flight_time_minutes 
                ? `${Math.round((drone as any).flight_time_minutes / 60)}h`
                : (drone as any).total_flight_time
                  ? `${Math.round((drone as any).total_flight_time / 3600)}h`
                  : '0h'}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
