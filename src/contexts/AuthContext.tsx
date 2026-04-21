'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

type UserRole = 'COORDINADOR' | 'MONITOR' | 'SUPERVISOR'

interface AuthUser {
  id: string
  name: string
  role: UserRole
}

interface AuthContextValue {
  user: AuthUser | null
  isCoordinator: boolean
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const u = JSON.parse(raw) as Record<string, unknown>
      return {
        id: String(u.id ?? ''),
        name: String(u.name ?? ''),
        role: (u.role as UserRole) ?? 'MONITOR',
      }
    }
    // Fallback: decode JWT payload for role
    const token = localStorage.getItem('access_token')
    if (token) {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      ) as Record<string, unknown>
      return {
        id: String(payload.sub ?? ''),
        name: String(payload.name ?? payload.email ?? payload.sub ?? ''),
        role: (payload.role as UserRole) ?? 'MONITOR',
      }
    }
  } catch {
    /* ignore parse errors */
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setUser(readUserFromStorage())
  }, [])

  const setAuth = useCallback((newUser: AuthUser, token: string) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(newUser))
    document.cookie = `role=${newUser.role}; path=/; SameSite=Lax`
    setUser(newUser)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    document.cookie = 'role=; path=/; max-age=0'
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isCoordinator: user?.role === 'COORDINADOR', setAuth, clearAuth }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
