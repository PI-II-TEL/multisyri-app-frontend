import { apiFetch } from './api'
import type { BuildingMapRead, ClassroomStateRead } from '@/types/shift'

export function getBuildingMap(buildingId: string): Promise<BuildingMapRead> {
  return apiFetch<BuildingMapRead>(`/map/${buildingId}`)
}

export function toggleClassroomStatus(
  buildingId: string,
  classroomId: string,
): Promise<ClassroomStateRead> {
  return apiFetch<ClassroomStateRead>(
    `/map/${buildingId}/classrooms/${classroomId}/toggle`,
    { method: 'POST' },
  )
}
