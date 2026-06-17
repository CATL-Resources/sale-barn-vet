import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPageData } from '@/lib/work-orders/queries'
import { WorkOrdersScreen } from '@/components/work-orders/work-orders-screen'

export const dynamic = 'force-dynamic'

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function generateMetadata({
  params,
}: {
  params: { saleDay: string }
}): Promise<Metadata> {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) return { title: 'Work orders' }
  return { title: `Work orders — ${pageData.barn.name} · ${longDate(pageData.saleDay.sale_date)}` }
}

export default async function WorkOrdersPage({ params }: { params: { saleDay: string } }) {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) notFound()

  return <WorkOrdersScreen pageData={pageData} saleDayId={params.saleDay} />
}
