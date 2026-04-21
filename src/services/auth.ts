import { apiFetch } from './api'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserRead {
  id: string
  name: string
  email: string
  hours_recorded: string
  min_hours_threshold: string
  roles: { id: string; name: string }[]
}

export async function loginRequest(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function refreshTokenRequest(refreshToken: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export async function getUserById(userId: string): Promise<UserRead> {
  return apiFetch<UserRead>(`/users/${userId}`)
}
