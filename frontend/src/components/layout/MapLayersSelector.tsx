/**
 * Map Layers Selector
 * 
 * Floating panel to toggle map layers and overlays
 */

import { motion, AnimatePresence } from 'framer-motion'
import { X, Map, Route, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

interface MapLayersSelectorProps {
  isOpen: boolean
  onClose: () => void
}

export default function MapLayersSelector({ isOpen, onClose }: MapLayersSelectorProps) {
  const { showFlightPath, showWaypoints, setShowFlightPath, setShowWaypoints } = useAppStore()

  const layers = [
    {
      id: 'flight-paths',
      name: 'Flight Paths',
      icon: Route,
      enabled: showFlightPath,
      toggle: setShowFlightPath,
    },
    {
      id: 'waypoints',
      name: 'Waypoints',
      icon: MapPin,
      enabled: showWaypoints,
      toggle: setShowWaypoints,
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Layers Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-4 z-50 w-64 glass-effect rounded-lg shadow-2xl border border-border/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Map Layers</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Layers List */}
            <div className="p-2">
              {layers.map((layer) => {
                const Icon = layer.icon
                return (
                  <motion.button
                    key={layer.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => layer.toggle(!layer.enabled)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
                      layer.enabled
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-background/50 hover:bg-background/80'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-md',
                        layer.enabled ? 'bg-primary/20' : 'bg-muted'
                      )}>
                        <Icon className={cn(
                          'h-4 w-4',
                          layer.enabled ? 'text-primary' : 'text-muted-foreground'
                        )} />
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        layer.enabled ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {layer.name}
                      </span>
                    </div>

                    {/* Toggle Indicator */}
                    <div className={cn(
                      'h-5 w-9 rounded-full transition-colors relative',
                      layer.enabled ? 'bg-primary' : 'bg-muted'
                    )}>
                      <motion.div
                        animate={{ x: layer.enabled ? 16 : 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                        className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
                      />
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setShowFlightPath(true)
                  setShowWaypoints(true)
                }}
              >
                Enable All Layers
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
