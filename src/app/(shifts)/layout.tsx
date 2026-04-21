import type { ReactNode } from 'react'

export default function ShiftsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {children}
    </div>
  )
}
