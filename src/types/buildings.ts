import type { FaultType } from './shift'

export type { FaultType }

export type BuildingTrafficLight = 'GREEN' | 'YELLOW' | 'RED'

export interface BuildingStatusRead {
  id: string
  name: string
  active_monitor: string | null
  open_tickets: number
  active_observations: number
  traffic_light: BuildingTrafficLight
}

export const FAULT_TYPE_LABELS: Record<FaultType, string> = {
  PROJECTOR: 'Proyector',
  SPEAKERS: 'Parlantes',
  PC: 'Computador',
  OTHER: 'Otro',
}

export const ALL_FAULT_TYPES: FaultType[] = ['PROJECTOR', 'SPEAKERS', 'PC', 'OTHER']

export interface Building {
  id: string
  name: string
}

export interface BuildingCreate {
  name: string
}

export interface BuildingUpdate {
  name?: string
}

export interface BuildingWithClassrooms extends Building {
  classrooms: Classroom[]
}

export interface Classroom {
  id: string
  name: string
  building_id: string
}

export interface ClassroomCreate {
  name: string
}

export interface ClassroomUpdate {
  name?: string
}

export interface ClassroomWithEquipment extends Classroom {
  equipment: ClassroomEquipment[]
}

export interface ClassroomEquipment {
  id: string
  classroom_id: string
  fault_type: FaultType
}
