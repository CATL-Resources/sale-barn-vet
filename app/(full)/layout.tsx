import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Full-screen task screens (e.g. chuteside Capture) — their own chrome, no menu shell.
export const dynamic = 'force-dynamic'

export default async function FullLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="sbv-canvas">
      <div className="sbv-frame">{children}</div>
    </div>
  )
}
