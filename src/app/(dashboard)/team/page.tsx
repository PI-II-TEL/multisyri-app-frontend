'use client'

import { useCallback, useEffect, startTransition, useState } from 'react'
import {
  getHoursDashboard,
  updateHoursThreshold,
  type MonitorHoursDashboardRow,
} from '@/services/users'

const COMPLIANCE_THRESHOLD = 80

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function TeamPage() {
  const now = new Date()
  const [year] = useState(now.getFullYear())
  const [month] = useState(now.getMonth() + 1)
  const [monitors, setMonitors] = useState<MonitorHoursDashboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingMonitor, setEditingMonitor] = useState<MonitorHoursDashboardRow | null>(null)
  const [thresholdInput, setThresholdInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHoursDashboard(year, month)
      startTransition(() => setMonitors(data))
    } catch {
      setError('No se pudo cargar el panel de horas.')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    startTransition(() => { void load() })
  }, [load])

  function openEdit(m: MonitorHoursDashboardRow) {
    setEditingMonitor(m)
    setThresholdInput(String(m.min_hours_threshold))
    setSaveError(null)
  }

  async function handleSaveThreshold() {
    if (!editingMonitor) return
    const value = parseFloat(thresholdInput)
    if (isNaN(value) || value < 0) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateHoursThreshold(editingMonitor.id, value)
      setEditingMonitor(null)
      void load()
    } catch {
      setSaveError('No se pudo actualizar el umbral. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const lowCount = monitors.filter(m => m.compliance_percentage < COMPLIANCE_THRESHOLD).length
  const okCount = monitors.length - lowCount

  return (
    <div className="flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[18px] font-bold text-[#0A2463]">Equipo y Horas</h1>
          <p className="text-[12px] text-[#6B7280]">Monitores activos del mes</p>
        </div>
        <button
          onClick={() => void load()}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-[#EFF6FF] text-[#1565C0] hover:bg-[#DBEAFE] transition-colors"
          aria-label="Actualizar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
        </button>
      </header>

      {/* Summary cards */}
      <div className="px-4 pb-3">
        <div className="flex gap-2.5">
          <div className="flex-1 flex flex-col gap-[3px] rounded-[10px] bg-[#F0FDF4] p-3">
            <span className="text-[10px] font-semibold text-[#16A34A] tracking-[0.8px]">EN META</span>
            <span className="text-[26px] font-bold text-[#15803D] leading-none">{okCount}</span>
            <span className="text-[11px] text-[#6B7280]">monitores</span>
          </div>
          <div className="flex-1 flex flex-col gap-[3px] rounded-[10px] bg-[#FFF7ED] p-3">
            <span className="text-[10px] font-semibold text-[#D97706] tracking-[0.8px]">HORAS BAJAS</span>
            <span className="text-[26px] font-bold text-[#B45309] leading-none">{lowCount}</span>
            <span className="text-[11px] text-[#6B7280]">por meta</span>
          </div>
          <div className="flex-1 flex flex-col gap-[3px] rounded-[10px] bg-[#F8F9FA] p-3">
            <span className="text-[10px] font-semibold text-[#9CA3AF] tracking-[0.8px]">TOTAL</span>
            <span className="text-[26px] font-bold text-[#0A2463] leading-none">{monitors.length}</span>
            <span className="text-[11px] text-[#6B7280]">monitores</span>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#9CA3AF]">MONITORES DEL MES</p>
      </div>

      {/* Monitor list */}
      <div className="px-4 flex flex-col gap-3 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 w-full">
              <span className="text-red-700 text-[13px]">{error}</span>
            </div>
            <button onClick={() => void load()} className="text-[13px] font-semibold text-[#0A2463] underline">
              Reintentar
            </button>
          </div>
        ) : monitors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="text-[15px] font-semibold text-[#6B7280]">Sin monitores registrados</span>
          </div>
        ) : (
          monitors.map(m => {
            const isLow = m.compliance_percentage < COMPLIANCE_THRESHOLD
            const pct = Math.min(100, Math.max(0, m.compliance_percentage))
            const initials = getInitials(m.name)
            return (
              <button
                key={m.id}
                onClick={() => openEdit(m)}
                className="flex flex-col gap-2.5 rounded-[12px] border-[1.5px] p-[14px] text-left transition-all active:opacity-70"
                style={{
                  borderColor: isLow ? '#FED7AA' : '#E5E7EB',
                  background: isLow ? '#FFFBF5' : '#FFFFFF',
                }}
              >
                {/* Top row: avatar + name + badge */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: isLow ? '#9CA3AF' : '#0A2463' }}
                  >
                    <span className="text-white text-[14px] font-bold">{initials}</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className="text-[15px] font-semibold text-[#111827] truncate">{m.name}</span>
                    <span className="text-[12px] text-[#6B7280] truncate">{m.email}</span>
                  </div>
                  <div
                    className="rounded-[10px] px-2.5 py-1 shrink-0"
                    style={{ background: isLow ? '#FEF3C7' : '#DCFCE7' }}
                  >
                    <span className="text-[11px] font-semibold" style={{ color: isLow ? '#D97706' : '#16A34A' }}>
                      {isLow ? 'Hrs bajas' : 'En meta'}
                    </span>
                  </div>
                </div>

                {/* Progress row */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6B7280]">Horas acumuladas</span>
                    <span className="text-[12px] font-semibold" style={{ color: isLow ? '#D97706' : '#111827' }}>
                      {m.hours_this_month.toFixed(1)}h / {m.min_hours_threshold.toFixed(0)}h
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: isLow ? '#F59E0B' : '#0A2463' }}
                    />
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* HU-06: Threshold edit bottom sheet */}
      {editingMonitor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setEditingMonitor(null)}>
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white px-5 pt-5 pb-10 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[16px] font-bold text-[#0A2463]">Umbral de horas</h2>
                <p className="text-[12px] text-[#6B7280]">{editingMonitor.name}</p>
              </div>
              <button
                onClick={() => setEditingMonitor(null)}
                className="p-1.5 rounded-full text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#374151]">
                Horas mínimas requeridas al mes
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-2.5">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={thresholdInput}
                  onChange={e => setThresholdInput(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] font-semibold text-[#111827] outline-none"
                  autoFocus
                />
                <span className="text-[13px] text-[#6B7280] shrink-0">horas</span>
              </div>
              <p className="text-[11px] text-[#9CA3AF]">
                Umbral actual: {editingMonitor.min_hours_threshold.toFixed(0)}h · Acumuladas: {editingMonitor.hours_this_month.toFixed(1)}h
              </p>
            </div>

            {saveError && (
              <p className="text-[13px] text-red-600">{saveError}</p>
            )}

            <button
              onClick={handleSaveThreshold}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-[#0A2463] text-white text-[15px] font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : 'Guardar cambio'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
