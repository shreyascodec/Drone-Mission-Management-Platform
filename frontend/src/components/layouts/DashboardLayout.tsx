/**
 * Map-First Dashboard Layout
 * 
 * Features:
 * - Fullscreen map background
 * - Slide-in side panels (left: missions, right: drone details)
 * - Top status bar
 * - Floating action buttons
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import MapView from '@/components/Map/MapView'
import TopStatusBar from '@/components/layout/TopStatusBar'
import LeftPanel from '@/components/layout/LeftPanel'
import RightPanel from '@/components/layout/RightPanel'
import FloatingControls from '@/components/layout/FloatingControls'
import { useAppStore } from '@/store/appStore'

export default function DashboardLayout() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  
  const { selectedMission, selectedDrone } = useAppStore()

  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative">
      {/* Fullscreen Map */}
      <div className="absolute inset-0 z-0">
        <MapView />
      </div>

      {/* Top Status Bar */}
      <TopStatusBar 
        onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
      />

      {/* Left Panel - Missions & Waypoints */}
      <AnimatePresence>
        {leftPanelOpen && (
          <LeftPanel 
            onClose={() => setLeftPanelOpen(false)}
            selectedMission={selectedMission}
          />
        )}
      </AnimatePresence>

      {/* Right Panel - Drone Details & Telemetry */}
      <AnimatePresence>
        {rightPanelOpen && (
          <RightPanel 
            onClose={() => setRightPanelOpen(false)}
            selectedDrone={selectedDrone}
          />
        )}
      </AnimatePresence>

      {/* Floating Controls */}
      <FloatingControls 
        onToggleLeftPanel={() => setLeftPanelOpen(!leftPanelOpen)}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
      />

      {/* Page Content (for routing) */}
      <Outlet />
    </div>
  )
}
