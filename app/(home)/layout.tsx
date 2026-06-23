import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/ui/app-header'
import { fetchHeaderInfo } from '@/lib/app-header-info'

// The landing hub (Sale Days) after login. Gets the one shared header on top,
// then its own responsive body.
export const dynamic = 'force-dynamic'

export default async function HomeLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { barnName, subtitle } = await fetchHeaderInfo(supabase)

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader barnName={barnName} subtitle={subtitle} />
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}
