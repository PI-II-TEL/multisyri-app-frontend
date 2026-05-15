'use client'
import { useEffect, useState, useCallback, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav, { MONITOR_TABS, COORDINATOR_TABS } from '@/components/BottomNav'
import { Toast } from '@/components/Toast'
import { listTickets, ACTIVE_STATUSES, listTicketsForBuilding } from '@/services/support'
import type { SupportTicketRead } from '@/services/support'
import type { SupportTicket } from '@/types/support'
import type { FaultType, TicketStatus } from '@/types/shift'
import { useAuth } from '@/contexts/AuthContext'

const SEED_BUILDING_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// ── Shared helpers (used by CoordinatorView) ──────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `Hace ${h}h` : `Hace ${h}h ${m}min`
}

function ticketId(id: string) {
  return `#TK-${id.slice(0, 4).toUpperCase()}`
}

function faultLabel(ft: string) {
  const map: Record<string, string> = { PROJECTOR: 'Proyector', PC: 'PC', SPEAKERS: 'Parlantes', OTHER: 'Otro' }
  return map[ft] ?? ft
}

// ── Monitor View labels/styles ─────────────────────────────────────────────────

const FAULT_LABEL: Record<FaultType, string> = {
  PROJECTOR: 'Proyector',
  SPEAKERS: 'Parlantes',
  PC: 'Computador',
  OTHER: 'Otro',
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  ESCALATED: 'Escalado',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
}

const STATUS_STYLE: Record<TicketStatus, { bg: string; text: string }> = {
  OPEN:        { bg: '#DCFCE7', text: '#15803D' },
  IN_PROGRESS: { bg: '#DBEAFE', text: '#1D4ED8' },
  ESCALATED:   { bg: '#FEF3C7', text: '#B45309' },
  CLOSED:      { bg: '#F3F4F6', text: '#6B7280' },
  CANCELLED:   { bg: '#FEE2E2', text: '#DC2626' },
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true, month: 'short', day: 'numeric',
  })
}

function elapsed(from: string, to?: string | null): string {
  const ms = (to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function isActive(t: SupportTicketRead) {
  return (ACTIVE_STATUSES as string[]).includes(t.status)
}

// ── Monitor Ticket Card ────────────────────────────────────────────────────────

function TicketCard({ ticket, onClick }: { ticket: SupportTicketRead; onClick: () => void }) {
  const active = isActive(ticket)
  const { bg, text } = STATUS_STYLE[ticket.status]

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-[14px] border border-[#E5E7EB] bg-white p-4 flex flex-col gap-3 active:bg-[#F9FAFB] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[15px] font-bold text-[#111827] leading-tight truncate">
            {FAULT_LABEL[ticket.fault_type]}
            {ticket.classroom_name && (
              <span className="font-normal text-[#6B7280]"> · {ticket.classroom_name}</span>
            )}
          </span>
          {ticket.fault_description && (
            <span className="text-[12px] text-[#6B7280] line-clamp-2">{ticket.fault_description}</span>
          )}
        </div>
        <span
          className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: bg, color: text }}
        >
          {STATUS_LABEL[ticket.status]}
        </span>
      </div>

      <div className="flex flex-col gap-1 text-[12px] text-[#6B7280]">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[#374151] w-6">T0</span>
          <span>{fmt(ticket.t0_reported_at)}</span>
          {active && (
            <span className="ml-auto text-[#F59E0B] font-medium">{elapsed(ticket.t0_reported_at)} transcurridos</span>
          )}
        </div>
        {ticket.t1_accepted_at && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#374151] w-6">T1</span>
            <span>{fmt(ticket.t1_accepted_at)}</span>
            <span className="ml-auto text-[#6B7280]">
              respuesta en {elapsed(ticket.t0_reported_at, ticket.t1_accepted_at)}
            </span>
          </div>
        )}
        {ticket.t2_resolved_at && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#374151] w-6">T2</span>
            <span>{fmt(ticket.t2_resolved_at)}</span>
            <span className="ml-auto text-[#6B7280]">
              resuelto en {elapsed(ticket.t0_reported_at, ticket.t2_resolved_at)}
            </span>
          </div>
        )}
      </div>

      {ticket.resolution_note && (
        <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-2">
          <p className="text-[12px] font-semibold text-[#15803D] mb-0.5">Solución registrada</p>
          <p className="text-[12px] text-[#166534]">{ticket.resolution_note}</p>
        </div>
      )}

      {active && (
        <div className="flex items-center justify-end gap-1 text-[12px] font-semibold text-[#0A2463]">
          <span>Gestionar</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>
      )}
    </button>
  )
}

// ── Monitor View ───────────────────────────────────────────────────────────────

type MonitorTab = 'active' | 'all'

