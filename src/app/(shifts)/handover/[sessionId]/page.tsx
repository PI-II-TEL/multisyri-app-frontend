'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { acknowledgeHandover } from '@/services/shifts'
import type { Handover, HandoverTicket } from '@/types/shift'
import type { ApiError } from '@/services/api'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const FAULT_LABEL: Record<string, string> = {
  PROJECTOR: 'Proyector',
  SPEAKERS: 'Parlantes',
  PC: 'PC',
  OTHER: 'Otro',
}

export default function HandoverPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const router = useRouter()
  const [handover, setHandover] = useState<Handover | null>(null)
  const [checkinAt, setCheckinAt] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('handover')
      const sess = localStorage.getItem('active_session')
      if (raw) setHandover(JSON.parse(raw))
      if (sess) setCheckinAt(JSON.parse(sess).checkin_at)
    } catch {}
  }, [])

  async function handleAcknowledge() {
    setAcknowledging(true)
    setError(null)
    try {
      await acknowledgeHandover(sessionId)
      router.push('/map')
    } catch (e) {
      const err = e as ApiError
      if (err.status === 409 || err.status === 404) {
        router.push('/map')
        return
      }
      setError(err.detail ?? 'Error al confirmar empalme')
      setAcknowledging(false)
    }
  }

  function renderTicketLabel(t: HandoverTicket) {
    const label = FAULT_LABEL[t.fault_type] ?? t.fault_type
    const room = t.classroom_name ?? 'Salón desconocido'
    return `${label} ${room}${t.fault_description ? ` – ${t.fault_description}` : ''}`
  }

  // Layout stack (bottom-up):
  // BottomNav:  fixed bottom-0,       height ~94px  (z-50)
  // CTA bar:    fixed bottom-[94px],  height ~90px  (z-40)
  // Total reserved bottom space: ~184px → pb-48 on scroll area

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav Bar */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
        <button onClick={() => router.push('/home')} className="p-0.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A2463" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span className="text-[17px] font-bold text-[#0A2463] flex-1">Empalme de Turno</span>
        {checkinAt && (
          <div className="rounded-[10px] bg-[#DCFCE7] px-3 py-1">
            <span className="text-[12px] font-semibold text-[#16A34A]">{formatTime(checkinAt)}</span>
          </div>
        )}
      </div>

      {/* Scrollable content — pb-48 clears CTA bar (~90px) + BottomNav (~94px) */}
      <div className="flex-1 overflow-y-auto px-5 pb-48 flex flex-col gap-5 pt-2">

        <div className="rounded-xl bg-[#EFF6FF] px-3.5 py-3.5 flex items-start gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-[13px] text-[#1565C0]">Revisa las novedades antes de asumir el turno</span>
        </div>

        {!handover || !handover.has_data ? (
          <div className="rounded-xl border border-[#E5E7EB] p-5 flex flex-col items-center gap-2 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="text-[14px] font-semibold text-[#6B7280]">Sin novedades del turno anterior</span>
            <span className="text-[13px] text-[#9CA3AF]">El turno anterior no registró actividades pendientes.</span>
          </div>
        ) : (
          <>
            {handover.closed_classrooms.length > 0 && (
              <>
                <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-[1px]">SALONES CERRADOS</span>
                <div className="flex flex-col gap-2">
                  {handover.closed_classrooms.map((c) => (
                    <div key={c.classroom_id} className="rounded-[10px] border border-[#E5E7EB] px-3.5 py-3 flex items-center gap-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <path d="M9 22V12h6v10"/>
                      </svg>
                      <span className="flex-1 text-[14px] font-semibold text-[#111827]">{c.classroom_name}</span>
                      <div className="rounded-[10px] bg-[#F3F4F6] px-2.5 py-0.5">
                        <span className="text-[11px] font-semibold text-[#6B7280]">Cerrado</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {handover.active_tickets.length > 0 && (
              <>
                <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-[1px]">FALLAS ACTIVAS</span>
                <div className="flex flex-col gap-2">
                  {handover.active_tickets.map((t) => (
                    <div key={t.ticket_id} className="rounded-[10px] bg-[#FFF5F5] border border-[#FEE2E2] px-3.5 py-3 flex items-center gap-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span className="flex-1 text-[14px] font-medium text-[#111827]">{renderTicketLabel(t)}</span>
                      <div className="rounded-[10px] bg-[#FEE2E2] px-2.5 py-0.5">
                        <span className="text-[11px] font-semibold text-[#DC2626]">Activa</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {handover.unresolved_observations.length > 0 && (
              <>
                <span className="text-[11px] font-semibold text-[#9CA3AF] tracking-[1px]">OBSERVACIONES</span>
                <div className="flex flex-col gap-2">
                  {handover.unresolved_observations.map((o) => (
                    <div key={o.classroom_id} className="rounded-[10px] bg-[#FAFAFA] border border-[#E5E7EB] p-3.5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span className="text-[12px] text-[#9CA3AF]">{o.classroom_name}</span>
                      </div>
                      {o.observation && (
                        <span className="text-[14px] text-[#374151] leading-[1.5]">{o.observation}</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {handover.previous_user_name && (
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="text-[12px] text-[#9CA3AF]">Monitor anterior: {handover.previous_user_name}</span>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <span className="text-red-700 text-[13px]">{error}</span>
          </div>
        )}
      </div>

      {/* CTA bar — sits above BottomNav (bottom-[94px]) */}
      <div className="fixed bottom-[94px] left-0 right-0 bg-white border-t border-[#F3F4F6] px-5 pt-3 pb-3 z-40">
        <button
          onClick={handleAcknowledge}
          disabled={acknowledging}
          className="w-full h-[54px] rounded-[14px] bg-[#0A2463] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {acknowledging ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          <span className="text-[16px] font-bold text-white">
            {acknowledging ? 'Confirmando...' : 'Recibido — Asumir Turno'}
          </span>
        </button>
      </div>

      {/* BottomNav — fixed bottom-0, z-50 */}
      <BottomNav />
    </div>
  )
}
