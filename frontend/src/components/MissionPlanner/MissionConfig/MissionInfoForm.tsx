/**
 * Mission Info Form Component
 * 
 * Mission name and type selection
 */

import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface MissionInfoFormProps {
  missionName: string
  missionType: 'survey' | 'inspection' | 'mapping' | 'emergency'
  onNameChange: (name: string) => void
  onTypeChange: (type: 'survey' | 'inspection' | 'mapping' | 'emergency') => void
}

export function MissionInfoForm({
  missionName,
  missionType,
  onNameChange,
  onTypeChange,
}: MissionInfoFormProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Mission Information</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Mission Name
          </label>
          <Input
            value={missionName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter mission name"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Mission Type
          </label>
          <select 
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={missionType}
            onChange={(e) => onTypeChange(e.target.value as any)}
          >
            <option value="survey">Survey</option>
            <option value="inspection">Inspection</option>
            <option value="mapping">Mapping</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>
    </Card>
  )
}
