'use client'

import { useCallback, useEffect, useState, startTransition, use } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/Toast'
import {
  getManualReport,
  reviewManualReport,
} from '@/services/shifts'
import { listUsers, type UserRead } from '@/services/users'
import { getBuildings } from '@/services/buildings'
import type { ApiError } from '@/services/api'
import type { ManualShiftReport, ManualShiftReportReview } from '@/types/shift'
import type { Building } from '@/types/buildings'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function nowLocalIso(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  const tzOffset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const tzOffset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

function toIsoUtc(local: string): string {
  return new Date(local).toISOString()
}

interface PageProps {
  params: Promise<{ reportId: string }>
}

export default function ManualReportReviewPage({ params }: PageProps) {
  const router = useRouter()
  const { reportId } = use(params)

  const [report, setReport] = useState<ManualShiftReport | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [buildingName, setBuildingName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null)
  const [adjustedStart, setAdjustedStart] = useState('')
  const [adjustedEnd, setAdjustedEnd] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await getManualReport(reportId)
      const [users, blds] = await Promise.all([
        listUsers().catch(() => [] as UserRead[]),
        getBuildings().catch(() => [] as Building[]),
      ])
      startTransition(() => {
        setReport(r)
        setUserName(users.find((u) => u.id === r.user_id)?.name ?? '')
        setBuildingName(blds.find((b) => b.id === r.building_id)?.name ?? '')
        setAdjustedStart(isoToLocalInput(r.reported_start))
        setAdjustedEnd(isoToLocalInput(r.reported_end))
        setNote('')
      })
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.detail ?? 'No se pudo cargar el reporte.')
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    startTransition(() => {
      void load()
    })
  }, [load])

  async function handleSubmit() {
    if (!mode) return
    if (mode === 'reject' && !note.trim()) {
      setToast({ message: 'La nota es obligatoria al rechazar.', variant: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const body: ManualShiftReportReview = {
        approval_status: mode === 'approve' ? 'APPROVED' : 'REJECTED',
      }
      if (note.trim()) body.reviewer_note = note.trim()
      if (mode === 'approve' && report) {
        if (adjustedStart !== isoToLocalInput(report.reported_start)) {
          body.adjusted_start = toIsoUtc(adjustedStart)
        }
        if (adjustedEnd !== isoToLocalInput(report.reported_end)) {
          body.adjusted_end = toIsoUtc(adjustedEnd)
        }
      }
      await reviewManualReport(reportId, body)
      setToast({
        message: mode === 'approve' ? 'Reporte aprobado.' : 'Reporte rechazado.',
        variant: 'success',
      })
      setMode(null)
      setTimeout(() => router.push('/manual-reports'), 600)
    } catch (err) {
      const apiErr = err as ApiError
      setToast({
        message: apiErr.detail ?? 'No se pudo procesar la revisión.',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
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
          <h1 className="text-lg font-bold text-[#0A2463]">Reporte manual</h1>
          <p className="text-xs text-[#6B7280]">Revisión del coordinador</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A2463] border-t-transparent" />
          </div>
        ) : error || !report ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[13px] text-red-700">{error ?? 'Reporte no encontrado.'}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] p-4">
              <p className="text-[14px] font-bold text-[#0A2463]">{userName}</p>
              <p className="text-[12px] text-[#6B7280]">
                {buildingName} · {report.session_type}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
                <div>
                  <p className="text-[#9CA3AF]">Inicio reportado</p>
                  <p className="font-semibold text-[#111827]">{formatDate(report.reported_start)}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF]">Fin reportado</p>
                  <p className="font-semibold text-[#111827]">{formatDate(report.reported_end)}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF]">Estado</p>
                  <p className="font-semibold text-[#111827]">{report.approval_status}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF]">Revisado</p>
                  <p className="font-semibold text-[#111827]">
                    {report.reviewed_at ? formatDate(report.reviewed_at) : '—'}
                  </p>
                </div>
              </div>
              {report.reviewer_note && (
                <div className="mt-2 rounded-xl bg-[#F8F9FA] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
                    Nota del coordinador
                  </p>
                  <p className="mt-1 text-[13px] text-[#111827]">{report.reviewer_note}</p>
                </div>
              )}
            </div>

            {report.approval_status === 'PENDING' && (
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    setMode('reject')
                    setNote('')
                  }}
                >
                  Rechazar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setMode('approve')}
                >
                  Aprobar
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'approve' ? 'Aprobar reporte' : 'Rechazar reporte'}
      >
        <div className="flex flex-col gap-3">
          {mode === 'approve' && (
            <>
              <p className="text-[13px] text-[#6B7280]">
                Puedes ajustar el bloque horario antes de aprobar.
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-[#374151]">Inicio</span>
                <input
                  type="datetime-local"
                  value={adjustedStart}
                  max={nowLocalIso()}
                  onChange={(e) => setAdjustedStart(e.target.value)}
                  className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[12px] font-medium text-[#374151]">Fin</span>
                <input
                  type="datetime-local"
                  value={adjustedEnd}
                  max={nowLocalIso()}
                  onChange={(e) => setAdjustedEnd(e.target.value)}
                  className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[#374151]">
              Nota {mode === 'reject' ? '(obligatoria)' : '(opcional)'}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none rounded-xl border border-[#E5E7EB] p-3 text-[13px]"
            />
          </label>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button
              variant={mode === 'approve' ? 'primary' : 'danger'}
              className="flex-1"
              isLoading={submitting}
              onClick={handleSubmit}
            >
              {mode === 'approve' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </div>
        </div>
      </Modal>

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
