'use server'

import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

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

/**
 * The yard-crew "Up" marker for a pen on a sale day. Brought up = true with the
 * time stamped; tapping again clears it. This is scratch yard state in
 * pen_session, separate from the chute status — it never touches pen_work, head
 * counts, billing, or the freeze. One row per pen per sale day (upsert on that
 * pair). barn_id is passed through and still re-checked by RLS, so a pen can only
 * be marked within the user's own barn.
 */
export async function setPenUp(
  penId: string,
  saleDayId: string,
  barnId: string,
  isUp: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('pen_session')
    .upsert(
      {
        pen_id: penId,
        sale_day_id: saleDayId,
        barn_id: barnId,
        is_up: isUp,
        up_at: isUp ? new Date().toISOString() : null,
      },
      { onConflict: 'pen_id,sale_day_id' },
    )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * The office's per-pen capture defaults for a sale day. Saved into the same
 * pen_session row as the staged marker (one row per pen per sale day), in the
 * field_defaults jsonb. The chute seeds each new animal's draft from these so a
 * pen of look-alikes pre-fills (still fully editable per animal). Mirrors
 * setPenUp exactly: same barn_id pass-through (re-checked by RLS) and the same
 * onConflict on (pen_id, sale_day_id). Only field_defaults is written, so it
 * never disturbs the staged marker on the same row.
 */
export async function setPenDefaults(
  penId: string,
  saleDayId: string,
  barnId: string,
  fieldDefaults: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('pen_session')
    .upsert(
      {
        pen_id: penId,
        sale_day_id: saleDayId,
        barn_id: barnId,
        field_defaults: fieldDefaults as unknown as Json,
      },
      { onConflict: 'pen_id,sale_day_id' },
    )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
