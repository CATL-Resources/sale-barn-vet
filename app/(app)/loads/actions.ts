'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/types/supabase'

// Everything here is paperwork only. It writes the buyer_load table and the
// animal.buyer_load_id link, and nothing else — never pen_work, a frozen charge,
// head_billed, or which owner an animal is billed under. RLS scopes all of it to
// the signed-in member's barn.

export type BuyerNumberMatch = {
  id: string
  number: string
  partyId: string
  partyName: string
  typicalDestination: string | null
  typicalState: string | null
}

/** Search recorded buyer numbers by the number or the buyer's name. */
export async function searchBuyerNumbers(query: string): Promise<BuyerNumberMatch[]> {
  const supabase = createClient()
  const q = query.trim().replace(/[,()*%\\]/g, ' ').trim()
  if (!q) return []

  const byNumber = await supabase
    .from('buyer_number')
    .select('id, number, party_id, typical_destination, typical_state')
    .is('deleted_at', null)
    .ilike('number', `%${q}%`)
    .limit(20)

  // Also match on the buyer's name: find the parties, then their numbers.
  const { data: parties } = await supabase
    .from('party')
    .select('id, name')
    .is('deleted_at', null)
    .or(`name.ilike.%${q}%,customer_number.ilike.${q}%`)
    .limit(20)
  const partyIds = (parties ?? []).map((p) => p.id)
  const byParty = partyIds.length
    ? await supabase
        .from('buyer_number')
        .select('id, number, party_id, typical_destination, typical_state')
        .is('deleted_at', null)
        .in('party_id', partyIds)
        .limit(40)
    : { data: [] as NonNullable<typeof byNumber.data> }

  const merged = new Map<string, NonNullable<typeof byNumber.data>[number]>()
  for (const n of [...(byNumber.data ?? []), ...(byParty.data ?? [])]) merged.set(n.id, n)
  const rows = [...merged.values()]
  if (rows.length === 0) return []

  const nameById = new Map((parties ?? []).map((p) => [p.id, p.name]))
  const missing = rows.map((r) => r.party_id).filter((id) => !nameById.has(id))
  if (missing.length) {
    const { data: more } = await supabase.from('party').select('id, name').in('id', missing)
    for (const p of more ?? []) nameById.set(p.id, p.name)
  }

  return rows
    .map((r) => ({
      id: r.id,
      number: r.number,
      partyId: r.party_id,
      partyName: nameById.get(r.party_id) ?? '',
      typicalDestination: r.typical_destination,
      typicalState: r.typical_state,
    }))
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    .slice(0, 30)
}

export type AssignInput = {
  buyerNumberId: string | null
  buyerNumberText: string
  buyerPartyId: string | null
  destinationName: string
  destinationState: string
  expectedHead: number | null
}
export type AssignResult = { ok: true; loadId: string; assigned: number } | { ok: false; error: string }

/**
 * Put the selected animals on a load for one buyer number on one sale day. Adds
 * to the existing load for that buyer number if there is one, otherwise creates
 * it. An animal already on another load is moved (never duplicated). Writes only
 * buyer_load and animal.buyer_load_id.
 */
