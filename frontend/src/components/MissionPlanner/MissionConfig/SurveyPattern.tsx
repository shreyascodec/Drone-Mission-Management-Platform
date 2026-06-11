/**
 * Survey Pattern Component
 * 
 * Pattern selection (grid, crosshatch, perimeter)
 */

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SurveyPatternProps {
  pattern: 'grid' | 'crosshatch' | 'perimeter'
  onPatternChange: (pattern: 'grid' | 'crosshatch' | 'perimeter') => void
}

export function SurveyPattern({
  pattern,
  onPatternChange,
}: SurveyPatternProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Survey Pattern</h3>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={pattern === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPatternChange('grid')}
          className="h-20 flex-col"
        >
          <div className="text-2xl mb-1">⊞</div>
          <span className="text-xs">Grid</span>
        </Button>
        <Button
          variant={pattern === 'crosshatch' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPatternChange('crosshatch')}
          className="h-20 flex-col"
        >
          <div className="text-2xl mb-1">✕</div>
          <span className="text-xs">Crosshatch</span>
        </Button>
        <Button
          variant={pattern === 'perimeter' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPatternChange('perimeter')}
          className="h-20 flex-col"
        >
          <div className="text-2xl mb-1">⬡</div>
          <span className="text-xs">Perimeter</span>
        </Button>
      </div>
    </Card>
  )
}
