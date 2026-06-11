/**
 * Reporting Dashboard Page
 * 
 * Comprehensive reporting dashboard that displays:
 * - Active mission summaries
 * - Organization-wide statistics
 * - Historical missions list
 * - Performance charts and metrics
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react'

import MissionSummaryCard from '@/components/Dashboard/MissionSummaryCard'
import OrganizationStats from '@/components/Dashboard/OrganizationStats'
import HistoricalMissionsList from '@/components/Dashboard/HistoricalMissionsList'

export default function ReportingDashboardPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  
  // Sample data - Replace with actual API calls
  const activeMissions = [
    {
      id: 'mission-001',
      name: 'Agricultural Survey - Field A',
      status: 'active' as const,
      startTime: new Date(Date.now() - 600000).toISOString(),
      duration: '10m 5s',
      distance: 2.5,
      coverage: 65,
      battery: 75,
      efficiency: 92,
      waypoints: { completed: 13, total: 20 },
      droneId: 'DRONE-01',
    },
    {
      id: 'mission-002',
      name: 'Infrastructure Inspection',
      status: 'active' as const,
      startTime: new Date(Date.now() - 1200000).toISOString(),
      duration: '20m 15s',
      distance: 5.8,
      coverage: 45,
      battery: 55,
      efficiency: 88,
      waypoints: { completed: 9, total: 20 },
      droneId: 'DRONE-03',
    },
    {
      id: 'mission-003',
      name: 'Search and Rescue - Grid 5',
      status: 'paused' as const,
      startTime: new Date(Date.now() - 300000).toISOString(),
      duration: '5m 0s',
      distance: 1.2,
      coverage: 30,
      battery: 90,
      efficiency: 85,
      waypoints: { completed: 6, total: 20 },
      droneId: 'DRONE-05',
    },
  ]
  
  const organizationStats = {
    // Fleet metrics
    totalDrones: 12,
    activeDrones: 5,
    inactiveDrones: 7,
    avgBatteryLevel: 73.5,
    
    // Mission metrics
    totalMissions: 156,
    activeMissions: 3,
    completedMissions: 142,
    abortedMissions: 8,
    pendingMissions: 3,
    
    // Performance metrics
    totalDistance: 1847.5,
    totalFlightTime: 285.3,
    avgEfficiency: 87.2,
    avgMissionDuration: 25.5,
    
    // Today's stats
    missionsToday: 8,
    distanceToday: 45.3,
    flightTimeToday: 6.8,
  }
  
  const historicalMissions = [
    {
      id: 'mission-h-001',
      name: 'Coastal Mapping Survey',
      status: 'completed' as const,
      droneId: 'DRONE-02',
      startTime: new Date(Date.now() - 86400000).toISOString(),
      endTime: new Date(Date.now() - 85200000).toISOString(),
      duration: '20m 0s',
      distance: 12.5,
      coverage: 100,
      efficiency: 95,
      battery: 45,
      waypoints: { completed: 50, total: 50 },
    },
    {
      id: 'mission-h-002',
      name: 'Building Inspection - Site 12',
      status: 'completed' as const,
      droneId: 'DRONE-04',
      startTime: new Date(Date.now() - 172800000).toISOString(),
      endTime: new Date(Date.now() - 171600000).toISOString(),
      duration: '15m 30s',
      distance: 3.8,
      coverage: 100,
      efficiency: 92,
      battery: 38,
      waypoints: { completed: 25, total: 25 },
    },
    {
      id: 'mission-h-003',
      name: 'Agricultural Survey - Field B',
      status: 'completed' as const,
      droneId: 'DRONE-01',
      startTime: new Date(Date.now() - 259200000).toISOString(),
      endTime: new Date(Date.now() - 257400000).toISOString(),
      duration: '30m 0s',
      distance: 18.2,
      coverage: 100,
      efficiency: 88,
      battery: 52,
      waypoints: { completed: 75, total: 75 },
    },
    {
      id: 'mission-h-004',
      name: 'Pipeline Inspection',
      status: 'aborted' as const,
      droneId: 'DRONE-06',
      startTime: new Date(Date.now() - 345600000).toISOString(),
      endTime: new Date(Date.now() - 344700000).toISOString(),
      duration: '12m 0s',
      distance: 6.5,
      coverage: 65,
      efficiency: 72,
      battery: 28,
      waypoints: { completed: 13, total: 20 },
    },
    {
      id: 'mission-h-005',
      name: 'Forest Fire Assessment',
      status: 'completed' as const,
      droneId: 'DRONE-08',
      startTime: new Date(Date.now() - 432000000).toISOString(),
      endTime: new Date(Date.now() - 429600000).toISOString(),
      duration: '40m 0s',
      distance: 25.7,
      coverage: 100,
      efficiency: 90,
      battery: 62,
      waypoints: { completed: 100, total: 100 },
    },
  ]
  
  // Handlers
  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setIsLoading(false)
  }
  
  const handleExportReport = () => {
    // Generate comprehensive report
    const report = {
      generatedAt: new Date().toISOString(),
      organizationStats,
      activeMissions,
      historicalMissions,
    }
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mission-report-${new Date().toISOString()}.json`
    a.click()
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mission Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive overview of all mission activities and performance metrics
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
        
        {/* Last Updated */}
        <div className="text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
        
        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="active">
              <BarChart3 className="w-4 h-4 mr-2" />
              Active Missions
            </TabsTrigger>
            <TabsTrigger value="history">
              <Calendar className="w-4 h-4 mr-2" />
              Mission History
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Organization Stats */}
              <OrganizationStats stats={organizationStats} />
              
              {/* Active Missions Preview */}
              {activeMissions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Active Missions</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const tabsList = document.querySelector('[data-state="active"]')
                        if (tabsList) {
                          const activeTab = document.querySelector('[value="active"]') as HTMLButtonElement
                          activeTab?.click()
                        }
                      }}
                    >
                      View All
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeMissions.slice(0, 3).map((mission) => (
                      <MissionSummaryCard
                        key={mission.id}
                        mission={mission}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recent History Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Recent Missions</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const historyTab = document.querySelector('[value="history"]') as HTMLButtonElement
                      historyTab?.click()
                    }}
                  >
                    View All
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {historicalMissions.slice(0, 3).map((mission) => (
                    <MissionSummaryCard
                      key={mission.id}
                      mission={mission}
                      variant="compact"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </TabsContent>
          
          {/* Active Missions Tab */}
          <TabsContent value="active" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Active Missions</h2>
                    <p className="text-muted-foreground">
                      {activeMissions.length} missions currently in progress
                    </p>
                  </div>
                </div>
                
                {activeMissions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeMissions.map((mission) => (
                      <MissionSummaryCard
                        key={mission.id}
                        mission={mission}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Missions</h3>
                    <p className="text-muted-foreground">
                      All drones are currently idle
                    </p>
                  </Card>
                )}
              </div>
            </motion.div>
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HistoricalMissionsList missions={historicalMissions} />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
