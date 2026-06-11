/**
 * Mission Estimates Card Component
 * 
 * Displays calculated mission estimates
 */

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MissionEstimates } from '@/hooks/useMissionPlanner'

interface MissionEstimatesCardProps {
  estimates: MissionEstimates
}

export function MissionEstimatesCard({ estimates }: MissionEstimatesCardProps) {
  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span>Mission Estimates</span>
        <Badge variant="outline">Calculated</Badge>
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Flight Time:</span>
          <span className="font-medium">{estimates.flightTime} min</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Distance:</span>
          <span className="font-medium">{estimates.distance} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Battery Usage:</span>
          <span className="font-medium">{estimates.battery}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Waypoints:</span>
          <span className="font-medium">{estimates.waypoints}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Coverage Area:</span>
          <span className="font-medium">{estimates.coverage} km²</span>
        </div>
      </div>
    </Card>
  )
}
