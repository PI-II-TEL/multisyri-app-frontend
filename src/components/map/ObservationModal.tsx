'use client'
import { useEffect, useState, startTransition } from 'react'
import { addObservation } from '@/services/map'
import type { ClassroomMapRead } from '@/types/shift'
import type { ApiError } from '@/services/api'

interface Props {
  open: boolean
  onClose: () => void
  classroom: ClassroomMapRead | null
  buildingId: string
  onSuccess: () => void
}

export function ObservationModal({ open, onClose, classroom, onSuccess }: Props) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { startTransition(() => { setText(''); setError(null) }) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const canSave = text.trim().length > 0

  async function handleSave() {
    if (!classroom || !canSave) return
    setSaving(true)
    setError(null)
    try {
      await addObservation(classroom.classroom_id, text.trim())
      onSuccess()
    } catch (e) {
      const err = e as ApiError
      setError(err.detail ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !classroom) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white sm:rounded-2xl flex flex-col">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        <div className="px-5 pb-6 pt-2 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold tracking-[1px] text-[#9CA3AF] uppercase">Observación</span>
              <span className="text-[22px] font-bold text-[#111827]">{classroom.classroom_name}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] transition-colors mt-1"
              aria-label="Cerrar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Active observation notice */}
          {classroom.active_observation && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-[12px] text-amber-700">
                <b>Observación activa:</b> {classroom.active_observation}
              </span>
            </div>
          )}

          {/* Observation text */}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-[#374151]">Agregar Observación</span>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Escribe una observación sobre el salón..."
              rows={4}
              className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[14px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#0A2463] focus:bg-white transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2">
              <span className="text-[13px] text-red-700">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="w-full h-[52px] rounded-2xl flex items-center justify-center gap-2.5 text-[15px] font-bold transition-all disabled:opacity-50"
              style={{ background: canSave ? '#0A2463' : '#E5E7EB', color: canSave ? '#fff' : '#9CA3AF' }}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>
                  </svg>
                  Guardar Observación
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-[14px] font-medium text-[#6B7280] hover:text-[#374151] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
