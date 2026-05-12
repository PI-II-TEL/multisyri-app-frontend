'use client'
import { useEffect, useState, useCallback, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav, { MONITOR_TABS, COORDINATOR_TABS } from '@/components/BottomNav'
import { listMyTickets, listTicketsForBuilding } from '@/services/support'
import type { SupportTicket, TicketStatus } from '@/types/support'
import { useAuth } from '@/contexts/AuthContext'

const SEED_BUILDING_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function statusLabel(status: TicketStatus, t0: string): { label: string; color: string; bg: string } {
  const ageMins = (Date.now() - new Date(t0).getTime()) / 60000
  if (status === 'OPEN') {
    if (ageMins > 15) return { label: 'Urgente',    color: '#DC2626', bg: '#FEF2F2' }
    return               { label: 'Pendiente',  color: '#D97706', bg: '#FFFBEB' }
  }
  if (status === 'IN_PROGRESS') return { label: 'En Atención', color: '#1565C0', bg: '#EFF6FF' }
  if (status === 'ESCALATED')   return { label: 'Escalado',    color: '#7C3AED', bg: '#F5F3FF' }
  if (status === 'CLOSED')      return { label: 'Cerrado',     color: '#6B7280', bg: '#F3F4F6' }
  return                                { label: 'Cancelado',  color: '#6B7280', bg: '#F3F4F6' }
}

function faultLabel(ft: string) {
  const map: Record<string, string> = { PROJECTOR: 'Proyector', PC: 'PC', SPEAKERS: 'Parlantes', OTHER: 'Otro' }
  return map[ft] ?? ft
}

// ── Ticket Card ────────────────────────────────────────────────────────────────

function TicketCard({ ticket, onClick }: { ticket: SupportTicket; onClick: () => void }) {
  const { label, color, bg } = statusLabel(ticket.status, ticket.t0_reported_at)
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-[#E5E7EB] bg-white p-4 flex flex-col gap-2 active:bg-[#F9FAFB] transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#9CA3AF]">{ticketId(ticket.id)}</span>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ color, background: bg }}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold text-[#111827] leading-snug line-clamp-2">
          {faultLabel(ticket.fault_type)} — {ticket.fault_description}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          Edificio SYRI
        </div>
        <div className="flex items-center gap-1 text-[12px] text-[#9CA3AF]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {timeAgo(ticket.t0_reported_at)}
        </div>
      </div>
    </button>
  )
}

// ── Monitor View ────────────────────────────────────────────────────────────────

type Tab = 'activos' | 'todos' | 'cerrados'

function MonitorView() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('activos')

  const load = useCallback(async () => {
    try {
      const data = await listMyTickets()
      startTransition(() => setTickets(data))
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = tickets.filter(t => {
    if (tab === 'activos')  return t.status === 'OPEN' || t.status === 'IN_PROGRESS'
    if (tab === 'cerrados') return t.status === 'CLOSED' || t.status === 'CANCELLED'
    return true
  })

  const activeCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[20px] font-bold text-[#111827]">Bandeja de Soportes</h1>
            {activeCount > 0 && (
              <span className="text-[13px] text-[#6B7280]">{activeCount} {activeCount === 1 ? 'ticket activo' : 'tickets activos'}</span>
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

        {/* Tabs */}
        <div className="flex rounded-xl bg-[#F3F4F6] p-1 gap-1">
          {(['activos', 'todos', 'cerrados'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all capitalize"
              style={{
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? '#0A2463' : '#6B7280',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {t === 'activos' ? 'Activos' : t === 'todos' ? 'Todos' : 'Cerrados'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 h-[100px] animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-20">
            <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-[#6B7280]">Sin tickets</span>
            <span className="text-[13px] text-[#9CA3AF]">
              {tab === 'activos' ? 'No tienes tickets activos en este momento.' : 'No hay tickets en esta categoría.'}
            </span>
          </div>
        ) : (
          filtered.map(t => (
            <TicketCard
              key={t.id}
              ticket={t}
              onClick={() => router.push(`/support/${t.id}`)}
            />
          ))
        )}
      </div>

      <BottomNav tabs={MONITOR_TABS} />
    </div>
  )
}

// ── Coordinator View (Soportes Escalados) ─────────────────────────────────────

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

  useEffect(() => { void load() }, [load])

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
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

      {/* List */}
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
              {/* Badge + ID */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#9CA3AF]">{ticketId(ticket.id)}</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F5F3FF] text-[#7C3AED]">Escalado</span>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold text-[#111827] leading-snug">
                  {faultLabel(ticket.fault_type)}
                </span>
                <span className="text-[13px] text-[#6B7280] line-clamp-1">{ticket.fault_description}</span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Edificio SYRI
              </div>

              {/* Timeline mini */}
              <div className="flex flex-col gap-1 border-t border-[#F3F4F6] pt-3">
                <TimelineItem
                  dot="#9CA3AF"
                  label={`Reportado · ${timeAgo(ticket.t0_reported_at)}`}
                />
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
