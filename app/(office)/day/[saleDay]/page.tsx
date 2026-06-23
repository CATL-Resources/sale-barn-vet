import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPageData } from '@/lib/work-orders/queries'
import { fetchSaleMetrics } from '@/lib/dashboard/metrics'
import { DayHub } from '@/components/day-hub/day-hub'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { saleDay: string } }): Promise<Metadata> {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  return { title: pageData ? `Sale day — ${pageData.barn.name}` : 'Sale day' }
}

// The Sale Dashboard: one tap from the Hub. Shows the day's metrics and routes to
// the working screens (Work Orders, Pen List, Animals) and Capture. The (office)
// layout guards auth and centers it.
export default async function DayHubPage({ params }: { params: { saleDay: string } }) {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) notFound()
  const metrics = await fetchSaleMetrics(supabase, params.saleDay)
  return <DayHub saleDay={pageData.saleDay} barn={pageData.barn} metrics={metrics} />
}
