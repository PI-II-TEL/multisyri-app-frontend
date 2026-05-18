'use client'

import { useCallback, useEffect, useMemo, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { listManualReports } from '@/services/shifts'
import { listUsers, type UserRead } from '@/services/users'
import { getBuildings } from '@/services/buildings'
import type { ApiError } from '@/services/api'
import type { ManualShiftReport, ApprovalStatus } from '@/types/shift'
import type { Building } from '@/types/buildings'

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
}

const STATUS_STYLES: Record<ApprovalStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#D97706' },
  APPROVED: { bg: '#DCFCE7', text: '#16A34A' },
  REJECTED: { bg: '#FEE2E2', text: '#DC2626' },
}

const STATUS_ORDER: Record<ApprovalStatus, number> = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
}

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }
  return `${new Date(start).toLocaleString('es-CO', opts)} → ${new Date(end).toLocaleString('es-CO', opts)}`
}

export default function ManualReportsListPage() {
  const router = useRouter()
  const [reports, setReports] = useState<ManualShiftReport[]>([])
  const [users, setUsers] = useState<UserRead[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const buildingsById = useMemo(() => Object.fromEntries(buildings.map((b) => [b.id, b])), [buildings])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [reps, us, blds] = await Promise.all([
        listManualReports(),
        listUsers().catch(() => [] as UserRead[]),
        getBuildings(),
      ])
      startTransition(() => {
        setReports(reps)
        setUsers(us)
        setBuildings(blds)
      })
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.detail ?? 'No se pudieron cargar los reportes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      void load()
    })
  }, [load])

  const sorted = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          STATUS_ORDER[a.approval_status] - STATUS_ORDER[b.approval_status] ||
          new Date(b.reported_start).getTime() - new Date(a.reported_start).getTime()
      ),
    [reports]
  )

  const pending = sorted.filter((r) => r.approval_status === 'PENDING').length

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
          <h1 className="text-lg font-bold text-[#0A2463]">Reportes manuales</h1>
          <p className="text-xs text-[#6B7280]">{pending} pendientes de revisión</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A2463] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            title="Sin reportes manuales"
            description="No hay reportes pendientes de revisión."
          />
        ) : (
          sorted.map((r) => {
            const style = STATUS_STYLES[r.approval_status]
            return (
              <button
                key={r.id}
                onClick={() => router.push(`/manual-reports/${r.id}`)}
                className="flex flex-col gap-1.5 rounded-xl border border-[#E5E7EB] p-3.5 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[14px] font-semibold text-[#111827]">
                    {usersById[r.user_id]?.name ?? 'Monitor'}
                  </p>
                  <span
                    className="rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {STATUS_LABELS[r.approval_status]}
                  </span>
                </div>
                <p className="text-[12px] text-[#6B7280]">
                  {buildingsById[r.building_id]?.name ?? 'Edificio'} · {r.session_type}
                </p>
                <p className="text-[12px] text-[#0A2463]">
                  {formatDateRange(r.reported_start, r.reported_end)}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
