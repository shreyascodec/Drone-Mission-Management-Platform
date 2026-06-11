/**
 * Top Status Bar
 * 
 * Displays:
 * - App logo and title
 * - Active missions count
 * - Connection status
 * - Quick actions
 * - User menu
 */

import { useState } from 'react'
import { Menu, Radio, Wifi, WifiOff, Bell, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { useMissionsStore } from '@/store/missionsStore'
import { useDronesStore } from '@/store/dronesStore'
import NotificationsDropdown from './NotificationsDropdown'
import SettingsModal from './SettingsModal'

interface TopStatusBarProps {
  onToggleLeftPanel: () => void
  onToggleRightPanel: () => void
  leftPanelOpen: boolean
  rightPanelOpen: boolean
}

export default function TopStatusBar({
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelOpen,
  rightPanelOpen,
}: TopStatusBarProps) {
  const { isConnected } = useAppStore()
  const activeMissions = useMissionsStore(
    (state) => Array.from(state.missions.values()).filter((m) => m.status === 'active').length
  )
  const connectedDrones = useDronesStore((state) => state.drones.size)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
    <div className="absolute top-0 left-0 right-0 z-40 h-16 glass-effect border-b border-border/50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Panel Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLeftPanel}
            className="text-foreground"
          >
            {leftPanelOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Radio className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Mission Control</h1>
              <p className="text-xs text-muted-foreground">Real-time Drone Operations</p>
            </div>
          </div>
        </div>

        {/* Center Section - Mission Stats */}
        <div className="flex items-center gap-6">
          {/* Active Missions */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-foreground">
              {activeMissions} Active
            </span>
          </div>

          {/* Connected Drones */}
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-foreground">
              {connectedDrones} Online
            </span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("relative", notificationsOpen && "bg-accent")}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon"
            className={cn(settingsOpen && "bg-accent")}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* Right Panel Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleRightPanel}
          >
            {rightPanelOpen ? <ChevronRight className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>

    {/* Notifications Dropdown */}
    <NotificationsDropdown 
      isOpen={notificationsOpen} 
      onClose={() => setNotificationsOpen(false)} 
    />

    {/* Settings Modal */}
    <SettingsModal 
      isOpen={settingsOpen} 
      onClose={() => setSettingsOpen(false)} 
    />
    </>
  )
}
