import { apiFetch } from './api'
import type { CheckInResponse, CheckOutResponse, ShiftSession } from '@/types/shift'

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
