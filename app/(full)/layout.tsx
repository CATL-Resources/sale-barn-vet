import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Full-screen task screens (the chuteside Capture). No shared top bar here — the
// chute needs every row it can get for the scan box and the ID fields, and the
// screen already has its own header (back to the Pen List, the pen + consignor,
// and the running count). The barn-name bar stays on the office screens, which
// live in the other layouts.
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
      <div className="sbv-frame sbv-frame--task">{children}</div>
    </div>
  )
}
