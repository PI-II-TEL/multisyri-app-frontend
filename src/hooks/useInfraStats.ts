'use client'
import { useEffect, useState } from 'react'
import { getInfraStats, type InfraStats } from '@/services/buildings'

export function useInfraStats() {
  const [stats, setStats] = useState<InfraStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInfraStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}
