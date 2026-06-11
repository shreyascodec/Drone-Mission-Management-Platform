/**
 * Settings Modal
 * 
 * Global application settings
 */

import { motion, AnimatePresence } from 'framer-motion'
import { X, Map as MapIcon, Bell, Zap, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useAppStore } from '@/store/appStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { followDrone, setFollowDrone } = useAppStore()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl glass-effect rounded-xl shadow-2xl border border-border/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h2 className="text-xl font-bold">Settings</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              <Tabs defaultValue="map" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="map">
                    <MapIcon className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                  <TabsTrigger value="notifications">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger value="performance">
                    <Zap className="h-4 w-4 mr-2" />
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="account">
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </TabsTrigger>
                </TabsList>

                {/* Map Settings */}
                <TabsContent value="map" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Auto-follow Drone</h3>
                        <p className="text-xs text-muted-foreground">
                          Automatically center map on selected drone
                        </p>
                      </div>
                      <Switch checked={followDrone} onCheckedChange={setFollowDrone} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Map Update Rate</h3>
                        <span className="text-xs text-muted-foreground">1 Hz</span>
                      </div>
                      <Slider defaultValue={[1]} max={10} step={1} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Map Zoom Level</h3>
                        <span className="text-xs text-muted-foreground">15</span>
                      </div>
                      <Slider defaultValue={[15]} max={20} min={10} step={1} />
                    </div>
                  </div>
                </TabsContent>

                {/* Notifications Settings */}
                <TabsContent value="notifications" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Low Battery Alerts</h3>
                        <p className="text-xs text-muted-foreground">
                          Notify when drone battery is low
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Mission Completion</h3>
                        <p className="text-xs text-muted-foreground">
                          Notify when missions complete
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Weather Alerts</h3>
                        <p className="text-xs text-muted-foreground">
                          Notify of weather changes
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Sound Effects</h3>
                        <p className="text-xs text-muted-foreground">
                          Play sounds for notifications
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </TabsContent>

                {/* Performance Settings */}
                <TabsContent value="performance" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Hardware Acceleration</h3>
                        <p className="text-xs text-muted-foreground">
                          Use GPU for map rendering
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Reduce Animations</h3>
                        <p className="text-xs text-muted-foreground">
                          Disable animations for better performance
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Telemetry Buffer Size</h3>
                        <span className="text-xs text-muted-foreground">100 points</span>
                      </div>
                      <Slider defaultValue={[100]} max={1000} min={10} step={10} />
                    </div>
                  </div>
                </TabsContent>

                {/* Account Settings */}
                <TabsContent value="account" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">User Information</h3>
                      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">operator@dronecorp.com</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Role:</span>
                          <span className="font-medium">Mission Operator</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Organization:</span>
                          <span className="font-medium">DroneCorp</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button variant="outline" className="w-full">
                        Change Password
                      </Button>
                      <Button variant="outline" className="w-full">
                        Update Profile
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-border/50">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onClose}>
                Save Changes
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
