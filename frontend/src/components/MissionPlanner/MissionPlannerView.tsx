/**
 * Mission Planner View (Refactored)
 * 
 * Orchestrates mission planning interface using extracted components and hooks
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer } from 'react-leaflet'
import { ArrowLeft, Save, Play, Loader2, MapPin, Square, Edit, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { OSM_TILE_LAYER } from '@/lib/leaflet'
import { useMissionPlanner } from '@/hooks/useMissionPlanner'
import { MapDrawingControls } from './MapDrawing/MapDrawingControls'
import { RectangleDrawingHandler } from './MapDrawing/RectangleDrawingHandler'
import { SurveyAreaDisplay } from './MapDrawing/SurveyAreaDisplay'
import { MissionInfoForm } from './MissionConfig/MissionInfoForm'
import { FlightParameters } from './MissionConfig/FlightParameters'
import { DataCollection } from './MissionConfig/DataCollection'
import { SurveyPattern } from './MissionConfig/SurveyPattern'
import { MissionEstimatesCard } from './MissionEstimates/MissionEstimatesCard'
import { ValidationPanel } from './MissionValidation/ValidationPanel'
import { ErrorToast } from '@/components/ui/ErrorToast'
import 'leaflet/dist/leaflet.css'

// Default survey area (16th Street Mission)
const MISSION_16TH_STREET_CENTER: [number, number] = [37.7650, -122.4200]
const DEFAULT_SURVEY_AREA: [number, number][] = [
  [MISSION_16TH_STREET_CENTER[0] - 0.005, MISSION_16TH_STREET_CENTER[1] - 0.005], // Top-left
  [MISSION_16TH_STREET_CENTER[0] - 0.005, MISSION_16TH_STREET_CENTER[1] + 0.005], // Top-right
  [MISSION_16TH_STREET_CENTER[0] + 0.005, MISSION_16TH_STREET_CENTER[1] + 0.005], // Bottom-right
  [MISSION_16TH_STREET_CENTER[0] + 0.005, MISSION_16TH_STREET_CENTER[1] - 0.005], // Bottom-left
]

export default function MissionPlannerView() {
  const navigate = useNavigate()
  const [surveyArea, setSurveyArea] = useState<[number, number][]>(DEFAULT_SURVEY_AREA)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showError, setShowError] = useState(false)

  const {
    state,
    setState,
    missionEstimates,
    validation,
    isCreating,
    error,
    handleSaveMission,
    handleStartMission,
  } = useMissionPlanner(surveyArea)

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSave = async () => {
    try {
      await handleSaveMission()
    } catch {
      // Error already handled by hook
    }
  }

  const handleStart = async () => {
    try {
      await handleStartMission()
    } catch {
      // Error already handled by hook
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Error Toast */}
      <ErrorToast
        message={error || ''}
        visible={showError}
        onClose={() => setShowError(false)}
      />

      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 h-16 glass-effect border-b border-border/50">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Mission Planner</h1>
              <p className="text-xs text-muted-foreground">Create new survey mission</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleSave}
              disabled={isCreating || !state.missionName.trim() || !validation.isValid}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </Button>
            <Button 
              onClick={handleStart}
              disabled={isCreating || !state.missionName.trim() || !validation.isValid}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Mission
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="absolute inset-0 top-16" style={{ right: '384px' }}>
        <MapContainer
          center={MISSION_16TH_STREET_CENTER}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution={OSM_TILE_LAYER.attribution}
            url={OSM_TILE_LAYER.url}
          />

          {/* Drawing Controls */}
          <MapDrawingControls 
            onAreaChange={(area) => {
              if (area.length >= 3) {
                setSurveyArea(area)
              }
            }}
            initialArea={surveyArea.length >= 3 ? surveyArea : undefined}
          />
          
          {/* Rectangle Drawing Handler */}
          <RectangleDrawingHandler
            isDrawing={isDrawing}
            onRectangleComplete={(bounds) => {
              const coordinates: [number, number][] = [
                [bounds.getNorth(), bounds.getWest()], // Top-left
                [bounds.getNorth(), bounds.getEast()], // Top-right
                [bounds.getSouth(), bounds.getEast()], // Bottom-right
                [bounds.getSouth(), bounds.getWest()], // Bottom-left
              ]
              setSurveyArea(coordinates)
              setIsDrawing(false)
            }}
          />
          
          {/* Survey Area Display */}
          <SurveyAreaDisplay
            surveyArea={surveyArea}
            onAreaChange={setSurveyArea}
          />
          
          {/* Drawing Controls UI */}
          <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-2">
            <Button
              size="sm"
              variant={isDrawing ? "default" : "secondary"}
              onClick={() => setIsDrawing(!isDrawing)}
              className="glass-effect shadow-lg"
            >
              <Square className="h-4 w-4 mr-2" />
              {isDrawing ? 'Cancel Drawing' : 'Draw Rectangle'}
            </Button>
            {surveyArea.length >= 4 && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    // Info: Points are already draggable
                  }}
                  className="glass-effect shadow-lg"
                  disabled
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Points
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    // Use confirm dialog - for now simple confirm
                    if (window.confirm('Delete survey area?')) {
                      setSurveyArea([])
                    }
                  }}
                  className="glass-effect shadow-lg"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
          
          {/* Helper Text */}
          <div className="absolute bottom-20 left-4 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-w-xs">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Drawing Tools
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Click <strong>Draw Rectangle</strong> button</li>
              <li>• Click and drag on map to draw</li>
              <li>• Drag <strong>blue numbered points</strong> to reshape</li>
              <li>• Path connects all 4 points</li>
            </ul>
          </div>
        </MapContainer>
      </div>

      {/* Right Panel - Mission Parameters */}
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-16 right-0 bottom-0 w-96 glass-effect border-l border-border/50 z-50 pointer-events-auto"
      >
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Mission Info */}
            <MissionInfoForm
              missionName={state.missionName}
              missionType={state.missionType}
              onNameChange={(name) => setState(prev => ({ ...prev, missionName: name }))}
              onTypeChange={(type) => setState(prev => ({ ...prev, missionType: type }))}
            />

            {/* Flight Parameters */}
            <FlightParameters
              altitude={state.altitude}
              speed={state.speed}
              forwardOverlap={state.forwardOverlap}
              sideOverlap={state.sideOverlap}
              onAltitudeChange={(alt) => setState(prev => ({ ...prev, altitude: alt }))}
              onSpeedChange={(spd) => setState(prev => ({ ...prev, speed: spd }))}
              onForwardOverlapChange={(overlap) => setState(prev => ({ ...prev, forwardOverlap: overlap }))}
              onSideOverlapChange={(overlap) => setState(prev => ({ ...prev, sideOverlap: overlap }))}
            />

            {/* Data Collection */}
            <DataCollection
              frequency={state.dataCollectionFrequency}
              sensors={state.selectedSensors}
              onFrequencyChange={(freq) => setState(prev => ({ ...prev, dataCollectionFrequency: freq }))}
              onSensorChange={(sensor, enabled) => 
                setState(prev => ({
                  ...prev,
                  selectedSensors: { ...prev.selectedSensors, [sensor]: enabled }
                }))
              }
            />

            {/* Survey Pattern */}
            <SurveyPattern
              pattern={state.pattern}
              onPatternChange={(pattern) => setState(prev => ({ ...prev, pattern }))}
            />

            {/* Mission Estimates */}
            <MissionEstimatesCard estimates={missionEstimates} />

            {/* Validation */}
            <ValidationPanel
              isValid={validation.isValid}
              errors={validation.errors}
            />
          </div>
        </ScrollArea>
      </motion.div>
    </div>
  )
}
