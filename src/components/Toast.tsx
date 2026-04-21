'use client'
import { useEffect, useState } from 'react'

type ToastVariant = 'info' | 'error' | 'success'

interface ToastProps {
  message: string
  variant?: ToastVariant
  duration?: number
  onDismiss?: () => void
}

const styles: Record<ToastVariant, { bg: string; border: string; icon: string; text: string }> = {
  info:    { bg: '#EFF6FF', border: '#BFDBFE', icon: '#1565C0', text: '#1e3a5f' },
  error:   { bg: '#FEF2F2', border: '#FECACA', icon: '#DC2626', text: '#7f1d1d' },
  success: { bg: '#F0FDF4', border: '#BBF7D0', icon: '#16A34A', text: '#14532d' },
}

function Icon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
  if (variant === 'error') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

export function Toast({ message, variant = 'info', duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const s = styles[variant]

  useEffect(() => {
    // small delay so the enter animation plays
    const show = setTimeout(() => setVisible(true), 10)
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss?.(), 350)
    }, duration)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [duration, onDismiss])

  return (
    <div
      className="fixed top-5 left-4 right-4 z-[100] flex justify-center pointer-events-none"
      style={{ transition: 'opacity 300ms ease, transform 300ms ease', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-12px)' }}
    >
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg pointer-events-auto max-w-sm w-full"
        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.icon }}
      >
        <span className="shrink-0 mt-0.5"><Icon variant={variant} /></span>
        <span className="text-[14px] font-medium leading-snug" style={{ color: s.text }}>{message}</span>
      </div>
    </div>
  )
}
