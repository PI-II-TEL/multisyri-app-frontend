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
