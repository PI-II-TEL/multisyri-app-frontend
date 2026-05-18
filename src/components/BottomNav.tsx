'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Toast } from './Toast'
import type { ReactElement } from 'react'

export interface NavTab {
  href: string
  label: string
  protected?: boolean
  disabled?: boolean
  icon: (active: boolean) => ReactElement
}

export const MONITOR_TABS: NavTab[] = [
  {
    href: '/home',
    label: 'INICIO',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/map',
    label: 'MAPA',
    protected: true,
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
  },
  {
    href: '/support',
    label: 'SOPORTES',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'PERFIL',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export const COORDINATOR_TABS: NavTab[] = [
  {
    href: '/coordinator-map',
    label: 'MAPA',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
  },
  {
    href: '/support',
    label: 'SOPORTES',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
      </svg>
    ),
  },
  {
    href: '/team',
    label: 'EQUIPO',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/buildings',
    label: 'ADMIN',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
      </svg>
    ),
  },
]

interface BottomNavProps {
  tabs?: NavTab[]
}

export default function BottomNav({ tabs = MONITOR_TABS }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showToast, setShowToast] = useState(false)

  function handleTabClick(href: string, isProtected: boolean) {
    if (!isProtected) {
      router.push(href)
      return
    }
    const hasSession = !!localStorage.getItem('active_session')
    if (hasSession) {
      router.push(href)
    } else {
      setShowToast(true)
    }
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-5 px-5 pt-3 z-50">
        <div
          className="flex w-full max-w-sm rounded-[36px] border border-[#E4E4E7] overflow-hidden bg-white"
          style={{ height: 62, padding: 4 }}
        >
          {tabs.map(({ href, label, icon, protected: isProtected = false, disabled = false }) => {
            const active = pathname === href || (pathname.startsWith(href + '/') && href !== '/home')
            return (
              <button
                key={href}
                onClick={() => !disabled && handleTabClick(href, isProtected)}
                disabled={disabled}
                className="flex-1 flex flex-col items-center justify-center gap-1 rounded-[26px] transition-colors disabled:cursor-not-allowed"
                style={{ background: active ? '#0A2463' : 'transparent', opacity: disabled ? 0.35 : 1 }}
              >
                {icon(active)}
                <span
                  className="text-[10px] font-semibold tracking-[0.5px]"
                  style={{ color: active ? '#fff' : '#A1A1AA' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {showToast && (
        <Toast
          message="Debes iniciar un turno antes de acceder al mapa."
          variant="info"
          duration={3000}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </>
  )
}
