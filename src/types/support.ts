export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'CLOSED' | 'CANCELLED'
export type FaultType = 'PROJECTOR' | 'SPEAKERS' | 'PC' | 'OTHER'

export interface SupportTicket {
  id: string
  status: TicketStatus
  fault_type: FaultType
  fault_description: string
  building_id: string
  classroom_id: string
  reported_by: string
  assigned_to: string | null
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

export interface ClassroomMapEntry {
  classroom_id: string
  classroom_name: string
  current_status: 'OPEN' | 'CLOSED'
  last_updated_at: string
  last_updated_by: string
  active_observation: string | null
  has_active_ticket: boolean
}

export interface ClassroomStateRead {
  id: string
  classroom_id: string
  status: 'OPEN' | 'CLOSED'
  observation: string | null
  is_observation_resolved: boolean
  recorded_at: string
  user_id: string
  shift_session_id: string
}
