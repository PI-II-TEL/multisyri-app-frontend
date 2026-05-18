import { apiFetch } from './api'
import type {
  ApprovalStatus,
  CheckInResponse,
  CheckOutResponse,
  ManualShiftReport,
  ManualShiftReportCreate,
  ManualShiftReportReview,
  ScheduleShift,
  ScheduleShiftCreate,
  ScheduleShiftUpdate,
  ScheduleUploadResult,
  SessionStatus,
  ShiftSession,
  ShiftSessionSummary,
} from '@/types/shift'

export function checkIn(building_id: string, schedule_shift_id?: string | null): Promise<CheckInResponse> {
  return apiFetch('/shifts/check-in', {
    method: 'POST',
    body: JSON.stringify({ building_id, ...(schedule_shift_id ? { schedule_shift_id } : {}) }),
  })
}

export function checkOut(force = false): Promise<CheckOutResponse> {
  return apiFetch('/shifts/check-out', {
    method: 'POST',
    body: JSON.stringify({ force }),
  })
}

export function acknowledgeHandover(session_id: string): Promise<ShiftSession> {
  return apiFetch(`/shifts/sessions/${session_id}/acknowledge-handover`, {
    method: 'POST',
  })
}

export function getActiveSession(): Promise<ShiftSession | null> {
  return apiFetch('/shifts/sessions/active')
}

// ── HU-21: Schedules ─────────────────────────────────────────────────────────

export interface ListSchedulesParams {
  building_id?: string
  user_id?: string
  day_of_week?: number
  only_active?: boolean
}

function toQuery(params: Record<string, string | number | boolean | undefined> | object): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== '') usp.append(k, String(v))
  }
  const q = usp.toString()
  return q ? `?${q}` : ''
}

export function listSchedules(params: ListSchedulesParams = {}): Promise<ScheduleShift[]> {
  return apiFetch(`/schedules/${toQuery(params)}`)
}

export function getSchedule(id: string): Promise<ScheduleShift> {
  return apiFetch(`/schedules/${id}`)
}

export function createSchedule(data: ScheduleShiftCreate): Promise<ScheduleShift> {
  return apiFetch('/schedules/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateSchedule(id: string, data: ScheduleShiftUpdate): Promise<ScheduleShift> {
  return apiFetch(`/schedules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function invalidateSchedule(id: string): Promise<ScheduleShift> {
  return apiFetch(`/schedules/${id}`, { method: 'DELETE' })
}

export async function uploadSchedules(file: File): Promise<ScheduleUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  const res = await fetch(`${base}/schedules/upload`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Error desconocido' }))
    throw { status: res.status, detail: body.detail ?? 'Error desconocido', ...body }
  }
  return res.json()
}

// ── HU-04: Relay traceability ────────────────────────────────────────────────

export interface ListSessionsParams {
  building_id?: string
  user_id?: string
  only_relays?: boolean
  status?: SessionStatus
  date_from?: string
  date_to?: string
}

export function listSessions(params: ListSessionsParams = {}): Promise<ShiftSessionSummary[]> {
  return apiFetch(`/shifts/sessions/${toQuery(params)}`)
}

export function getSessionDetail(id: string): Promise<ShiftSessionSummary> {
  return apiFetch(`/shifts/sessions/${id}`)
}

export function updateCoordinatorNote(id: string, coordinator_note: string): Promise<ShiftSessionSummary> {
  return apiFetch(`/shifts/sessions/${id}/note`, {
    method: 'PATCH',
    body: JSON.stringify({ coordinator_note }),
  })
}

// ── HU-08: Manual shift reports ──────────────────────────────────────────────

export interface ListManualReportsParams {
  user_id?: string
  approval_status?: ApprovalStatus
}

export function createManualReport(data: ManualShiftReportCreate): Promise<ManualShiftReport> {
  return apiFetch('/shifts/manual-reports/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function listManualReports(params: ListManualReportsParams = {}): Promise<ManualShiftReport[]> {
  return apiFetch(`/shifts/manual-reports/${toQuery(params)}`)
}

export function getManualReport(id: string): Promise<ManualShiftReport> {
  return apiFetch(`/shifts/manual-reports/${id}`)
}

export function reviewManualReport(id: string, data: ManualShiftReportReview): Promise<ManualShiftReport> {
  return apiFetch(`/shifts/manual-reports/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
