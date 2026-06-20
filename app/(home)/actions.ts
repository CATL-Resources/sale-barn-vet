'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Start a sale day for the barn. Uses the app's existing active status value,
 * 'open'. Stays on Home (the list refreshes) — entering a day is a separate tap.
 * Per-barn RLS scopes the write.
 */
export async function createSaleDay(input: {
  saleDate: string
  notes: string | null
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createClient()
  const { data: barn } = await supabase.from('barn').select('id').limit(1).maybeSingle()
  if (!barn) return { ok: false, error: 'No barn is visible for your account.' }

  const sale_date = input.saleDate || new Date().toISOString().slice(0, 10)

  // One sale day per date. If this date already has an open day, point the user
  // at it instead of making a duplicate. (The database also enforces this, so a
  // race that slips past the check is caught below.)
  const { data: existing } = await supabase
    .from('sale_day')
    .select('id')
    .eq('barn_id', barn.id)
    .eq('sale_date', sale_date)
    .is('deleted_at', null)
    .maybeSingle()
  if (existing) {
    return { ok: false, error: `There's already a sale day for ${sale_date}. Open it from the list instead of starting a second one.` }
  }

  const { data, error } = await supabase
    .from('sale_day')
    .insert({ barn_id: barn.id, sale_date, status: 'open', notes: input.notes?.trim() || null })
    .select('id')
    .single()
  if (error) {
    // 23505 = the one-day-per-date unique rule fired (two creates raced).
    if (error.code === '23505') {
      return { ok: false, error: `There's already a sale day for ${sale_date}. Open it from the list instead of starting a second one.` }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/')
  return { ok: true, id: data.id }
}
