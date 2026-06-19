'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const round2 = (n: number) => Math.round(n * 100) / 100

export type PartyMatch = { id: string; name: string; customer_number: string | null; state: string | null }
export type PartyLocation = {
  id: string
  label: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  is_po_box: boolean
  is_physical: boolean
  is_default: boolean
}

export type SpecialInput = {
  description: string
  head: number
  perHead: number
  bucket: 'vet' | 'admin' | 'sol'
}

export type WorkOrderInput = {
  id?: string | null
  saleDayId: string
  role: 'seller' | 'buyer'
  partyId: string | null
  buyerNumberText: string | null
  originLocationId: string | null
  workTypeId: string | null
  animalTypeId: string | null
  headExpected: number | null
  penText: string | null
  notes: string | null
  newSpecials: SpecialInput[]
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string }

/** Search the barn's customers by name or customer number (RLS scopes to the barn). */
export async function searchParties(query: string): Promise<PartyMatch[]> {
  const supabase = createClient()
  // Strip characters that would break a PostgREST or() filter.
  const q = query.trim().replace(/[,()*%\\]/g, ' ').trim()
  if (!q) return []
  const { data } = await supabase
    .from('party')
    .select('id, name, customer_number, state')
    .is('deleted_at', null)
    .or(`name.ilike.%${q}%,customer_number.ilike.${q}%`)
    .order('name')
    .limit(8)
  return data ?? []
}

/** Add a new customer (no customer number yet — auto-numbering is a separate TODO). */
export async function createParty(
  name: string,
): Promise<{ ok: true; party: PartyMatch } | { ok: false; error: string }> {
  const supabase = createClient()
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Enter a name first.' }
  const { data: barn } = await supabase.from('barn').select('id').limit(1).maybeSingle()
  if (!barn) return { ok: false, error: 'No barn is visible for your account.' }
  const { data, error } = await supabase
    .from('party')
    .insert({ barn_id: barn.id, name: trimmed })
    .select('id, name, customer_number, state')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, party: data }
}

/** Every location on file for a customer — including PO boxes (none are hidden or blocked). */
export async function getPartyLocations(partyId: string): Promise<PartyLocation[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('party_location')
    .select('id, label, address, city, state, zip, is_po_box, is_physical, is_default')
    .eq('party_id', partyId)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
  return data ?? []
}

/**
 * Create or edit a work order (pen_work). This is an ORDER, not completed work:
 * it never writes frozen_vet_charge / frozen_sol_charge / frozen_admin_rate /
 * frozen_tax_rate (the *_total columns are generated and can't be written
 * either). Those freeze later, at completion. Per-barn RLS scopes every write.
 */
export async function saveWorkOrder(input: WorkOrderInput): Promise<SaveResult> {
  const supabase = createClient()

  if (!input.partyId) return { ok: false, error: 'Pick a consignor or buyer first.' }

  const { data: barn } = await supabase.from('barn').select('id').limit(1).maybeSingle()
  if (!barn) return { ok: false, error: 'No barn is visible for your account.' }
  const barnId = barn.id

  // Resolve the pen: reuse an existing one for this sale day, or make a new one.
  let penId: string | null = null
  const penText = input.penText?.trim()
  if (penText) {
    const { data: existing } = await supabase
      .from('pen')
      .select('id')
      .eq('sale_day_id', input.saleDayId)
      .is('deleted_at', null)
      .ilike('pen_number', penText)
      .limit(1)
    if (existing && existing.length > 0) {
      penId = existing[0].id
    } else {
      const { data: created, error } = await supabase
        .from('pen')
        .insert({ barn_id: barnId, sale_day_id: input.saleDayId, pen_number: penText })
        .select('id')
        .single()
      if (error) return { ok: false, error: `Pen — ${error.message}` }
      penId = created.id
    }
  }

  const isBuyer = input.role === 'buyer'
  const payload = {
    barn_id: barnId,
    sale_day_id: input.saleDayId,
    pen_id: penId,
    seller_party_id: isBuyer ? null : input.partyId,
    buyer_party_id: isBuyer ? input.partyId : null,
    buyer_number_text: isBuyer ? (input.buyerNumberText?.trim() || null) : null,
    origin_location_id: input.originLocationId,
    work_type_id: input.workTypeId,
    animal_type_id: input.animalTypeId,
    head_expected: input.headExpected,
    notes: input.notes?.trim() || null,
    origin: 'office',
  }

  let penWorkId: string
  if (input.id) {
    const { error } = await supabase.from('pen_work').update(payload).eq('id', input.id)
    if (error) return { ok: false, error: `Work order — ${error.message}` }
    penWorkId = input.id
  } else {
    const { data, error } = await supabase.from('pen_work').insert(payload).select('id').single()
    if (error) return { ok: false, error: `Work order — ${error.message}` }
    penWorkId = data.id
  }

  // Insert any new special charges, each tied to this work order.
  const rows = input.newSpecials
    .filter((s) => s.description.trim() !== '' && s.head > 0)
    .map((s) => {
      const total = round2(s.perHead * s.head)
      return {
        sale_day_id: input.saleDayId,
        barn_id: barnId,
        pen_work_id: penWorkId,
        party_id: input.partyId,
        role: input.role,
        description: s.description.trim(),
        head: s.head,
        customer_charge: total,
        vet_total: s.bucket === 'vet' ? total : 0,
        admin_total: s.bucket === 'admin' ? total : 0,
        sol_total: s.bucket === 'sol' ? total : 0,
      }
    })
  if (rows.length > 0) {
    const { error } = await supabase.from('special_charge').insert(rows)
    if (error) return { ok: false, error: `Special charge — ${error.message}` }
  }

  revalidatePath(`/work-orders/${input.saleDayId}`)
  return { ok: true, id: penWorkId }
}
