import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Client = SupabaseClient<Database>

/**
 * Returns the id of a pen matching (barnId, saleDayId, penNumber).
 * Creates the pen if it does not exist.
 *
 * This is the "lazy pen creation" pattern — pens appear as they're typed,
 * no setup required.
 */
export async function upsertPen(
  supabase: Client,
  barnId: string,
  saleDayId: string,
  penNumber: string,
): Promise<string> {
  const number = penNumber.trim()

  const { data: existing } = await supabase
    .from('pen')
    .select('id')
    .eq('barn_id', barnId)
    .eq('sale_day_id', saleDayId)
    .eq('pen_number', number)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('pen')
    .insert({ barn_id: barnId, sale_day_id: saleDayId, pen_number: number })
    .select('id')
    .single()

  if (error) throw error
  return created.id
}
