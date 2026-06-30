'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isBredStage } from '@/lib/capture/types'
import type { Database } from '@/types/supabase'

type AnimalUpdate = Database['public']['Tables']['animal']['Update']

export type DeleteResult = { ok: true; deleted: number } | { ok: false; error: string }

/**
 * Delete one or more animals from the office. This is a soft delete: each animal
 * row gets a deleted_at stamp, so the record is recoverable and never truly gone.
 * A database trigger soft-deletes the animal's identifiers (EID, back tag, etc.)
 * at the same time, so a removed animal's tags stop showing up anywhere and stop
 * counting as duplicates.
 *
 * After the delete we put each affected work order's worked-head count back in
 * step with the animals that are actually left — but ONLY while the order is still
 * open. A finished order's billed head count is frozen and we never touch it here
 * (changing a finished bill is the office layer's job), exactly like the chuteside
 * remove. The office can still delete an animal off a finished order (that's how
 * the chute is locked out and why test animals were stuck); the bill just holds.
 *
 * RLS scopes everything to the signed-in member's barn, so this can only ever
 * reach that barn's animals.
 */
export async function deleteAnimals(animalIds: string[]): Promise<DeleteResult> {
  const ids = [...new Set(animalIds.filter((id) => typeof id === 'string' && id))]
  if (ids.length === 0) return { ok: false, error: 'No animals selected' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in' }

  // The work orders these animals belong to, so we can re-count them afterward.
  const { data: animals, error: lookupErr } = await supabase
    .from('animal')
    .select('id, pen_work_id')
    .in('id', ids)
    .is('deleted_at', null)
  if (lookupErr) return { ok: false, error: lookupErr.message }
  if (!animals || animals.length === 0) return { ok: false, error: 'Nothing to delete' }

  const penWorkIds = [...new Set(animals.map((a) => a.pen_work_id).filter((x): x is string => !!x))]

  const { error: delErr } = await supabase
    .from('animal')
    .update({ deleted_at: new Date().toISOString() })
    .in(
      'id',
      animals.map((a) => a.id),
    )
  if (delErr) return { ok: false, error: delErr.message }

  // Keep head_worked equal to the live count on every still-open order touched.
  for (const pwId of penWorkIds) {
    const { count } = await supabase
      .from('animal')
      .select('id', { count: 'exact', head: true })
      .eq('pen_work_id', pwId)
      .is('deleted_at', null)
    const { data: pw } = await supabase
      .from('pen_work')
      .select('work_complete')
      .eq('id', pwId)
      .maybeSingle()
    if (pw && !pw.work_complete) {
      await supabase.from('pen_work').update({ head_worked: count ?? 0 }).eq('id', pwId)
    }
  }

  // Refresh the office views that list animals so the removed rows drop out.
  revalidatePath('/reports')

  return { ok: true, deleted: animals.length }
}

// The animal attributes the office can change in bulk. This is exactly the
// single-animal edit field set (the shared AnimalAttributes card + quick notes +
// the free note) — no identifiers, and nothing tied to the work order, the
// owner/buyer, billing, or which pen the animal sits in.
export type BatchField =
  | 'color'
  | 'breed'
  | 'age_designation'
  | 'preg_status'
  | 'preg_timing'
  | 'fetal_sex'
  | 'quick_notes'
  | 'notes'

const SINGLE_FIELDS = new Set<BatchField>([
  'color',
  'breed',
  'age_designation',
  'preg_status',
  'preg_timing',
  'fetal_sex',
  'notes',
])

export type BatchEditResult = { ok: true; updated: number } | { ok: false; error: string }

/**
 * Set one shared field across many animals at once. Only the per-animal
 * attribute fields above can be set — anything else is refused. This never
 * touches a work order, a frozen charge, an identifier (EID/tag), the animal's
 * type, or which owner/buyer/pen it belongs to, so there is no money path here.
 *
 * Quick notes are a list, so this ADDS the chosen note to each selected animal
 * that doesn't already have it (it never wipes the notes already on a row). Every
 * other field is a straight set across the whole selection. Setting a stage that
 * isn't a bred stage also clears Month bred, the same as the single-animal edit.
 *
 * RLS scopes everything to the signed-in member's barn.
 */
export async function updateAnimalsBatch(
  animalIds: string[],
  field: BatchField,
  value: string | null,
): Promise<BatchEditResult> {
  const ids = [...new Set(animalIds.filter((id) => typeof id === 'string' && id))]
  if (ids.length === 0) return { ok: false, error: 'No animals selected' }
  if (field !== 'quick_notes' && !SINGLE_FIELDS.has(field)) {
    return { ok: false, error: 'That field can’t be batch edited' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in' }

  const v = typeof value === 'string' ? value.trim() : ''

  // Quick notes: add the label to each selected animal that doesn't have it yet,
  // keeping the rest of that animal's notes.
  if (field === 'quick_notes') {
    if (!v) return { ok: false, error: 'Pick a quick note to add' }
    const { data: rows, error } = await supabase
      .from('animal')
      .select('id, quick_notes')
      .in('id', ids)
      .is('deleted_at', null)
    if (error) return { ok: false, error: error.message }
    const missing = (rows ?? []).filter((r) => !(r.quick_notes ?? []).includes(v))
    let updated = 0
    for (const r of missing) {
      const next = [...(r.quick_notes ?? []), v]
      const { error: e } = await supabase
        .from('animal')
        .update({ quick_notes: next, updated_at: new Date().toISOString() })
        .eq('id', r.id)
        .is('deleted_at', null)
      if (e) return { ok: false, error: e.message }
      updated += 1
    }
    revalidatePath('/reports')
    return { ok: true, updated }
  }

  // Every other field is a single set across the whole selection.
  const patch: AnimalUpdate = { [field]: v || null, updated_at: new Date().toISOString() }
  // A non-bred stage has no Month bred — clear it, matching the single edit.
  if (field === 'preg_status' && !isBredStage(v || null)) patch.preg_timing = null

  const { data, error } = await supabase
    .from('animal')
    .update(patch)
    .in('id', ids)
    .is('deleted_at', null)
    .select('id')
  if (error) return { ok: false, error: error.message }

  revalidatePath('/reports')
  return { ok: true, updated: data?.length ?? 0 }
}
