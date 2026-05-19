'use client'

import { useCallback, useEffect, useState, startTransition, use } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast } from '@/components/Toast'
import { getSessionDetail, updateCoordinatorNote, forceCloseSession } from '@/services/shifts'
import type { ApiError } from '@/services/api'
import type { ShiftSessionSummary } from '@/types/shift'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: string): { label: string; color: string; bg: string } {
  if (status === 'ACTIVE')      return { label: 'Activo',         color: '#15803D', bg: '#DCFCE7' }
  if (status === 'CLOSED')      return { label: 'Cerrado',        color: '#6B7280', bg: '#F3F4F6' }
  if (status === 'FORCE_CLOSED') return { label: 'Cierre Forzado', color: '#DC2626', bg: '#FEF2F2' }
  return { label: status, color: '#6B7280', bg: '#F3F4F6' }
}

// ── Inline Dialog ──────────────────────────────────────────────────────────────

interface TextDialogProps {
  title: string
  description?: string
  placeholder: string
  confirmLabel: string
  confirmColor?: string
  onConfirm: (text: string) => Promise<void>
  onCancel: () => void
}

function TextDialog({
  title, description, placeholder, confirmLabel, confirmColor = '#DC2626', onConfirm, onCancel,
}: TextDialogProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleConfirm() {
    if (!text.trim()) return
    setLoading(true)
    setErr(null)
    try {
      await onConfirm(text.trim())
    } catch (e) {
      setErr((e as ApiError).detail ?? 'Error al realizar la acción')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#111827]">{title}</h3>
            {description && <p className="text-[13px] text-[#6B7280] mt-0.5">{description}</p>}
          </div>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[14px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#0A2463] focus:bg-white transition-colors"
        />

        {err && (
          <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[14px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors"
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

// ── Page ───────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ sessionId: string }>
}

export default function RelayDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { sessionId } = use(params)

  const [session, setSession] = useState<ShiftSessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showForceClose, setShowForceClose] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSessionDetail(sessionId)
      startTransition(() => {
        setSession(data)
        setNoteDraft(data.coordinator_note ?? '')
      })
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.detail ?? 'No se pudo cargar la sesión.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    startTransition(() => { void load() })
  }, [load])

  async function handleSaveNote() {
    setSavingNote(true)
    try {
      const updated = await updateCoordinatorNote(sessionId, noteDraft)
      setSession(updated)
      setToast({ message: 'Nota guardada.', variant: 'success' })
    } catch (err) {
      const apiErr = err as ApiError
      setToast({ message: apiErr.detail ?? 'No se pudo guardar la nota.', variant: 'error' })
    } finally {
      setSavingNote(false)
    }
  }

  // HU-24: Force-close
  async function handleForceClose(reason: string) {
    const updated = await forceCloseSession(sessionId, reason)
    startTransition(() => {
      setSession(updated)
      setNoteDraft(updated.coordinator_note ?? '')
    })
    setShowForceClose(false)
    setToast({ message: 'Turno cerrado forzosamente. Acción registrada en auditoría.', variant: 'success' })
  }

  const st = session ? statusLabel(session.status) : null

  return (
    <div className="flex flex-col">
      <header className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100"
          aria-label="Volver"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-bold text-[#0A2463]">Detalle del turno</h1>
          <p className="text-xs text-[#6B7280]">Trazabilidad de relevo</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A2463] border-t-transparent" />
          </div>
        ) : error || !session ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-700">{error ?? 'Sesión no encontrada.'}</p>
          </div>
        ) : (
          <>
            {/* Main info card */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-4">
              <div className="flex items-center gap-2 flex-wrap">
                {session.is_relay && (
                  <span className="rounded-lg bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#D97706]">
                    Relevo
                  </span>
                )}
                {st && (
                  <span
                    className="rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                    style={{ color: st.color, background: st.bg }}
                  >
                    {st.label}
                  </span>
                )}
              </div>

              <p className="text-[16px] font-bold text-[#0A2463]">{session.user_name}</p>
              {session.original_user_name && (
                <p className="text-[13px] text-[#6B7280]">
                  Cubrió el turno de {session.original_user_name}
                </p>
              )}
              <p className="text-[12px] text-[#6B7280]">{session.building_name}</p>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
                <div>
                  <p className="text-[#9CA3AF]">Inicio</p>
                  <p className="font-semibold text-[#111827]">{formatDate(session.checkin_at)}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF]">Fin</p>
                  <p className="font-semibold text-[#111827]">{formatDate(session.checkout_at)}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF]">Estado</p>
                  <p className="font-semibold text-[#111827]">{session.status}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF]">Duración</p>
                  <p className="font-semibold text-[#111827]">
                    {session.duration_hours !== null ? `${session.duration_hours.toFixed(2)} h` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* HU-24: Force-close action — only when session is ACTIVE */}
            {session.status === 'ACTIVE' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <path d="m10.29 3.86-8.2 14.2A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .91-1.44l-8.2-14.2a1 1 0 0 0-1.82 0Z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div>
                    <p className="text-[13px] font-bold text-red-700">Acciones administrativas</p>
                    <p className="text-[12px] text-red-600 mt-0.5">
                      El turno está activo. Si el monitor olvidó cerrarlo, usa el cierre forzado.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForceClose(true)}
                  className="w-full py-2.5 rounded-xl bg-red-600 text-[14px] font-bold text-white flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  Cierre Forzado de Turno
                </button>
              </div>
            )}

            {/* Force-closed notice */}
            {session.status === 'FORCE_CLOSED' && session.coordinator_note && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-red-500 mb-1">Motivo del cierre forzado</p>
                <p className="text-[13px] text-red-700">{session.coordinator_note}</p>
              </div>
            )}

            {/* Coordinator note */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
                Nota del coordinador
              </p>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                className="resize-none rounded-xl border border-[#E5E7EB] p-3 text-[13px] text-[#111827] outline-none focus:border-[#0A2463] transition-colors"
                placeholder="Añade una observación para el turno…"
              />
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0A2463] py-2.5 text-[14px] font-bold text-white disabled:opacity-60"
              >
                {savingNote ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Guardar nota'
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* HU-24: Force-close dialog */}
      {showForceClose && (
        <TextDialog
          title="Cierre Forzado de Turno"
          description="Esta acción cerrará el turno y quedará registrada en el log de auditoría como acción administrativa."
          placeholder="Motivo del cierre forzado (requerido)…"
          confirmLabel="Forzar Cierre"
          confirmColor="#DC2626"
          onConfirm={handleForceClose}
          onCancel={() => setShowForceClose(false)}
        />
      )}

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
