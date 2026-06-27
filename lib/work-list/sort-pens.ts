import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Client = SupabaseClient<Database>

// One owner's share of a sort pen — their name and how many head of theirs are
// sitting in the pen right now.
export type SortPenOwner = { id: string; name: string; head: number }

// A sort pen for the sale day: a pen holding cattle through animal.current_pen_id,
// plus its closed-out marker and the owner mix of the cattle inside it.
export type SortPenSummary = {
  penId: string
  penNumber: string
  closedAt: string | null
  closedBy: string | null
  head: number
  owners: SortPenOwner[]
}

// The shape we read per animal (a hand-written select, so we type it ourselves).
type AnimalRow = {
  current_pen_id: string | null
  pen: { id: string; pen_number: string; closed_at: string | null; closed_by: string | null } | null
  pen_work: {
    seller_party_id: string | null
    buyer_party_id: string | null
    seller: { id: string; name: string } | null
    buyer: { id: string; name: string } | null
  } | null
}

/**
 * Load the sale day's sort pens, computed live from where the cattle actually
 * are. A sort pen is any pen holding animals via animal.current_pen_id; we group
 * those animals by pen for the head count and the owner mix (the consignor each
 * animal's work order is for, or the buyer on a buyer-side order).
 *
 * We also pull in any pen that has been closed out even if it now holds no cattle
 * (its cattle were already moved), so a closed-and-emptied pen still shows in the
 * list. Read-only — this never writes.
 */
export async function fetchSortPens(supabase: Client, saleDayId: string): Promise<SortPenSummary[]> {
  const { data, error } = await supabase
    .from('animal')
    .select(
      `current_pen_id,
       pen:pen!animal_current_pen_id_fkey(id, pen_number, closed_at, closed_by),
       pen_work:pen_work!animal_pen_work_id_fkey(
         seller_party_id, buyer_party_id,
         seller:party!pen_work_seller_party_id_fkey(id, name),
         buyer:party!pen_work_buyer_party_id_fkey(id, name)
       )`,
    )
    .eq('sale_day_id', saleDayId)
    .not('current_pen_id', 'is', null)
    .is('deleted_at', null)

  const byPen = new Map<string, SortPenSummary>()
  if (!error) {
    for (const row of (data ?? []) as unknown as AnimalRow[]) {
      const pen = row.pen
      if (!pen) continue
      let s = byPen.get(pen.id)
      if (!s) {
        s = { penId: pen.id, penNumber: pen.pen_number, closedAt: pen.closed_at, closedBy: pen.closed_by, head: 0, owners: [] }
        byPen.set(pen.id, s)
      }
      s.head += 1
      const pw = row.pen_work
      const owner = pw?.seller ?? pw?.buyer ?? null
      const ownerId = pw?.seller_party_id ?? pw?.buyer_party_id ?? 'unknown'
      const ownerName = owner?.name ?? 'Unknown owner'
      const found = s.owners.find((o) => o.id === ownerId)
      if (found) found.head += 1
      else s.owners.push({ id: ownerId, name: ownerName, head: 1 })
    }
  }

  // Closed-out pens that no longer hold any cattle (already moved) won't appear in
  // the animal query, so fetch them on their own to keep them in the list.
  const { data: closedPens } = await supabase
    .from('pen')
    .select('id, pen_number, closed_at, closed_by')
    .eq('sale_day_id', saleDayId)
    .not('closed_at', 'is', null)
    .is('deleted_at', null)
  for (const p of closedPens ?? []) {
    if (!byPen.has(p.id)) {
      byPen.set(p.id, { penId: p.id, penNumber: p.pen_number, closedAt: p.closed_at, closedBy: p.closed_by, head: 0, owners: [] })
    }
  }

  const list = [...byPen.values()]
  for (const s of list) s.owners.sort((a, b) => b.head - a.head || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  list.sort((a, b) => a.penNumber.localeCompare(b.penNumber, undefined, { numeric: true, sensitivity: 'base' }))
  return list
}
