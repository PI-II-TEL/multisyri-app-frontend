'use client'

import { useState, useEffect, useCallback } from 'react'
import * as api from '@/services/buildings'
import type { Classroom, ClassroomUpdate } from '@/types/buildings'

export function useClassrooms(buildingId: string) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!buildingId) return
    setIsLoading(true)
    setError(null)
    try {
      setClassrooms(await api.getClassrooms(buildingId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar salones')
    } finally {
      setIsLoading(false)
    }
  }, [buildingId])

  useEffect(() => { fetch() }, [fetch])

  const createClassroom = async (name: string) => {
    const created = await api.createClassroom(buildingId, { name })
    setClassrooms((prev) => [...prev, created])
    return created
  }

  const updateClassroom = async (id: string, data: ClassroomUpdate) => {
    const updated = await api.updateClassroom(id, data)
    setClassrooms((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  const deleteClassroom = async (id: string) => {
    await api.deleteClassroom(id)
    setClassrooms((prev) => prev.filter((c) => c.id !== id))
  }

  return { classrooms, isLoading, error, refetch: fetch, createClassroom, updateClassroom, deleteClassroom }
}
