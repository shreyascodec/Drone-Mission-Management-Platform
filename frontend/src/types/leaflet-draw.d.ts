/**
 * Type declarations for Leaflet Draw
 * Extends Leaflet types with Draw plugin types
 */

import 'leaflet'
import 'leaflet-draw'

declare module 'leaflet' {
  namespace Draw {
    namespace Event {
      const CREATED: string
      const EDITED: string
      const DELETED: string
      const DRAWSTART: string
      const DRAWSTOP: string
      const DRAWVERTEX: string
      const EDITSTART: string
      const EDITMOVE: string
      const EDITRESIZE: string
      const EDITVERTEX: string
      const EDITSTOP: string
      const DELETESTART: string
      const DELETESTOP: string
    }

  }

  namespace DrawEvents {
    interface Created extends LeafletEvent {
      layer: L.Layer
      layerType: string
    }
    interface Edited extends LeafletEvent {
      layers: L.LayerGroup
    }
    interface Deleted extends LeafletEvent {
      layers: L.LayerGroup
    }
  }

  namespace Control {
    interface DrawOptions {
      position?: string
      draw?: {
        polygon?: {
          allowIntersection?: boolean
          shapeOptions?: L.PathOptions
        }
        rectangle?: {
          shapeOptions?: L.PathOptions
        }
        polyline?: boolean
        marker?: boolean
        circle?: boolean
        circlemarker?: boolean
      }
      edit?: {
        featureGroup?: L.FeatureGroup
        remove?: boolean
        edit?: boolean
      }
    }

    class Draw extends Control {
      constructor(options?: DrawOptions)
    }
  }
}
