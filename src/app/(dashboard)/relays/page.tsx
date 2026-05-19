'use client'

import { useCallback, useEffect, useMemo, useState, startTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { listSessions } from '@/services/shifts'
import { getBuildings } from '@/services/buildings'
import type { ApiError } from '@/services/api'
import type { Building } from '@/types/buildings'
import type { ShiftSessionSummary } from '@/types/shift'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RelaysContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeMode = searchParams.get('active') === 'true'

  const [sessions, setSessions] = useState<ShiftSessionSummary[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Parameters<typeof listSessions>[0] = activeMode
        ? { status: 'ACTIVE' }
        : { only_relays: true }
      if (filterBuilding) params.building_id = filterBuilding
      if (dateFrom) params.date_from = `${dateFrom}T00:00:00`
      if (dateTo) params.date_to = `${dateTo}T23:59:59`
      const [items, blds] = await Promise.all([listSessions(params), getBuildings()])
      startTransition(() => {
        setSessions(items)
        setBuildings(blds)
      })
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.detail ?? 'No se pudo cargar las sesiones.')
    } finally {
      setLoading(false)
    }
  }, [activeMode, filterBuilding, dateFrom, dateTo])

  useEffect(() => {
    startTransition(() => {
      void load()
    })
  }, [load])

  const totalSessions = useMemo(() => sessions.length, [sessions])

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
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-bold text-[#0A2463]">
            {activeMode ? 'Sesiones Activas' : 'Trazabilidad de relevos'}
          </h1>
          <p className="text-xs text-[#6B7280]">
            {activeMode
              ? `${totalSessions} sesión${totalSessions !== 1 ? 'es' : ''} en curso`
              : `${totalSessions} relevos registrados`}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
            Filtros
          </p>
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827]"
          >
            <option value="">Todos los edificios</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
              placeholder="Desde"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
              placeholder="Hasta"
            />
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
        ) : sessions.length === 0 ? (
          <EmptyState
            title={activeMode ? 'Sin sesiones activas' : 'Sin relevos'}
            description={activeMode
              ? 'No hay monitores con turno activo en este momento.'
              : 'No hay sesiones de relevo con los filtros aplicados.'}
          />
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => router.push(`/relays/${s.id}`)}
              className="flex flex-col gap-1.5 rounded-xl border border-[#E5E7EB] p-3.5 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#D97706]">
                  Relevo
                </span>
                <span className="rounded-lg bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1565C0]">
                  {s.status}
                </span>
              </div>
              <p className="text-[14px] font-semibold text-[#111827]">{s.user_name}</p>
              <p className="text-[12px] text-[#6B7280]">
                Cubrió el turno de {s.original_user_name ?? '—'}
              </p>
              <p className="text-[12px] text-[#6B7280]">
                {s.building_name} · {formatDate(s.checkin_at)}
                {s.checkout_at ? ` → ${formatDate(s.checkout_at)}` : ''}
              </p>
              {s.duration_hours !== null && (
                <p className="text-[12px] text-[#0A2463]">{s.duration_hours.toFixed(2)} h</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default function RelaysPage() {
  return (
    <Suspense>
      <RelaysContent />
    </Suspense>
  )
}
