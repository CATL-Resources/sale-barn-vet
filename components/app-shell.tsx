'use client'

import { useState, type ReactNode } from 'react'
import { TopBar } from '@/components/ui/top-bar'
import { Drawer } from '@/components/ui/drawer'

/**
 * The authenticated app frame every screen mounts into: navy top bar + slide-out
 * nav drawer, constrained to the 390px page over the canvas.
 */
export function AppShell({
  barnName,
  userEmail,
  statusLabel,
  children,
}: {
  barnName: string
  userEmail: string
  statusLabel: string
  children: ReactNode
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="sbv-canvas">
      <div className="sbv-frame">
        <TopBar title={barnName} status={statusLabel} onMenu={() => setDrawerOpen(true)} />
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          userLine={userEmail || barnName}
        />
        <main className="sbv-scroll">{children}</main>
      </div>
    </div>
  )
}
