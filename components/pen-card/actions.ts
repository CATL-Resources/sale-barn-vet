'use server'

import { createClient } from '@/lib/supabase/server'

// Stamp the moment a pen card label was printed. Called when the print button
// opens the print window. RLS scopes the update to the user's barn. Fire-and-
// forget from the client; the pen card shows a "printed" icon once this is set,
// so the cards without it are the new, unprinted ones.
export async function markLabelPrinted(penWorkId: string): Promise<void> {
  if (!penWorkId) return
  const supabase = createClient()
  // The generated row/update types don't know label_printed_at yet (added by a
  // migration, not regenerated), so cast just this payload. The column exists in
  // the database, so the write itself is real.
  await supabase
    .from('pen_work')
    .update({ label_printed_at: new Date().toISOString() } as never)
    .eq('id', penWorkId)
}
