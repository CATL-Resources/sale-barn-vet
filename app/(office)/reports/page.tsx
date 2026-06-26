import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportsHub } from '@/components/reports/reports-hub'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Reports' }

// The Reports hub. Lives in the (office) route group alongside Work Orders, so it
// shares that screen's full-width office layout and styling. The scope selector
// inside the hub picks the sale day(s); there is no sale-day URL param here.
export default async function ReportsPage() {
  const supabase = createClient()
  // The full barn row: the money views need its tax + admin rates for
  // penWorkCharges, and every view shows the barn name.
  const [barnRes, daysRes, workTypeRes, animalTypeRes] = await Promise.all([
    supabase.from('barn').select('*').limit(1).maybeSingle(),
    supabase
      .from('sale_day')
      .select('id, sale_date, status')
      .is('deleted_at', null)
      .order('sale_date', { ascending: false }),
    supabase.from('work_type').select('id, name').order('name'),
    supabase.from('animal_type').select('id, name').order('name'),
  ])

  if (!barnRes.data) notFound()

  return (
    <ReportsHub
      barn={barnRes.data}
      saleDays={daysRes.data ?? []}
      workTypes={workTypeRes.data ?? []}
      animalTypes={animalTypeRes.data ?? []}
    />
  )
}
