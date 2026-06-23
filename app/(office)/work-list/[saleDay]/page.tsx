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

  // Reuse the office Work Orders fetch (same party / work_type / animal_type
  // joins), then drop the finished jobs — the chute only sees what's left.
  const penWorks = await fetchPenWorks(supabase, params.saleDay)
  const open = penWorks.filter((pw) => !pw.work_complete)
  const ids = open.map((p) => p.id)

  // Two read-only lookups the chute list needs on top of the work orders:
  //  - workedById: how many animals are recorded on each job so far (the live
  //    count drives the "Not started / In progress" badge and the head text).
  //  - productsById: the special-charge descriptions to show on the job detail.
  const workedById: Record<string, number> = {}
  const productsById: Record<string, string[]> = {}

  // The yard-crew "Up" markers for this sale day (pen_session.is_up), keyed by
  // pen. Scratch yard state only — separate from the chute status, never touches
  // pen_work or billing. A pen with no row is simply not up.
  const upByPenId: Record<string, boolean> = {}
  {
    const { data: sessions } = await supabase
      .from('pen_session')
      .select('pen_id, is_up')
      .eq('sale_day_id', params.saleDay)
    for (const s of sessions ?? []) {
      if (s.pen_id && s.is_up) upByPenId[s.pen_id] = true
    }
  }

  if (ids.length) {
    const [{ data: animals }, { data: charges }] = await Promise.all([
      supabase.from('animal').select('pen_work_id').in('pen_work_id', ids).is('deleted_at', null),
      supabase
        .from('special_charge')
        .select('pen_work_id, description')
        .in('pen_work_id', ids)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
    ])
    for (const a of animals ?? []) {
      if (a.pen_work_id) workedById[a.pen_work_id] = (workedById[a.pen_work_id] ?? 0) + 1
    }
    for (const c of charges ?? []) {
      const d = (c.description ?? '').trim()
      if (!c.pen_work_id || !d) continue
      ;(productsById[c.pen_work_id] ??= []).push(d)
    }
  }

  return (
    <WorkListScreen
      saleDay={pageData.saleDay}
      barn={pageData.barn}
      penWorks={open}
      workedById={workedById}
      productsById={productsById}
      upByPenId={upByPenId}
    />
  )
}
