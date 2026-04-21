'use client'

import { useState, useEffect, useCallback } from 'react'
import * as api from '@/services/buildings'
import type { Building, BuildingCreate, BuildingUpdate } from '@/types/buildings'

export function useBuildings() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setBuildings(await api.getBuildings())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar edificios')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const createBuilding = async (data: BuildingCreate) => {
    const created = await api.createBuilding(data)
    setBuildings((prev) => [...prev, created])
    return created
  }

  const updateBuilding = async (id: string, data: BuildingUpdate) => {
    const updated = await api.updateBuilding(id, data)
    setBuildings((prev) => prev.map((b) => (b.id === id ? updated : b)))
    return updated
  }

  const deleteBuilding = async (id: string) => {
    await api.deleteBuilding(id)
    setBuildings((prev) => prev.filter((b) => b.id !== id))
  }

  return { buildings, isLoading, error, refetch: fetch, createBuilding, updateBuilding, deleteBuilding }
}
