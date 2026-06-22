// Shared animal + identifier save path — used by BOTH the chute Capture screen
// and the full-record edit pop-up, so records are written identically no matter
// where they come from. Also holds the duplicate-EID check and the head-count
// sync. This file NEVER writes pen_work.frozen_* or any *_total (billing is
// frozen at completion by the office layer + the DB trigger).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Client = SupabaseClient<Database>

// The five identifier kinds. eid is the only official one (St. Onge = EID barn).
export const ID_TYPES = ['eid', 'secondary_eid', 'back_tag', 'visual_tag', 'metal_tag'] as const
export type IdType = (typeof ID_TYPES)[number]

export type IdentifierInput = { type: IdType; value: string; is_official: boolean }

const nowIso = () => new Date().toISOString()

function formatTime(iso: string): string {
  const d = new Date(iso)
  let h = d.getHours()
  const m = d.getMinutes()
  const ap = h < 12 ? 'a' : 'p'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m.toString().padStart(2, '0')}${ap}`
}

// ---- duplicate EID -------------------------------------------------------

export type DuplicateHit = { eid: string; time: string; status: string }

/**
 * Is this EID already on another non-deleted animal in THIS pen_work? A match
 * under a DIFFERENT work order is fine (the same tag legitimately moves between
 * orders), so we only look inside this one. When editing, pass excludeAnimalId so
 * a record doesn't flag its own tag. Returns the worked-already detail for the
 * flag banner, or null.
 */
export async function findDuplicateEid(
  supabase: Client,
  opts: { barnId: string; penWorkId: string; eid: string; excludeAnimalId?: string },
): Promise<DuplicateHit | null> {
  const value = opts.eid.trim()
  if (!value) return null

  let animalsQ = supabase
    .from('animal')
    .select('id, created_at')
    .eq('pen_work_id', opts.penWorkId)
    .is('deleted_at', null)
  if (opts.excludeAnimalId) animalsQ = animalsQ.neq('id', opts.excludeAnimalId)
  const { data: animals } = await animalsQ
  const createdById = new Map((animals ?? []).map((a) => [a.id, a.created_at as string]))
  if (createdById.size === 0) return null

  const { data: hits } = await supabase
    .from('identifier')
    .select('animal_id')
    .eq('barn_id', opts.barnId)
    .eq('type', 'eid')
    .eq('value', value)
    .is('deleted_at', null)
    .in('animal_id', Array.from(createdById.keys()))
  const hit = (hits ?? [])[0]
  if (!hit) return null

  const created = createdById.get(hit.animal_id) ?? null
  const { data: pw } = await supabase
    .from('pen_work')
    .select('work_complete')
    .eq('id', opts.penWorkId)
    .maybeSingle()
  return {
    eid: value,
    time: created ? formatTime(created) : '',
    status: pw?.work_complete ? 'Complete' : 'Open',
  }
}

// ---- save (create or update) --------------------------------------------

export type AnimalFieldsInput = {
  barn_id: string
  sale_day_id: string
  pen_work_id: string
  animal_type_id: string | null
  color: string | null
  breed: string | null
  age_value: string | null
  age_designation: string | null
  preg_status: string | null
  preg_timing: string | null
  fetal_sex: string | null
  quick_notes: string[]
  notes: string | null
  current_pen_id?: string | null
  created_by?: string | null
}

export type SaveResult = { ok: true; animalId: string } | { ok: false; error: string }

/**
 * Create or update an animal record plus its identifiers.
 * Identifier rule (one active row per type per animal, enforced in code):
 *   - value present  -> update the most-recent non-deleted row in place
 *                       (an EID edit is a correction, no new history), or insert
 *                       one if none exists; older duplicates of that type are
 *                       soft-deleted so only one stays active.
 *   - value cleared  -> soft-delete the active row for that type.
 */
export async function saveAnimalRecord(
  supabase: Client,
  params: { animalId?: string | null; animal: AnimalFieldsInput; identifiers: IdentifierInput[] },
): Promise<SaveResult> {
  const a = params.animal
  const animalRow = {
    barn_id: a.barn_id,
    sale_day_id: a.sale_day_id,
    pen_work_id: a.pen_work_id,
    animal_type_id: a.animal_type_id,
    color: a.color,
    breed: a.breed,
    age_value: a.age_value,
    age_designation: a.age_designation,
    preg_status: a.preg_status,
    preg_timing: a.preg_timing,
    fetal_sex: a.fetal_sex,
    quick_notes: a.quick_notes,
    notes: a.notes,
    current_pen_id: a.current_pen_id ?? null,
  }

  const isUpdate = !!params.animalId
  let animalId = params.animalId ?? null
  if (animalId) {
    const { error } = await supabase.from('animal').update(animalRow).eq('id', animalId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { data, error } = await supabase
      .from('animal')
      .insert({ ...animalRow, created_by: a.created_by ?? null })
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? 'Could not save the animal' }
    animalId = data.id
  }

  if (!isUpdate) {
    // Create: just insert the non-empty identifiers.
    const rows = params.identifiers
      .filter((i) => i.value.trim())
      .map((i) => ({
        animal_id: animalId as string,
        barn_id: a.barn_id,
        type: i.type,
        value: i.value.trim(),
        is_official: i.is_official,
        created_by: a.created_by ?? null,
      }))
    if (rows.length) {
      const { error } = await supabase.from('identifier').insert(rows)
      if (error) return { ok: false, error: error.message }
    }
    return { ok: true, animalId: animalId as string }
  }

  // Update: upsert / soft-delete per type.
  const { data: existing } = await supabase
    .from('identifier')
    .select('id, type, value, created_at')
    .eq('animal_id', animalId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  const byType = new Map<string, { id: string; value: string }[]>()
  for (const r of existing ?? []) {
    const arr = byType.get(r.type) ?? []
    arr.push({ id: r.id, value: r.value })
    byType.set(r.type, arr)
  }

  for (const idf of params.identifiers) {
    const rows = byType.get(idf.type) ?? []
    const current = rows[0]
    const olders = rows.slice(1)
    const v = idf.value.trim()

    // Collapse any older duplicates of this type so only one stays active.
    for (const o of olders) {
      await supabase.from('identifier').update({ deleted_at: nowIso() }).eq('id', o.id)
    }

    if (v) {
      if (current) {
        if (current.value !== v) {
          const { error } = await supabase
            .from('identifier')
            .update({ value: v, is_official: idf.is_official })
            .eq('id', current.id)
          if (error) return { ok: false, error: error.message }
        }
      } else {
        const { error } = await supabase.from('identifier').insert({
          animal_id: animalId,
          barn_id: a.barn_id,
          type: idf.type,
          value: v,
          is_official: idf.is_official,
          created_by: a.created_by ?? null,
        })
        if (error) return { ok: false, error: error.message }
      }
    } else if (current) {
      const { error } = await supabase.from('identifier').update({ deleted_at: nowIso() }).eq('id', current.id)
      if (error) return { ok: false, error: error.message }
    }
  }

  return { ok: true, animalId: animalId as string }
}

/** Soft-delete an animal (recoverable). Leaves identifiers in place. */
export async function softDeleteAnimal(supabase: Client, animalId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('animal').update({ deleted_at: nowIso() }).eq('id', animalId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Keep pen_work.head_worked equal to the live count of non-deleted animals —
 * but ONLY while the order is still open. On a completed order we never touch
 * the count here (head changes on a frozen order belong to the office layer),
 * and we never touch any frozen rate or total column anywhere. Returns the count.
 */
export async function syncHeadWorked(supabase: Client, penWorkId: string): Promise<number> {
  const { count } = await supabase
    .from('animal')
    .select('id', { count: 'exact', head: true })
    .eq('pen_work_id', penWorkId)
    .is('deleted_at', null)
  const live = count ?? 0
  const { data: pw } = await supabase.from('pen_work').select('work_complete').eq('id', penWorkId).maybeSingle()
  if (pw && !pw.work_complete) {
    await supabase.from('pen_work').update({ head_worked: live }).eq('id', penWorkId)
  }
  return live
}

// ---- list ----------------------------------------------------------------

export type CapturedAnimal = {
  id: string
  created_at: string
  animal_type_id: string | null
  color: string | null
  breed: string | null
  age_value: string | null
  age_designation: string | null
  preg_status: string | null
  preg_timing: string | null
  fetal_sex: string | null
  quick_notes: string[]
  notes: string | null
  current_pen_id: string | null
  eid: string | null
  eid2: string | null
  backTag: string | null
  visualTag: string | null
  metalTag: string | null
}

/** Every non-deleted animal on a pen_work, newest first, with its tags pulled out. */
export async function fetchPenWorkAnimals(supabase: Client, penWorkId: string): Promise<CapturedAnimal[]> {
  const { data: animals } = await supabase
    .from('animal')
    .select(
      'id, created_at, animal_type_id, color, breed, age_value, age_designation, preg_status, preg_timing, fetal_sex, quick_notes, notes, current_pen_id',
    )
    .eq('pen_work_id', penWorkId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  const list = animals ?? []
  if (!list.length) return []

  const ids = list.map((a) => a.id)
  const { data: idents } = await supabase
    .from('identifier')
    .select('animal_id, type, value, created_at')
    .in('animal_id', ids)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  type Tags = Pick<CapturedAnimal, 'eid' | 'eid2' | 'backTag' | 'visualTag' | 'metalTag'>
  const empty = (): Tags => ({ eid: null, eid2: null, backTag: null, visualTag: null, metalTag: null })
  const tags = new Map<string, Tags>()
  for (const it of idents ?? []) {
    const cur = tags.get(it.animal_id) ?? empty()
    // idents are newest-first; keep the most recent value per type.
    if (it.type === 'eid' && cur.eid == null) cur.eid = it.value
    else if (it.type === 'secondary_eid' && cur.eid2 == null) cur.eid2 = it.value
    else if (it.type === 'back_tag' && cur.backTag == null) cur.backTag = it.value
    else if (it.type === 'visual_tag' && cur.visualTag == null) cur.visualTag = it.value
    else if (it.type === 'metal_tag' && cur.metalTag == null) cur.metalTag = it.value
    tags.set(it.animal_id, cur)
  }

  return list.map((a) => ({ ...a, ...(tags.get(a.id) ?? empty()) }))
}
