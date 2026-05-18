'use client'

import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast } from '@/components/Toast'
import { createManualReport } from '@/services/shifts'
import { getBuildings } from '@/services/buildings'
import type { ApiError } from '@/services/api'
import type { Building } from '@/types/buildings'
import type { ManualShiftReportCreate, SessionType } from '@/types/shift'

const SESSION_TYPES: SessionType[] = ['SALONES', 'SERVICIOS']

function nowLocalIso(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  const tzOffset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

function toIsoUtc(local: string): string {
  return new Date(local).toISOString()
}

export default function ForgottenShiftPage() {
  const router = useRouter()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingId, setBuildingId] = useState('')
  const [sessionType, setSessionType] = useState<SessionType>('SALONES')
  const [reportedStart, setReportedStart] = useState('')
  const [reportedEnd, setReportedEnd] = useState(nowLocalIso())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  useEffect(() => {
    startTransition(() => {
      async function load() {
        try {
          const blds = await getBuildings()
          setBuildings(blds)
          if (blds[0]) setBuildingId(blds[0].id)
        } catch {
          setError('No se pudieron cargar los edificios.')
        }
      }
      void load()
    })
  }, [])

  function validate(): boolean {
    setValidationError(null)
    if (!buildingId) {
      setValidationError('Selecciona un edificio.')
      return false
    }
    if (!reportedStart || !reportedEnd) {
      setValidationError('Indica el rango de fechas.')
      return false
    }
    if (reportedStart >= reportedEnd) {
      setValidationError('La hora de inicio debe ser anterior a la de fin.')
      return false
    }
    if (new Date(reportedEnd).getTime() > Date.now() + 60_000) {
      setValidationError('La hora de fin no puede estar en el futuro.')
      return false
    }
    return true
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload: ManualShiftReportCreate = {
        session_type: sessionType,
        reported_start: toIsoUtc(reportedStart),
        reported_end: toIsoUtc(reportedEnd),
        building_id: buildingId,
      }
      await createManualReport(payload)
      setToast({ message: 'Reporte enviado. Queda pendiente de revisión.', variant: 'success' })
      setTimeout(() => router.push('/home'), 800)
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.detail ?? 'No se pudo crear el reporte.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100"
          aria-label="Volver"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-bold text-[#0A2463]">Turno olvidado</h1>
          <p className="text-xs text-[#6B7280]">Registro retroactivo</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-6">
        <div className="flex items-start gap-3 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-3.5">
          <Icon name="alert-circle" size={18} className="mt-0.5 shrink-0 text-[#D97706]" />
          <p className="text-[13px] leading-relaxed text-[#B45309]">
            Registra un turno que no fue marcado en su momento. Esto quedará en el historial
            del sistema y deberá ser aprobado por un coordinador.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Edificio</label>
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827]"
          >
            <option value="">Selecciona…</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Tipo de turno</label>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as SessionType)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827]"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Inicio</label>
          <input
            type="datetime-local"
            value={reportedStart}
            max={nowLocalIso()}
            onChange={(e) => setReportedStart(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Fin</label>
          <input
            type="datetime-local"
            value={reportedEnd}
            max={nowLocalIso()}
            onChange={(e) => setReportedEnd(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827]"
          />
        </div>

        {validationError && (
          <p className="text-[12px] text-red-500">{validationError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A2463] py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
        >
          {submitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Icon name="save" size={18} />
              Enviar reporte
            </>
          )}
        </button>
      </form>

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
