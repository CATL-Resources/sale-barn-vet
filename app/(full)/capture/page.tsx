import { createClient } from '@/lib/supabase/server'
import { CaptureScreen } from '@/components/capture/capture-screen'
import { createPen, saveAnimal } from './actions'

export default async function CapturePage() {
  const supabase = createClient()

  const { data: animalTypes } = await supabase
    .from('animal_type')
    .select('id, name')
    .eq('active', true)
    .order('name')
    .returns<{ id: string; name: string }[]>()

  const { data: day } = await supabase
    .from('sale_day')
    .select('id')
    .order('sale_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Seed the duplicate-tag check with the official IDs already worked this sale day.
  let existingOfficialIds: string[] = []
  if (day) {
    const { data: animals } = await supabase
      .from('animal')
      .select('id')
      .eq('sale_day_id', day.id)
      .returns<{ id: string }[]>()
    const animalIds = (animals ?? []).map((a) => a.id)
    if (animalIds.length > 0) {
      const { data: ids } = await supabase
        .from('identifier')
        .select('value')
        .eq('is_official', true)
        .in('animal_id', animalIds)
        .returns<{ value: string }[]>()
      existingOfficialIds = (ids ?? []).map((i) => i.value)
    }
  }

  return (
    <CaptureScreen
      animalTypes={animalTypes ?? []}
      hasSaleDay={!!day}
      existingOfficialIds={existingOfficialIds}
      createPen={createPen}
      saveAnimal={saveAnimal}
    />
  )
}
