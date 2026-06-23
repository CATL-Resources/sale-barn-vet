// Real metrics for the hub + sale dashboard, derived from pen_work / pen / animal.
// Anything not yet derivable (e.g. office billing) is left to the screen to show
// as a clear placeholder — this module never invents a number.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Client = SupabaseClient<Database>

export type SaleMetrics = {
  orders: number // work orders (pen_work rows)
  openOrders: number // not yet complete
  headWorked: number // sum of head_worked
  headExpected: number // sum of head_expected
  toWork: number // head left to work across the open orders
  pensInUse: number // distinct pens the orders sit in
}

type PwRow = {
  sale_day_id: string
  head_expected: number | null
  head_worked: number | null
  work_complete: boolean
  pen_id: string | null
}

const PW_COLUMNS = 'sale_day_id, head_expected, head_worked, work_complete, pen_id'

export function emptyMetrics(): SaleMetrics {
  return { orders: 0, openOrders: 0, headWorked: 0, headExpected: 0, toWork: 0, pensInUse: 0 }
}

/** Group pen_work rows into per-sale metrics. */
export function metricsBySale(rows: PwRow[]): Map<string, SaleMetrics> {
  const out = new Map<string, SaleMetrics>()
  const pens = new Map<string, Set<string>>()
  for (const r of rows) {
    let m = out.get(r.sale_day_id)
    if (!m) {
      m = emptyMetrics()
      out.set(r.sale_day_id, m)
      pens.set(r.sale_day_id, new Set())
    }
    const hw = r.head_worked ?? 0
    const he = r.head_expected ?? 0
    m.orders += 1
    m.headWorked += hw
    m.headExpected += he
    if (!r.work_complete) {
      m.openOrders += 1
      m.toWork += Math.max(0, he - hw)
    }
    if (r.pen_id) pens.get(r.sale_day_id)!.add(r.pen_id)
  }
  for (const [id, set] of pens) out.get(id)!.pensInUse = set.size
  return out
}

/** Every pen_work row the account can see (RLS scopes to the barn), light columns. */
export async function fetchAllPenWorkRows(supabase: Client): Promise<PwRow[]> {
  const { data } = await supabase.from('pen_work').select(PW_COLUMNS).is('deleted_at', null)
  return (data ?? []) as PwRow[]
}

/** Metrics for one sale day plus the count of animals worked that day. */
export async function fetchSaleMetrics(
  supabase: Client,
  saleDayId: string,
): Promise<SaleMetrics & { animals: number }> {
  const { data } = await supabase
    .from('pen_work')
    .select(PW_COLUMNS)
    .eq('sale_day_id', saleDayId)
    .is('deleted_at', null)
  const m = metricsBySale((data ?? []) as PwRow[]).get(saleDayId) ?? emptyMetrics()
  const { count } = await supabase
    .from('animal')
    .select('id', { count: 'exact', head: true })
    .eq('sale_day_id', saleDayId)
    .is('deleted_at', null)
  return { ...m, animals: count ?? 0 }
}
