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
  const { data, error } = await supabase
    .from('sale_day')
    .insert({ barn_id: barn.id, sale_date, status: 'open', notes: input.notes?.trim() || null })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }

  revalidatePath('/')
  return { ok: true, id: data.id }
}
