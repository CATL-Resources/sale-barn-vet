import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Client = SupabaseClient<Database>

// One consignor line of a pen for the current work — its pen_work id and the
// owner to show in the per-cow picker.
export type ConsignorLine = { id: string; ownerId: string; ownerName: string }

type OwnerRow = {
  seller_party_id: string | null
  buyer_party_id: string | null
  seller: { id: string; name: string } | null
  buyer: { id: string; name: string } | null
}

// "Who owns this line" — the same rule the rest of the app uses: the buyer on
// buyer-side work, otherwise the seller. origin_location_id is a sub-detail (which
// of the consignor's locations the cattle came from), NOT the owner, so it is not
// used for the name; a line with no party at all falls back gracefully.
export function lineOwner(row: OwnerRow): { id: string; name: string } {
  if (row.buyer_party_id && row.buyer) return { id: row.buyer.id, name: row.buyer.name }
  if (row.seller_party_id && row.seller) return { id: row.seller.id, name: row.seller.name }
  return { id: row.seller_party_id ?? row.buyer_party_id ?? 'unknown', name: 'Unknown consignor' }
}

type LineRow = OwnerRow & { id: string; is_hold: boolean }

export type PenLines = { lines: ConsignorLine[]; holdLineId: string | null }

// All of a pen's lines for ONE work type on the sale day: the consignor lines
// (each with an owner) plus the single Hold line (no owner) if one exists. The
// pen is "mixed for the current work" when there is more than one consignor line.
// A pen with a line for a DIFFERENT work type is not part of this — we filter by
// work_type_id.
export async function fetchPenLines(
  supabase: Client,
  opts: { penId: string; workTypeId: string; saleDayId: string },
): Promise<PenLines> {
  const { data } = await supabase
    .from('pen_work')
    .select(
      `id, is_hold, seller_party_id, buyer_party_id,
       seller:party!pen_work_seller_party_id_fkey(id,name),
       buyer:party!pen_work_buyer_party_id_fkey(id,name)`,
    )
    .eq('pen_id', opts.penId)
    .eq('work_type_id', opts.workTypeId)
    .eq('sale_day_id', opts.saleDayId)
    .is('deleted_at', null)

  const lines: ConsignorLine[] = []
  let holdLineId: string | null = null
  for (const r of (data ?? []) as unknown as LineRow[]) {
    if (r.is_hold) {
      holdLineId = r.id
      continue
    }
    const o = lineOwner(r)
    lines.push({ id: r.id, ownerId: o.id, ownerName: o.name })
  }
  lines.sort((a, b) => a.ownerName.localeCompare(b.ownerName, undefined, { sensitivity: 'base' }))
  return { lines, holdLineId }
}

// Find the pen's single Hold line for this work, or create one (no owner,
// is_hold = true) — the relaxed one-owner constraint allows the empty-owner row.
export async function getOrCreateHoldLine(
  supabase: Client,
  opts: { barnId: string; penId: string; workTypeId: string; saleDayId: string },
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('pen_work')
    .select('id')
    .eq('pen_id', opts.penId)
    .eq('work_type_id', opts.workTypeId)
    .eq('sale_day_id', opts.saleDayId)
    .eq('is_hold', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created } = await supabase
    .from('pen_work')
    .insert({
      barn_id: opts.barnId,
      sale_day_id: opts.saleDayId,
      pen_id: opts.penId,
      work_type_id: opts.workTypeId,
      is_hold: true,
      origin: 'chute',
    })
    .select('id')
    .single()
  return created?.id ?? null
}

// Live head on a line — distinct non-deleted animals, counted the same way the
// app counts heads everywhere (one row per animal; the dedupe guards keep it
// true, so this never double-counts).
export async function countOnLine(supabase: Client, penWorkId: string): Promise<number> {
  const { count } = await supabase
    .from('animal')
    .select('id', { count: 'exact', head: true })
    .eq('pen_work_id', penWorkId)
    .is('deleted_at', null)
  return count ?? 0
}
