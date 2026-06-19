import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// The landing hub after login. Its own responsive shell (the design is a wide
// desktop screen that stacks on mobile), separate from the 390px (app) frame.
export const dynamic = 'force-dynamic'

export default async function HomeLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <>{children}</>
}
