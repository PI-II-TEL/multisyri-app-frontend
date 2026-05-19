'use client'

import { useCallback, useEffect, useRef, startTransition, useState } from 'react'
import { getNotifications, markNotificationsRead, type NotificationRead } from '@/services/notifications'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h}h`
  return `Hace ${Math.floor(h / 24)}d`
}

const TYPE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  HOURS_ALERT:      { label: 'Alerta de horas',    color: '#D97706', bg: '#FEF3C7' },
  TICKET_ESCALATED: { label: 'Ticket escalado',    color: '#DC2626', bg: '#FEE2E2' },
  TICKET_RESOLVED:  { label: 'Ticket resuelto',    color: '#16A34A', bg: '#DCFCE7' },
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRead[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch {
      // silently fail — bell is non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) startTransition(() => { void load() })
  }, [open, load])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const unread = notifications.filter(n => !n.is_read)

  async function handleMarkAllRead() {
    const ids = unread.map(n => n.id)
    if (ids.length === 0) return
    try {
      await markNotificationsRead(ids)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
    } catch {
      // ignore
    }
  }

  async function handleMarkOne(id: string) {
    try {
      await markNotificationsRead([id])
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100 transition-colors"
        aria-label="Notificaciones"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#DC2626] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">{unread.length > 9 ? '9+' : unread.length}</span>
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-10 w-80 max-h-[420px] rounded-2xl bg-white border border-[#E5E7EB] shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
            <span className="text-[14px] font-bold text-[#0A2463]">Notificaciones</span>
            {unread.length > 0 && (
              <button onClick={handleMarkAllRead} className="text-[11px] font-semibold text-[#1565C0]">
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#0A2463] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span className="text-[13px] text-[#9CA3AF]">Sin notificaciones</span>
              </div>
            ) : (
              notifications.map(n => {
                const meta = TYPE_LABEL[n.type] ?? { label: n.type, color: '#6B7280', bg: '#F3F4F6' }
                return (
                  <div
                    key={n.id}
                    className="flex gap-3 px-4 py-3 border-b border-[#F9FAFB] last:border-0 transition-colors"
                    style={{ background: n.is_read ? '#FFFFFF' : '#FAFBFF' }}
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: meta.color, background: meta.bg }}
                        >
                          {meta.label}
                        </span>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#0A2463] shrink-0" />}
                      </div>
                      <p className="text-[12px] text-[#374151] leading-snug">{n.body}</p>
                      <span className="text-[11px] text-[#9CA3AF]">{timeAgo(n.sent_at)}</span>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => void handleMarkOne(n.id)}
                        className="shrink-0 self-start mt-1 text-[#9CA3AF] hover:text-[#6B7280]"
                        aria-label="Marcar como leída"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
