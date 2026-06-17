'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// DEV ONLY — REMOVE WHEN OFFICE WORK-ORDER SCREEN EXISTS.
// Inserts one empty sale_day for the user's barn (today) so the home screen has
// something to render before the office work-order screen exists.
export async function createTestSaleDay() {
  const supabase = createClient()

  const { data: barn, error: barnErr } = await supabase
    .from('barn')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (barnErr) throw new Error(barnErr.message)
  if (!barn) throw new Error('No barn visible — is your account a barn member?')

  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('sale_day')
    .insert({ barn_id: barn.id, sale_date: today })
  if (error) throw new Error(error.message)

  revalidatePath('/')
}
