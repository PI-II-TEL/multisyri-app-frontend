import { apiFetch } from './api'
import type { SupportTicket } from '@/types/support'

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

export function getTicket(ticket_id: string): Promise<SupportTicket> {
  return apiFetch(`/support/tickets/${ticket_id}`)
}

export function createTicket(data: {
  fault_type: string
  fault_description: string
  building_id: string
  classroom_id: string
}): Promise<SupportTicket> {
  return apiFetch('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
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
