'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/types/supabase'

const round2 = (n: number) => Math.round(n * 100) / 100

export type PartyMatch = { id: string; name: string; customer_number: string | null; city: string | null; state: string | null }
export type PartyLocation = {
  id: string
  label: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  premise_id: string | null
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
  const { data: parties } = await supabase
    .from('party')
    .select('id, name, customer_number')
    .is('deleted_at', null)
    .or(`name.ilike.%${q}%,customer_number.ilike.${q}%`)
    .order('name')
    .limit(30)
  const list = parties ?? []
  if (list.length === 0) return []

  // City + state from each customer's default location (fall back to any) — so
  // the office can tell two same-named customers apart.
  const { data: locs } = await supabase
    .from('party_location')
    .select('party_id, city, state, is_default')
    .in('party_id', list.map((p) => p.id))
    .is('deleted_at', null)
  const place = new Map<string, { city: string | null; state: string | null }>()
  for (const l of locs ?? []) {
    if (!place.has(l.party_id) || l.is_default) place.set(l.party_id, { city: l.city, state: l.state })
  }
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    customer_number: p.customer_number,
    city: place.get(p.id)?.city ?? null,
    state: place.get(p.id)?.state ?? null,
  }))
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
  return { ok: true, party: { ...data, city: null } }
}

/** Every location on file for a customer — including PO boxes (none are hidden or blocked). */
export async function getPartyLocations(partyId: string): Promise<PartyLocation[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('party_location')
    .select('id, label, address, city, state, zip, premise_id, is_po_box, is_physical, is_default')
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

export type LocationInput = {
  id?: string | null
  partyId: string
  label: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  premiseId: string | null
  isPoBox: boolean
  isDefault: boolean
}

const LOC_COLUMNS = 'id, label, address, city, state, zip, premise_id, is_po_box, is_physical, is_default'

/**
 * Add or edit a location for a customer — used both inline on the work order and
 * in the customer popup. A PO box is allowed and stays on file; it's just marked
 * not-physical (never blocked). Only one default per customer.
 */
export async function upsertLocation(
  input: LocationInput,
): Promise<{ ok: true; location: PartyLocation } | { ok: false; error: string }> {
  const supabase = createClient()
  const row = {
    party_id: input.partyId,
    label: input.label?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    zip: input.zip?.trim() || null,
    premise_id: input.premiseId?.trim() || null,
    is_po_box: input.isPoBox,
    is_physical: !input.isPoBox,
    is_default: input.isDefault,
  }
  if (input.isDefault) {
    await supabase.from('party_location').update({ is_default: false }).eq('party_id', input.partyId).is('deleted_at', null)
  }
  if (input.id) {
    const { data, error } = await supabase.from('party_location').update(row).eq('id', input.id).select(LOC_COLUMNS).single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, location: data }
  }
  const { data, error } = await supabase.from('party_location').insert(row).select(LOC_COLUMNS).single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, location: data }
}

/**
 * Edit a customer's own details. The customer number is the stable identity and
 * is never changed here.
 */
