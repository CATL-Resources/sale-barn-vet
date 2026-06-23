import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { fetchHeaderInfo } from '@/lib/app-header-info'

// Auth-gated and per-user — always render at request time.
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { barnName, subtitle } = await fetchHeaderInfo(supabase)

  return (
    <AppShell barnName={barnName} subtitle={subtitle}>
      {children}
    </AppShell>
  )
}
