'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { ApiError } from '@/services/api'
import { loginRequest, getUserById } from '@/services/auth'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function emailToDisplayName(email: string): string {
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function validateEmail(value: string): string | null {
  if (!value) return 'El correo es requerido'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ingresa un correo válido'
  return null
}

function validatePassword(value: string): string | null {
  if (!value) return 'La contraseña es requerida'
  return null
}

function inputClass(hasError: boolean, extraPadding = 'pr-4'): string {
  const base = `w-full pl-[42px] ${extraPadding} py-[14px] rounded-xl border text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 transition-colors duration-150`
  return hasError
    ? `${base} border-red-400 focus:border-red-400 focus:ring-red-200`
    : `${base} border-[#E5E7EB] focus:border-[#0A2463] focus:ring-[#0A2463]/20`
}

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [touched, setTouched] = useState({ email: false, password: false })

  const emailError = touched.email ? validateEmail(email) : null
  const passwordError = touched.password ? validatePassword(password) : null

  function blur(field: 'email' | 'password') {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    setApiError(null)

    if (validateEmail(email) || validatePassword(password)) return

    setLoading(true)

    try {
      const tokens = await loginRequest(email, password)
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)

      const payload = decodeJwtPayload(tokens.access_token)
      const userId = String(payload.sub ?? '')

      let user: Parameters<typeof setAuth>[0]

      try {
        const userData = await getUserById(userId)
        const backendRole = userData.roles[0]?.name ?? 'MONITOR'
        const role = backendRole === 'COORDINATOR' ? 'COORDINADOR' : ('MONITOR' as const)
        user = { id: userData.id, name: userData.name, role }
        localStorage.setItem(
          'user',
          JSON.stringify({ ...user, hours_recorded: userData.hours_recorded })
        )
      } catch {
        user = { id: userId, name: emailToDisplayName(email), role: 'MONITOR' }
      }

      setAuth(user, tokens.access_token)
      router.push(user.role === 'COORDINADOR' ? '/buildings' : '/home')
    } catch (err) {
      const apiErr = err as ApiError
      setApiError(apiErr.detail ?? 'Error al iniciar sesión. Verifica tus credenciales.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 sm:py-16"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-[360px]">

        {/* ── Logo & branding ── */}
        <div className="flex flex-col items-center gap-2 mb-9">
          <div className="w-[72px] h-[72px] rounded-[20px] bg-[#0A2463] flex items-center justify-center shadow-lg mb-0.5">
            <svg
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 3L2 8.5L12 14L22 8.5L12 3Z"
                fill="white"
                stroke="white"
                strokeWidth="0.3"
                strokeLinejoin="round"
              />
              <path
                d="M6 11.5V16.5C6 16.5 8.5 19.5 12 19.5C15.5 19.5 18 16.5 18 16.5V11.5"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="22"
                y1="8.5"
                x2="22"
                y2="14"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-[22px] font-bold text-[#0A2463] tracking-tight">
            MultiSyri
          </span>
          <span className="text-[13px] text-[#6B7280]">Universidad Icesi</span>
        </div>

        {/* ── Welcome heading ── */}
        <div className="mb-7">
          <h1 className="text-[26px] font-bold text-[#111827] leading-tight mb-1">
            Bienvenido de nuevo
          </h1>
          <p className="text-[14px] text-[#6B7280] leading-relaxed">
            Inicia sesión con tus credenciales institucionales
          </p>
        </div>

        {/* ── API error banner ── */}
        {apiError && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-[13px] text-red-600 leading-snug">{apiError}</p>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" suppressHydrationWarning>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-[#374151]">
              Usuario Institucional
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => blur('email')}
                placeholder="usuario@icesi.edu.co"
                autoComplete="email"
                aria-describedby={emailError ? 'email-error' : undefined}
                aria-invalid={!!emailError}
                className={inputClass(!!emailError)}
                suppressHydrationWarning
              />
            </div>
            {emailError && (
              <p id="email-error" className="text-[12px] text-red-500 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {emailError}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-[#374151]">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => blur('password')}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-describedby={passwordError ? 'password-error' : undefined}
                aria-invalid={!!passwordError}
                className={inputClass(!!passwordError, 'pr-12')}
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors duration-150 p-0.5 rounded"
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && (
              <p id="password-error" className="text-[12px] text-red-500 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {passwordError}
              </p>
            )}

            {/* Forgot password */}
            <div className="flex justify-end mt-0.5">
              <button
                type="button"
                className="text-[13px] font-medium text-[#0A2463] hover:underline focus:outline-none"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full mt-1 py-[15px] rounded-2xl
              bg-[#0A2463] text-white
              text-[16px] font-bold tracking-wide
              flex items-center justify-center gap-2
              hover:bg-[#0d2f7a] active:bg-[#091e52]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150 shadow-sm
            "
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Iniciar Sesión
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className="mt-9 text-center text-[13px] text-[#6B7280]">
          ¿Necesitas ayuda?{' '}
          <button
            type="button"
            className="text-[#0A2463] font-semibold hover:underline focus:outline-none"
          >
            Contacta soporte
          </button>
        </p>
      </div>
    </div>
  )
}
