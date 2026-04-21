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

export async function getRoles(): Promise<RoleRead[]> {
  return apiFetch<RoleRead[]>('/users/roles')
}

export async function createUser(payload: UserCreatePayload): Promise<UserRead> {
  return apiFetch<UserRead>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
