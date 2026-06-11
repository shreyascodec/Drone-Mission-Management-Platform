/**
 * Historical Missions List
 * 
 * Displays a table of past missions with:
 * - Filtering by status, date range, drone
 * - Sorting by various columns
 * - Pagination
 * - Quick actions
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  BarChart3,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type MissionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'aborted' | 'error'

interface HistoricalMission {
  id: string
  name: string
  status: MissionStatus
  droneId: string
  startTime: string
  endTime?: string
  duration: string
  distance: number // km
  coverage: number // percentage
  efficiency: number // percentage
  battery: number // percentage used
  waypoints: {
    completed: number
    total: number
  }
}

interface HistoricalMissionsListProps {
  missions: HistoricalMission[]
}

type SortField = 'name' | 'startTime' | 'duration' | 'distance' | 'coverage' | 'efficiency'
type SortDirection = 'asc' | 'desc'

export default function HistoricalMissionsList({ missions }: HistoricalMissionsListProps) {
  const navigate = useNavigate()
  
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('startTime')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Status configuration
  const statusConfig = {
    pending: { color: 'bg-gray-500', label: 'Pending', variant: 'secondary' as const },
    active: { color: 'bg-green-500', label: 'Active', variant: 'default' as const },
    paused: { color: 'bg-amber-500', label: 'Paused', variant: 'secondary' as const },
    completed: { color: 'bg-blue-500', label: 'Completed', variant: 'outline' as const },
    aborted: { color: 'bg-red-500', label: 'Aborted', variant: 'destructive' as const },
    error: { color: 'bg-red-500', label: 'Error', variant: 'destructive' as const },
  }
  
  // Filtering and sorting
  const filteredAndSortedMissions = useMemo(() => {
    let result = [...missions]
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.droneId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter)
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]
      
      // Handle date sorting
      if (sortField === 'startTime') {
        aValue = new Date(a.startTime).getTime()
        bValue = new Date(b.startTime).getTime()
      }
      
      const multiplier = sortDirection === 'asc' ? 1 : -1
      return (aValue > bValue ? 1 : -1) * multiplier
    })
    
    return result
  }, [missions, searchQuery, statusFilter, sortField, sortDirection])
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMissions.length / itemsPerPage)
  const paginatedMissions = filteredAndSortedMissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  
  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }
  
  const handleViewMission = (missionId: string) => {
    navigate(`/missions/${missionId}`)
  }
  
  const handleExportData = () => {
    const csv = [
      ['ID', 'Name', 'Status', 'Drone', 'Start Time', 'Duration', 'Distance', 'Coverage', 'Efficiency'].join(','),
      ...filteredAndSortedMissions.map(m => [
        m.id,
        m.name,
        m.status,
        m.droneId,
        m.startTime,
        m.duration,
        m.distance,
        m.coverage,
        m.efficiency
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `missions-export-${new Date().toISOString()}.csv`
    a.click()
  }
  
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mission History</h2>
          <p className="text-muted-foreground">
            {filteredAndSortedMissions.length} missions found
          </p>
        </div>
        
        <Button onClick={handleExportData} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search missions, drones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md bg-background"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MissionStatus | 'all')}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="pending">Pending</option>
              <option value="aborted">Aborted</option>
            </select>
          </div>
        </div>
      </Card>
      
      {/* Table */}
      <Card>
        <ScrollArea className="h-[600px]">
          <div className="min-w-full">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Mission
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('startTime')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Start Time
                      <SortIcon field="startTime" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('duration')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Duration
                      <SortIcon field="duration" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('distance')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Distance
                      <SortIcon field="distance" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('coverage')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Coverage
                      <SortIcon field="coverage" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('efficiency')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Efficiency
                      <SortIcon field="efficiency" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y">
                <AnimatePresence mode="popLayout">
                  {paginatedMissions.map((mission, index) => (
                    <motion.tr
                      key={mission.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewMission(mission.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium">{mission.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {mission.droneId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusConfig[mission.status].variant}>
                          {statusConfig[mission.status].label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(mission.startTime).toLocaleDateString()}
                        <div className="text-xs text-muted-foreground">
                          {new Date(mission.startTime).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {mission.duration}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {mission.distance.toFixed(2)} km
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm">{mission.coverage}%</div>
                          <div className="w-16 bg-muted rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${mission.coverage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          mission.efficiency >= 80 ? 'text-green-600' :
                          mission.efficiency >= 60 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {mission.efficiency}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewMission(mission.id)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/missions/${mission.id}/statistics`)
                            }}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            
            {/* Empty State */}
            {paginatedMissions.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No missions found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedMissions.length)} of{' '}
                {filteredAndSortedMissions.length} results
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
