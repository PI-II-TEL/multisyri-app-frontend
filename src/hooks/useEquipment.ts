'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import * as api from '@/services/buildings'
import type { ClassroomEquipment } from '@/types/buildings'
import type { FaultType } from '@/types/shift'

export function useEquipment(classroomId: string) {
  const [equipment, setEquipment] = useState<ClassroomEquipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!classroomId) return
    setIsLoading(true)
    setError(null)
    try {
      setEquipment(await api.getEquipment(classroomId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar equipos')
    } finally {
      setIsLoading(false)
    }
  }, [classroomId])

  useEffect(() => { startTransition(() => { void fetch() }) }, [fetch])

  const assignedTypes = new Set(equipment.map((e) => e.fault_type))

  const addEquipment = async (faultType: FaultType) => {
    const created = await api.addEquipment(classroomId, faultType)
    setEquipment((prev) => [...prev, created])
    return created
  }

  const removeEquipment = async (faultType: FaultType) => {
    await api.removeEquipment(classroomId, faultType)
    setEquipment((prev) => prev.filter((e) => e.fault_type !== faultType))
  }

  return { equipment, assignedTypes, isLoading, error, refetch: fetch, addEquipment, removeEquipment }
}
