'use client'

import { useCallback, useEffect, useState, startTransition } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { useRouter } from 'next/navigation'
import {
  getTicketHistory,
  getBuildingMetrics,
  getMonitorMetrics,
} from '@/services/support'
import type { SupportTicket } from '@/types/support'
import type { BuildingMetrics, MonitorMetrics } from '@/services/support'
import { getBuildings } from '@/services/buildings'
import { listUsers } from '@/services/users'
import type { Building } from '@/types/buildings'
import type { ApiError } from '@/services/api'

// ── Helpers ────────────────────────────────────────────────────────────────────

type FaultType = 'PROJECTOR' | 'PC' | 'SPEAKERS' | 'OTHER'
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'CLOSED' | 'CANCELLED'
type Tab = 'history' | 'buildings' | 'monitors'

const SLA_MINUTES = 20 // default; matches backend TICKET_SLA_RESPONSE_MINUTES

function faultLabel(ft: string) {
  const map: Record<string, string> = { PROJECTOR: 'Proyector', PC: 'PC', SPEAKERS: 'Parlantes', OTHER: 'Otro' }
  return map[ft] ?? ft
}

function statusMeta(s: string): { label: string; color: string; bg: string } {
  const m: Record<string, { label: string; color: string; bg: string }> = {
    OPEN:        { label: 'Abierto',     color: '#D97706', bg: '#FFFBEB' },
    IN_PROGRESS: { label: 'En Atención', color: '#1565C0', bg: '#EFF6FF' },
    ESCALATED:   { label: 'Escalado',    color: '#7C3AED', bg: '#F5F3FF' },
    CLOSED:      { label: 'Cerrado',     color: '#16A34A', bg: '#F0FDF4' },
    CANCELLED:   { label: 'Anulado',     color: '#9CA3AF', bg: '#F3F4F6' },
  }
  return m[s] ?? { label: s, color: '#6B7280', bg: '#F3F4F6' }
}

function minutesDiff(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000
}

function formatMin(m: number | null): string {
  if (m === null) return '—'
  const h = Math.floor(m / 60)
  const min = Math.round(m % 60)
  return h > 0 ? `${h}h ${min}m` : `${min} min`
}

function formatDt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function shortId(id: string) {
  return `#TK-${id.slice(0, 4).toUpperCase()}`
}

// ── Ticket row ─────────────────────────────────────────────────────────────────

interface User { id: string; name: string }

function TicketRow({ ticket, usersMap }: { ticket: SupportTicket; usersMap: Record<string, string> }) {
  const responseMin = minutesDiff(ticket.t0_reported_at, ticket.t1_accepted_at)
  const resolutionMin = minutesDiff(ticket.t0_reported_at, ticket.t2_resolved_at)
  const slaBreached = responseMin !== null && responseMin > SLA_MINUTES

  const st = statusMeta(ticket.status)

  return (
    <div
      className="rounded-xl border p-3.5 flex flex-col gap-2 bg-white"
      style={{ borderColor: slaBreached ? '#FCA5A5' : '#E5E7EB', background: slaBreached ? '#FFF5F5' : 'white' }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-[#9CA3AF]">{shortId(ticket.id)}</span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: st.color, background: st.bg }}
          >
            {st.label}
          </span>
          {slaBreached && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-red-600 bg-red-100 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              ANS Incumplido
            </span>
          )}
        </div>
        <span className="text-[12px] font-medium text-[#374151]">{faultLabel(ticket.fault_type)}</span>
      </div>

      {/* Description */}
      <p className="text-[13px] text-[#374151] line-clamp-2">{ticket.fault_description}</p>

      {/* Times grid */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-[#9CA3AF] font-medium">T0 — Reporte</p>
          <p className="font-semibold text-[#374151]">{formatDt(ticket.t0_reported_at)}</p>
        </div>
        <div>
          <p className="text-[#9CA3AF] font-medium">T1 — Atención</p>
          <p className={`font-semibold ${slaBreached ? 'text-red-600' : 'text-[#374151]'}`}>
            {formatDt(ticket.t1_accepted_at)}
          </p>
        </div>
        <div>
          <p className="text-[#9CA3AF] font-medium">T2 — Cierre</p>
          <p className="font-semibold text-[#374151]">{formatDt(ticket.t2_resolved_at)}</p>
        </div>
      </div>

      {/* Response / resolution times */}
      <div className="flex gap-3 text-[11px]">
        <span className={`font-semibold ${slaBreached ? 'text-red-600' : 'text-[#374151]'}`}>
          Respuesta: {formatMin(responseMin)}
          {slaBreached && ` (límite ${SLA_MINUTES} min)`}
        </span>
        <span className="text-[#6B7280]">·</span>
        <span className="text-[#374151]">Resolución total: {formatMin(resolutionMin)}</span>
      </div>

      {/* Classroom + Monitor */}
      <div className="flex gap-3 text-[11px] text-[#9CA3AF] flex-wrap">
        {ticket.classroom_name && (
          <span>Salón: <span className="font-medium text-[#6B7280]">{ticket.classroom_name}</span></span>
        )}
        {ticket.assigned_to && (
          <span>Monitor: <span className="font-medium text-[#6B7280]">{usersMap[ticket.assigned_to] ?? ticket.assigned_to.slice(0, 8)}</span></span>
        )}
      </div>
    </div>
  )
}

// ── Metrics tabs ────────────────────────────────────────────────────────────────

const CHART_COLORS = { respuesta: '#3B82F6', resolucion: '#0A2463', sla: '#EF4444' }

function TooltipMinutes({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-md text-[12px]">
      <p className="font-semibold text-[#111827] mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'respuesta' ? 'T. Respuesta' : 'T. Resolución'}: {p.value} min
        </p>
      ))}
    </div>
  )
}