export async function assignAnimalsToLoad(animalIds: string[], input: AssignInput): Promise<AssignResult> {
  const ids = [...new Set(animalIds.filter((id) => typeof id === 'string' && id))]
  if (ids.length === 0) return { ok: false, error: 'No animals selected' }
  const numberText = input.buyerNumberText.trim()
  if (!input.buyerNumberId && !numberText) return { ok: false, error: 'Pick or type a buyer number' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in' }

  // A load is one sale day. Derive it from the animals and refuse a mixed pick.
  const { data: animals, error: aErr } = await supabase
    .from('animal')
    .select('id, sale_day_id, barn_id')
    .in('id', ids)
    .is('deleted_at', null)
  if (aErr) return { ok: false, error: aErr.message }
  if (!animals || animals.length === 0) return { ok: false, error: 'Nothing to assign' }
  const saleDays = [...new Set(animals.map((a) => a.sale_day_id))]
  if (saleDays.length > 1) return { ok: false, error: 'Those animals are from more than one sale day' }
  const saleDayId = saleDays[0]
  const barnId = animals[0].barn_id

  // Find the load for this buyer number on the day (recorded number by id, else
  // free-typed by text), or make a new one.
  let loadId: string
  const finder = supabase.from('buyer_load').select('id').eq('sale_day_id', saleDayId).is('deleted_at', null)
  const { data: existing } = input.buyerNumberId
    ? await finder.eq('buyer_number_id', input.buyerNumberId).limit(1).maybeSingle()
    : await finder.is('buyer_number_id', null).ilike('buyer_number_text', numberText).limit(1).maybeSingle()

  if (existing) {
    loadId = existing.id
  } else {
    const row: TablesInsert<'buyer_load'> = {
      barn_id: barnId,
      sale_day_id: saleDayId,
      buyer_party_id: input.buyerPartyId,
      buyer_number_id: input.buyerNumberId,
      buyer_number_text: numberText || null,
      destination_name: input.destinationName.trim() || null,
      destination_state: input.destinationState.trim() || null,
      expected_head: input.expectedHead,
    }
    const { data: created, error: cErr } = await supabase.from('buyer_load').insert(row).select('id').single()
    if (cErr || !created) return { ok: false, error: cErr?.message ?? 'Could not make the load' }
    loadId = created.id
  }

  const { error: uErr } = await supabase
    .from('animal')
    .update({ buyer_load_id: loadId, updated_at: new Date().toISOString() })
    .in('id', ids)
    .is('deleted_at', null)
  if (uErr) return { ok: false, error: uErr.message }

  revalidatePath('/loads')
  revalidatePath('/reports')
  return { ok: true, loadId, assigned: ids.length }
}

export type LoadEdit = {
  destinationName: string
  destinationState: string
  destinationAddress: string
  expectedHead: number | null
  notes: string
}
export type OkResult = { ok: true } | { ok: false; error: string }

/** Edit a load's destination, expected head, and notes. Paperwork only. */
export async function updateLoad(id: string, edit: LoadEdit): Promise<OkResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in' }
  const { error } = await supabase
    .from('buyer_load')
    .update({
      destination_name: edit.destinationName.trim() || null,
      destination_state: edit.destinationState.trim() || null,
      destination_address: edit.destinationAddress.trim() || null,
      expected_head: edit.expectedHead,
      notes: edit.notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/loads')
  revalidatePath(`/loads/${id}`)
  return { ok: true }
}

/** Take animals off a load (clears their buyer_load_id). The animals stay. */
export async function unassignAnimals(animalIds: string[]): Promise<OkResult> {
  const ids = [...new Set(animalIds.filter((id) => typeof id === 'string' && id))]
  if (ids.length === 0) return { ok: false, error: 'No animals selected' }
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in' }
  const { error } = await supabase
    .from('animal')
    .update({ buyer_load_id: null, updated_at: new Date().toISOString() })
    .in('id', ids)
    .is('deleted_at', null)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/loads')
  revalidatePath('/reports')
  return { ok: true }
}

/** Delete a load (soft delete) and take its animals off it — the animals stay. */
export async function deleteLoad(id: string): Promise<OkResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in' }
  // Clear the link first so no animal points at a deleted load.
  const { error: clearErr } = await supabase
    .from('animal')
    .update({ buyer_load_id: null, updated_at: new Date().toISOString() })
    .eq('buyer_load_id', id)
    .is('deleted_at', null)
  if (clearErr) return { ok: false, error: clearErr.message }
  const { error } = await supabase
    .from('buyer_load')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/loads')
  revalidatePath('/reports')
  return { ok: true }
}
