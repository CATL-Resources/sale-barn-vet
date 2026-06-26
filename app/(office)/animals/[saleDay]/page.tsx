import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPageData } from '@/lib/work-orders/queries'
import { fetchAnimalRows } from '@/lib/animals/report-data'
import { AnimalsReport } from '@/components/animals/animals-report'

export const dynamic = 'force-dynamic'

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function generateMetadata({ params }: { params: { saleDay: string } }): Promise<Metadata> {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) return { title: 'Animals' }
  return { title: `Animals — ${pageData.barn.name} · ${longDate(pageData.saleDay.sale_date)}` }
}

export default async function AnimalsPage({ params }: { params: { saleDay: string } }) {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) notFound()

  const { rows, hasSecondaryEid } = await fetchAnimalRows(
    supabase,
    params.saleDay,
    pageData.workTypes,
    pageData.animalTypes,
  )

  return (
    <AnimalsReport
      saleDayId={pageData.saleDay.id}
      saleDate={pageData.saleDay.sale_date}
      barnName={pageData.barn.name}
      rows={rows}
      hasSecondaryEid={hasSecondaryEid}
    />
  )
}