function MonitorView() {
  const router = useRouter()
  const [tickets, setTickets]       = useState<SupportTicketRead[]>([])
  const [tab, setTab]               = useState<MonitorTab>('active')
  const [loading, setLoading]       = useState(true)
  const [buildingId, setBuildingId] = useState<string | null>(null)
  const [toast, setToast]           = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null)

  const loadTickets = useCallback(async (bid: string) => {
    try {
      const data = await listTickets(bid)
      setTickets(data)
    } catch {
      setToast({ message: 'No se pudieron cargar los tickets.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      try {
        const raw = localStorage.getItem('active_session')
        if (raw) {
          const session = JSON.parse(raw) as { building_id: string }
          setBuildingId(session.building_id)
          void loadTickets(session.building_id)
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    })
  }, [loadTickets])

  const displayed = tab === 'active' ? tickets.filter(isActive) : tickets
  const activeCount = tickets.filter(isActive).length

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <div className="bg-white px-5 pt-5 pb-3 shrink-0">
        <span className="text-[18px] font-bold text-[#0A2463]">Tickets de soporte</span>
        {buildingId && (
          <p className="text-[12px] text-[#6B7280] mt-0.5">Edificio del turno activo</p>
        )}
        <div className="flex gap-2 mt-3">
          {(['active', 'all'] as MonitorTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
              style={{
                background: tab === t ? '#0A2463' : '#F3F4F6',
                color: tab === t ? '#fff' : '#6B7280',
              }}
            >
              {t === 'active'
                ? `Activos${activeCount > 0 ? ` (${activeCount})` : ''}`
                : `Todos (${tickets.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !buildingId ? (
          <div className="flex flex-col items-center gap-3 text-center px-8 py-16">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
            <span className="text-[15px] font-semibold text-[#6B7280]">Sin turno activo</span>
            <span className="text-[13px] text-[#9CA3AF]">Inicia un turno para ver los tickets de tu edificio.</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center px-8 py-16">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span className="text-[15px] font-semibold text-[#6B7280]">
              {tab === 'active' ? 'Sin tickets activos' : 'Sin tickets registrados'}
            </span>
            <span className="text-[13px] text-[#9CA3AF]">
              {tab === 'active' ? 'Todos los tickets están cerrados.' : 'No se han reportado fallas en este edificio.'}
            </span>
          </div>
        ) : (
          displayed.map(t => (
            <TicketCard key={t.id} ticket={t} onClick={() => router.push(`/support/${t.id}`)} />
          ))
        )}
      </div>

      <BottomNav tabs={MONITOR_TABS} />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={3500}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}

// ── Coordinator View ───────────────────────────────────────────────────────────

function CoordinatorView() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const buildingId = localStorage.getItem('building_id') ?? SEED_BUILDING_ID
      const data = await listTicketsForBuilding(buildingId, 'ESCALATED')
      startTransition(() => setTickets(data))
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { startTransition(() => { void load() }) }, [load])

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="bg-white px-5 pt-5 pb-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[20px] font-bold text-[#111827]">Soportes Escalados</h1>
          {tickets.length > 0 && (
            <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706]">
              {tickets.length} {tickets.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={load} className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F4F6] transition-colors" aria-label="Actualizar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
            </svg>
          </button>
          <button className="rounded-full p-2 text-[#6B7280] hover:bg-[#F3F4F6] transition-colors" aria-label="Notificaciones">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 h-[140px] animate-pulse" />
          ))
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-20">
            <div className="w-16 h-16 rounded-full bg-[#F5F3FF] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-[#374151]">Sin escalamientos</span>
            <span className="text-[13px] text-[#9CA3AF]">No hay tickets escalados en este momento.</span>
          </div>
        ) : (
          tickets.map(ticket => (
            <button
              key={ticket.id}
              onClick={() => router.push(`/support/${ticket.id}`)}
              className="w-full text-left rounded-2xl border border-[#E5E7EB] bg-white p-4 flex flex-col gap-3 active:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#9CA3AF]">{ticketId(ticket.id)}</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F5F3FF] text-[#7C3AED]">Escalado</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold text-[#111827] leading-snug">
                  {faultLabel(ticket.fault_type)}
                </span>
                <span className="text-[13px] text-[#6B7280] line-clamp-1">{ticket.fault_description}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Edificio SYRI
              </div>
              <div className="flex flex-col gap-1 border-t border-[#F3F4F6] pt-3">
                <TimelineItem dot="#9CA3AF" label={`Reportado · ${timeAgo(ticket.t0_reported_at)}`} />
                {ticket.t1_accepted_at && (
                  <TimelineItem dot="#F59E0B" label={`Atendido · ${timeAgo(ticket.t1_accepted_at)}`} />
                )}
                {ticket.escalated_at && (
                  <TimelineItem dot="#7C3AED" label={`Escalado a Coordinador · ${timeAgo(ticket.escalated_at)}`} />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <BottomNav tabs={COORDINATOR_TABS} />
    </div>
  )
}

function TimelineItem({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
      <span className="text-[12px] text-[#6B7280]">{label}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const { isCoordinator } = useAuth()
  return isCoordinator ? <CoordinatorView /> : <MonitorView />
}
