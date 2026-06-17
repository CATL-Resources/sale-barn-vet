import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Wide office screens (e.g. the work-orders board) — auth-gated, full-width,
// no phone frame. Distinct from (full), which constrains to a 390px device frame.
export const dynamic = 'force-dynamic'

export default async function OfficeLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--page)',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1280, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
