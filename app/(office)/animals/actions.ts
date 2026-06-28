'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
