/**
 * Left Slide-in Panel
 * 
 * Displays:
 * - Mission list
 * - Mission details
 * - Waypoint list
 * - Mission controls
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, Square, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn, formatDate, getStatusColor } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { useMissionsStore } from '@/store/missionsStore'
import type { Mission } from '@/types'

interface LeftPanelProps {
  onClose: () => void
  selectedMission?: Mission | null
}

export default function LeftPanel({ onClose, selectedMission: selectedMissionProp }: LeftPanelProps) {
  const navigate = useNavigate()
  const { setSelectedMission } = useAppStore()
  const missions = useMissionsStore((state) => state.missions)

  const displayMissions = Array.from(missions.values())

  // Always render live mission data from the store (telemetry keeps it fresh);
  // the prop is only a selection pointer.
  const selectedMission = selectedMissionProp
    ? missions.get(selectedMissionProp.id) ?? selectedMissionProp
    : null

  const handleCreateMission = () => {
    navigate('/missions/plan')
  }

  const handleSelectMission = (mission: Mission) => {
    setSelectedMission(mission)
    // Center map on mission area if available
    // TODO: Integrate with map controls to show mission area
  }

  const [showAbortDialog, setShowAbortDialog] = useState(false)
  const [actionInProgress, setActionInProgress] = useState(false)
  const [actionNotification, setActionNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  
  // Progress updates come from backend - no local timers needed

  const showNotification = (type: 'success' | 'error', message: string) => {
    setActionNotification({ type, message })
    setTimeout(() => setActionNotification(null), 3000)
  }

  const { startMissionSimulation, pauseMissionSimulation, resumeMissionSimulation, stopMissionSimulation } = useMissionsStore()

  const handleStartMission = async () => {
    if (!selectedMission || actionInProgress) return
    
    console.log('▶️ Starting mission:', selectedMission.name)
    setActionInProgress(true)
    
    try {
      // Call backend API through store
      await startMissionSimulation(selectedMission.id)
      
      showNotification('success', `Mission "${selectedMission.name}" started!`)
      console.log('✅ Mission simulation started')
      
      // Progress will update via WebSocket/backend
    } catch (error) {
      console.error('❌ Error starting mission:', error)
      showNotification('error', 'Failed to start mission. Check backend connection.')
    } finally {
      setActionInProgress(false)
    }
  }

  const handlePauseMission = async () => {
    if (!selectedMission || actionInProgress) return
    
    setActionInProgress(true)
    
    try {
      // Call backend API through store
      await pauseMissionSimulation(selectedMission.id)
      
      showNotification('success', `Mission "${selectedMission.name}" paused`)
    } catch (error) {
      console.error('❌ Error pausing mission:', error)
      showNotification('error', 'Failed to pause mission')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleResumeMission = async () => {
    if (!selectedMission || actionInProgress) return
    
    setActionInProgress(true)
    
    try {
      // Call backend API through store
      await resumeMissionSimulation(selectedMission.id)
      
      showNotification('success', `Mission "${selectedMission.name}" resumed`)
    } catch (error) {
      console.error('❌ Error resuming mission:', error)
      showNotification('error', 'Failed to resume mission')
    } finally {
      setActionInProgress(false)
    }
  }

  const handleAbortMission = async () => {
    if (!selectedMission || actionInProgress) return
    
    setShowAbortDialog(false)
    setActionInProgress(true)
    
    try {
      // Call backend API through store
      await stopMissionSimulation(selectedMission.id)
      
      showNotification('success', `Mission "${selectedMission.name}" aborted`)
    } catch (error) {
      console.error('❌ Error aborting mission:', error)
      showNotification('error', 'Failed to abort mission')
    } finally {
      setActionInProgress(false)
    }
  }

  // Progress updates now come from backend/WebSocket
  // Local simulation removed - all progress updates flow through missionsStore from backend
  // Progress is updated via:
  // 1. Backend simulation engine → WebSocket → missionsStore
  // 2. Direct API calls → missionsStore
  // No local timers needed - single source of truth in store

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute top-16 left-0 bottom-0 z-30 w-96"
    >
      <div className="h-full glass-effect border-r border-border/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold text-foreground">Missions</h2>
            <p className="text-xs text-muted-foreground">Active flight operations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {/* New Mission Button */}
            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleCreateMission}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Mission
            </Button>

            {/* Mission Cards - Dynamic from Store */}
            {displayMissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No missions yet</p>
                <p className="text-xs mt-1">Create your first mission to get started</p>
              </div>
            ) : (
              displayMissions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  isSelected={selectedMission?.id === mission.id}
                  onClick={handleSelectMission}
                />
              ))
            )}
          </div>

          {/* Mission Details - Show when selected */}
          {selectedMission && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20"
            >
              <h4 className="text-sm font-semibold mb-2">Selected Mission</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={cn(getStatusColor(selectedMission.status))}>
                    {selectedMission.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="text-foreground font-medium">{selectedMission.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress:</span>
                  <span className="text-foreground font-medium">{selectedMission.progress_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waypoints:</span>
                  <span className="text-foreground font-medium">
                    {selectedMission.waypoints_completed} / {selectedMission.total_waypoints}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </ScrollArea>

        {/* Footer - Quick Actions */}
        {selectedMission && (
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              {/* Start Button - for missions that have not flown yet */}
              {['draft', 'scheduled', 'aborted', 'failed'].includes(selectedMission.status) && (
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1"
                  onClick={handleStartMission}
                  disabled={actionInProgress}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {actionInProgress ? 'Starting...' : 'Start'}
                </Button>
              )}

              {/* Resume Button - only when paused */}
              {selectedMission.status === 'paused' && (
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1"
                  onClick={handleResumeMission}
                  disabled={actionInProgress}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {actionInProgress ? 'Resuming...' : 'Resume'}
                </Button>
              )}

              {/* Pause Button - Only show if active */}
              {selectedMission.status === 'active' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handlePauseMission}
                  disabled={actionInProgress}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  {actionInProgress ? 'Pausing...' : 'Pause'}
                </Button>
              )}
              
              {/* Abort Button - Show if active or paused */}
              {(selectedMission.status === 'active' || selectedMission.status === 'paused') && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setShowAbortDialog(true)}
                  disabled={actionInProgress}
                >
                  <Square className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Abort Confirmation Dialog */}
      <AlertDialog open={showAbortDialog} onOpenChange={setShowAbortDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Abort Mission?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to abort "{selectedMission?.name}"? This action cannot be undone and the drone will return to base immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAbortMission}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Abort Mission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Action Notification */}
      <AnimatePresence>
        {actionNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-4 z-50"
          >
            <Card className={cn(
              "p-4 shadow-2xl border-2",
              actionNotification.type === 'success' 
                ? "bg-green-500 text-white border-green-600" 
                : "bg-red-500 text-white border-red-600"
            )}>
              <div className="flex items-center gap-3">
                {actionNotification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <p className="font-medium">{actionNotification.message}</p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Mission Card Component
function MissionCard({ 
  mission, 
  isSelected,
  onClick
}: { 
  mission: Mission
  isSelected: boolean
  onClick: (mission: Mission) => void
}) {
  return (
    <Card 
      className={cn(
        'p-4 cursor-pointer transition-all hover:shadow-lg',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={() => onClick(mission)}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">
              {mission.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(mission.created_at, 'PP')}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={cn('text-xs', getStatusColor(mission.status))}
          >
            {mission.status}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-medium">
              {mission.progress_percent}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${mission.progress_percent}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {mission.waypoints_completed} / {mission.total_waypoints} waypoints
          </div>
        </div>

        {/* Type Badge */}
        <Badge variant="secondary" className="text-xs">
          {mission.type}
        </Badge>
      </div>
    </Card>
  )
}
