'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** Create a buyer: a party (+ an optional buyer number). */
export async function createBuyer(input: { name: string; number: string }): Promise<void> {
  const supabase = createClient()

  const { data: barn } = await supabase.from('barn').select('id').limit(1).maybeSingle()
  if (!barn) throw new Error('No barn visible — is your account a barn member?')

  const name = input.name.trim()
  if (!name) throw new Error('A buyer name is required.')

  const { data: party, error } = await supabase
    .from('party')
    .insert({ barn_id: barn.id, name })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const number = input.number.trim()
  if (number) {
    const { error: numErr } = await supabase
      .from('buyer_number')
      .insert({ barn_id: barn.id, party_id: party.id, number })
    if (numErr) throw new Error(numErr.message)
  }

  revalidatePath('/buyers')
}
