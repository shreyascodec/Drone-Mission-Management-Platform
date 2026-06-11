/**
 * Validation Panel Component
 * 
 * Displays mission validation errors and warnings
 */

import { AlertCircle, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface ValidationPanelProps {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export function ValidationPanel({ isValid, errors, warnings = [] }: ValidationPanelProps) {
  if (isValid && warnings.length === 0) {
    return (
      <Card className="p-4 bg-success/10 border-success/20">
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">Mission parameters are valid</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-warning/10 border-warning/20">
      <div className="space-y-2">
        {errors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1">
              <AlertCircle className="h-4 w-4" />
              <span>Validation Errors</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              {errors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-warning mb-1">
              <AlertCircle className="h-4 w-4" />
              <span>Warnings</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              {warnings.map((warning, idx) => (
                <li key={idx}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
