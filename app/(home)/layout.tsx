import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/ui/app-header'

// The landing hub (Sale Days) after login. Gets the one shared header on top,
// then its own responsive body.
export const dynamic = 'force-dynamic'

export default async function HomeLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: barn } = await supabase.from('barn').select('name').limit(1).maybeSingle()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader barnName={barn?.name ?? 'Sale Barn Vet'} />
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}
