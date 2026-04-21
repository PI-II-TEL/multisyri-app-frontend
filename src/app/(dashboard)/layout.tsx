'use client'

import BottomNav, { COORDINATOR_TABS } from '@/components/BottomNav'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <main className="mx-auto max-w-md pb-32">{children}</main>
      <BottomNav tabs={COORDINATOR_TABS} />
    </div>
  )
}
