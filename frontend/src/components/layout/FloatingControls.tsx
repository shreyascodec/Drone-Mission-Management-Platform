/**
 * Floating Control Buttons
 * 
 * Quick access controls that float over the map:
 * - Panel toggles
 * - Map controls
 * - Quick actions
 */

import { useState } from 'react'
import { Layers, Target, Maximize2, PanelLeft, PanelRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import MapLayersSelector from './MapLayersSelector'

interface FloatingControlsProps {
  onToggleLeftPanel: () => void
  onToggleRightPanel: () => void
  leftPanelOpen: boolean
  rightPanelOpen: boolean
}

export default function FloatingControls({
  onToggleLeftPanel,
  onToggleRightPanel,
  leftPanelOpen,
  rightPanelOpen,
}: FloatingControlsProps) {
  const [layersOpen, setLayersOpen] = useState(false)
  const { selectedDrone, setFollowDrone } = useAppStore()

  const handleCenterOnDrone = () => {
    if (selectedDrone) {
      setFollowDrone(true)
      // Map will automatically center on drone via MapEffects component
    }
  }

  return (
    <>
      {/* Left Side Toggle (visible when panel is closed) */}
      {!leftPanelOpen && (
        <div className="absolute left-4 top-24 z-20">
          <Button
            size="icon"
            variant="default"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={onToggleLeftPanel}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Right Side Toggle (visible when panel is closed) */}
      {!rightPanelOpen && (
        <div className="absolute right-4 top-24 z-20">
          <Button
            size="icon"
            variant="default"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={onToggleRightPanel}
          >
            <PanelRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Map Controls - Bottom Right */}
      <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            "h-10 w-10 rounded-full shadow-lg glass-effect",
            !selectedDrone && "opacity-50 cursor-not-allowed"
          )}
          title="Center on Drone"
          onClick={handleCenterOnDrone}
          disabled={!selectedDrone}
        >
          <Target className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          variant="secondary"
          className={cn(
            "h-10 w-10 rounded-full shadow-lg glass-effect",
            layersOpen && "bg-primary text-primary-foreground"
          )}
          title="Map Layers"
          onClick={() => setLayersOpen(!layersOpen)}
        >
          <Layers className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          variant="secondary"
          className="h-10 w-10 rounded-full shadow-lg glass-effect"
          title="Fullscreen"
          onClick={() => {
            console.log('Fullscreen clicked')
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen()
            } else {
              document.exitFullscreen()
            }
          }}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Map Layers Selector */}
      <MapLayersSelector 
        isOpen={layersOpen} 
        onClose={() => setLayersOpen(false)} 
      />
    </>
  )
}
