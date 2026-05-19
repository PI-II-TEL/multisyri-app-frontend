'use client'

import { useCallback, useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getAuditLogs } from '@/services/audit'
import type { AuditLog, AuditAction } from '@/services/audit'
import type { ApiError } from '@/services/api'

// ── Category mapping ───────────────────────────────────────────────────────────

type LogCategory = 'SEGURIDAD' | 'ADMIN' | 'TURNO' | 'TICKET' | 'SISTEMA'

const CATEGORY_STYLE: Record<LogCategory, { color: string; bg: string }> = {
  SEGURIDAD: { color: '#DC2626', bg: '#FEF2F2' },
  ADMIN:     { color: '#1565C0', bg: '#EFF6FF' },
  TURNO:     { color: '#16A34A', bg: '#F0FDF4' },
  TICKET:    { color: '#D97706', bg: '#FFFBEB' },
  SISTEMA:   { color: '#6B7280', bg: '#F3F4F6' },
}

function actionCategory(action: AuditAction): LogCategory {
  if (action === 'ACCOUNT_LOCKED') return 'SEGURIDAD'
  if (action === 'SHIFT_FORCE_CLOSED') return 'TURNO'
  if (action === 'TICKET_CANCELLED') return 'TICKET'
  if (['MANUAL_SHIFT_APPROVED', 'MANUAL_SHIFT_REJECTED'].includes(action)) return 'SISTEMA'
  return 'ADMIN'
}

function actionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    USER_CREATED: 'Usuario creado',
    USER_DEACTIVATED: 'Usuario desactivado',
    ROLE_ASSIGNED: 'Rol asignado',
    SHIFT_FORCE_CLOSED: 'Cierre Forzado de Turno ejecutado',
    TICKET_CANCELLED: 'Ticket anulado por administrador',
    MANUAL_SHIFT_APPROVED: 'Turno Omitido aprobado',
    MANUAL_SHIFT_REJECTED: 'Turno Omitido rechazado',
    BUILDING_CREATED: 'Edificio creado',
    CLASSROOM_CREATED: 'Salón creado',
    HOURS_THRESHOLD_UPDATED: 'Umbral de horas actualizado',
    ACCOUNT_LOCKED: 'Cuenta bloqueada (intentos fallidos)',
  }
  return labels[action] ?? action
}

