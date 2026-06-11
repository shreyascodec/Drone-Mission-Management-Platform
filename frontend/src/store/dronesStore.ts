/**
 * Drones Store
 * 
 * Manages all drone-related state:
 * - Drone fleet
 * - Drone positions
 * - Real-time telemetry
 * - Battery levels
 * - Connection status
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import api, { APIError } from '@/services/api'
import type { Drone, Position } from '@/types'
import type { CreateDroneRequest, UpdateDroneRequest } from '@/services/api/types'

interface DroneTelemetry {
  position: Position
  battery: {
    percent: number
    voltage: number
    current: number
    temperature: number
  }
  signal: {
    strength: number
    quality: number
  }
  sensors: {
    gps: boolean
    compass: boolean
    barometer: boolean
  }
  lastUpdate: Date
}

interface DroneWithTelemetry extends Drone {
  telemetry?: DroneTelemetry
  isConnected: boolean
  lastSeen: Date
}

interface DronesState {
  // State
  drones: Map<string, DroneWithTelemetry>
  selectedDroneId: string | null
  
  // Computed getters
  getDrone: (id: string) => DroneWithTelemetry | undefined
  getSelectedDrone: () => DroneWithTelemetry | null
  getConnectedDrones: () => DroneWithTelemetry[]
  getDronesByStatus: (status: string) => DroneWithTelemetry[]
  getLowBatteryDrones: (threshold?: number) => DroneWithTelemetry[]
  getTotalConnectedDrones: () => number
  getFleetHealth: () => {
    total: number
    connected: number
    active: number
    lowBattery: number
  }
  
  // Actions
  addDrone: (drone: Drone) => void
  updateDrone: (id: string, updates: Partial<DroneWithTelemetry>) => void
  removeDrone: (id: string) => void
  setDronePosition: (id: string, position: Position) => void
  setDroneBattery: (id: string, battery: DroneTelemetry['battery']) => void
  setDroneTelemetry: (id: string, telemetry: DroneTelemetry) => void
  setDroneConnection: (id: string, isConnected: boolean) => void
  setSelectedDrone: (id: string | null) => void
  clearDrones: () => void
  
  // Batch actions
  setDrones: (drones: Drone[]) => void
  updateMultipleDrones: (updates: { id: string; data: Partial<DroneWithTelemetry> }[]) => void
  bulkUpdatePositions: (positions: { id: string; position: Position }[]) => void
  
  // Backend API actions
  loadDronesFromBackend: () => Promise<void>
  createDroneOnBackend: (data: CreateDroneRequest) => Promise<Drone>
  updateDroneOnBackend: (id: string, data: UpdateDroneRequest) => Promise<void>
  deleteDroneOnBackend: (id: string) => Promise<void>
  
  // State flags
  isLoading: boolean
  error: string | null
}

export const useDronesStore = create<DronesState>()(
  devtools(
      (set, get) => ({
        // Initial state
        drones: new Map(),
        selectedDroneId: null,
        isLoading: false,
        error: null,
      
      // Computed getters
      getDrone: (id: string) => {
        return get().drones.get(id)
      },
      
      getSelectedDrone: () => {
        const state = get()
        if (!state.selectedDroneId) return null
        return state.drones.get(state.selectedDroneId) || null
      },
      
      getConnectedDrones: () => {
        return Array.from(get().drones.values()).filter(d => d.isConnected)
      },
      
      getDronesByStatus: (status: string) => {
        return Array.from(get().drones.values()).filter(d => d.status === status)
      },
      
      getLowBatteryDrones: (threshold: number = 20) => {
        return Array.from(get().drones.values()).filter(
          d => d.telemetry && d.telemetry.battery.percent < threshold
        )
      },
      
      getTotalConnectedDrones: () => {
        return get().getConnectedDrones().length
      },
      
      getFleetHealth: () => {
        const drones = Array.from(get().drones.values())
        return {
          total: drones.length,
          connected: drones.filter(d => d.isConnected).length,
          active: drones.filter(d => d.status === 'active').length,
          lowBattery: drones.filter(
            d => d.telemetry && d.telemetry.battery.percent < 20
          ).length,
        }
      },
      
      // Actions
      addDrone: (drone: Drone) => set((state) => {
        const newDrones = new Map(state.drones)
        newDrones.set(drone.id, {
          ...drone,
          isConnected: false,
          lastSeen: new Date(),
        })
        
        return { drones: newDrones }
      }),
      
      updateDrone: (id: string, updates: Partial<DroneWithTelemetry>) => set((state) => {
        const drone = state.drones.get(id)
        if (!drone) return state
        
        const newDrones = new Map(state.drones)
        newDrones.set(id, {
          ...drone,
          ...updates,
          lastSeen: new Date(),
        })
        
        return { drones: newDrones }
      }),
      
      removeDrone: (id: string) => set((state) => {
        const newDrones = new Map(state.drones)
        newDrones.delete(id)
        
        return {
          drones: newDrones,
          selectedDroneId: state.selectedDroneId === id ? null : state.selectedDroneId,
        }
      }),
      
      setDronePosition: (id: string, position: Position) => set((state) => {
        const drone = state.drones.get(id)
        if (!drone) return state
        
        const newDrones = new Map(state.drones)
        newDrones.set(id, {
          ...drone,
          telemetry: {
            ...(drone.telemetry || {
              battery: { percent: 100, voltage: 0, current: 0, temperature: 0 },
              signal: { strength: 0, quality: 0 },
              sensors: { gps: true, compass: true, barometer: true },
              lastUpdate: new Date(),
            }),
            position,
            lastUpdate: new Date(),
          },
          lastSeen: new Date(),
        })
        
        return { drones: newDrones }
      }),
      
      setDroneBattery: (id: string, battery: DroneTelemetry['battery']) => set((state) => {
        const drone = state.drones.get(id)
        if (!drone || !drone.telemetry) return state
        
        const newDrones = new Map(state.drones)
        newDrones.set(id, {
          ...drone,
          telemetry: {
            ...drone.telemetry,
            battery,
            lastUpdate: new Date(),
          },
          lastSeen: new Date(),
        })
        
        return { drones: newDrones }
      }),
      
      setDroneTelemetry: (id: string, telemetry: DroneTelemetry) => set((state) => {
        const drone = state.drones.get(id)
        if (!drone) return state
        
        const newDrones = new Map(state.drones)
        newDrones.set(id, {
          ...drone,
          telemetry,
          lastSeen: new Date(),
        })
        
        return { drones: newDrones }
      }),
      
      setDroneConnection: (id: string, isConnected: boolean) => set((state) => {
        const drone = state.drones.get(id)
        if (!drone) return state
        
        const newDrones = new Map(state.drones)
        newDrones.set(id, {
          ...drone,
          isConnected,
          lastSeen: new Date(),
        })
        
        return { drones: newDrones }
      }),
      
      setSelectedDrone: (id: string | null) => set({ selectedDroneId: id }),
      
      clearDrones: () => set({
        drones: new Map(),
        selectedDroneId: null,
      }),
      
      // Batch actions
      setDrones: (drones: Drone[]) => set(() => {
        const newDrones = new Map<string, DroneWithTelemetry>()
        
        drones.forEach(drone => {
          newDrones.set(drone.id, {
            ...drone,
            isConnected: false,
            lastSeen: new Date(),
          })
        })
        
        return { drones: newDrones }
      }),
      
      updateMultipleDrones: (updates) => set((state) => {
        const newDrones = new Map(state.drones)
        
        updates.forEach(({ id, data }) => {
          const drone = newDrones.get(id)
          if (drone) {
            newDrones.set(id, {
              ...drone,
              ...data,
              lastSeen: new Date(),
            })
          }
        })
        
        return { drones: newDrones }
      }),
      
      bulkUpdatePositions: (positions) => set((state) => {
        const newDrones = new Map(state.drones)
        
        positions.forEach(({ id, position }) => {
          const drone = newDrones.get(id)
          if (drone) {
            newDrones.set(id, {
              ...drone,
              telemetry: {
                ...(drone.telemetry || {
                  battery: { percent: 100, voltage: 0, current: 0, temperature: 0 },
                  signal: { strength: 0, quality: 0 },
                  sensors: { gps: true, compass: true, barometer: true },
                  lastUpdate: new Date(),
                }),
                position,
                lastUpdate: new Date(),
              },
              lastSeen: new Date(),
            })
          }
        })
        
        return { drones: newDrones }
      }),
      
      // Backend API actions
      loadDronesFromBackend: async () => {
        set({ isLoading: true, error: null })
        try {
          const drones = await api.getDrones()
          get().setDrones(drones)
          set({ isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof APIError 
            ? error.message 
            : 'Failed to load drones from backend'
          set({ isLoading: false, error: errorMessage })
          throw error
        }
      },
      
      createDroneOnBackend: async (data: CreateDroneRequest) => {
        set({ isLoading: true, error: null })
        try {
          const drone = await api.createDrone(data)
          get().addDrone(drone)
          set({ isLoading: false })
          return drone
        } catch (error) {
          const errorMessage = error instanceof APIError 
            ? error.message 
            : 'Failed to create drone'
          set({ isLoading: false, error: errorMessage })
          throw error
        }
      },
      
      updateDroneOnBackend: async (id: string, data: UpdateDroneRequest) => {
        set({ isLoading: true, error: null })
        try {
          const drone = await api.updateDrone(id, data)
          get().updateDrone(id, drone)
          set({ isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof APIError 
            ? error.message 
            : 'Failed to update drone'
          set({ isLoading: false, error: errorMessage })
          throw error
        }
      },
      
      deleteDroneOnBackend: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          await api.deleteDrone(id)
          get().removeDrone(id)
          set({ isLoading: false })
        } catch (error) {
          const errorMessage = error instanceof APIError 
            ? error.message 
            : 'Failed to delete drone'
          set({ isLoading: false, error: errorMessage })
          throw error
        }
      },
    }),
    { name: 'DronesStore' }
  )
)

// Selectors
export const selectDrone = (id: string) => (state: DronesState) =>
  state.drones.get(id)

export const selectConnectedDrones = (state: DronesState) =>
  state.getConnectedDrones()

export const selectLowBatteryDrones = (threshold?: number) => (state: DronesState) =>
  state.getLowBatteryDrones(threshold)

export const selectFleetHealth = (state: DronesState) =>
  state.getFleetHealth()

export const selectDronePosition = (id: string) => (state: DronesState) =>
  state.drones.get(id)?.telemetry?.position

export const selectDroneBattery = (id: string) => (state: DronesState) =>
  state.drones.get(id)?.telemetry?.battery
