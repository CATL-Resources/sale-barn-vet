import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'

// Auth-gated and per-user — always render at request time.
export const dynamic = 'force-dynamic'

function shortDate(iso: string) {
  // iso is 'YYYY-MM-DD' — render like "Jun 14"
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: barn } = await supabase.from('barn').select('name').limit(1).maybeSingle()
  const { data: latestDay } = await supabase
    .from('sale_day')
    .select('sale_date')
    .order('sale_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const statusLabel = latestDay ? `Sale day · ${shortDate(latestDay.sale_date)}` : 'No sale day yet'

  return (
    <AppShell
      barnName={barn?.name ?? 'Sale Barn Vet'}
      userEmail={user.email ?? ''}
      statusLabel={statusLabel}
    >
      {children}
    </AppShell>
  )
}
