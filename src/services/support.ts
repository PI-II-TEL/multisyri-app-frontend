import { apiFetch } from './api'
import type { FaultType, TicketStatus } from '@/types/shift'

export interface ReportFaultPayload {
  fault_type: FaultType
  fault_description: string
  building_id: string
  classroom_id: string
  shift_session_id?: string | null
}

export interface SupportTicketRead {
  id: string
  status: TicketStatus
  fault_type: FaultType
  fault_description: string
  resolution_note: string | null
  escalation_reason: string | null
  t0_reported_at: string
  t1_accepted_at: string | null
  t2_resolved_at: string | null
  escalated_at: string | null
  reported_by: string
  assigned_to: string | null
  escalated_to: string | null
  closed_by: string | null
  building_id: string
  classroom_id: string
  created_at: string
}

export function reportFault(payload: ReportFaultPayload): Promise<SupportTicketRead> {
  return apiFetch('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