export async function updateParty(input: {
  id: string
  name: string
  phone: string | null
  email: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  if (!input.name.trim()) return { ok: false, error: 'Name is required.' }
  const { error } = await supabase
    .from('party')
    .update({ name: input.name.trim(), phone: input.phone?.trim() || null, email: input.email?.trim() || null })
    .eq('id', input.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export type PartyDetail = {
  id: string
  name: string
  customer_number: string | null
  phone: string | null
  email: string | null
  locations: PartyLocation[]
}

export type SetBilledResult = { ok: true } | { ok: false; error: string }

/**
 * Set a line's billed count — the office's number, independent of the chute's
 * head_worked. Office detail only; the chute never calls this.
 *
 * - head_worked is never touched, and the frozen_* RATE columns are never written.
 * - The bill follows head_billed through pricing.ts (penWorkCharges), which
 *   prices a finished line from the FROZEN rates times the billed head. We do NOT
 *   write the vet/admin/sol/total columns: they are GENERATED from head_worked and
 *   can't be written or made to track head_billed. So this action only stores the
 *   billed count; pricing reflects it everywhere the charge is shown.
 * - Records the change in pen_work_adjustment (kind='set_billed', old -> new).
 *
 * Per-barn RLS scopes every write.
 */
export async function setHeadBilled(penWorkId: string, headBilled: number | null): Promise<SetBilledResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: pw, error: readErr } = await supabase
    .from('pen_work')
    .select('barn_id, sale_day_id, head_worked, head_billed')
    .eq('id', penWorkId)
    .is('deleted_at', null)
    .maybeSingle()
  if (readErr) return { ok: false, error: readErr.message }
  if (!pw) return { ok: false, error: 'Work order not found.' }

  const { error: upErr } = await supabase
    .from('pen_work')
    .update({ head_billed: headBilled })
    .eq('id', penWorkId)
  if (upErr) return { ok: false, error: upErr.message }

  // Audit the change: old billed (or worked, if billed was unset) -> new.
  const fromValue = pw.head_billed ?? pw.head_worked
  await supabase.from('pen_work_adjustment').insert({
    barn_id: pw.barn_id,
    sale_day_id: pw.sale_day_id,
    pen_work_id: penWorkId,
    kind: 'set_billed',
    from_value: fromValue == null ? null : String(fromValue),
    to_value: headBilled == null ? null : String(headBilled),
    reason: null,
    created_by: user?.id ?? null,
  })

  revalidatePath(`/work-orders/${pw.sale_day_id}`)
  return { ok: true }
}

export type ResolveMode = 'accept_actual' | 'approve_difference'
export type ResolveResult = { ok: true } | { ok: false; error: string }

/**
 * Resolve a count-mismatch line (office, slice 2). Both paths set
 * line_status='resolved' and audit a status_change; neither writes a frozen rate.
 * The bill follows head_billed through pricing.ts, so we never persist the
 * generated *_total columns.
 *  - accept_actual: bill what was worked (head_billed = head_worked).
 *  - approve_difference: keep head_billed as-is, but a typed reason is REQUIRED.
 */
export async function resolveLine(penWorkId: string, mode: ResolveMode, reason?: string): Promise<ResolveResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const note = reason?.trim() ?? ''
  if (mode === 'approve_difference' && !note) {
    return { ok: false, error: 'A reason is required to approve the difference.' }
  }

  const { data: pw, error: readErr } = await supabase
    .from('pen_work')
    .select('barn_id, sale_day_id, head_worked, line_status')
    .eq('id', penWorkId)
    .is('deleted_at', null)
    .maybeSingle()
  if (readErr) return { ok: false, error: readErr.message }
  if (!pw) return { ok: false, error: 'Work order not found.' }

  const update: { line_status: string; head_billed?: number | null } = { line_status: 'resolved' }
  if (mode === 'accept_actual') update.head_billed = pw.head_worked

  const { error: upErr } = await supabase.from('pen_work').update(update).eq('id', penWorkId)
  if (upErr) return { ok: false, error: upErr.message }

  await supabase.from('pen_work_adjustment').insert({
    barn_id: pw.barn_id,
    sale_day_id: pw.sale_day_id,
    pen_work_id: penWorkId,
    kind: 'status_change',
    from_value: pw.line_status,
    to_value: 'resolved',
    reason: mode === 'accept_actual' ? 'accept actual' : note,
    created_by: user?.id ?? null,
  })

  revalidatePath(`/work-orders/${pw.sale_day_id}`)
  return { ok: true }
}

export type MoveHeadInput = {
  sourceId: string
  n: number
  // Either move to an existing line, or create a line for this owner in the pen.
  targetId?: string | null
  targetPartyId?: string | null
  targetRole?: 'seller' | 'buyer'
  reason?: string | null
}
export type MoveResult = { ok: true; targetId: string } | { ok: false; error: string }

/**
 * Move N head from one owner's line to another WITHIN THE SAME PEN (slice 2 move
 * engine — how a mixed pen gets sorted). Only head_billed moves: source down by
 * N, target up by N. The *_total columns are generated from head_worked and can't
 * be written, so we never persist them — pricing.ts charges each line from its
 * frozen rate × (head_billed ?? head_worked). Frozen rate columns are untouched.
 * Writes one pen_work_adjustment (kind='move', target line, source_pen_work_id,
 * head_delta). If the target owner has no line in the pen yet, one is created.
 */
