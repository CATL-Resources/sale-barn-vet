'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Create a sale day for the user's barn and jump straight into its office
 * work-orders screen. Called from the home sale-day selector.
 */
export async function createSaleDay(formData: FormData) {
  const supabase = createClient()

  const { data: barn, error: barnErr } = await supabase
    .from('barn')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (barnErr) throw new Error(barnErr.message)
  if (!barn) throw new Error('No barn visible — is your account a barn member?')

  const dateRaw = (formData.get('sale_date') as string | null)?.trim()
  const notes = (formData.get('notes') as string | null)?.trim() || null
  const sale_date = dateRaw || new Date().toISOString().slice(0, 10)

  const { data: day, error } = await supabase
    .from('sale_day')
    .insert({ barn_id: barn.id, sale_date, status: 'open', notes })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  redirect(`/work-orders/${day.id}`)
}
