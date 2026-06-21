import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/ui/app-header'

// Full-screen task screens (e.g. chuteside Capture). The one shared header sits
// on top; the screen's own controls (work type, progress, close-out) stay below.
export const dynamic = 'force-dynamic'

export default async function FullLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: barn } = await supabase.from('barn').select('name').limit(1).maybeSingle()

  return (
    <div className="sbv-canvas">
      <div className="sbv-frame sbv-frame--task">
        <AppHeader barnName={barn?.name ?? 'Sale Barn Vet'} />
        {children}
      </div>
    </div>
  )
}
