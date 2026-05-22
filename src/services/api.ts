const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

export interface ApiError {
  status: number
  detail: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

function isAuthEndpoint(path: string): boolean {
  return path.startsWith('/auth/login') || path.startsWith('/auth/refresh')
}

export function handleAuthFailure(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('active_session')
    localStorage.removeItem('handover')
    document.cookie = 'role=; path=/; max-age=0'
  } catch {
    /* ignore storage errors */
  }
  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { access_token?: string; refresh_token?: string }
      if (!data.access_token) return null
      localStorage.setItem('access_token', data.access_token)
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
      return data.access_token
    } catch {
      return null
    } finally {
      // Release the singleton on next tick so concurrent callers awaiting now still
      // see the resolved promise, but subsequent failures can trigger a fresh retry.
      setTimeout(() => {
        refreshPromise = null
      }, 0)
    }
  })()

  return refreshPromise
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const buildHeaders = (accessToken: string | null): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers as Record<string, string>),
  })

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(token) })

  if (res.status === 401 && !isAuthEndpoint(path) && typeof window !== 'undefined') {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await fetch(`${API_BASE}${path}`, { ...options, headers: buildHeaders(newToken) })
      if (res.status === 401) {
        handleAuthFailure()
      }
    } else {
      handleAuthFailure()
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Error desconocido' }))
    const err: ApiError = { status: res.status, detail: body.detail ?? 'Error desconocido', ...body }
    throw err
  }

  // 204 No Content
  if (res.status === 204) return null as T
  return res.json()
}
