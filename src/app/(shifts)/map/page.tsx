'use client'
import { useEffect, useState, useCallback, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { checkOut, getActiveSession } from '@/services/shifts'
import { getBuildingMap, toggleClassroomStatus } from '@/services/map'
import { getBuilding } from '@/services/buildings'
import { reportFault } from '@/services/support'
import type {
  ShiftSession,
  OpenClassroomItem,
  ClassroomMapRead,
  BuildingMapRead,
  FaultType,
} from '@/types/shift'
import type { ApiError } from '@/services/api'
import { Toast } from '@/components/Toast'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function shortName(name: string) {
  return name.replace(/[Ss]al[oó]n\s*/i, '').trim()
}

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

const FAULT_LABELS: Record<FaultType, string> = {
  PROJECTOR: 'Proyector',
  SPEAKERS: 'Parlantes',
  PC: 'Computador',
  OTHER: 'Otro',
}

const FAULT_TYPES: FaultType[] = ['PROJECTOR', 'SPEAKERS', 'PC', 'OTHER']

function DoorOpenIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 4H3v16h10"/><path d="M13 4h8l-3 8 3 8h-8"/><circle cx="16" cy="12" r="1"/>
    </svg>
  )
}

function DoorClosedIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <path d="M9 22V12h6v10"/>
    </svg>
  )
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

interface RoomCardProps {
  room: ClassroomMapRead
  canEdit: boolean
  toggling: boolean
  onToggle: () => void
  onReportFault?: () => void
}

