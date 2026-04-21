import { apiFetch } from './api'
import type {
  Building,
  BuildingCreate,
  BuildingUpdate,
  BuildingWithClassrooms,
  Classroom,
  ClassroomUpdate,
  ClassroomWithEquipment,
  ClassroomEquipment,
} from '@/types/buildings'
import type { FaultType } from '@/types/shift'

// ── Buildings ────────────────────────────────────────────────────────────────

export const getBuildings = () =>
  apiFetch<Building[]>('/buildings')

export const getBuilding = (id: string) =>
  apiFetch<BuildingWithClassrooms>(`/buildings/${id}`)

export const createBuilding = (data: BuildingCreate) =>
  apiFetch<Building>('/buildings', { method: 'POST', body: JSON.stringify(data) })

export const updateBuilding = (id: string, data: BuildingUpdate) =>
  apiFetch<Building>(`/buildings/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteBuilding = (id: string) =>
  apiFetch<null>(`/buildings/${id}`, { method: 'DELETE' })

// ── Classrooms ───────────────────────────────────────────────────────────────

export const getClassrooms = (buildingId: string) =>
  apiFetch<Classroom[]>(`/buildings/${buildingId}/classrooms`)

export const getClassroom = (id: string) =>
  apiFetch<ClassroomWithEquipment>(`/buildings/classrooms/${id}`)

export const createClassroom = (buildingId: string, data: { name: string }) =>
  apiFetch<Classroom>(`/buildings/${buildingId}/classrooms`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateClassroom = (id: string, data: ClassroomUpdate) =>
  apiFetch<Classroom>(`/buildings/classrooms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteClassroom = (id: string) =>
  apiFetch<null>(`/buildings/classrooms/${id}`, { method: 'DELETE' })

// ── Equipment ────────────────────────────────────────────────────────────────

export const getEquipment = (classroomId: string) =>
  apiFetch<ClassroomEquipment[]>(`/buildings/classrooms/${classroomId}/equipment`)

export const addEquipment = (classroomId: string, faultType: FaultType) =>
  apiFetch<ClassroomEquipment>(`/buildings/classrooms/${classroomId}/equipment`, {
    method: 'POST',
    body: JSON.stringify({ fault_type: faultType }),
  })

export const removeEquipment = (classroomId: string, faultType: FaultType) =>
  apiFetch<null>(`/buildings/classrooms/${classroomId}/equipment/${faultType}`, {
    method: 'DELETE',
  })

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface InfraStats {
  total_buildings: number
  total_classrooms: number
  total_equipment: number
}

export const getInfraStats = () =>
  apiFetch<InfraStats>('/buildings/stats')
