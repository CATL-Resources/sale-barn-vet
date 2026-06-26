import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// /day has no day of its own — it's the menu's way into the Sale Dashboard.
// Pick the current sale (the most recent open day, falling back to the most
// recent day overall — the same rule the Home hub uses) and send the browser
// to that day's dashboard. With no sale days at all, fall back to Home.
export default async function DayIndexPage() {
  const supabase = createClient()
  const { data: days } = await supabase
    .from('sale_day')
    .select('id, status')
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(100)

  const list = days ?? []
  const current = list.find((d) => d.status === 'open') ?? list[0] ?? null
  redirect(current ? `/day/${current.id}` : '/')
}
