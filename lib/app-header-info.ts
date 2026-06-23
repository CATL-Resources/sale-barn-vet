import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// What the shared app header shows: the barn name + a short status line. Used by
// every layout so the one header reads the same everywhere.
export async function fetchHeaderInfo(
  supabase: SupabaseClient<Database>,
): Promise<{ barnName: string; subtitle: string }> {
  const [{ data: barn }, { data: open }] = await Promise.all([
    supabase.from('barn').select('name').limit(1).maybeSingle(),
    supabase.from('sale_day').select('id').eq('status', 'open').is('deleted_at', null).limit(1).maybeSingle(),
  ])
  return {
    barnName: barn?.name ?? 'Sale Barn Vet',
    subtitle: open ? 'Sale Day In Progress' : 'No Sale In Progress',
  }
}
