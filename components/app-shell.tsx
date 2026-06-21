import type { ReactNode } from 'react'
import { AppHeader } from '@/components/ui/app-header'

/**
 * The authenticated app frame for the 390px phone screens: the one shared
 * header over the scrolling body.
 */
export function AppShell({ barnName, children }: { barnName: string; children: ReactNode }) {
  return (
    <div className="sbv-canvas">
      <div className="sbv-frame">
        <AppHeader barnName={barnName} />
        <main className="sbv-scroll">{children}</main>
      </div>
    </div>
  )
}
