'use client'

import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast } from '@/components/Toast'
import { createSchedule, updateSchedule } from '@/services/shifts'
import { getBuildings } from '@/services/buildings'
import { listUsers, type UserRead } from '@/services/users'
import type { ApiError } from '@/services/api'
import type { Building } from '@/types/buildings'
import type {
  ScheduleShift,
  ScheduleShiftCreate,
  ScheduleShiftUpdate,
  SessionType,
} from '@/types/shift'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const SESSION_TYPES: SessionType[] = ['SALONES', 'SERVICIOS']

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function timeForInput(value: string): string {
  // backend returns "HH:MM:SS" — <input type="time"> wants "HH:MM"
  return value.slice(0, 5)
}

interface Errors {
  userId?: string
  buildingId?: string
  block?: string
  validFrom?: string
  validUntil?: string
}

type Mode = 'create' | 'edit'

interface Props {
  mode: Mode
  initial?: ScheduleShift
}

export function ScheduleForm({ mode, initial }: Props) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  const [monitors, setMonitors] = useState<UserRead[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [userId, setUserId] = useState(initial?.user_id ?? '')
  const [buildingId, setBuildingId] = useState(initial?.building_id ?? '')
  const [sessionType, setSessionType] = useState<SessionType>(initial?.session_type ?? 'SALONES')
  const [dayOfWeek, setDayOfWeek] = useState(initial?.day_of_week ?? 0)
  const [startTime, setStartTime] = useState(initial ? timeForInput(initial.start_time) : '08:00')
  const [endTime, setEndTime] = useState(initial ? timeForInput(initial.end_time) : '10:00')
  const [validFrom, setValidFrom] = useState(initial?.valid_from ?? todayIso())
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? '')

  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [users, blds] = await Promise.all([listUsers(), getBuildings()])
        const onlyMonitors = users.filter((u) => u.roles.some((r) => r.name === 'MONITOR'))
        startTransition(() => {
          setMonitors(onlyMonitors)
          setBuildings(blds)
          if (!isEdit) {
            if (onlyMonitors[0]) setUserId((cur) => cur || onlyMonitors[0].id)
            if (blds[0]) setBuildingId((cur) => cur || blds[0].id)
          }
        })
      } catch {
        setApiError('No se pudieron cargar monitores o edificios.')
      } finally {
        setLoadingMeta(false)
      }
    }
    startTransition(() => void load())
  }, [isEdit])

  function validate(): boolean {
    const e: Errors = {}
    if (!isEdit) {
      if (!userId) e.userId = 'Selecciona un monitor.'
      if (!buildingId) e.buildingId = 'Selecciona un edificio.'
      if (!validFrom || validFrom < todayIso()) {
        e.validFrom = 'La vigencia no puede ser anterior a hoy.'
      }
    }
    if (startTime >= endTime) e.block = 'La hora de inicio debe ser anterior a la de fin.'
    if (validUntil && validFrom && validUntil < validFrom) {
      e.validUntil = '`Vigente hasta` no puede ser anterior a `Vigente desde`.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setApiError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      if (isEdit && initial) {
        const payload: ScheduleShiftUpdate = {
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          valid_until: validUntil || null,
        }
        await updateSchedule(initial.id, payload)
        setToast({ message: 'Turno programado actualizado.', variant: 'success' })
      } else {
        const payload: ScheduleShiftCreate = {
          user_id: userId,
          building_id: buildingId,
          session_type: sessionType,
          day_of_week: dayOfWeek,
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          valid_from: validFrom,
          valid_until: validUntil || null,
        }
        await createSchedule(payload)
        setToast({ message: 'Turno programado creado.', variant: 'success' })
      }
      setTimeout(() => router.push('/schedules'), 600)
    } catch (err) {
      const apiErr = err as ApiError
      setApiError(
        apiErr.detail ??
          (isEdit
            ? 'No se pudo actualizar el turno programado.'
            : 'No se pudo crear el turno programado.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const headerTitle = isEdit ? 'Editar turno programado' : 'Nuevo turno programado'

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
          <h1 className="text-lg font-bold text-[#0A2463]">{headerTitle}</h1>
          <p className="text-xs text-[#6B7280]">HU-21 · Programación semanal</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[13px] text-red-700">{apiError}</p>
          </div>
        )}

        {isEdit && (
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
            <p className="text-[12px] text-[#1E40AF]">
              Solo se pueden cambiar el horario y la vigencia. Para reasignar monitor, edificio o día,
              invalida este turno y crea uno nuevo.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Monitor</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={loadingMeta || isEdit}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          >
            <option value="">Selecciona…</option>
            {monitors.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          {errors.userId && <p className="text-[12px] text-red-500">{errors.userId}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Edificio</label>
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            disabled={loadingMeta || isEdit}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          >
            <option value="">Selecciona…</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {errors.buildingId && <p className="text-[12px] text-red-500">{errors.buildingId}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Tipo de turno</label>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as SessionType)}
            disabled={isEdit}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          >
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Día de la semana</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            disabled={isEdit}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          >
            {DAY_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#374151]">Hora inicio</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827]"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#374151]">Hora fin</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827]"
            />
          </div>
        </div>
        {errors.block && <p className="text-[12px] text-red-500">{errors.block}</p>}

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">Vigente desde</label>
          <input
            type="date"
            value={validFrom}
            min={isEdit ? undefined : todayIso()}
            onChange={(e) => setValidFrom(e.target.value)}
            disabled={isEdit}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827] disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          />
          {errors.validFrom && <p className="text-[12px] text-red-500">{errors.validFrom}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#374151]">
            Vigente hasta <span className="text-[#9CA3AF] font-normal">(opcional)</span>
          </label>
          <input
            type="date"
            value={validUntil}
            min={validFrom || undefined}
            onChange={(e) => setValidUntil(e.target.value)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-3 text-[14px] text-[#111827]"
          />
          {errors.validUntil && <p className="text-[12px] text-red-500">{errors.validUntil}</p>}
          <p className="text-[11px] text-[#9CA3AF]">
            Déjalo vacío para que el turno sea recurrente sin fecha de fin.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || loadingMeta}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A2463] py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
        >
          {submitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Icon name="save" size={18} />
              {isEdit ? 'Guardar cambios' : 'Crear turno'}
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
