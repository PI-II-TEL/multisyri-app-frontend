'use client'

import { useEffect, useState, startTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ScheduleForm } from '@/components/schedules/ScheduleForm'
import { Icon } from '@/components/ui/Icon'
import { getSchedule } from '@/services/shifts'
import type { ApiError } from '@/services/api'
import type { ScheduleShift } from '@/types/shift'

export default function EditSchedulePage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const router = useRouter()
  const [schedule, setSchedule] = useState<ScheduleShift | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getSchedule(scheduleId)
        startTransition(() => setSchedule(data))
      } catch (err) {
        const apiErr = err as ApiError
        setError(apiErr.detail ?? 'No se pudo cargar el turno programado.')
      } finally {
        setLoading(false)
      }
    }
    startTransition(() => void load())
  }, [scheduleId])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A2463] border-t-transparent" />
      </div>
    )
  }

  if (error || !schedule) {
    return (
      <div className="flex flex-col">
        <header className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => router.back()}
            className="rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100"
            aria-label="Volver"
          >
            <Icon name="chevron-left" size={22} />
          </button>
          <h1 className="text-lg font-bold text-[#0A2463]">Editar turno</h1>
        </header>
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[13px] text-red-700">{error ?? 'Turno no encontrado.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return <ScheduleForm mode="edit" initial={schedule} />
}
