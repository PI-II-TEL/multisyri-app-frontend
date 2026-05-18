'use client'

import { useCallback, useEffect, useState, startTransition, use } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast } from '@/components/Toast'
import { getSessionDetail, updateCoordinatorNote } from '@/services/shifts'
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
    startTransition(() => {
      void load()
    })
  }, [load])

  async function handleSaveNote() {
    setSavingNote(true)
    try {
      const updated = await updateCoordinatorNote(sessionId, noteDraft)
      setSession(updated)
      setToast({ message: 'Nota guardada.', variant: 'success' })
    } catch (err) {
      const apiErr = err as ApiError
      setToast({
        message: apiErr.detail ?? 'No se pudo guardar la nota.',
        variant: 'error',
      })
    } finally {
      setSavingNote(false)
    }
  }

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
            <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-4">
              {session.is_relay && (
                <span className="w-fit rounded-lg bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#D97706]">
                  Relevo
                </span>
              )}
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

            <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
                Nota del coordinador
              </p>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                className="resize-none rounded-xl border border-[#E5E7EB] p-3 text-[13px] text-[#111827]"
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

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={2500}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