function TooltipMonitor({
  active, payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { name: string } }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-md text-[12px]">
      <p className="font-semibold text-[#111827] mb-0.5">{payload[0].payload.name}</p>
      <p className="text-[#0A2463]">T. Respuesta: {payload[0].value} min</p>
    </div>
  )
}

function BuildingMetricsTab({ metrics }: { metrics: BuildingMetrics[] }) {
  if (metrics.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-2 text-center">
        <span className="text-[15px] font-semibold text-[#6B7280]">Sin datos de métricas</span>
        <span className="text-[13px] text-[#9CA3AF]">Aún no hay tickets resueltos.</span>
      </div>
    )
  }

  const chartData = metrics.map(m => ({
    name: m.building_name.length > 14 ? m.building_name.slice(0, 14) + '…' : m.building_name,
    respuesta: m.avg_response_minutes !== null ? +m.avg_response_minutes.toFixed(1) : 0,
    resolucion: m.avg_resolution_minutes !== null ? +m.avg_resolution_minutes.toFixed(1) : 0,
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* Grouped bar chart */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-3">
          Tiempos promedio por edificio (min)
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} unit=" min" />
            <Tooltip content={<TooltipMinutes />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(val) => (
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  {val === 'respuesta' ? 'T. Respuesta' : 'T. Resolución'}
                </span>
              )}
            />
            <ReferenceLine
              y={SLA_MINUTES}
              stroke={CHART_COLORS.sla}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: `ANS ${SLA_MINUTES}m`, position: 'insideTopRight', fontSize: 10, fill: CHART_COLORS.sla }}
            />
            <Bar dataKey="respuesta" fill={CHART_COLORS.respuesta} radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="resolucion" fill={CHART_COLORS.resolucion} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-building stat cards */}
      {metrics.map(m => (
        <div key={String(m.building_id)} className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#F8F9FA] border-b border-[#E5E7EB]">
            <span className="text-[14px] font-bold text-[#0A2463]">{m.building_name}</span>
            <span className="text-[12px] font-medium text-[#6B7280]">{m.total_tickets} tickets</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#F3F4F6]">
            <div className="p-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">T. Respuesta</span>
              <span
                className="text-[18px] font-bold"
                style={{ color: (m.avg_response_minutes ?? 0) > SLA_MINUTES ? '#EF4444' : CHART_COLORS.respuesta }}
              >
                {formatMin(m.avg_response_minutes)}
              </span>
              {(m.avg_response_minutes ?? 0) > SLA_MINUTES && (
                <span className="text-[10px] text-red-500 font-semibold">⚠ ANS incumplido</span>
              )}
            </div>
            <div className="p-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">T. Resolución</span>
              <span className="text-[18px] font-bold text-[#0A2463]">{formatMin(m.avg_resolution_minutes)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#F3F4F6] border-t border-[#F3F4F6]">
            <div className="p-3 flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Escalados</span>
              <span className="text-[20px] font-bold text-[#7C3AED]">{m.escalated_count}</span>
            </div>
            <div className="p-3 flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">ANS Incumplidos</span>
              <span className={`text-[20px] font-bold ${m.sla_breached_count > 0 ? 'text-red-600' : 'text-[#16A34A]'}`}>
                {m.sla_breached_count}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MonitorMetricsTab({ metrics }: { metrics: MonitorMetrics[] }) {
  if (metrics.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-2 text-center">
        <span className="text-[15px] font-semibold text-[#6B7280]">Sin datos de métricas</span>
        <span className="text-[13px] text-[#9CA3AF]">Aún no hay tickets resueltos.</span>
      </div>
    )
  }

  const chartData = [...metrics]
    .sort((a, b) => (a.avg_response_minutes ?? 0) - (b.avg_response_minutes ?? 0))
    .map(m => ({
      name: m.monitor_name.split(' ')[0],
      respuesta: m.avg_response_minutes !== null ? +m.avg_response_minutes.toFixed(1) : 0,
    }))

  const chartHeight = Math.max(100, metrics.length * 52)

  return (
    <div className="flex flex-col gap-3">
      {/* Horizontal bar chart */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF] mb-3">
          Comparativa T. Respuesta promedio (min)
        </p>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
            barCategoryGap="25%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              unit=" min"
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#374151' }}
              axisLine={false}
              tickLine={false}
              width={68}
            />
            <Tooltip content={<TooltipMonitor />} />
            <ReferenceLine
              x={SLA_MINUTES}
              stroke={CHART_COLORS.sla}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: 'ANS', position: 'top', fontSize: 10, fill: CHART_COLORS.sla }}
            />
            <Bar
              dataKey="respuesta"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.respuesta > SLA_MINUTES ? CHART_COLORS.sla : CHART_COLORS.resolucion} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Individual ranking cards */}
      {metrics.map((m, i) => {
        const breached = (m.avg_response_minutes ?? 0) > SLA_MINUTES
        return (
          <div key={String(m.monitor_id)} className="rounded-xl border border-[#E5E7EB] bg-white p-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
              style={{ background: '#0A2463' }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#111827] truncate">{m.monitor_name}</p>
              <p className="text-[12px] text-[#6B7280]">{m.total_tickets} tickets atendidos</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-[#9CA3AF]">T. Respuesta</p>
              <p className={`text-[15px] font-bold ${breached ? 'text-red-600' : 'text-[#0A2463]'}`}>
                {formatMin(m.avg_response_minutes)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TicketHistoryPage() {
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('history')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [bldMetrics, setBldMetrics] = useState<BuildingMetrics[]>([])
  const [monMetrics, setMonMetrics] = useState<MonitorMetrics[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterFault, setFilterFault] = useState<FaultType | ''>('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | ''>('')
  const [filterMonitor, setFilterMonitor] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const usersMap: Record<string, string> = Object.fromEntries(users.map(u => [u.id, u.name]))

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        ...(filterBuilding ? { building_id: filterBuilding } : {}),
        ...(filterFault ? { fault_type: filterFault } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterMonitor ? { assigned_to: filterMonitor } : {}),
        ...(dateFrom ? { date_from: `${dateFrom}T00:00:00` } : {}),
        ...(dateTo ? { date_to: `${dateTo}T23:59:59` } : {}),
      }

      const [tData, bData, mData, bldData, usrData] = await Promise.allSettled([
        getTicketHistory(params),
        getBuildingMetrics(),
        getMonitorMetrics(),
        getBuildings(),
        listUsers(),
      ])

      startTransition(() => {
        if (tData.status === 'fulfilled') setTickets(tData.value)
        if (bData.status === 'fulfilled') setBldMetrics(bData.value)
        if (mData.status === 'fulfilled') setMonMetrics(mData.value)
        if (bldData.status === 'fulfilled') setBuildings(bldData.value)
        if (usrData.status === 'fulfilled') setUsers(usrData.value as User[])
      })
    } catch (e) {
      setError((e as ApiError).detail ?? 'Error al cargar el historial.')
    } finally {
      setLoading(false)
    }
  }, [filterBuilding, filterFault, filterStatus, filterMonitor, dateFrom, dateTo])

  useEffect(() => {
    startTransition(() => { void loadAll() })
  }, [loadAll])

  const slaBreachedCount = tickets.filter(t => {
    const m = minutesDiff(t.t0_reported_at, t.t1_accepted_at)
    return m !== null && m > SLA_MINUTES
  }).length

  const TAB_LABELS: Record<Tab, string> = {
    history:  'Historial',
    buildings: 'Por Edificio',
    monitors:  'Por Monitor',
  }

  return (
    <div
      className="min-h-screen bg-[#F9FAFB] flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-0 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="rounded-full w-9 h-9 flex items-center justify-center bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
            aria-label="Volver"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-bold text-[#111827]">Historial de Tickets</h1>
            <p className="text-[12px] text-[#9CA3AF]">ANS y métricas de soporte · HU-18</p>
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

        {/* Tab bar */}
        <div className="flex border-b border-[#E5E7EB]">
          {(['history', 'buildings', 'monitors'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-[13px] font-semibold transition-colors"
              style={{
                color: tab === t ? '#0A2463' : '#9CA3AF',
                borderBottom: tab === t ? '2px solid #0A2463' : '2px solid transparent',
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Edificio</label>
              <select
                value={filterBuilding}
                onChange={e => setFilterBuilding(e.target.value)}
                className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827] bg-white"
              >
                <option value="">Todos</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Tipo de Falla</label>
              <select
                value={filterFault}
                onChange={e => setFilterFault(e.target.value as FaultType | '')}
                className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827] bg-white"
              >
                <option value="">Todos</option>
                <option value="PROJECTOR">Proyector</option>
                <option value="PC">PC</option>
                <option value="SPEAKERS">Parlantes</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Estado</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as TicketStatus | '')}
                className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827] bg-white"
              >
                <option value="">Todos</option>
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En Atención</option>
                <option value="ESCALATED">Escalado</option>
                <option value="CLOSED">Cerrado</option>
                <option value="CANCELLED">Anulado</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Monitor</label>
              <select
                value={filterMonitor}
                onChange={e => setFilterMonitor(e.target.value)}
                className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827] bg-white"
              >
                <option value="">Todos</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
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
              setFilterBuilding('')
              setFilterFault('')
              setFilterStatus('')
              setFilterMonitor('')
              setDateFrom('')
              setDateTo('')
            }}
            className="text-[13px] font-semibold text-[#6B7280] underline self-start"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        ) : tab === 'history' ? (
          <>
            {/* Summary strip */}
            {tickets.length > 0 && (
              <div className="rounded-xl bg-white border border-[#E5E7EB] px-4 py-3 flex items-center gap-0">
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Total</span>
                  <span className="text-[18px] font-bold text-[#0A2463]">{tickets.length}</span>
                </div>
                <div className="w-px h-10 bg-[#E5E7EB]" />
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">ANS Incumplido</span>
                  <span className="text-[18px] font-bold" style={{ color: slaBreachedCount > 0 ? '#DC2626' : '#16A34A' }}>
                    {slaBreachedCount}
                  </span>
                </div>
                <div className="w-px h-10 bg-[#E5E7EB]" />
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Cerrados</span>
                  <span className="text-[18px] font-bold text-[#16A34A]">
                    {tickets.filter(t => t.status === 'CLOSED').length}
                  </span>
                </div>
              </div>
            )}

            {tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
                <p className="text-[15px] font-semibold text-[#6B7280]">Sin tickets con estos filtros</p>
                <p className="text-[13px] text-[#9CA3AF]">Prueba ajustando los filtros o limpiándolos.</p>
              </div>
            ) : (
              tickets.map(t => (
                <TicketRow key={t.id} ticket={t} usersMap={usersMap} />
              ))
            )}
          </>
        ) : tab === 'buildings' ? (
          <BuildingMetricsTab metrics={bldMetrics} />
        ) : (
          <MonitorMetricsTab metrics={monMetrics} />
        )}
      </div>
    </div>
  )
}
