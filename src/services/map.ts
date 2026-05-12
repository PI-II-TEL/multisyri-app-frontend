import { apiFetch } from './api'
import type { ClassroomMapRead, ClassroomStateRead } from '@/types/shift'

export function getBuildingMap(building_id: string): Promise<ClassroomMapRead[]> {
  return apiFetch(`/map/buildings/${building_id}`)
}

export function updateClassroomStatus(
  classroom_id: string,
  status: 'OPEN' | 'CLOSED',
): Promise<ClassroomStateRead> {
  return apiFetch(`/map/classrooms/${classroom_id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function addObservation(
  classroom_id: string,
  text: string,
): Promise<ClassroomStateRead> {
  return apiFetch(`/map/classrooms/${classroom_id}/observations`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export function listActiveObservations(
  building_id: string,
): Promise<ClassroomStateRead[]> {
  return apiFetch(`/map/buildings/${building_id}/observations`)
}
