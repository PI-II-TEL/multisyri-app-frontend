'use client'
import { useEffect, useState } from 'react'
import { getAllClassrooms, type ClassroomWithBuilding } from '@/services/buildings'

export function useAllClassrooms() {
  const [classrooms, setClassrooms] = useState<ClassroomWithBuilding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAllClassrooms()
      .then(setClassrooms)
      .catch(() => setError('No se pudieron cargar los salones'))
      .finally(() => setLoading(false))
  }, [])

  return { classrooms, loading, error }
}
