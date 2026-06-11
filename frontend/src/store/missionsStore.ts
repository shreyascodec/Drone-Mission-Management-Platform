/**
 * Missions Store
 * 
 * Manages all mission-related state:
 * - Active missions
 * - Mission statuses
 * - Mission progress
 * - Mission events
 * - Waypoints
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import api, { APIError } from '@/services/api'
import type { Mission, MissionWaypoint, MissionEvent } from '@/types'
import type { CreateMissionRequest, UpdateMissionRequest } from '@/services/api/types'

interface MissionProgress {
  percent: number
  waypointsCompleted: number
  waypointsTotal: number
  distanceTraveled: number
  estimatedTimeRemaining: number
}

interface MissionWithProgress extends Mission {
  progress?: MissionProgress
  events?: MissionEvent[]
}

interface MissionsState {
  // State
  missions: Map<string, MissionWithProgress>
  activeMissions: string[]
  selectedMissionId: string | null
  isLoading: boolean
  error: string | null
  
  // Computed getters
  getActiveMissions: () => MissionWithProgress[]
  getMission: (id: string) => MissionWithProgress | undefined
  getSelectedMission: () => MissionWithProgress | null
  getMissionsByStatus: (status: string) => MissionWithProgress[]
  getTotalActiveMissions: () => number
  
  // Local actions
  addMission: (mission: Mission) => void
  updateMission: (id: string, updates: Partial<MissionWithProgress>) => void
  removeMission: (id: string) => void
  setMissionProgress: (id: string, progress: MissionProgress) => void
  addMissionEvent: (id: string, event: MissionEvent) => void
  setMissionWaypoints: (id: string, waypoints: MissionWaypoint[]) => void
  setSelectedMission: (id: string | null) => void
  clearMissions: () => void
  setMissions: (missions: Mission[]) => void
  updateMultipleMissions: (updates: { id: string; data: Partial<MissionWithProgress> }[]) => void
  
  // Backend API actions
  loadMissionsFromBackend: () => Promise<void>
  loadMissionFromBackend: (id: string) => Promise<void>
  createMissionOnBackend: (data: CreateMissionRequest) => Promise<Mission>
  updateMissionOnBackend: (id: string, data: UpdateMissionRequest) => Promise<void>
  deleteMissionOnBackend: (id: string) => Promise<void>
  startMissionSimulation: (id: string) => Promise<void>
  pauseMissionSimulation: (id: string) => Promise<void>
  resumeMissionSimulation: (id: string) => Promise<void>
  stopMissionSimulation: (id: string) => Promise<void>
}

export const useMissionsStore = create<MissionsState>()(
  devtools(
      (set, get) => ({
        // Initial state
        missions: new Map(),
        activeMissions: [],
        selectedMissionId: null,
        isLoading: false,
        error: null,
        
        // Computed getters
        getActiveMissions: () => {
          const state = get()
          return Array.from(state.missions.values()).filter(
            m => m.status === 'active'
          )
        },
        
        getMission: (id: string) => {
          return get().missions.get(id)
        },
        
        getSelectedMission: () => {
          const state = get()
          if (!state.selectedMissionId) return null
          return state.missions.get(state.selectedMissionId) || null
        },
        
        getMissionsByStatus: (status: string) => {
          return Array.from(get().missions.values()).filter(
            m => m.status === status
          )
        },
        
        getTotalActiveMissions: () => {
          return get().getActiveMissions().length
        },
        
        // Actions
        addMission: (mission: Mission) => set((state) => {
          const newMissions = new Map(state.missions)
          newMissions.set(mission.id, {
            ...mission,
            progress: {
              percent: 0,
              waypointsCompleted: 0,
              waypointsTotal: 0,
              distanceTraveled: 0,
              estimatedTimeRemaining: 0,
            },
            events: [],
          })
          
          const isActive = mission.status === 'active'
          const newActiveMissions = isActive
            ? [...state.activeMissions, mission.id]
            : state.activeMissions
          
          return {
            missions: newMissions,
            activeMissions: newActiveMissions,
          }
        }),
        
        updateMission: (id: string, updates: Partial<MissionWithProgress>) => set((state) => {
          const mission = state.missions.get(id)
          if (!mission) return state
          
          const newMissions = new Map(state.missions)
          newMissions.set(id, { ...mission, ...updates })
          
          // Update active missions list if status changed
          const wasActive = state.activeMissions.includes(id)
          const isActive = 
            updates.status === 'active' ||
            (mission.status === 'active')
          
          let newActiveMissions = state.activeMissions
          if (isActive && !wasActive) {
            newActiveMissions = [...state.activeMissions, id]
          } else if (!isActive && wasActive) {
            newActiveMissions = state.activeMissions.filter(mid => mid !== id)
          }
          
          return {
            missions: newMissions,
            activeMissions: newActiveMissions,
          }
        }),
        
        removeMission: (id: string) => set((state) => {
          const newMissions = new Map(state.missions)
          newMissions.delete(id)
          
          return {
            missions: newMissions,
            activeMissions: state.activeMissions.filter(mid => mid !== id),
            selectedMissionId: state.selectedMissionId === id ? null : state.selectedMissionId,
          }
        }),
        
        setMissionProgress: (id: string, progress: MissionProgress) => set((state) => {
          const mission = state.missions.get(id)
          if (!mission) return state
          
          const newMissions = new Map(state.missions)
          newMissions.set(id, { ...mission, progress })
          
          return { missions: newMissions }
        }),
        
        addMissionEvent: (id: string, event: MissionEvent) => set((state) => {
          const mission = state.missions.get(id)
          if (!mission) return state
          
          const newMissions = new Map(state.missions)
          const events = [...(mission.events || []), event].slice(-50) // Keep last 50 events
          newMissions.set(id, { ...mission, events })
          
          return { missions: newMissions }
        }),
        
        setMissionWaypoints: (id: string, waypoints: MissionWaypoint[]) => set((state) => {
          const mission = state.missions.get(id)
          if (!mission) return state
          
          const newMissions = new Map(state.missions)
          newMissions.set(id, { ...mission, waypoints })
          
          return { missions: newMissions }
        }),
        
        setSelectedMission: (id: string | null) => set({ selectedMissionId: id }),
        
        clearMissions: () => set({
          missions: new Map(),
          activeMissions: [],
          selectedMissionId: null,
        }),
        
        // Batch actions
        setMissions: (missions: Mission[]) => set(() => {
          const newMissions = new Map<string, MissionWithProgress>()
          const activeMissions: string[] = []
          
          missions.forEach(mission => {
            newMissions.set(mission.id, {
              ...mission,
              progress: {
                percent: 0,
                waypointsCompleted: 0,
                waypointsTotal: 0,
                distanceTraveled: 0,
                estimatedTimeRemaining: 0,
              },
              events: [],
            })
            
            if (mission.status === 'active') {
              activeMissions.push(mission.id)
            }
          })
          
          return {
            missions: newMissions,
            activeMissions,
          }
        }),
        
        updateMultipleMissions: (updates) => set((state) => {
          const newMissions = new Map(state.missions)
          
          updates.forEach(({ id, data }) => {
            const mission = newMissions.get(id)
            if (mission) {
              newMissions.set(id, { ...mission, ...data })
            }
          })
          
          return { missions: newMissions }
        }),
        
        // Backend API actions
        loadMissionsFromBackend: async () => {
          set({ isLoading: true, error: null })
          try {
            const missions = await api.getMissions()
            get().setMissions(missions)
            set({ isLoading: false })
          } catch (error) {
            const errorMessage = error instanceof APIError 
              ? error.message 
              : 'Failed to load missions from backend'
            set({ isLoading: false, error: errorMessage })
            throw error
          }
        },
        
        loadMissionFromBackend: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const mission = await api.getMission(id)
            get().addMission(mission)
            set({ isLoading: false })
          } catch (error) {
            const errorMessage = error instanceof APIError 
              ? error.message 
              : 'Failed to load mission from backend'
            set({ isLoading: false, error: errorMessage })
            throw error
          }
        },
        
        createMissionOnBackend: async (data: CreateMissionRequest) => {
          set({ isLoading: true, error: null })
          try {
            const mission = await api.createMission(data)
            get().addMission(mission)
            set({ isLoading: false })
            return mission
          } catch (error) {
            const errorMessage = error instanceof APIError 
              ? error.message 
              : 'Failed to create mission'
            set({ isLoading: false, error: errorMessage })
            throw error
          }
        },
        
        updateMissionOnBackend: async (id: string, data: UpdateMissionRequest) => {
          set({ isLoading: true, error: null })
          try {
            const mission = await api.updateMission(id, data)
            get().updateMission(id, mission)
            set({ isLoading: false })
          } catch (error) {
            const errorMessage = error instanceof APIError 
              ? error.message 
              : 'Failed to update mission'
            set({ isLoading: false, error: errorMessage })
            throw error
          }
        },
        
        deleteMissionOnBackend: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            await api.deleteMission(id)
            get().removeMission(id)
            set({ isLoading: false })
          } catch (error) {
            const errorMessage = error instanceof APIError 
              ? error.message 
              : 'Failed to delete mission'
            set({ isLoading: false, error: errorMessage })
            throw error
          }
        },
        
        startMissionSimulation: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            await api.startSimulation(id)
            get().updateMission(id, { status: 'active' })
            set({ isLoading: false })
          } catch (error) {
            const errorMessage = error instanceof APIError 
              ? error.message 
              : 'Failed to start simulation'
            set({ isLoading: false, error: errorMessage })
            throw error
          }
        },
        
        pauseMissionSimulation: async (id: string) => {
          try {
            await api.pauseSimulation(id)
            get().updateMission(id, { status: 'paused' })
          } catch (error) {
            console.error('Failed to pause simulation:', error)
            throw error
          }
        },
        
        resumeMissionSimulation: async (id: string) => {
          try {
            await api.resumeSimulation(id)
            get().updateMission(id, { status: 'active' })
          } catch (error) {
            console.error('Failed to resume simulation:', error)
            throw error
          }
        },
        
        stopMissionSimulation: async (id: string) => {
          try {
            await api.stopSimulation(id)
            get().updateMission(id, { status: 'completed' })
          } catch (error) {
            console.error('Failed to stop simulation:', error)
            throw error
          }
        },
      }),
    { name: 'MissionsStore' }
  )
)

// Selectors (for optimized re-renders)
export const selectMission = (id: string) => (state: MissionsState) => 
  state.missions.get(id)

export const selectActiveMissions = (state: MissionsState) => 
  state.getActiveMissions()

export const selectMissionsByStatus = (status: string) => (state: MissionsState) =>
  state.getMissionsByStatus(status)

export const selectTotalActiveMissions = (state: MissionsState) =>
  state.getTotalActiveMissions()
