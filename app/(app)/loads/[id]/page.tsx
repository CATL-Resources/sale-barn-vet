import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchLoad, fetchLoadAnimalsWithTags } from '@/lib/loads/queries'
import { LoadDetail } from '@/components/loads/load-detail'

export const dynamic = 'force-dynamic'

export default async function LoadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const load = await fetchLoad(supabase, params.id)
  if (!load) notFound()
  const [{ data: animalTypes }, { data: barn }] = await Promise.all([
    supabase.from('animal_type').select('id, name'),
    supabase.from('barn').select('name').limit(1).maybeSingle(),
  ])
  const animals = await fetchLoadAnimalsWithTags(supabase, params.id, animalTypes ?? [])
  return <LoadDetail load={load} animals={animals} barnName={barn?.name ?? 'Sale Barn Vet'} />
}
