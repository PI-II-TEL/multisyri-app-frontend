import type { TicketStatus, FaultType } from '@/types/shift'

export type { TicketStatus, FaultType }

export interface SupportTicket {
  id: string
  status: TicketStatus
  fault_type: FaultType
  fault_description: string
  building_id: string
  classroom_id: string
  classroom_name: string | null
  reported_by: string
  assigned_to: string | null
  escalated_to: string | null
  shift_session_id: string | null
  t0_reported_at: string
  t1_accepted_at: string | null
  t2_resolved_at: string | null
  escalated_at: string | null
  escalation_reason: string | null
  resolution_note: string | null
  closed_by: string | null
  created_at: string
}
