import { apiFetch } from './api'

export interface RoleRead {
  id: string
  name: string
}

export interface UserRead {
  id: string
  name: string
  email: string
  hours_recorded: string
  min_hours_threshold: string
  created_at: string
  roles: RoleRead[]
}

export interface UserCreatePayload {
  name: string
  email: string
  role_ids: string[]
  min_hours_threshold?: number
}

export interface UserCreatedResponse {
  user: UserRead
  email_sent: boolean
  email_error: string | null
  temporary_password: string | null
}

export interface ResetPasswordResponse {
  email_sent: boolean
  email_error: string | null
  temporary_password: string | null
}

export interface MonitorHoursDashboardRow {
  id: string
  name: string
  email: string
  hours_this_month: number
  min_hours_threshold: number
  compliance_percentage: number
}

export async function getRoles(): Promise<RoleRead[]> {
  return apiFetch<RoleRead[]>('/users/roles')
}

export async function listUsers(): Promise<UserRead[]> {
  return apiFetch<UserRead[]>('/users')
}

export async function createUser(payload: UserCreatePayload): Promise<UserCreatedResponse> {
  return apiFetch<UserCreatedResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function resetUserPassword(userId: string): Promise<ResetPasswordResponse> {
  return apiFetch<ResetPasswordResponse>(`/users/${userId}/reset-password`, {
    method: 'POST',
  })
}

export async function getHoursDashboard(year: number, month: number): Promise<MonitorHoursDashboardRow[]> {
  return apiFetch<MonitorHoursDashboardRow[]>(`/users/hours-dashboard?year=${year}&month=${month}`)
}

export async function updateHoursThreshold(userId: string, minHoursThreshold: number): Promise<UserRead> {
  return apiFetch<UserRead>(`/users/${userId}/hours-threshold`, {
    method: 'PATCH',
    body: JSON.stringify({ min_hours_threshold: minHoursThreshold }),
  })
}
