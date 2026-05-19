'use client'
import { useEffect, useState, useCallback, useRef, startTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import BottomNav, { MONITOR_TABS, COORDINATOR_TABS } from '@/components/BottomNav'
import { getTicket, acceptTicket, escalateTicket, resolveTicket, cancelTicket } from '@/services/support'
import type { SupportTicket } from '@/types/support'
import { useAuth } from '@/contexts/AuthContext'
import type { ApiError } from '@/services/api'

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

function formatHHMMSS(ms: number): string {
  const s = Math.floor(ms / 1000)
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function faultLabel(ft: string) {
  const map: Record<string, string> = { PROJECTOR: 'Proyector', PC: 'PC', SPEAKERS: 'Parlantes', OTHER: 'Otro' }
  return map[ft] ?? ft
}

function ticketId(id: string) {
  return `#TK-${id.slice(0, 4).toUpperCase()}`
}

function urgencyBadge(status: string, t0: string) {
  const mins = (Date.now() - new Date(t0).getTime()) / 60000
  if (status === 'OPEN' && mins > 15) return { label: 'Urgente', color: '#DC2626', bg: '#FEF2F2' }
  if (status === 'IN_PROGRESS') return { label: 'En Atención', color: '#1565C0', bg: '#EFF6FF' }
  if (status === 'ESCALATED')   return { label: 'Escalado',    color: '#7C3AED', bg: '#F5F3FF' }
  if (status === 'CLOSED')      return { label: 'Cerrado',     color: '#6B7280', bg: '#F3F4F6' }
  return { label: 'Pendiente', color: '#D97706', bg: '#FFFBEB' }
}

// ── Inline Dialog ──────────────────────────────────────────────────────────────

interface ActionDialogProps {
  title: string
  placeholder: string
  confirmLabel: string
  confirmColor?: string
  onConfirm: (text: string) => Promise<void>
  onCancel: () => void
}

function ActionDialog({ title, placeholder, confirmLabel, confirmColor = '#0A2463', onConfirm, onCancel }: ActionDialogProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  async function handleConfirm() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(text.trim())
    } catch (e) {
      const err = e as ApiError
      setError(err.detail ?? 'Error al realizar la acción')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 flex flex-col gap-4">
        <h3 className="text-[17px] font-bold text-[#111827]">{title}</h3>
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[14px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#0A2463] focus:bg-white transition-colors"
        />
        {error && (
          <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[14px] font-semibold text-[#374151]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!text.trim() || loading}
            className="flex-1 py-3 rounded-xl text-[14px] font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: confirmColor }}
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Live Timer ─────────────────────────────────────────────────────────────────

interface LiveTimerProps {
  since: string | null   // t1_accepted_at
  until: string | null   // escalated_at or t2_resolved_at — freezes timer when set
  status: string
}

function LiveTimer({ since, until, status }: LiveTimerProps) {
  const frozen = until ?? null
  const [elapsed, setElapsed] = useState(() =>
    since ? (frozen ? new Date(frozen).getTime() - new Date(since).getTime() : Date.now() - new Date(since).getTime()) : 0
  )

  useEffect(() => {
    if (!since || frozen) return
    const id = setInterval(() => setElapsed(Date.now() - new Date(since).getTime()), 1000)
    return () => clearInterval(id)
  }, [since, frozen])

  const isRunning = since && !frozen
  const isDone    = status === 'CLOSED'
  const isEscalated = status === 'ESCALATED'

  const timerColor = isDone ? '#16A34A' : isEscalated ? '#7C3AED' : '#0A2463'
  const bg         = isDone ? '#F0FDF4' : isEscalated ? '#F5F3FF' : '#F9FAFB'
  const border     = isDone ? '#BBF7D0' : isEscalated ? '#DDD6FE' : '#E5E7EB'

  const label = isDone
    ? 'Tiempo total de atención'
    : isEscalated
    ? 'Tiempo hasta escalamiento'
    : 'Tiempo en Atención'

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col items-center gap-2"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[1px] uppercase" style={{ color: timerColor }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        {label}
      </div>
      <span className="text-[36px] font-bold tracking-wider font-mono" style={{ color: timerColor }}>
        {since ? formatHHMMSS(elapsed) : '00:00:00'}
      </span>
      {!since && (
        <span className="text-[12px] text-[#9CA3AF]">Toca &apos;Atender&apos; para iniciar</span>
      )}
      {frozen && isRunning === false && since && (
        <span className="text-[11px] font-medium" style={{ color: timerColor }}>
          {isDone ? 'Ticket cerrado' : 'Escalado — en manos del coordinador'}
        </span>
      )}
    </div>
  )
}

// ── Timeline (coordinator view) ────────────────────────────────────────────────

function Timeline({ ticket }: { ticket: SupportTicket }) {
  const steps = [
    { label: 'Ticket reportado', time: ticket.t0_reported_at, dot: '#9CA3AF', active: true },
    { label: 'Atendido',         time: ticket.t1_accepted_at, dot: '#F59E0B', active: !!ticket.t1_accepted_at },
    { label: 'Escalado a Coordinador', time: ticket.escalated_at, dot: '#7C3AED', active: !!ticket.escalated_at },
  ]
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 flex flex-col gap-0">
      <span className="text-[11px] font-semibold tracking-[1px] text-[#9CA3AF] uppercase mb-3">Historial</span>
      {steps.filter(s => s.active).map((step, i, arr) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: step.dot }} />
            {i < arr.length - 1 && <div className="w-px flex-1 my-1 bg-[#E5E7EB]" />}
          </div>
          <div className="pb-4">
            <p className="text-[14px] font-semibold text-[#111827]">{step.label}</p>
            {step.time && (
              <p className="text-[12px] text-[#9CA3AF]">{timeAgo(step.time)}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId_ = params?.ticketId as string
  const { isCoordinator } = useAuth()

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'escalate' | 'resolve' | 'reassign' | 'void' | null>(null)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getTicket(ticketId_)
      startTransition(() => setTicket(data))
    } catch {
      setError('No se pudo cargar el ticket.')
    } finally {
      setLoading(false)
    }
  }, [ticketId_])

  useEffect(() => { startTransition(() => { void load() }) }, [load])

  async function handleAccept() {
    if (!ticket) return
    setActing(true)
    setError(null)
    try {
      const updated = await acceptTicket(ticket.id)
      startTransition(() => setTicket(updated))
    } catch (e) {
      const err = e as ApiError
      setError(err.detail ?? 'Error al aceptar')
    } finally {
      setActing(false)
    }
  }

  async function handleEscalate(reason: string) {
    if (!ticket) return
    const updated = await escalateTicket(ticket.id, reason)
    setTicket(updated)
    setDialog(null)
  }

  async function handleResolve(note: string) {
    if (!ticket) return
    const updated = await resolveTicket(ticket.id, note)
    setTicket(updated)
    setDialog(null)
  }

  async function handleReassign(assignee: string) {
    if (!ticket) return
    const updated = await resolveTicket(
      ticket.id,
      `Reasignado a: ${assignee}. Requiere nueva asignación por el monitor indicado.`,
    )
    setTicket(updated)
    setDialog(null)
  }

  // HU-24: coordinator annuls a ticket — uses cancel endpoint with reason
  async function handleVoid(reason: string) {
    if (!ticket) return
    const updated = await cancelTicket(ticket.id, reason)
    setTicket(updated)
    setDialog(null)
  }

  const badge = ticket ? urgencyBadge(ticket.status, ticket.t0_reported_at) : null

  return (
    <>
      <div
        className="min-h-screen bg-[#F9FAFB] flex flex-col"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="bg-white px-4 pt-5 pb-4 flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="rounded-full w-9 h-9 flex items-center justify-center bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
            aria-label="Volver"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h1 className="text-[17px] font-bold text-[#111827]">Detalle del Ticket</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-36 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !ticket ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <span className="text-[15px] font-semibold text-[#6B7280]">Ticket no encontrado</span>
              <span className="text-[13px] text-[#9CA3AF]">{error}</span>
            </div>
          ) : (
            <>
              {/* Main card */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex flex-col gap-4">
                {/* ID + badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#9CA3AF]">{ticketId(ticket.id)}</span>
                  {badge && (
                    <span
                      className="text-[12px] font-bold px-3 py-1 rounded-full"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-[20px] font-bold text-[#111827] leading-snug">
                    {faultLabel(ticket.fault_type)} sin imagen
                  </h2>
                  <p className="text-[13px] text-[#6B7280] mt-1 flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    Edificio SYRI
                  </p>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Reportado</span>
                    <span className="text-[13px] font-medium text-[#374151]">{timeAgo(ticket.t0_reported_at)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Tipo</span>
                    <span className="text-[13px] font-medium text-[#374151]">{faultLabel(ticket.fault_type)}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Descripción</span>
                  <p className="text-[14px] text-[#374151] leading-relaxed">{ticket.fault_description}</p>
                </div>

                {/* Escalation reason (if escalated) */}
                {ticket.escalation_reason && (
                  <div className="rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] p-3 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#7C3AED] uppercase tracking-wide">Motivo de escalamiento</span>
                    <p className="text-[13px] text-[#5B21B6]">{ticket.escalation_reason}</p>
                  </div>
                )}

                {/* Resolution note (if closed) */}
                {ticket.resolution_note && (
                  <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-3 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#15803D] uppercase tracking-wide">Resolución</span>
                    <p className="text-[13px] text-[#166534]">{ticket.resolution_note}</p>
                  </div>
                )}
              </div>

              {/* Timeline (coordinator) or Timer (monitor) */}
              {isCoordinator
                ? <Timeline ticket={ticket} />
                : (
                  <LiveTimer
                    since={ticket.t1_accepted_at}
                    until={ticket.escalated_at ?? ticket.t2_resolved_at}
                    status={ticket.status}
                  />
                )
              }

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <span className="text-[13px] text-red-700">{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action bar */}
        {ticket && (
          <div className="fixed bottom-[78px] left-0 right-0 bg-white border-t border-[#F3F4F6] px-4 pt-3 pb-3 z-40 flex flex-col gap-2 max-w-2xl mx-auto">
            {isCoordinator ? (
              // Coordinator actions — HU-24
              ticket.status === 'OPEN' ? (
                // Can only cancel/void an OPEN ticket
                <button
                  onClick={() => setDialog('void')}
                  className="w-full h-[50px] rounded-2xl border border-red-200 bg-red-50 text-[15px] font-bold text-red-600 flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  Anular Ticket (Error de reporte)
                </button>
              ) : ticket.status === 'ESCALATED' || ticket.status === 'IN_PROGRESS' ? (
                <>
                  <button
                    onClick={() => setDialog('resolve')}
                    className="w-full h-[50px] rounded-2xl bg-[#0A2463] text-white text-[15px] font-bold flex items-center justify-center gap-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                    Resolver Ticket
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDialog('reassign')}
                      className="flex-1 h-[44px] rounded-2xl border border-[#E5E7EB] text-[14px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors"
                    >
                      Reasignar
                    </button>
                    <button
                      onClick={() => setDialog('void')}
                      className="flex-1 h-[44px] rounded-2xl border border-red-200 text-[14px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Anular
                    </button>
                  </div>
                </>
              ) : null
            ) : (
              // Monitor actions
              ticket.status === 'OPEN' ? (
                <button
                  onClick={handleAccept}
                  disabled={acting}
                  className="w-full h-[54px] rounded-2xl bg-[#0A2463] text-white text-[16px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {acting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Atender
                    </>
                  )}
                </button>
              ) : ticket.status === 'IN_PROGRESS' ? (
                <>
                  <button
                    onClick={() => setDialog('resolve')}
                    className="w-full h-[50px] rounded-2xl border border-[#E5E7EB] text-[15px] font-semibold text-[#374151] flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                    Cerrar Ticket
                  </button>
                  <button
                    onClick={() => setDialog('escalate')}
                    className="w-full h-[44px] rounded-2xl border border-red-200 text-[14px] font-semibold text-red-600 flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 19V5M5 12l7-7 7 7"/>
                    </svg>
                    Escalar
                  </button>
                </>
              ) : null
            )}
          </div>
        )}

        <BottomNav tabs={isCoordinator ? COORDINATOR_TABS : MONITOR_TABS} />
      </div>

      {/* Escalate dialog */}
      {dialog === 'escalate' && (
        <ActionDialog
          title="Escalar ticket"
          placeholder="Describe el motivo del escalamiento..."
          confirmLabel="Escalar"
          confirmColor="#7C3AED"
          onConfirm={handleEscalate}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* Resolve dialog */}
      {dialog === 'resolve' && (
        <ActionDialog
          title="Cerrar ticket"
          placeholder="Describe cómo se resolvió el problema..."
          confirmLabel="Cerrar Ticket"
          confirmColor="#0A2463"
          onConfirm={handleResolve}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* Reassign dialog */}
      {dialog === 'reassign' && (
        <ActionDialog
          title="Reasignar ticket"
          placeholder="Nombre del monitor al que se reasigna..."
          confirmLabel="Reasignar"
          confirmColor="#1565C0"
          onConfirm={handleReassign}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* Void dialog — HU-24: requires reason, calls cancelTicket */}
      {dialog === 'void' && (
        <ActionDialog
          title="Anular ticket"
          placeholder="Motivo de la anulación (ej: reportado por error)…"
          confirmLabel="Anular Ticket"
          confirmColor="#DC2626"
          onConfirm={handleVoid}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  )
}
