/**
 * Error Toast Component
 * 
 * Replaces alert() with proper error display
 */

import { X, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from './card'
import { Button } from './button'

interface ErrorToastProps {
  message: string
  onClose: () => void
  visible: boolean
}

export function ErrorToast({ message, onClose, visible }: ErrorToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-4 z-[9999] max-w-md"
        >
          <Card className="p-4 bg-destructive/10 border-destructive/20 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