export async function moveHead(input: MoveHeadInput): Promise<MoveResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const n = Math.trunc(input.n)
  if (!(n > 0)) return { ok: false, error: 'Enter a head count greater than zero.' }

  const { data: source, error: srcErr } = await supabase
    .from('pen_work')
    .select('id, barn_id, sale_day_id, pen_id, head_worked, head_billed')
    .eq('id', input.sourceId)
    .is('deleted_at', null)
    .maybeSingle()
  if (srcErr) return { ok: false, error: srcErr.message }
  if (!source) return { ok: false, error: 'Source line not found.' }

  const srcBilled = source.head_billed ?? source.head_worked ?? 0
  if (n > srcBilled) return { ok: false, error: `Can't move ${n} — that line only bills ${srcBilled}.` }

  // Resolve (or create) the target line, in the SAME pen + sale day.
  let target: { id: string; head_worked: number | null; head_billed: number | null }
  if (input.targetId) {
    const { data, error } = await supabase
      .from('pen_work')
      .select('id, pen_id, sale_day_id, head_worked, head_billed')
      .eq('id', input.targetId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: 'Target line not found.' }
    if (data.pen_id !== source.pen_id || data.sale_day_id !== source.sale_day_id) {
      return { ok: false, error: 'The target line must be in the same pen and sale day.' }
    }
    target = { id: data.id, head_worked: data.head_worked, head_billed: data.head_billed }
  } else if (input.targetPartyId && input.targetRole) {
    const payload: TablesInsert<'pen_work'> = {
      barn_id: source.barn_id,
      sale_day_id: source.sale_day_id,
      pen_id: source.pen_id,
      origin: 'office',
    }
    if (input.targetRole === 'buyer') payload.buyer_party_id = input.targetPartyId
    else payload.seller_party_id = input.targetPartyId
    const { data, error } = await supabase.from('pen_work').insert(payload).select('id, head_worked, head_billed').single()
    if (error || !data) return { ok: false, error: error?.message ?? 'Could not create the target line.' }
    target = { id: data.id, head_worked: data.head_worked, head_billed: data.head_billed }
  } else {
    return { ok: false, error: 'Pick an owner to move the head to.' }
  }

  const tgtBilled = target.head_billed ?? target.head_worked ?? 0

  // Apply: head_billed only. pricing.ts turns these into the charges.
  const { error: e1 } = await supabase.from('pen_work').update({ head_billed: srcBilled - n }).eq('id', source.id)
  if (e1) return { ok: false, error: e1.message }
  const { error: e2 } = await supabase.from('pen_work').update({ head_billed: tgtBilled + n }).eq('id', target.id)
  if (e2) return { ok: false, error: e2.message }

  await supabase.from('pen_work_adjustment').insert({
    barn_id: source.barn_id,
    sale_day_id: source.sale_day_id,
    pen_work_id: target.id,
    source_pen_work_id: source.id,
    kind: 'move',
    head_delta: n,
    reason: input.reason?.trim() || null,
    created_by: user?.id ?? null,
  })

  revalidatePath(`/work-orders/${source.sale_day_id}`)
  return { ok: true, targetId: target.id }
}

/** Soft-delete a work order (set deleted_at). Per-barn RLS scopes the write. */
export async function deleteWorkOrder(penWorkId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('pen_work')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', penWorkId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Full info for the customer popup (details + every location). */
export async function getPartyDetail(partyId: string): Promise<PartyDetail | null> {
  const supabase = createClient()
  const { data: p } = await supabase
    .from('party')
    .select('id, name, customer_number, phone, email')
    .eq('id', partyId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!p) return null
  const locations = await getPartyLocations(partyId)
  return { ...p, locations }
}

// One animal recorded on a work order, with its tags pulled out so the office
// can copy/paste them onto health papers.
export type PenWorkAnimal = {
  animalId: string
  eid: string | null
  eid2: string | null
  backTag: string | null
  visualTag: string | null
  metalTag: string | null
  color: string | null
  breed: string | null
  age: string | null
  pregStatus: string | null
  pregTiming: string | null
  sortPen: string | null
}

/**
 * Every animal worked under one work order, in the order they went through the
 * chute, with EID / back tag / tag # / metal tag pulled onto each row. Read-only;
 * RLS scopes to the barn. This is the source for the "Animal list" export.
 */
export async function getPenWorkAnimals(penWorkId: string): Promise<PenWorkAnimal[]> {
  const supabase = createClient()
  const { data: animals } = await supabase
    .from('animal')
    .select('id, color, breed, age_designation, preg_status, preg_timing, pen, created_at')
    .eq('pen_work_id', penWorkId)
    .is('deleted_at', null)
    .order('created_at')
  const list = animals ?? []
  if (list.length === 0) return []

  const ids = list.map((a) => a.id)
  const { data: idents } = await supabase
    .from('identifier')
    .select('animal_id, type, value')
    .in('animal_id', ids)
    .is('deleted_at', null)

  type Tags = { eid: string | null; eid2: string | null; backTag: string | null; visualTag: string | null; metalTag: string | null }
  const tagsByAnimal = new Map<string, Tags>()
  for (const it of idents ?? []) {
    const cur = tagsByAnimal.get(it.animal_id) ?? { eid: null, eid2: null, backTag: null, visualTag: null, metalTag: null }
    if (it.type === 'eid') cur.eid = it.value
    else if (it.type === 'secondary_eid') cur.eid2 = it.value
    else if (it.type === 'back_tag') cur.backTag = it.value
    else if (it.type === 'visual_tag') cur.visualTag = it.value
    else if (it.type === 'metal_tag') cur.metalTag = it.value
    tagsByAnimal.set(it.animal_id, cur)
  }

  return list.map((a) => {
    const t = tagsByAnimal.get(a.id) ?? { eid: null, eid2: null, backTag: null, visualTag: null, metalTag: null }
    return {
      animalId: a.id,
      eid: t.eid,
      eid2: t.eid2,
      backTag: t.backTag,
      visualTag: t.visualTag,
      metalTag: t.metalTag,
      color: a.color,
      breed: a.breed,
      age: a.age_designation,
      pregStatus: a.preg_status,
      pregTiming: a.preg_timing,
      sortPen: a.pen,
    }
  })
}
