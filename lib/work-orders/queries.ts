import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { PenWorkFull, SpecialChargeFull, WorkOrdersPageData } from './types'

type Client = SupabaseClient<Database>

// pen_work has two FKs to party (seller + buyer), so every embed is
// disambiguated by its FK constraint name.
const PEN_WORK_SELECT = `
  *,
  seller:party!pen_work_seller_party_id_fkey(id,name,customer_number),
  buyer:party!pen_work_buyer_party_id_fkey(id,name,customer_number),
  buyerNumber:buyer_number!pen_work_buyer_number_id_fkey(id,number,typical_destination,typical_state),
  workType:work_type!pen_work_work_type_id_fkey(id,name,vet_charge,sol_charge),
  animalType:animal_type!pen_work_animal_type_id_fkey(id,name),
  pen:pen!pen_work_pen_id_fkey(id,pen_number)
`

/** Load static page data (barn config + reference lists). Null if the day or barn is missing. */
export async function fetchPageData(
  supabase: Client,
  saleDayId: string,
): Promise<WorkOrdersPageData | null> {
  const { data: saleDay } = await supabase
    .from('sale_day')
    .select('*')
    .eq('id', saleDayId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!saleDay) return null

  const { data: barn } = await supabase.from('barn').select('*').limit(1).maybeSingle()
  if (!barn) return null

  const [{ data: workTypes }, { data: animalTypes }] = await Promise.all([
    supabase.from('work_type').select('*').eq('active', true).is('deleted_at', null).order('name'),
    supabase
      .from('animal_type')
      .select('*')
      .eq('active', true)
      .is('deleted_at', null)
      .order('name'),
  ])

  return { saleDay, barn, workTypes: workTypes ?? [], animalTypes: animalTypes ?? [] }
}

/**
 * Load pen_works with full joins for one sale day (the Work Orders board) or
 * several (the Reports hub scope — a single day, a range, or all days). An empty
 * list yields no rows.
 */
export async function fetchPenWorks(supabase: Client, saleDayId: string | string[]): Promise<PenWorkFull[]> {
  const ids = Array.isArray(saleDayId) ? saleDayId : [saleDayId]
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('pen_work')
    .select(PEN_WORK_SELECT)
    .in('sale_day_id', ids)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .returns<PenWorkFull[]>()
  if (error) throw error
  return data ?? []
}

/** Load special charges for a sale day, party joined in. */
export async function fetchSpecialCharges(
  supabase: Client,
  saleDayId: string,
): Promise<SpecialChargeFull[]> {
  const { data, error } = await supabase
    .from('special_charge')
    .select('*, party:party!special_charge_party_id_fkey(id,name)')
    .eq('sale_day_id', saleDayId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .returns<SpecialChargeFull[]>()
  if (error) throw error
  return data ?? []
}

/** All sale days for the barn, most recent first (the day selector). */
export async function fetchSaleDays(supabase: Client) {
  const { data } = await supabase
    .from('sale_day')
    .select('id, sale_date, status, notes')
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
  return data ?? []
}

/** Existing pens for a sale day (the pen picker). */
export async function fetchPens(supabase: Client, saleDayId: string) {
  const { data } = await supabase
    .from('pen')
    .select('id, pen_number')
    .eq('sale_day_id', saleDayId)
    .is('deleted_at', null)
    .order('pen_number')
  return data ?? []
}
