'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Mark a work order started (so it reads "In progress") before the crew drops
 * into Capture. "Started" = the expected head came into the pen, so we set
 * head_started from head_expected — only if it isn't set yet, so Resume on an
 * already-started job leaves it alone. Per-barn RLS scopes the write.
 *
 * If the order has no expected head, we can't mark a count here; the status
 * flips to In progress as soon as the first animal is captured.
 */
export async function startWorkOrder(penWorkId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const { data: pw, error } = await supabase
    .from('pen_work')
    .select('head_started, head_expected')
    .eq('id', penWorkId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!pw) return { ok: false, error: 'Work order not found.' }

  if (pw.head_started == null && pw.head_expected != null) {
    const { error: upErr } = await supabase
      .from('pen_work')
      .update({ head_started: pw.head_expected })
      .eq('id', penWorkId)
    if (upErr) return { ok: false, error: upErr.message }
  }
  return { ok: true }
}