function actionDetail(log: AuditLog): string {
  const d = log.detail ?? {}
  if (log.action === 'SHIFT_FORCE_CLOSED') {
    const parts = []
    if (log.actor_name) parts.push(`Por: ${log.actor_name}`)
    if (d.reason) parts.push(`Motivo: ${d.reason}`)
    return parts.join(' · ')
  }
  if (log.action === 'TICKET_CANCELLED') {
    const parts = []
    if (log.actor_name) parts.push(`Por: ${log.actor_name}`)
    if (d.reason) parts.push(`Motivo: ${d.reason}`)
    return parts.join(' · ')
  }
  if (log.action === 'ACCOUNT_LOCKED') {
    return `Más de 5 intentos de login fallidos detectados`
  }
  if (log.actor_name) return `Por: ${log.actor_name}`
  return Object.entries(d).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) {
    return `Hoy · ${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Ayer · ${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

function CategoryBadge({ category }: { category: LogCategory }) {
  const { color, bg } = CATEGORY_STYLE[category]
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: bg }}
    >
      {category}
    </span>
  )
}

// ── Group logs by day ─────────────────────────────────────────────────────────

interface LogDay {
  label: string
  dateKey: string
  entries: AuditLog[]
}

function groupByDay(logs: AuditLog[]): LogDay[] {
  const map = new Map<string, AuditLog[]>()
  for (const log of logs) {
    const key = log.occurred_at.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(log)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, entries]) => ({
      dateKey: key,
      label: formatDate(entries[0].occurred_at),
      entries,
    }))
}

// ── Page ───────────────────────────────────────────────────────────────────────

const ACTION_OPTIONS: { value: AuditAction | ''; label: string }[] = [
  { value: '', label: 'Todas las acciones' },
  { value: 'SHIFT_FORCE_CLOSED', label: 'Cierre forzado de turno' },
  { value: 'TICKET_CANCELLED', label: 'Ticket anulado' },
  { value: 'USER_CREATED', label: 'Usuario creado' },
  { value: 'USER_DEACTIVATED', label: 'Usuario desactivado' },
  { value: 'ROLE_ASSIGNED', label: 'Rol asignado' },
  { value: 'MANUAL_SHIFT_APPROVED', label: 'Turno omitido aprobado' },
  { value: 'MANUAL_SHIFT_REJECTED', label: 'Turno omitido rechazado' },
  { value: 'BUILDING_CREATED', label: 'Edificio creado' },
  { value: 'CLASSROOM_CREATED', label: 'Salón creado' },
  { value: 'HOURS_THRESHOLD_UPDATED', label: 'Umbral de horas' },
  { value: 'ACCOUNT_LOCKED', label: 'Cuenta bloqueada' },
]

export default function AuditLogPage() {
  const router = useRouter()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        ...(filterAction ? { action: filterAction } : {}),
        ...(dateFrom ? { date_from: `${dateFrom}T00:00:00` } : {}),
        ...(dateTo ? { date_to: `${dateTo}T23:59:59` } : {}),
        limit: 200,
      }
      const data = await getAuditLogs(params)
      startTransition(() => setLogs(data))
    } catch (e) {
      setError((e as ApiError).detail ?? 'No se pudo cargar el log de auditoría.')
    } finally {
      setLoading(false)
    }
  }, [filterAction, dateFrom, dateTo])

  useEffect(() => {
    startTransition(() => { void load() })
  }, [load])

  const days = groupByDay(logs)

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-full w-9 h-9 flex items-center justify-center bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
            aria-label="Volver"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="flex flex-col gap-0">
            <h1 className="text-[18px] font-bold text-[#111827]">Log de Auditoría</h1>
            <p className="text-[12px] text-[#9CA3AF]">
              Registro inmutable de acciones
              {!loading && ` · ${logs.length} evento${logs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filtrar
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Acción</label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value as AuditAction | '')}
              className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827] bg-white"
            >
              {ACTION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] bg-white"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] bg-white"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setFilterAction('')
              setDateFrom('')
              setDateTo('')
            }}
            className="text-[13px] font-semibold text-[#6B7280] underline self-start"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Log */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
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
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            </svg>
            <span className="text-[15px] font-semibold text-[#6B7280]">Sin eventos registrados</span>
            <span className="text-[13px] text-[#9CA3AF]">El log de auditoría está vacío con estos filtros.</span>
          </div>
        ) : (
          days.map(day => (
            <div key={day.dateKey} className="flex flex-col gap-3">
              {/* Day label */}
              <span className="text-[11px] font-semibold tracking-[0.5px] text-[#9CA3AF] uppercase px-1">
                {day.label}
              </span>

              {/* Entries */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F3F4F6] overflow-hidden">
                {day.entries.map(log => {
                  const cat = actionCategory(log.action)
                  return (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3.5">
                      {/* Dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                        style={{ background: CATEGORY_STYLE[cat].color }}
                      />
                      {/* Content */}
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CategoryBadge category={cat} />
                          <span className="text-[11px] text-[#9CA3AF]">{formatTime(log.occurred_at)}</span>
                        </div>
                        <p className="text-[14px] font-semibold text-[#111827] leading-snug">
                          {actionLabel(log.action)}
                        </p>
                        <p className="text-[12px] text-[#6B7280]">{actionDetail(log)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Footer note */}
        {days.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            </svg>
            <span className="text-[12px] text-[#D1D5DB]">Registro inmutable · Solo lectura</span>
          </div>
        )}
      </div>
    </div>
  )
}
