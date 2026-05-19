'use client'

import { useState, useEffect, startTransition, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getBuildingMapReadonly } from '@/services/map'
import { getBuilding } from '@/services/buildings'
import type { ClassroomMapRead } from '@/types/shift'

type DisplayStatus = 'open' | 'closed' | 'fault'

function getDisplayStatus(room: ClassroomMapRead): DisplayStatus {
  if (room.has_active_ticket) return 'fault'
  return room.current_status === 'OPEN' ? 'open' : 'closed'
}

const STATUS_STYLE: Record<
  DisplayStatus,
  { dot: string; bg: string; numColor: string; textColor: string; label: string; border?: string }
> = {
  open:   { dot: '#16A34A', bg: '#DCFCE7', numColor: '#15803D', textColor: '#16A34A', label: 'Abierto' },
  closed: { dot: '#9CA3AF', bg: '#F3F4F6', numColor: '#6B7280', textColor: '#9CA3AF', label: 'Cerrado' },
  fault:  { dot: '#F59E0B', bg: '#FFF7ED', numColor: '#B45309', textColor: '#F59E0B', label: 'Falla activa', border: '1.5px solid #FED7AA' },
}

function shortName(name: string) {
  return name.replace(/[Ss]al[oó]n\s*/i, '').trim()
}

function ReadonlyRoomCard({ room }: { room: ClassroomMapRead }) {
  const ds = getDisplayStatus(room)
  const { dot, bg, numColor, textColor, label, border } = STATUS_STYLE[ds]

  return (
    <div
      className="rounded-[14px] flex flex-col gap-1 p-3 w-full"
      style={{ background: bg, height: 88, border: border ?? '1.5px solid transparent' }}
    >
      <div className="flex items-center justify-between w-full">
        {ds === 'fault' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        ) : ds === 'open' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4H3v16h10"/>
            <path d="M13 4h8l-3 8 3 8h-8"/>
            <circle cx="16" cy="12" r="1"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <path d="M9 22V12h6v10"/>
          </svg>
        )}
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
      </div>
      <span className="text-[18px] font-bold leading-tight" style={{ color: numColor }}>
        {shortName(room.classroom_name)}
      </span>
      <span className="text-[11px] font-medium" style={{ color: textColor }}>{label}</span>
    </div>
  )
}

function getWsUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  return api.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') + '/api/v1/ws/map'
}

export default function CoordinatorBuildingMapPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const router = useRouter()

  const [classrooms, setClassrooms]     = useState<ClassroomMapRead[]>([])
  const [buildingName, setBuildingName] = useState('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [wsStatus, setWsStatus]         = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const wsRef                           = useRef<WebSocket | null>(null)
  const reconnectTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectWsRef                    = useRef<() => void>(() => {})

  const load = useCallback(async () => {
    setError(null)
    try {
      const [mapResult, buildingResult] = await Promise.allSettled([
        getBuildingMapReadonly(buildingId),
        getBuilding(buildingId),
      ])
      if (mapResult.status === 'fulfilled') {
        startTransition(() => setClassrooms(mapResult.value.classrooms))
      } else {
        setError('No se pudo cargar el mapa del edificio.')
      }
      if (buildingResult.status === 'fulfilled') {
        setBuildingName(buildingResult.value.name)
      }
    } finally {
      setLoading(false)
    }
  }, [buildingId])

  // WebSocket for real-time updates (HU-14)
  const connectWs = useCallback(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const url = `${getWsUrl()}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws
    setWsStatus('connecting')

    ws.onopen = () => setWsStatus('connected')

    ws.onmessage = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data as string) as { building_id?: string }
        // Only reload when the event is for this building
        if (!msg.building_id || msg.building_id === buildingId) {
          void load()
        }
      } catch {
        void load()
      }
    }

    ws.onclose = () => {
      setWsStatus('disconnected')
      reconnectTimer.current = setTimeout(() => connectWsRef.current(), 5000)
    }

    ws.onerror = () => ws.close()
  }, [buildingId, load])

  useEffect(() => { connectWsRef.current = connectWs }, [connectWs])

  useEffect(() => { startTransition(() => { void load() }) }, [load])

  useEffect(() => {
    startTransition(() => { connectWs() })
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connectWs])

  const openCount   = classrooms.filter(c => c.current_status === 'OPEN'   && !c.has_active_ticket).length
  const closedCount = classrooms.filter(c => c.current_status === 'CLOSED' && !c.has_active_ticket).length
  const faultCount  = classrooms.filter(c => c.has_active_ticket).length

  const pairs: ClassroomMapRead[][] = []
  for (let i = 0; i < classrooms.length; i += 2) pairs.push(classrooms.slice(i, i + 2))

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            className="rounded-full p-1.5 text-[#0A2463] hover:bg-[#F3F4F6] transition-colors"
            aria-label="Volver"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[18px] font-bold text-[#0A2463]">
              {loading && !buildingName ? 'Cargando...' : buildingName || 'Edificio'}
            </h1>
            <p className="text-[12px] text-[#6B7280]">Estado de salones</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* WS indicator */}
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: wsStatus === 'connected' ? '#16A34A' : wsStatus === 'connecting' ? '#F59E0B' : '#DC2626',
              }}
              title={wsStatus === 'connected' ? 'Tiempo real activo' : 'Sin conexión en tiempo real'}
            />
            <span className="text-[10px] text-[#9CA3AF]">
              {wsStatus === 'connected' ? 'En vivo' : wsStatus === 'connecting' ? 'Conectando' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
            aria-label="Actualizar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Read-only badge */}
      <div className="px-5 mb-1">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FF] px-2.5 py-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0A2463" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="text-[11px] font-semibold text-[#0A2463]">Solo lectura · Coordinador</span>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && classrooms.length > 0 && (
        <div className="flex items-center px-5 py-2 bg-[#F8F9FA] shrink-0">
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span className="text-[12px] font-semibold text-[#16A34A]">{openCount} Abiertos</span>
          </div>
          <div className="w-px h-4 bg-[#E5E7EB]" />
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
            <span className="text-[12px] font-semibold text-[#6B7280]">{closedCount} Cerrados</span>
          </div>
          {faultCount > 0 && (
            <>
              <div className="w-px h-4 bg-[#E5E7EB]" />
              <div className="flex-1 flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-[12px] font-semibold text-[#F59E0B]">
                  {faultCount} {faultCount === 1 ? 'Falla' : 'Fallas'}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Room grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-36 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
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
        ) : classrooms.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center px-8 py-16">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            <span className="text-[15px] font-semibold text-[#6B7280]">Sin salones registrados</span>
            <span className="text-[13px] text-[#9CA3AF]">Este edificio aún no tiene salones configurados.</span>
          </div>
        ) : (
          pairs.map((pair, i) => (
            <div key={i} className="flex gap-3">
              {pair.map(c => (
                <div key={c.classroom_id} className="flex-1">
                  <ReadonlyRoomCard room={c} />
                </div>
              ))}
              {pair.length === 1 && <div className="flex-1" />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
