export type SessionStatus = 'ACTIVE' | 'CLOSED' | 'FORCE_CLOSED'
export type SessionType = 'SALONES' | 'SERVICIOS'
export type ClassroomStatus = 'OPEN' | 'CLOSED'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'CLOSED' | 'CANCELLED'
export type FaultType = 'PROJECTOR' | 'SPEAKERS' | 'PC' | 'OTHER'

export interface ShiftSession {
  id: string
  session_type: SessionType
  status: SessionStatus
  checkin_at: string
  checkout_at: string | null
  is_relay: boolean
  coordinator_note: string | null
  handover_acknowledged_at: string | null
  user_id: string
  original_user_id: string | null
  building_id: string
  schedule_shift_id: string | null
}

export interface HandoverClassroom {
  classroom_id: string
  classroom_name: string
  status: ClassroomStatus
  observation: string | null
  recorded_at: string
}

export interface HandoverTicket {
  ticket_id: string
  classroom_id: string
  classroom_name: string | null
  fault_type: FaultType
  fault_description: string | null
  status: TicketStatus
  t0_reported_at: string
}

export interface Handover {
  previous_session_id: string | null
  previous_user_name: string | null
  closed_classrooms: HandoverClassroom[]
  active_tickets: HandoverTicket[]
  unresolved_observations: HandoverClassroom[]
  has_data: boolean
}

export interface CheckInResponse {
  session: ShiftSession
  handover: Handover
}

export interface CheckOutResponse {
  session: ShiftSession
  hours_this_session: number
  total_hours_accumulated: number
}

export interface OpenClassroomItem {
  classroom_id: string
  classroom_name: string
}

// ── HU-09: Map state ──────────────────────────────────────────────────────────

export interface ClassroomMapRead {
  classroom_id: string
  classroom_name: string
  current_status: ClassroomStatus
  last_updated_at: string | null
  last_updated_by: string | null
  active_observation: string | null
  has_active_ticket: boolean
}

export interface BuildingMapRead {
  session_id: string | null
  can_edit: boolean
  classrooms: ClassroomMapRead[]
}

export interface ClassroomStateRead {
  id: string
  classroom_id: string
  status: ClassroomStatus
  observation: string | null
  is_observation_resolved: boolean
  recorded_at: string
  user_id: string
  shift_session_id: string
}
