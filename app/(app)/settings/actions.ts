'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Turn a capture field on or off for the barn. The chuteside Capture form is
 * built from this list, so flipping a row here changes what the vet sees —
 * no code change. RLS limits the update to the user's own barn.
 */
export async function setFieldDisplayed(id: string, displayed: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('barn_field_config')
    .update({ is_displayed: displayed })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
