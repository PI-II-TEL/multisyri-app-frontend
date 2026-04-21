'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { getRoles, createUser } from '@/services/users'
import type { ApiError } from '@/services/api'

function validateName(value: string): string | null {
  if (!value.trim()) return 'El nombre es requerido'
  if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres'
  return null
}

function validateEmail(value: string): string | null {
  if (!value.trim()) return 'El correo es requerido'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Ingresa un correo válido'
  return null
}

function validateHours(value: string): string | null {
  const n = parseFloat(value)
  if (isNaN(n) || n < 1) return 'Mínimo 1 hora'
  if (n > 200) return 'Máximo 200 horas'
  return null
}

function inputClass(hasError: boolean): string {
  const base =
    'w-full pl-[42px] pr-4 py-[14px] rounded-xl border text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 transition-colors duration-150'
  return hasError
    ? `${base} border-red-400 focus:border-red-400 focus:ring-red-200`
    : `${base} border-[#E5E7EB] focus:border-[#0A2463] focus:ring-[#0A2463]/20`
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="text-[12px] text-red-500 flex items-center gap-1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </p>
  )
}

export default function CreateMonitorPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [minHours, setMinHours] = useState('40')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [touched, setTouched] = useState({ name: false, email: false, minHours: false })

  const nameError = touched.name ? validateName(name) : null
  const emailError = touched.email ? validateEmail(email) : null
  const hoursError = touched.minHours ? validateHours(minHours) : null

  function blur(field: 'name' | 'email' | 'minHours') {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched({ name: true, email: true, minHours: true })
    setApiError(null)

    if (validateName(name) || validateEmail(email) || validateHours(minHours)) return

    setLoading(true)

    try {
      const roles = await getRoles()
      const monitorRole = roles.find((r) => r.name === 'MONITOR')
      if (!monitorRole) {
        setApiError('No se encontró el rol de Monitor en el sistema.')
        setLoading(false)
        return
      }

      await createUser({
        name: name.trim(),
        email: email.trim(),
        role_ids: [monitorRole.id],
        min_hours_threshold: parseFloat(minHours) || 40,
      })

      setSuccess(true)
    } catch (err) {
      const apiErr = err as ApiError
      setApiError(apiErr.detail ?? 'No se pudo crear el monitor. Intenta de nuevo.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <div className="w-full max-w-[360px] flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center">
            <Icon name="check" size={32} className="text-[#16A34A]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[22px] font-bold text-[#111827]">Monitor creado</h2>
            <p className="text-[14px] text-[#6B7280] leading-relaxed">
              La cuenta de <span className="font-semibold text-[#111827]">{name}</span> fue
              registrada exitosamente. Se le enviará su contraseña al correo institucional.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full mt-2">
            <button
              onClick={() => {
                setName('')
                setEmail('')
                setMinHours('40')
                setTouched({ name: false, email: false, minHours: false })
                setApiError(null)
                setLoading(false)
                setSuccess(false)
              }}
              className="w-full py-[14px] rounded-2xl bg-[#0A2463] text-white text-[15px] font-bold hover:bg-[#0d2f7a] active:bg-[#091e52] transition-colors"
            >
              Crear otro monitor
            </button>
            <button
              onClick={() => router.push('/buildings')}
              className="w-full py-[14px] rounded-2xl border border-[#E5E7EB] text-[#0A2463] text-[15px] font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              Volver al panel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 shrink-0">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Volver"
        >
          <Icon name="chevron-left" size={22} />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[18px] font-bold text-[#0A2463]">Nuevo Monitor</h1>
          <p className="text-[12px] text-[#6B7280]">Registrar al sistema</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 py-2 flex flex-col gap-6 max-w-[520px] w-full mx-auto">

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] p-4">
          <Icon name="info" size={18} className="shrink-0 text-[#1565C0] mt-0.5" />
          <p className="text-[13px] text-[#1E40AF] leading-relaxed">
            La contraseña se genera automáticamente y se envía al correo institucional del monitor.
          </p>
        </div>

        {/* API error banner */}
        {apiError && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
            <Icon name="alert-circle" size={18} className="shrink-0 text-red-500 mt-0.5" />
            <p className="text-[13px] text-red-600 leading-relaxed">{apiError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-[13px] font-medium text-[#374151]">
              Nombre completo
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
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => blur('name')}
                placeholder="Ej. Juan Pérez"
                autoComplete="name"
                aria-describedby={nameError ? 'name-error' : undefined}
                aria-invalid={!!nameError}
                className={inputClass(!!nameError)}
              />
            </div>
            {nameError && <FieldError message={nameError} />}
          </div>

          {/* Correo */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-[#374151]">
              Correo institucional
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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
              />
            </div>
            {emailError && <FieldError message={emailError} />}
          </div>

          {/* Meta de horas */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="minHours" className="text-[13px] font-medium text-[#374151]">
              Meta de horas mensuales
              <span className="ml-1.5 text-[12px] font-normal text-[#9CA3AF]">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <input
                id="minHours"
                type="number"
                min="1"
                max="200"
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                onBlur={() => blur('minHours')}
                aria-describedby={hoursError ? 'hours-error' : 'hours-hint'}
                aria-invalid={!!hoursError}
                className={inputClass(!!hoursError)}
              />
            </div>
            {hoursError
              ? <FieldError message={hoursError} />
              : <p id="hours-hint" className="text-[12px] text-[#9CA3AF]">Por defecto: 40 horas</p>
            }
          </div>

          {/* Divider */}
          <div className="h-px bg-[#F3F4F6]" />

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full py-[15px] rounded-2xl
              bg-[#0A2463] text-white
              text-[16px] font-bold
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
                <Icon name="users" size={18} />
                Crear Monitor
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
