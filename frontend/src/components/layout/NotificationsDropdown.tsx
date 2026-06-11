/**
 * Notifications Dropdown Panel
 * 
 * Displays recent notifications with actions
 */

import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
}

const mockNotifications = [
  {
    id: '1',
    type: 'warning' as const,
    title: 'Low Battery Warning',
    message: 'Drone DJI-001 battery at 25%',
    time: '2 minutes ago',
    read: false,
  },
  {
    id: '2',
    type: 'success' as const,
    title: 'Mission Completed',
    message: 'Survey Mission Alpha completed successfully',
    time: '15 minutes ago',
    read: false,
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'Weather Alert',
    message: 'Wind speed increasing in mission area',
    time: '1 hour ago',
    read: true,
  },
]

export default function NotificationsDropdown({ isOpen, onClose }: NotificationsDropdownProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            onClick={onClose}
          />

          {/* Dropdown Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-20 right-4 z-50 w-96 glass-effect rounded-lg shadow-2xl border border-border/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Notifications</h3>
                <Badge variant="destructive" className="h-5 px-2 text-xs">
                  {mockNotifications.filter(n => !n.read).length}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Notifications List */}
            <ScrollArea className="h-96">
              <div className="p-2">
                {mockNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      'p-3 mb-2 rounded-lg cursor-pointer transition-colors',
                      notification.read 
                        ? 'bg-background/50 hover:bg-background/80' 
                        : 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{notification.time}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-border/50">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Mark all as read
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
