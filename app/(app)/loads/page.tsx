import { createClient } from '@/lib/supabase/server'
import { fetchSaleDays } from '@/lib/work-orders/queries'
import { fetchLoads } from '@/lib/loads/queries'
import { LoadsList } from '@/components/loads/loads-list'

export const dynamic = 'force-dynamic'

// The day's loads. Defaults to the most recent sale day; a day picker switches it
// via ?day=. Read-only list — building and editing happen elsewhere.
export default async function LoadsPage({ searchParams }: { searchParams: { day?: string } }) {
  const supabase = createClient()
  const saleDays = await fetchSaleDays(supabase)
  const dayId = searchParams.day || saleDays[0]?.id || ''
  const loads = dayId ? await fetchLoads(supabase, dayId) : []
  return <LoadsList loads={loads} saleDays={saleDays} dayId={dayId} />
}
