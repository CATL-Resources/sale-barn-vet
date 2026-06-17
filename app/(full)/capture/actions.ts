'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CreatePenInput = {
  pen: string
  expected: number | null
  sellerName: string
  animalTypeId: string | null
}

export type SaveAnimalInput = {
  lotId: string
  officialId: string
  secondaryEid: string
  backTag: string
  tagColor: string | null
  pregStatus: 'bred' | 'open' | null
  pregTiming: string | null
  quickNotes: string[]
}

/** Start a pen: create a consignment_lot (the sticky batch) for the current sale day. */
export async function createPen(input: CreatePenInput): Promise<{ lotId: string }> {
  const supabase = createClient()

  const { data: barn } = await supabase.from('barn').select('id').limit(1).maybeSingle()
  if (!barn) throw new Error('No barn visible — is your account a barn member?')

  const { data: day } = await supabase
    .from('sale_day')
    .select('id')
    .order('sale_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!day) throw new Error('No sale day yet — create one on the home screen first.')

  const { data: lot, error } = await supabase
    .from('consignment_lot')
    .insert({
      sale_day_id: day.id,
      barn_id: barn.id,
      pen: input.pen.trim() || null,
      expected_head: input.expected,
      people_names: input.sellerName.trim() || null,
      animal_type_id: input.animalTypeId,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { lotId: lot.id }
}

/** Save one animal (+ its identifiers) into a pen, and return the pen's new head count. */
export async function saveAnimal(input: SaveAnimalInput): Promise<{ count: number }> {
  const supabase = createClient()

  const { data: barn } = await supabase
    .from('barn')
    .select('id, official_id_type')
    .limit(1)
    .maybeSingle()
  if (!barn) throw new Error('No barn visible.')

  const { data: lot } = await supabase
    .from('consignment_lot')
    .select('id, sale_day_id')
    .eq('id', input.lotId)
    .maybeSingle()
  if (!lot) throw new Error('Pen not found.')

  const { data: animal, error: animalErr } = await supabase
    .from('animal')
    .insert({
      sale_day_id: lot.sale_day_id,
      consignment_lot_id: lot.id,
      barn_id: barn.id,
      age_designation: input.tagColor,
      preg_status: input.pregStatus,
      preg_timing: input.pregTiming,
      quick_notes: input.quickNotes,
    })
    .select('id')
    .single()
  if (animalErr) throw new Error(animalErr.message)

  const officialType = barn.official_id_type === 'EID' ? 'official_eid' : 'metal'
  const identifiers: {
    animal_id: string
    barn_id: string
    type: string
    value: string
    is_official: boolean
  }[] = []
  const push = (type: string, value: string, isOfficial: boolean) => {
    const v = value.trim()
    if (v) identifiers.push({ animal_id: animal.id, barn_id: barn.id, type, value: v, is_official: isOfficial })
  }
  push(officialType, input.officialId, true)
  push('secondary_eid', input.secondaryEid, false)
  push('back_tag', input.backTag, false)

  if (identifiers.length > 0) {
    const { error: idErr } = await supabase.from('identifier').insert(identifiers)
    if (idErr) throw new Error(idErr.message)
  }

  const { count } = await supabase
    .from('animal')
    .select('id', { count: 'exact', head: true })
    .eq('consignment_lot_id', lot.id)

  revalidatePath('/')
  return { count: count ?? 0 }
}
