'use client'
import { useEffect, useState, useCallback, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { checkIn, getActiveSession } from '@/services/shifts'
import type { ShiftSession, CheckInResponse } from '@/types/shift'
import type { ApiError } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { logoutRequest } from '@/services/auth'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const SEED_BUILDING_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const SEED_SCHEDULE_SHIFT_ID = 'bbbbbbbb-0000-0000-0000-000000000001'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HomePage() {
  const router = useRouter()
  const { clearAuth } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [session, setSession] = useState<ShiftSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [hoursRecorded, setHoursRecorded] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        startTransition(() => {
          setUserName(u.name ?? '')
          setHoursRecorded(parseFloat(u.hours_recorded ?? '0'))
        })
      }
    } catch {}
  }, [])

  const loadSession = useCallback(async () => {
    try {
      const active = await getActiveSession()
      setSession(active)
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { startTransition(() => { void loadSession() }) }, [loadSession])

  async function handleCheckIn() {
    setChecking(true)
    setError(null)
    try {
      const building_id = localStorage.getItem('building_id') ?? SEED_BUILDING_ID
      const schedule_shift_id = localStorage.getItem('schedule_shift_id') ?? SEED_SCHEDULE_SHIFT_ID
      const res: CheckInResponse = await checkIn(building_id, schedule_shift_id)
      localStorage.setItem('active_session', JSON.stringify(res.session))
      localStorage.setItem('handover', JSON.stringify(res.handover))
      router.push(`/handover/${res.session.id}`)
    } catch (e) {
      const err = e as ApiError
      setError(err.detail ?? 'Error al iniciar turno')
      setChecking(false)
    }
  }

  async function handleLogout() {
    const refreshToken = localStorage.getItem('refresh_token')
    try {
      if (refreshToken) await logoutRequest(refreshToken)
    } catch {
      // Limpia la sesión local aunque el API falle
    } finally {
      clearAuth()
      router.push('/login')
    }
  }

  const hoursGoal = 40
  const pct = Math.min(100, Math.round((hoursRecorded / hoursGoal) * 100))

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header — natural top padding, no status bar gap */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-[18px] font-bold text-[#0A2463]">
            {userName ? `Hola, ${userName.split(' ')[0]}` : 'Hola'}
          </span>
          <span className="text-[13px] text-[#6B7280]">Monitor · Edificio A</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="rounded-full p-1.5 text-[#6B7280] hover:bg-red-50 hover:text-red-500 transition-colors"
            aria-label="Cerrar sesión"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content — pb accounts for BottomNav (~94px) */}
      <div className="flex-1 overflow-y-auto px-5 pb-28 flex flex-col gap-4 pt-1">

        {loading ? (
          <div className="rounded-2xl bg-[#0A2463] p-6 flex items-center justify-center h-[120px]">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : session ? (
          <div className="rounded-2xl bg-[#0A2463] p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[20px] font-bold">Turno Activo</span>
                <span className="text-[#93C5FD] text-[13px]">Iniciado a las {formatTime(session.checkin_at)}</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/map')}
              className="w-full mt-1 py-2.5 rounded-xl bg-white text-[#0A2463] text-[15px] font-bold"
            >
              Ver Mapa y Finalizar Turno
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0A2463] p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3.5 w-full">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[22px] font-bold leading-tight">Iniciar Turno</span>
                <span className="text-[#93C5FD] text-[13px]">Toca para registrar tu entrada</span>
              </div>
            </div>
            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-400/50 px-3 py-2">
                <span className="text-red-200 text-[13px]">{error}</span>
              </div>
            )}
            <button
              onClick={handleCheckIn}
              disabled={checking}
              className="w-full mt-1 py-3 rounded-xl bg-white text-[#0A2463] text-[16px] font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {checking
                ? <><div className="w-4 h-4 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" /> Iniciando...</>
                : 'Registrar Entrada'
              }
            </button>
          </div>
        )}

        <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-[1px]">HORAS DEL MES</span>
        <div className="rounded-xl border border-[#E5E7EB] p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-[#6B7280]">Horas acumuladas</span>
            <span className="text-[14px] font-bold text-[#111827]">{hoursRecorded.toFixed(1)}h / {hoursGoal}h</span>
          </div>
          <div className="rounded w-full h-2 bg-[#F3F4F6] overflow-hidden">
            <div className="h-2 rounded bg-[#0A2463] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#6B7280]">Meta mensual</span>
            <span className="text-[13px] font-semibold text-[#16A34A]">{pct}% completado</span>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-[1px]">PRÓXIMO TURNO</span>
        <div className="rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div className="flex flex-col gap-0.5">
            {session ? (
              <>
                <span className="text-[14px] font-semibold text-[#111827]">Turno en curso</span>
                <span className="text-[13px] text-[#6B7280]">Iniciado: {formatDate(session.checkin_at)}</span>
              </>
            ) : (
              <>
                <span className="text-[14px] font-semibold text-[#111827]">Ver turnos programados</span>
                <span className="text-[13px] text-[#6B7280]">Edificio A · Según horario asignado</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BottomNav is fixed at bottom-0, height ~94px */}
      <BottomNav />
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Cerrar sesión"
        description="¿Estás seguro de que quieres cerrar sesión?"
        confirmLabel="Cerrar sesión"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}
