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

export interface ActiveTicketInfo {
  id: string
  fault_type: FaultType
  fault_description: string
  t0_reported_at: string
}

export interface ClassroomMapRead {
  classroom_id: string
  classroom_name: string
  current_status: ClassroomStatus
  last_updated_at: string | null
  last_updated_by: string | null
  active_observation: string | null
  has_active_ticket: boolean
  active_ticket: ActiveTicketInfo | null
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

// ── HU-21: Schedule shifts ────────────────────────────────────────────────────

export interface ScheduleShift {
  id: string
  session_type: SessionType
  day_of_week: number  // 0=Mon … 6=Sun
  start_time: string   // "HH:MM:SS"
  end_time: string
  valid_from: string   // ISO date
  valid_until: string | null
  user_id: string
  building_id: string
}

export interface ScheduleShiftCreate {
  session_type: SessionType
  day_of_week: number
  start_time: string
  end_time: string
  valid_from: string
  valid_until?: string | null
  user_id: string
  building_id: string
}

export interface ScheduleShiftUpdate {
  start_time?: string
  end_time?: string
  valid_until?: string | null
}

export interface ScheduleUploadError {
  row: number
  reason: string
}

export interface ScheduleUploadResult {
  created: number
  failed: number
  errors: ScheduleUploadError[]
}

// ── HU-04: Relay traceability ─────────────────────────────────────────────────

export interface ShiftSessionSummary extends ShiftSession {
  user_name: string
  original_user_name: string | null
  building_name: string
  duration_hours: number | null
}

// ── HU-08: Manual shift reports ───────────────────────────────────────────────

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ManualShiftReport {
  id: string
  session_type: SessionType
  reported_start: string
  reported_end: string
  approval_status: ApprovalStatus
  reviewer_note: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  user_id: string
  building_id: string
}

export interface ManualShiftReportCreate {
  session_type: SessionType
  reported_start: string
  reported_end: string
  building_id: string
}

export interface ManualShiftReportReview {
  approval_status: ApprovalStatus
  reviewer_note?: string | null
  adjusted_start?: string | null
  adjusted_end?: string | null
}
