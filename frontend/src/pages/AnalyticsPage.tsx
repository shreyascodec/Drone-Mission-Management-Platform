/**
 * Analytics Page
 * 
 * Advanced analytics and reporting for mission performance
 */

import { useMemo } from 'react'
import MissionAnalyticsCharts from '@/components/Analytics/MissionAnalyticsCharts'
import { useMissionsStore } from '@/store/missionsStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw } from 'lucide-react'

export default function AnalyticsPage() {
  const { missions, loadMissionsFromBackend } = useMissionsStore()
  
  // Convert Map to Array - Single source of truth
  const missionsArray = useMemo(() => Array.from(missions.values()), [missions])
  
  const handleExport = () => {
    // Export real mission data from store
    const data = missionsArray.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      status: m.status,
      progress_percent: m.progress_percent,
      total_waypoints: m.total_waypoints,
      waypoints_completed: m.waypoints_completed,
      total_distance: m.total_distance,
      elapsed_time: m.elapsed_time,
      created_at: m.created_at,
      completed_at: m.completed_at,
    }))
    
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mission-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleRefresh = async () => {
    try {
      await loadMissionsFromBackend()
    } catch (error) {
      console.error('Failed to refresh missions:', error)
    }
  }
  
  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mission Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive performance metrics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Analytics Charts */}
      {missionsArray.length > 0 ? (
        <MissionAnalyticsCharts missions={missionsArray} timeRange="month" />
      ) : (
        <Card className="p-12 text-center">
          <p className="text-lg text-muted-foreground">No mission data available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Complete some missions to see analytics
          </p>
        </Card>
      )}
    </div>
  )
}
