/**
 * Leaflet Draw Wrapper
 * Properly initializes and exports Leaflet Draw functionality
 * 
 * Note: leaflet-draw must be imported as a side effect to extend L namespace
 */

import L from 'leaflet'
// Import leaflet-draw - this extends the L namespace when loaded
// This import must happen before accessing L.Control.Draw
import 'leaflet-draw'

// Export Draw control with proper typing
// Access it from L namespace after leaflet-draw extends it
export const DrawControl: typeof L.Control & {
  new (options?: any): L.Control
} = (L.Control as any).Draw

// Export Draw events
export const DrawEvents = (L.Draw as any).Event || {
  CREATED: 'draw:created',
  EDITED: 'draw:edited',
  DELETED: 'draw:deleted',
}

// Type guard to check if Draw is available
export function isDrawAvailable(): boolean {
  return typeof (L.Control as any).Draw !== 'undefined' && 
         typeof DrawControl !== 'undefined'
}
