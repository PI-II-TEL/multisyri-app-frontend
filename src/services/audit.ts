import { apiFetch } from './api'

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_DEACTIVATED'
  | 'ROLE_ASSIGNED'
  | 'SHIFT_FORCE_CLOSED'
  | 'TICKET_CANCELLED'
  | 'MANUAL_SHIFT_APPROVED'
  | 'MANUAL_SHIFT_REJECTED'
  | 'BUILDING_CREATED'
  | 'CLASSROOM_CREATED'
  | 'HOURS_THRESHOLD_UPDATED'
  | 'ACCOUNT_LOCKED'

export interface AuditLog {
  id: string
  action: AuditAction
  detail: Record<string, string> | null
  occurred_at: string
  actor_id: string
  actor_name: string | null
}

export interface AuditLogsParams {
  action?: AuditAction
  actor_id?: string
  date_from?: string
  date_to?: string
  skip?: number
  limit?: number
}

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.append(k, String(v))
  }
  const q = usp.toString()
  return q ? `?${q}` : ''
}

export function getAuditLogs(params: AuditLogsParams = {}): Promise<AuditLog[]> {
  return apiFetch(`/audit/logs${toQuery(params as Record<string, string | number | boolean | undefined>)}`)
}
