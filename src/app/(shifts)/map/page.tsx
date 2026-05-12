'use client'
import { useEffect, useState, useCallback, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { checkOut, getActiveSession } from '@/services/shifts'
import { getBuildingMap } from '@/services/map'
import { ObservationModal } from '@/components/map/ObservationModal'
import type { ShiftSession, OpenClassroomItem } from '@/types/shift'
import type { ClassroomMapEntry } from '@/types/support'
import type { ApiError } from '@/services/api'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ── Room Card ──────────────────────────────────────────────────────────────────

function RoomCard({ room, onClick }: { room: ClassroomMapEntry; onClick: () => void }) {
  const isOpen  = room.current_status === 'OPEN'
  const isFault = room.has_active_ticket
  const color   = isFault ? '#F59E0B' : isOpen ? '#16A34A' : '#9CA3AF'
  const bg      = isFault ? '#FFF7ED' : isOpen ? '#DCFCE7' : '#F3F4F6'
  const numColor = isFault ? '#B45309' : isOpen ? '#15803D' : '#6B7280'
  const label   = isFault ? 'Falla activa' : isOpen ? 'Abierto' : 'Cerrado'
  const shortName = room.classroom_name.replace(/[Ss]al[oó]n\s*/i, '')

  return (
    <button
      onClick={onClick}
      className="w-full rounded-[14px] flex flex-col gap-1 p-3 text-left transition-all active:scale-95"
      style={{ background: bg, height: 88, border: isFault ? '1.5px solid #FED7AA' : '1.5px solid transparent' }}
    >
      <div className="flex items-center justify-between w-full">
        {isFault ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        ) : isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4H3v16h10"/><path d="M13 4h8l-3 8 3 8h-8"/><circle cx="16" cy="12" r="1"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <path d="M9 22V12h6v10"/>
          </svg>
        )}
        <div className="flex items-center gap-1.5">
          {room.active_observation && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          )}
          <div className="rounded w-2 h-2" style={{ background: color }} />
        </div>
      </div>
      <span className="text-[18px] font-bold leading-tight" style={{ color: numColor }}>{shortName}</span>
      <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const router = useRouter()
  const [session, setSession]       = useState<ShiftSession | null>(null)
  const [rooms, setRooms]           = useState<ClassroomMapEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [checking, setChecking]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [openRooms, setOpenRooms]   = useState<OpenClassroomItem[] | null>(null)
  const [selected, setSelected]     = useState<ClassroomMapEntry | null>(null)

  const loadMap = useCallback(async (buildingId: string) => {
    try {
      const data = await getBuildingMap(buildingId)
      startTransition(() => setRooms(data))
    } catch {
      // silently keep empty — map might not have states yet
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      const active = await getActiveSession()
      if (!active) {
        localStorage.removeItem('active_session')
        localStorage.removeItem('handover')
        router.replace('/home')
        return
      }
      startTransition(() => setSession(active))
      localStorage.setItem('active_session', JSON.stringify(active))
      await loadMap(active.building_id)
    } catch {
      router.replace('/home')
    } finally {
      setLoading(false)
    }
  }, [router, loadMap])

  useEffect(() => { startTransition(() => { void loadData() }) }, [loadData])

  async function handleCheckOut(force = false) {
    setChecking(true)
    setError(null)
    try {
      const res = await checkOut(force)
      localStorage.removeItem('active_session')
      localStorage.removeItem('handover')
      try {
        const u = localStorage.getItem('user')
        if (u) {
          const user = JSON.parse(u)
          user.hours_recorded = res.total_hours_accumulated
          localStorage.setItem('user', JSON.stringify(user))
        }
      } catch {}
      router.push('/home')
    } catch (e) {
      const err = e as ApiError
      if (err.status === 409 && err.open_classrooms) {
        setOpenRooms(err.open_classrooms as OpenClassroomItem[])
        setChecking(false)
        return
      }
      setError(err.detail ?? 'Error al finalizar turno')
      setChecking(false)
    }
  }

  const openCount  = rooms.filter(r => r.current_status === 'OPEN').length
  const closedCount = rooms.filter(r => r.current_status === 'CLOSED').length
  const faultCount  = rooms.filter(r => r.has_active_ticket).length
  const pairs: ClassroomMapEntry[][] = []
  for (let i = 0; i < rooms.length; i += 2) pairs.push(rooms.slice(i, i + 2))

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav Bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-[18px] font-bold text-[#0A2463]">
            {loading ? 'Cargando...' : 'Edificio SYRI · Turno Activo'}
          </span>
          <span className="text-[12px] text-[#6B7280]">
            {session ? `Activo desde ${formatTime(session.checkin_at)}` : ' '}
          </span>
        </div>
        <button
          onClick={() => session && loadMap(session.building_id)}
          className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          aria-label="Actualizar mapa"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
          </svg>
        </button>
      </div>

      {/* Stats bar */}
      {rooms.length > 0 && (
        <div className="flex items-center px-5 py-2 bg-[#F8F9FA] shrink-0">
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <div className="w-2 h-2 rounded bg-[#16A34A]" />
            <span className="text-[12px] font-semibold text-[#16A34A]">{openCount} Abiertos</span>
          </div>
          <div className="w-px h-4 bg-[#E5E7EB]" />
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <div className="w-2 h-2 rounded bg-[#9CA3AF]" />
            <span className="text-[12px] font-semibold text-[#6B7280]">{closedCount} Cerrados</span>
          </div>
          {faultCount > 0 && (
            <>
              <div className="w-px h-4 bg-[#E5E7EB]" />
              <div className="flex-1 flex items-center justify-center gap-1.5">
                <div className="w-2 h-2 rounded bg-[#F59E0B]" />
                <span className="text-[12px] font-semibold text-[#F59E0B]">{faultCount} {faultCount === 1 ? 'Falla' : 'Fallas'}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hint */}
      {!loading && rooms.length > 0 && (
        <div className="px-5 py-1.5 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-[11px] text-[#9CA3AF]">Toca un salón para agregar novedades</span>
        </div>
      )}

      {/* Grid — pb-44 clears checkout bar + BottomNav */}
      <div className="flex-1 overflow-y-auto p-4 pb-44 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-16">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            <span className="text-[15px] font-semibold text-[#6B7280]">Sin datos de salones</span>
            <span className="text-[13px] text-[#9CA3AF]">Los estados se registran durante el turno.</span>
          </div>
        ) : (
          pairs.map((pair, i) => (
            <div key={i} className="flex gap-3">
              {pair.map(r => (
                <div key={r.classroom_id} className="flex-1">
                  <RoomCard room={r} onClick={() => setSelected(r)} />
                </div>
              ))}
              {pair.length === 1 && <div className="flex-1" />}
            </div>
          ))
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <span className="text-red-700 text-[13px]">{error}</span>
          </div>
        )}
      </div>

      {/* Open classrooms warning modal */}
      {openRooms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#111827]">Salones aún abiertos</p>
                <p className="text-[13px] text-[#6B7280] mt-1">Los siguientes salones siguen marcados como abiertos:</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {openRooms.map(r => (
                <div key={r.classroom_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[13px] font-medium text-[#111827]">{r.classroom_name}</span>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-[#6B7280]">¿Quieres finalizar el turno de todas formas?</p>
            <div className="flex gap-3">
              <button onClick={() => setOpenRooms(null)} className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[14px] font-semibold text-[#374151]">
                Cancelar
              </button>
              <button onClick={() => { setOpenRooms(null); handleCheckOut(true) }} className="flex-1 py-3 rounded-xl bg-[#DC2626] text-[14px] font-bold text-white">
                Finalizar igual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout bar */}
      <div className="fixed bottom-[94px] left-0 right-0 bg-white border-t border-[#F3F4F6] px-4 pt-2 pb-2 z-40">
        <button
          onClick={() => handleCheckOut(false)}
          disabled={checking || loading}
          className="w-full h-[54px] rounded-[14px] bg-[#DC2626] flex items-center justify-center gap-2.5 disabled:opacity-60"
        >
          {checking ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          )}
          <span className="text-[16px] font-bold text-white">
            {checking ? 'Finalizando...' : 'Check-Out · Finalizar Turno'}
          </span>
        </button>
      </div>

      <BottomNav />

      {/* Observation / Fault Modal (HU-11 + HU-15) */}
      <ObservationModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        classroom={selected}
        buildingId=""
        onSuccess={() => {
          setSelected(null)
          if (session?.building_id) void loadMap(session.building_id)
        }}
      />
    </div>
  )
}
