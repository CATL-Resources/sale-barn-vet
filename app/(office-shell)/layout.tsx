import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Desktop office screens that use the OfficeShell (fixed sidebar + slim top bar).
// Auth-gated and full-bleed. Unlike (office), this layout renders NO AppHeader —
// the page renders <OfficeShell>, which is the only chrome. The chute/capture
// screens are not in here; they keep the mobile layout.
export const dynamic = 'force-dynamic'

export default async function OfficeShellLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <>{children}</>
}
