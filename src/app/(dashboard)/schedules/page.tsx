'use client'

import { useCallback, useEffect, startTransition, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { listSchedules, invalidateSchedule } from '@/services/shifts'
import { getBuildings } from '@/services/buildings'
import { listUsers, type UserRead } from '@/services/users'
import type { ApiError } from '@/services/api'
import type { Building } from '@/types/buildings'
import type { ScheduleShift } from '@/types/shift'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function formatTime(hms: string): string {
  return hms.slice(0, 5)
}

interface ToastState {
  message: string
  variant: 'success' | 'error' | 'info'
}

export default function SchedulesPage() {
  const router = useRouter()
  const [schedules, setSchedules] = useState<ScheduleShift[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [users, setUsers] = useState<UserRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterBuilding, setFilterBuilding] = useState<string>('')
  const [filterDay, setFilterDay] = useState<string>('')
  const [confirmDelete, setConfirmDelete] = useState<ScheduleShift | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const buildingsById = useMemo(() => Object.fromEntries(buildings.map((b) => [b.id, b])), [buildings])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [scheds, blds, allUsers] = await Promise.all([
        listSchedules({ only_active: true }),
        getBuildings(),
        listUsers().catch(() => [] as UserRead[]),
      ])
      startTransition(() => {
        setSchedules(scheds)
        setBuildings(blds)
        setUsers(allUsers)
      })
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.detail ?? 'No se pudo cargar la programación.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      void load()
    })
  }, [load])

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      if (filterBuilding && s.building_id !== filterBuilding) return false
      if (filterDay !== '' && s.day_of_week !== Number(filterDay)) return false
      return true
    })
  }, [schedules, filterBuilding, filterDay])

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleShift[]>()
    for (const s of filtered) {
      const arr = map.get(s.building_id) ?? []
      arr.push(s)
      map.set(s.building_id, arr)
    }
    return Array.from(map.entries()).map(([buildingId, items]) => ({
      buildingId,
      name: buildingsById[buildingId]?.name ?? 'Edificio',
      items: items.sort((a, b) =>
        a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
      ),
    }))
  }, [filtered, buildingsById])

  async function handleInvalidate() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await invalidateSchedule(confirmDelete.id)
      setConfirmDelete(null)
      setToast({ message: 'Turno invalidado correctamente.', variant: 'success' })
      void load()
    } catch (err) {
      const apiErr = err as ApiError
      setToast({
        message: apiErr.detail ?? 'No se pudo invalidar el turno.',
        variant: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }

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
        <div className="flex flex-1 flex-col gap-0.5">
          <h1 className="text-lg font-bold text-[#0A2463]">Programación de Turnos</h1>
          <p className="text-xs text-[#6B7280]">Turnos activos del equipo</p>
        </div>
        <button
          onClick={() => router.push('/schedules/new')}
          className="flex items-center gap-1.5 rounded-xl bg-[#0A2463] px-3 py-2 text-[13px] font-bold text-white"
        >
          <Icon name="plus" size={16} />
          Nuevo
        </button>
      </header>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {/* Filtros */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
            Filtros
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827]"
            >
              <option value="">Todos los edificios</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827]"
            >
              <option value="">Todos los días</option>
              {DAY_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A2463] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            title="Sin turnos programados"
            description="No hay turnos que coincidan con los filtros aplicados."
          />
        ) : (
          grouped.map((group) => (
            <div key={group.buildingId} className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
                {group.name}
              </p>
              <div className="flex flex-col gap-2">
                {group.items.map((s) => {
                  const monitor = usersById[s.user_id]
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col gap-1 rounded-xl border border-[#E5E7EB] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-[14px] font-semibold text-[#111827]">
                            {monitor?.name ?? 'Monitor'}
                          </span>
                          <span className="truncate text-[12px] text-[#6B7280]">
                            {DAY_NAMES[s.day_of_week]} · {formatTime(s.start_time)}–{formatTime(s.end_time)} · {s.session_type}
                          </span>
                        </div>
                        <button
                          onClick={() => setConfirmDelete(s)}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50"
                        >
                          Invalidar
                        </button>
                      </div>
                      <span className="text-[11px] text-[#9CA3AF]">
                        Vigente desde {s.valid_from}
                        {s.valid_until ? ` · hasta ${s.valid_until}` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Invalidar turno"
        description="El turno dejará de estar activo a partir de hoy. ¿Quieres continuar?"
        confirmLabel="Invalidar"
        isLoading={deleting}
        onConfirm={handleInvalidate}
        onCancel={() => setConfirmDelete(null)}
      />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={3000}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
