'use client'

import { useState, useEffect, startTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getBuildingsOverview } from '@/services/map'
import { useMapWebSocket } from '@/hooks/useMapWebSocket'
import type { BuildingStatusRead, BuildingTrafficLight } from '@/types/buildings'

const TRAFFIC: Record<BuildingTrafficLight, { dot: string; valueColor: string }> = {
  GREEN:  { dot: '#16A34A', valueColor: '#16A34A' },
  YELLOW: { dot: '#F59E0B', valueColor: '#B45309' },
  RED:    { dot: '#DC2626', valueColor: '#DC2626' },
}

function buildingSubtitle(b: BuildingStatusRead): string {
  if (!b.active_monitor) return 'Sin monitor asignado'
  const parts: string[] = [`Monitor: ${b.active_monitor}`]
  if (b.open_tickets > 0)
    parts.push(`${b.open_tickets} falla${b.open_tickets !== 1 ? 's' : ''} activa${b.open_tickets !== 1 ? 's' : ''}`)
  else if (b.active_observations > 0)
    parts.push(`${b.active_observations} observación${b.active_observations !== 1 ? 'es' : ''}`)
  return parts.join(' · ')
}

function buildingRightLabel(b: BuildingStatusRead): string {
  if (!b.active_monitor) return 'Sin turno'
  if (b.open_tickets >= 2) return `${b.open_tickets} fallas`
  if (b.open_tickets === 1) return '1 falla'
  return 'Normal'
}

export default function CoordinatorMapPage() {
  const router = useRouter()
  const [buildings, setBuildings] = useState<BuildingStatusRead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await getBuildingsOverview()
      startTransition(() => setBuildings(data))
    } catch {
      setError('No se pudo cargar el estado del campus.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => { void load() })
  }, [load])

  // HU-14: any map event in the campus triggers a silent overview reload.
  const { wsStatus } = useMapWebSocket({
    onMessage: useCallback(() => { startTransition(() => { void load() }) }, [load]),
  })

  const monitorsActive = buildings.filter(b => b.active_monitor !== null).length
  const totalFaults    = buildings.reduce((sum, b) => sum + b.open_tickets, 0)
  const noMonitor      = buildings.filter(b => b.active_monitor === null).length

  return (
    <div
      className="flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h1 className="text-[18px] font-bold text-[#0A2463]">Mapa Global</h1>
          <p className="text-[12px] text-[#6B7280]">
            Campus Icesi
            {!loading && ` · ${buildings.length} edificio${buildings.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* WS status indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: wsStatus === 'connected' ? '#16A34A' : wsStatus === 'connecting' ? '#F59E0B' : '#DC2626',
              }}
              title={wsStatus === 'connected' ? 'Tiempo real activo' : wsStatus === 'connecting' ? 'Conectando…' : 'Sin conexión en tiempo real'}
            />
            <span className="text-[11px] text-[#9CA3AF]">
              {wsStatus === 'connected' ? 'En vivo' : wsStatus === 'connecting' ? 'Conectando' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            aria-label="Actualizar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Section label */}
      <div className="px-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
          Estado del Campus
        </p>
      </div>

      {/* Building list */}
      <div className="px-4 flex flex-col gap-2 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 w-full">
              <span className="text-red-700 text-[13px]">{error}</span>
            </div>
            <button
              onClick={() => void load()}
              className="text-[13px] font-semibold text-[#0A2463] underline"
            >
              Reintentar
            </button>
          </div>
        ) : buildings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
            </svg>
            <span className="text-[15px] font-semibold text-[#6B7280]">Sin edificios registrados</span>
            <span className="text-[13px] text-[#9CA3AF]">Agrega edificios desde el panel de administración.</span>
          </div>
        ) : (
          buildings.map(b => {
            const { dot, valueColor } = TRAFFIC[b.traffic_light]
            return (
              <button
                key={b.id}
                onClick={() => router.push(`/coordinator-map/${b.id}`)}
                className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-[#E5E7EB] bg-white p-4 text-left transition-all active:opacity-70 hover:border-[#0A2463]/25 hover:bg-[#F8F9FA]"
              >
                {/* Semaphore dot */}
                <div
                  className="shrink-0 w-3 h-3 rounded-full"
                  style={{ background: dot }}
                  aria-label={b.traffic_light === 'GREEN' ? 'Normal' : b.traffic_light === 'YELLOW' ? 'Alerta' : 'Crítico'}
                />

                {/* Building icon */}
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0A2463"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
                </svg>

                {/* Name + subtitle */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[#111827] truncate">{b.name}</p>
                  <p className="text-[12px] text-[#6B7280] truncate mt-0.5">{buildingSubtitle(b)}</p>
                </div>

                {/* Right stat + chevron */}
                <div className="shrink-0 flex flex-col items-end gap-0.5">
                  <span className="text-[14px] font-bold leading-none" style={{ color: valueColor }}>
                    {buildingRightLabel(b)}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Summary strip */}
      {!loading && !error && buildings.length > 0 && (
        <div className="mx-4 mb-4 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] px-4 py-3 flex items-center">
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF]">Monitores</span>
            <span className="text-[15px] font-bold text-[#0A2463]">{monitorsActive} activos</span>
          </div>
          <div className="w-px h-10 bg-[#E5E7EB]" />
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF]">Fallas</span>
            <span
              className="text-[15px] font-bold"
              style={{ color: totalFaults > 0 ? '#F59E0B' : '#16A34A' }}
            >
              {totalFaults} activas
            </span>
          </div>
          <div className="w-px h-10 bg-[#E5E7EB]" />
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF]">Sin Turno</span>
            <span
              className="text-[15px] font-bold"
              style={{ color: noMonitor > 0 ? '#DC2626' : '#16A34A' }}
            >
              {noMonitor} {noMonitor === 1 ? 'edificio' : 'edificios'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
