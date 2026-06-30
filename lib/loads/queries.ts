import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { LoadAnimal, LoadRow } from './types'

type Client = SupabaseClient<Database>

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

function joinDestination(name: string, state: string): string {
  return [name, state].filter(Boolean).join(', ')
}

// All loads for one sale day, with the buyer's name, the buyer number, and the
// live assigned-head count (animals currently pointing at the load). Read-only,
// RLS-scoped to the barn.
export async function fetchLoads(supabase: Client, saleDayId: string): Promise<LoadRow[]> {
  const { data: loads } = await supabase
    .from('buyer_load')
    .select(
      'id, sale_day_id, buyer_party_id, buyer_number_id, buyer_number_text, destination_name, destination_state, destination_address, expected_head, notes, created_at',
    )
    .eq('sale_day_id', saleDayId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  const list = loads ?? []
  if (list.length === 0) return []

  // Buyer party names.
  const partyName = new Map<string, string>()
  const partyIds = [...new Set(list.map((l) => l.buyer_party_id).filter((x): x is string => !!x))]
  if (partyIds.length) {
    const { data: parties } = await supabase.from('party').select('id, name').in('id', partyIds)
    for (const p of parties ?? []) partyName.set(p.id, str(p.name))
  }

  // Recorded buyer numbers (for loads that reference one).
  const numberById = new Map<string, string>()
  const numberIds = [...new Set(list.map((l) => l.buyer_number_id).filter((x): x is string => !!x))]
  if (numberIds.length) {
    const { data: nums } = await supabase.from('buyer_number').select('id, number').in('id', numberIds)
    for (const n of nums ?? []) numberById.set(n.id, str(n.number))
  }

  // Assigned-head counts: one query for every animal on these loads.
  const assigned = new Map<string, number>()
  const { data: animals } = await supabase
    .from('animal')
    .select('buyer_load_id')
    .in('buyer_load_id', list.map((l) => l.id))
    .is('deleted_at', null)
  for (const a of animals ?? []) {
    if (!a.buyer_load_id) continue
    assigned.set(a.buyer_load_id, (assigned.get(a.buyer_load_id) ?? 0) + 1)
  }

  return list.map((l) => {
    const destinationName = str(l.destination_name)
    const destinationState = str(l.destination_state)
    return {
      id: l.id,
      buyerNumber: (l.buyer_number_id && numberById.get(l.buyer_number_id)) || str(l.buyer_number_text),
      buyerName: (l.buyer_party_id && partyName.get(l.buyer_party_id)) || '',
      destinationName,
      destinationState,
      destinationAddress: str(l.destination_address),
      destination: joinDestination(destinationName, destinationState),
      expectedHead: l.expected_head,
      assignedHead: assigned.get(l.id) ?? 0,
      notes: str(l.notes),
      saleDayId: l.sale_day_id,
    }
  })
}

// One load (or null), with the same resolved fields as the list row.
export async function fetchLoad(supabase: Client, id: string): Promise<LoadRow | null> {
  const { data: l } = await supabase
    .from('buyer_load')
    .select(
      'id, sale_day_id, buyer_party_id, buyer_number_id, buyer_number_text, destination_name, destination_state, destination_address, expected_head, notes',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!l) return null

  let buyerName = ''
  if (l.buyer_party_id) {
    const { data: p } = await supabase.from('party').select('name').eq('id', l.buyer_party_id).maybeSingle()
    buyerName = str(p?.name)
  }
  let recordedNumber = ''
  if (l.buyer_number_id) {
    const { data: n } = await supabase.from('buyer_number').select('number').eq('id', l.buyer_number_id).maybeSingle()
    recordedNumber = str(n?.number)
  }
  const { count } = await supabase
    .from('animal')
    .select('id', { count: 'exact', head: true })
    .eq('buyer_load_id', id)
    .is('deleted_at', null)

  const destinationName = str(l.destination_name)
  const destinationState = str(l.destination_state)
  return {
    id: l.id,
    buyerNumber: recordedNumber || str(l.buyer_number_text),
    buyerName,
    destinationName,
    destinationState,
    destinationAddress: str(l.destination_address),
    destination: joinDestination(destinationName, destinationState),
    expectedHead: l.expected_head,
    assignedHead: count ?? 0,
    notes: str(l.notes),
    saleDayId: l.sale_day_id,
  }
}

// The animals on a load, with the tags the health paper needs (EID + back tag).
// Tags come from the identifier table, pivoted to columns like the Animals report.
export async function fetchLoadAnimalsWithTags(
  supabase: Client,
  loadId: string,
  animalTypes: { id: string; name: string }[],
): Promise<LoadAnimal[]> {
  const { data: animals } = await supabase
    .from('animal')
    .select('id, color, animal_type_id, created_at')
    .eq('buyer_load_id', loadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  const list = animals ?? []
  if (list.length === 0) return []

  const ids = list.map((a) => a.id)
  type Tags = { eid: string; backTag: string; visualTag: string }
  const tags = new Map<string, Tags>()
  // Batches of 250 keep each response well under the row cap.
  for (let i = 0; i < ids.length; i += 250) {
    const { data: idents } = await supabase
      .from('identifier')
      .select('animal_id, type, value')
      .in('animal_id', ids.slice(i, i + 250))
      .is('deleted_at', null)
    for (const it of idents ?? []) {
      if (!it.animal_id) continue
      const cur = tags.get(it.animal_id) ?? { eid: '', backTag: '', visualTag: '' }
      if (it.type === 'eid') cur.eid = str(it.value)
      else if (it.type === 'back_tag') cur.backTag = str(it.value)
      else if (it.type === 'visual_tag') cur.visualTag = str(it.value)
      tags.set(it.animal_id, cur)
    }
  }

  const typeName = new Map(animalTypes.map((t) => [t.id, str(t.name)]))
  return list.map((a) => {
    const t = tags.get(a.id) ?? { eid: '', backTag: '', visualTag: '' }
    return {
      id: a.id,
      eid: t.eid,
      backTag: t.backTag,
      visualTag: t.visualTag,
      color: str(a.color),
      animalType: (a.animal_type_id && typeName.get(a.animal_type_id)) || '',
    }
  })
}