function RoomCard({ room, canEdit, toggling, onToggle, onReportFault }: RoomCardProps) {
  const ds = getDisplayStatus(room)
  const { dot, bg, numColor, textColor, label, border } = STATUS_STYLE[ds]
  const tappable = canEdit && ds !== 'fault'

  return (
    <div
      onClick={tappable ? onToggle : undefined}
      role={tappable ? 'button' : undefined}
      className="rounded-[14px] flex flex-col gap-1 p-3 w-full text-left transition-opacity active:opacity-70"
      style={{
        background: bg,
        height: 88,
        border,
        cursor: tappable ? 'pointer' : 'default',
        opacity: toggling ? 0.55 : 1,
      }}
    >
      <div className="flex items-center justify-between w-full">
        {ds === 'fault'
          ? <WarningIcon color={textColor} />
          : ds === 'open'
            ? <DoorOpenIcon color={textColor} />
            : <DoorClosedIcon color={textColor} />}
        {toggling ? (
          <div
            className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${dot} transparent transparent transparent` }}
          />
        ) : canEdit && ds !== 'fault' && onReportFault ? (
          <button
            onClick={(e) => { e.stopPropagation(); onReportFault() }}
            className="p-0.5 rounded opacity-40 hover:opacity-90 active:opacity-100 transition-opacity"
            title="Reportar falla"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
        ) : (
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />
        )}
      </div>
      <span className="text-[18px] font-bold leading-tight" style={{ color: numColor }}>
        {shortName(room.classroom_name)}
      </span>
      <span className="text-[11px] font-medium" style={{ color: textColor }}>{label}</span>
    </div>
  )
}

export default function MapPage() {
  const router = useRouter()

  const [session, setSession]           = useState<ShiftSession | null>(null)
  const [mapData, setMapData]           = useState<BuildingMapRead | null>(null)
  const [buildingName, setBuildingName] = useState('')
  const [loading, setLoading]           = useState(true)
  const [checking, setChecking]         = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [openRooms, setOpenRooms]       = useState<OpenClassroomItem[] | null>(null)
  const [togglingId, setTogglingId]     = useState<string | null>(null)
  const [toast, setToast]               = useState<{ message: string; variant: 'error' | 'success' | 'info' } | null>(null)

  // Fault report modal
  const [faultRoom, setFaultRoom]           = useState<ClassroomMapRead | null>(null)
  const [faultType, setFaultType]           = useState<FaultType | ''>('')
  const [faultDesc, setFaultDesc]           = useState('')
  const [faultSubmitting, setFaultSubmitting] = useState(false)
  const [faultError, setFaultError]         = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const active = await getActiveSession()
      if (!active) {
        localStorage.removeItem('active_session')
        localStorage.removeItem('handover')
        router.replace('/home')
        return
      }
      setSession(active)
      localStorage.setItem('active_session', JSON.stringify(active))

      const [mapResult, buildingResult] = await Promise.allSettled([
        getBuildingMap(active.building_id),
        getBuilding(active.building_id),
      ])
      if (mapResult.status === 'fulfilled')      setMapData(mapResult.value)
      if (buildingResult.status === 'fulfilled') setBuildingName(buildingResult.value.name)
    } catch {
      router.replace('/home')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { startTransition(() => { void loadData() }) }, [loadData])

  async function handleToggle(classroomId: string) {
    if (!session || !mapData) return

    // Optimistic flip — applied immediately so the UI feels instant
    setMapData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        classrooms: prev.classrooms.map(c =>
          c.classroom_id === classroomId
            ? { ...c, current_status: c.current_status === 'OPEN' ? 'CLOSED' : 'OPEN' }
            : c,
        ),
      }
    })

    setTogglingId(classroomId)
    try {
      const result = await toggleClassroomStatus(session.building_id, classroomId)
      // Confirm with the server-authoritative status
      setMapData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          classrooms: prev.classrooms.map(c =>
            c.classroom_id === classroomId ? { ...c, current_status: result.status } : c,
          ),
        }
      })
    } catch {
      // Revert optimistic flip — the current value is already flipped, so flip again
      setMapData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          classrooms: prev.classrooms.map(c =>
            c.classroom_id === classroomId
              ? { ...c, current_status: c.current_status === 'OPEN' ? 'CLOSED' : 'OPEN' }
              : c,
          ),
        }
      })
      setToast({ message: 'No se pudo cambiar el estado del salón.', variant: 'error' })
    } finally {
      setTogglingId(null)
    }
  }

  async function handleCheckOut(force = false) {
    setChecking(true)
    setError(null)
    try {
      const res = await checkOut(force)
      localStorage.removeItem('active_session')
      localStorage.removeItem('handover')
      try {
        const raw = localStorage.getItem('user')
        if (raw) {
          const u = JSON.parse(raw)
          u.hours_recorded = res.total_hours_accumulated
          localStorage.setItem('user', JSON.stringify(u))
        }
      } catch { /* ignore */ }
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

  function openFaultModal(room: ClassroomMapRead) {
    setFaultRoom(room)
    setFaultType('')
    setFaultDesc('')
    setFaultError(null)
  }

  function closeFaultModal() {
    if (faultSubmitting) return
    setFaultRoom(null)
    setFaultType('')
    setFaultDesc('')
    setFaultError(null)
  }

  async function handleReportFault() {
    if (!faultRoom || !faultType || !session) return
    setFaultSubmitting(true)
    setFaultError(null)
    try {
      await reportFault({
        fault_type: faultType,
        fault_description: faultDesc,
        building_id: session.building_id,
        classroom_id: faultRoom.classroom_id,
        shift_session_id: session.id,
      })
      // Optimistic: mark room as having an active ticket
      setMapData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          classrooms: prev.classrooms.map(c =>
            c.classroom_id === faultRoom.classroom_id
              ? { ...c, has_active_ticket: true }
              : c,
          ),
        }
      })
      closeFaultModal()
    } catch (e) {
      const err = e as ApiError
      setFaultError(err.detail ?? 'Error al reportar falla')
    } finally {
      setFaultSubmitting(false)
    }
  }

  const classrooms = mapData?.classrooms ?? []
  const canEdit    = mapData?.can_edit ?? false

  const openCount   = classrooms.filter(c => c.current_status === 'OPEN'  && !c.has_active_ticket).length
  const closedCount = classrooms.filter(c => c.current_status === 'CLOSED' && !c.has_active_ticket).length
  const faultCount  = classrooms.filter(c => c.has_active_ticket).length

  // Split into rows of 2 for the grid
  const pairs: ClassroomMapRead[][] = []
  for (let i = 0; i < classrooms.length; i += 2) pairs.push(classrooms.slice(i, i + 2))

  // Layout (bottom-up):
  //   BottomNav:    fixed bottom-0,        ≈ 94px  (z-50)
  //   Checkout bar: fixed bottom-[94px],   ≈ 78px  (z-40)
  //   → scroll area needs pb-44 to clear both

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-[18px] font-bold text-[#0A2463]">
            {loading ? 'Cargando...' : buildingName || 'Mapa de Salones'}
          </span>
          <span className="text-[12px] text-[#6B7280]">
            {session ? `Turno activo desde ${formatTime(session.checkin_at)}` : ' '}
          </span>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
          <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
        </svg>
      </div>

      {/* Read-only banner — only shown when there is map data but the user cannot edit */}
      {!loading && !canEdit && mapData && (
        <div className="mx-4 mb-1 px-3 py-2 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-[12px] font-medium text-[#B45309]">
            Modo lectura — no tienes turno activo en este edificio
          </span>
        </div>
      )}

      {/* Stats bar */}
      {classrooms.length > 0 && (
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

      {/* Room grid — pb-44 clears checkout bar + BottomNav */}
      <div className="flex-1 overflow-y-auto p-4 pb-44 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : classrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-16">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            <span className="text-[15px] font-semibold text-[#6B7280]">Sin salones registrados</span>
            <span className="text-[13px] text-[#9CA3AF]">
              Este edificio aún no tiene salones configurados.
            </span>
          </div>
        ) : (
          pairs.map((pair, i) => (
            <div key={i} className="flex gap-3">
              {pair.map(c => (
                <div key={c.classroom_id} className="flex-1">
                  <RoomCard
                    room={c}
                    canEdit={canEdit}
                    toggling={togglingId === c.classroom_id}
                    onToggle={() => handleToggle(c.classroom_id)}
                    onReportFault={canEdit ? () => openFaultModal(c) : undefined}
                  />
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

      {/* Open-classrooms warning modal */}
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
                <p className="text-[13px] text-[#6B7280] mt-1">
                  Los siguientes salones siguen marcados como abiertos:
                </p>
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
              <button
                onClick={() => setOpenRooms(null)}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[14px] font-semibold text-[#374151]"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setOpenRooms(null); handleCheckOut(true) }}
                className="flex-1 py-3 rounded-xl bg-[#DC2626] text-[14px] font-bold text-white"
              >
                Finalizar igual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fault report modal */}
      {faultRoom && (
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
                <p className="text-[15px] font-bold text-[#111827]">Reportar falla</p>
                <p className="text-[13px] text-[#6B7280] mt-0.5">{faultRoom.classroom_name}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-[#374151]">Tipo de equipo</span>
              <div className="grid grid-cols-2 gap-2">
                {FAULT_TYPES.map(ft => (
                  <button
                    key={ft}
                    onClick={() => setFaultType(ft)}
                    className="py-2.5 px-3 rounded-xl border text-[13px] font-medium transition-colors"
                    style={{
                      borderColor: faultType === ft ? '#F59E0B' : '#E5E7EB',
                      background: faultType === ft ? '#FFF7ED' : '#fff',
                      color: faultType === ft ? '#B45309' : '#374151',
                    }}
                  >
                    {FAULT_LABELS[ft]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-[#374151]">
                Descripción <span className="font-normal text-[#9CA3AF]">(opcional)</span>
              </span>
              <textarea
                value={faultDesc}
                onChange={e => setFaultDesc(e.target.value)}
                placeholder="Describe brevemente el problema..."
                rows={3}
                className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-[13px] text-[#111827] placeholder-[#9CA3AF] resize-none focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            {faultError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                <span className="text-red-700 text-[12px]">{faultError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeFaultModal}
                disabled={faultSubmitting}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[14px] font-semibold text-[#374151] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportFault}
                disabled={!faultType || faultSubmitting}
                className="flex-1 py-3 rounded-xl bg-[#F59E0B] text-[14px] font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {faultSubmitting
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Reportar falla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout bar — sits above BottomNav (bottom-[94px]) */}
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

      {/* BottomNav — fixed bottom-0, z-50 */}
      <BottomNav />

      {/* Toast for toggle errors */}
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
