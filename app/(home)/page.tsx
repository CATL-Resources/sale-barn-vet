import { createClient } from '@/lib/supabase/server'
import { HomeScreen } from '@/components/home/home-screen'
import { emptyMetrics, fetchAllPenWorkRows, metricsBySale, type SaleMetrics } from '@/lib/dashboard/metrics'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: days }, { data: barn }, pwRows] = await Promise.all([
    supabase
      .from('sale_day')
      .select('id, sale_date, status, notes')
      .is('deleted_at', null)
      .order('sale_date', { ascending: false })
      .limit(100),
    supabase.from('barn').select('name').limit(1).maybeSingle(),
    fetchAllPenWorkRows(supabase),
  ])

  const dayList = days ?? []
  const bySale = metricsBySale(pwRows)
  const metrics: Record<string, SaleMetrics> = {}
  for (const d of dayList) metrics[d.id] = bySale.get(d.id) ?? emptyMetrics()

  // The current sale is the most recent open day, falling back to the most
  // recent day overall (the list is already newest-first).
  const current = dayList.find((d) => d.status === 'open') ?? dayList[0] ?? null

  let currentAnimals = 0
  if (current) {
    const { count } = await supabase
      .from('animal')
      .select('id', { count: 'exact', head: true })
      .eq('sale_day_id', current.id)
      .is('deleted_at', null)
    currentAnimals = count ?? 0
  }

  return (
    <HomeScreen
      days={dayList}
      today={today}
      barnName={barn?.name ?? 'Sale Barn Vet'}
      currentSaleId={current?.id ?? null}
      currentAnimals={currentAnimals}
      metrics={metrics}
    />
  )
}
