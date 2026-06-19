import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  fetchPageData,
  fetchPenWorks,
  fetchPens,
  fetchSaleDays,
  fetchSpecialCharges,
} from '@/lib/work-orders/queries'
import type { SpecialChargeFull } from '@/lib/work-orders/types'
import { WorkOrdersBoard } from '@/components/work-orders/board/work-orders-board'

export const dynamic = 'force-dynamic'

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function generateMetadata({ params }: { params: { saleDay: string } }): Promise<Metadata> {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) return { title: 'Work orders' }
  return { title: `Work orders — ${pageData.barn.name} · ${longDate(pageData.saleDay.sale_date)}` }
}

export default async function WorkOrdersPage({ params }: { params: { saleDay: string } }) {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) notFound()

  const [penWorks, specials, saleDays, pens] = await Promise.all([
    fetchPenWorks(supabase, params.saleDay),
    fetchSpecialCharges(supabase, params.saleDay),
    fetchSaleDays(supabase),
    fetchPens(supabase, params.saleDay),
  ])

  const specialsByPenWork: Record<string, SpecialChargeFull[]> = {}
  for (const s of specials) {
    if (!s.pen_work_id) continue
    ;(specialsByPenWork[s.pen_work_id] ??= []).push(s)
  }

  return (
    <WorkOrdersBoard
      saleDay={pageData.saleDay}
      saleDays={saleDays}
      barn={pageData.barn}
      workTypes={pageData.workTypes}
      animalTypes={pageData.animalTypes}
      pens={pens}
      penWorks={penWorks}
      specialsByPenWork={specialsByPenWork}
    />
  )
}
