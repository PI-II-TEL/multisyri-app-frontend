import { apiFetch } from './api'
import type { SupportTicket, TicketStatus, FaultType } from '@/types/support'

export type { SupportTicket, FaultType }

// Alias so all consumers can use either name
export type SupportTicketRead = SupportTicket

export interface ReportFaultPayload {
  fault_type: FaultType
  fault_description: string
  building_id: string
  classroom_id: string
  shift_session_id?: string | null
}

export interface CloseTicketPayload {
  resolution_note: string
}

export const ACTIVE_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'ESCALATED']

// ── Ticket CRUD ───────────────────────────────────────────────────────────────

export function listMyTickets(): Promise<SupportTicket[]> {
  return apiFetch('/support/tickets')
}

export function listTicketsForBuilding(
  building_id: string,
  status?: string,
): Promise<SupportTicket[]> {
  const params = new URLSearchParams({ building_id })
  if (status) params.set('status', status)
  return apiFetch(`/support/tickets?${params}`)
}

export function listTickets(
  buildingId: string,
  options: { onlyActive?: boolean } = {},
): Promise<SupportTicketRead[]> {
  const q = new URLSearchParams({ building_id: buildingId })
  if (options.onlyActive) q.set('only_active', 'true')
  return apiFetch(`/support/tickets?${q}`)
}

export function getTicket(ticket_id: string): Promise<SupportTicket> {
  return apiFetch(`/support/tickets/${ticket_id}`)
}

export function createTicket(data: {
  fault_type: string
  fault_description: string
  building_id: string
  classroom_id: string
  shift_session_id?: string | null
}): Promise<SupportTicket> {
  return apiFetch('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function reportFault(payload: ReportFaultPayload): Promise<SupportTicket> {
  return createTicket(payload)
}

export function acceptTicket(ticket_id: string): Promise<SupportTicket> {
  return apiFetch(`/support/tickets/${ticket_id}/accept`, { method: 'POST' })
}

export function escalateTicket(
  ticket_id: string,
  escalation_reason: string,
): Promise<SupportTicket> {
  return apiFetch(`/support/tickets/${ticket_id}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ escalation_reason }),
  })
}

export function resolveTicket(
  ticket_id: string,
  resolution_note: string,
): Promise<SupportTicket> {
  return apiFetch(`/support/tickets/${ticket_id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution_note }),
  })
}

export function closeTicket(ticketId: string, payload: CloseTicketPayload): Promise<SupportTicketRead> {
  return apiFetch(`/support/tickets/${ticketId}/close`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// ── HU-24: Administrative cancel ─────────────────────────────────────────────

export function cancelTicket(ticketId: string, reason: string): Promise<SupportTicketRead> {
  return apiFetch(`/support/tickets/${ticketId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

// ── HU-18: History and metrics ────────────────────────────────────────────────

export interface TicketHistoryParams {
  building_id?: string
  assigned_to?: string
  fault_type?: string
  status?: string
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

export function getTicketHistory(params: TicketHistoryParams = {}): Promise<SupportTicket[]> {
  return apiFetch(`/support/history${toQuery(params as Record<string, string | number | boolean | undefined>)}`)
}

export interface BuildingMetrics {
  building_id: string
  building_name: string
  total_tickets: number
  avg_response_minutes: number | null
  avg_resolution_minutes: number | null
  escalated_count: number
  sla_breached_count: number
}

export interface MonitorMetrics {
  monitor_id: string
  monitor_name: string
  total_tickets: number
  avg_response_minutes: number | null
  avg_resolution_minutes: number | null
}

export function getBuildingMetrics(): Promise<BuildingMetrics[]> {
  return apiFetch('/support/metrics/buildings')
}

export function getMonitorMetrics(): Promise<MonitorMetrics[]> {
  return apiFetch('/support/metrics/monitors')
}
