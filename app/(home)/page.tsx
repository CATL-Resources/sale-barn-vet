import { createClient } from '@/lib/supabase/server'
import { HomeScreen } from '@/components/home/home-screen'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()
  const { data: days } = await supabase
    .from('sale_day')
    .select('id, sale_date, status, notes')
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(100)

  return <HomeScreen days={days ?? []} today={new Date().toISOString().slice(0, 10)} />
}
