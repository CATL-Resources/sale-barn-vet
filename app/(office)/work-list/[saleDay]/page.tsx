import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPageData, fetchPenWorks } from '@/lib/work-orders/queries'
import { WorkListScreen } from '@/components/work-list/work-list-screen'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { saleDay: string } }): Promise<Metadata> {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  return { title: pageData ? `Work list — ${pageData.barn.name}` : 'Work list' }
}

export default async function WorkListPage({ params }: { params: { saleDay: string } }) {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) notFound()

  const penWorks = await fetchPenWorks(supabase, params.saleDay)
  // "What's left to work" — drop the finished jobs.
  const open = penWorks.filter((pw) => !pw.work_complete)

  return <WorkListScreen saleDay={pageData.saleDay} barn={pageData.barn} penWorks={open} />
}
