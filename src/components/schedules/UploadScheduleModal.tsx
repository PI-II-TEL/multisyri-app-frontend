'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { uploadSchedules } from '@/services/shifts'
import type { ApiError } from '@/services/api'
import type { ScheduleUploadResult } from '@/types/shift'

interface UploadScheduleModalProps {
  open: boolean
  onClose: () => void
  onUploaded?: () => void
}

export function UploadScheduleModal({ open, onClose, onUploaded }: UploadScheduleModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ScheduleUploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFile(null)
    setResult(null)
    setError(null)
    setUploading(false)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)
    try {
      const res = await uploadSchedules(file)
      setResult(res)
      if (res.failed === 0) onUploaded?.()
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.detail ?? 'No se pudo procesar el archivo.')
    } finally {
      setUploading(false)
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cargar programación (CSV)">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-[#1565C0]" />
          <p className="text-[12px] leading-relaxed text-[#1E40AF]">
            Columnas requeridas: <code>user_email, building_id, session_type, day_of_week,
            start_time, end_time, valid_from</code>.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#374151]">Archivo CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px]"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-[13px] text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-white p-3">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-[#DCFCE7] px-2 py-1 text-[12px] font-bold text-[#16A34A]">
                {result.created} creados
              </span>
              <span className="rounded-lg bg-[#FEF3C7] px-2 py-1 text-[12px] font-bold text-[#D97706]">
                {result.failed} fallidos
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-[#E5E7EB] p-2">
                <ul className="flex flex-col gap-1">
                  {result.errors.map((e) => (
                    <li key={e.row} className="text-[12px] text-[#6B7280]">
                      Fila {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            isLoading={uploading}
            disabled={!file || uploading}
            onClick={handleUpload}
          >
            Procesar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
