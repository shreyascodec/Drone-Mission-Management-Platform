/**
 * Global Application Store
 * 
 * Manages:
 * - App initialization state
 * - Connection status
 * - Active missions/drones
 * - Selected items
 * - UI state
 */

import { create } from 'zustand'
import type { Mission, Drone } from '@/types'
import { DEFAULT_VALUES } from '@/lib/constants'

interface AppState {
  // Initialization
  isInitialized: boolean
  isLoading: boolean
  
  // Connection
  isConnected: boolean
  
  // Counts
  activeMissions: number
  connectedDrones: number
  
  // Selected items
  selectedMission: Mission | null
  selectedDrone: Drone | null
  
  // UI state
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  
  // Map state
  followDrone: boolean
  mapStyle: string
  showFlightPath: boolean
  showWaypoints: boolean
  
  // Actions
  initialize: () => Promise<void>
  setConnected: (connected: boolean) => void
  setActiveMissions: (count: number) => void
  setConnectedDrones: (count: number) => void
  setSelectedMission: (mission: Mission | null) => void
  setSelectedDrone: (drone: Drone | null) => void
  setLeftPanelOpen: (open: boolean) => void
  setRightPanelOpen: (open: boolean) => void
  setFollowDrone: (follow: boolean) => void
  setMapStyle: (style: string) => void
  setShowFlightPath: (show: boolean) => void
  setShowWaypoints: (show: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  isInitialized: false,
  isLoading: false,
  isConnected: false,
  activeMissions: DEFAULT_VALUES.ACTIVE_MISSIONS,
  connectedDrones: DEFAULT_VALUES.CONNECTED_DRONES,
  selectedMission: null,
  selectedDrone: null,
  leftPanelOpen: true,
  rightPanelOpen: false,
  followDrone: false,
  mapStyle: 'streets',
  showFlightPath: true,
  showWaypoints: true,
  
  // Initialize app - REQUIRES BACKEND
  initialize: async () => {
    set({ isLoading: true })
    
    try {
      console.log('🔄 Connecting to backend...')
      
      // Import API after stores are initialized
      const { default: api } = await import('@/services/api')
      const { useMissionsStore } = await import('./missionsStore')
      const { useDronesStore } = await import('./dronesStore')
      
      // Check backend health (REQUIRED)
      const health = await api.checkHealth()
      console.log('✅ Backend connected:', health)
      
      // Load initial data from backend
      console.log('📥 Loading missions from backend...')
      await useMissionsStore.getState().loadMissionsFromBackend()
      
      console.log('📥 Loading drones from backend...')
      await useDronesStore.getState().loadDronesFromBackend()
      
      set({
        isInitialized: true,
        isConnected: true,
        isLoading: false,
      })
      
      console.log('✅ App initialized with backend data')
    } catch (error) {
      console.error('❌ Failed to connect to backend:', error)
      set({
        isInitialized: false,
        isConnected: false,
        isLoading: false,
      })
      
      // Throw error to show connection required message
      throw new Error(
        'Backend connection required. Please ensure the backend server is running at http://localhost:8000'
      )
    }
  },
  
  setConnected: (connected) => set({ isConnected: connected }),
  setActiveMissions: (count) => set({ activeMissions: count }),
  setConnectedDrones: (count) => set({ connectedDrones: count }),
  setSelectedMission: (mission) => set({ selectedMission: mission }),
  setSelectedDrone: (drone) => set({ selectedDrone: drone }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setFollowDrone: (follow) => set({ followDrone: follow }),
  setMapStyle: (style) => set({ mapStyle: style }),
  setShowFlightPath: (show) => set({ showFlightPath: show }),
  setShowWaypoints: (show) => set({ showWaypoints: show }),
}))
