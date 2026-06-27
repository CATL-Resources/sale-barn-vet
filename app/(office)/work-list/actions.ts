'use server'

import { createClient } from '@/lib/supabase/server'
import { upsertPen } from '@/lib/work-orders/pens'
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
 * Save (or clear) the note on a work order. The crew writes a free-text note from
 * the pen-list job popup; it lands in pen_work.notes. An empty note clears the
 * field (stored as null). barn_id is passed through and re-checked by RLS, so a
 * note can only be set on a job in the user's own barn. Returns the saved text so
 * the screen can show it right away.
 */
export async function setPenWorkNote(
  penWorkId: string,
  barnId: string,
  note: string,
): Promise<{ ok: boolean; note: string | null; error?: string }> {
  const supabase = createClient()
  const trimmed = note.trim()
  const value = trimmed.length ? trimmed : null
  const { error } = await supabase
    .from('pen_work')
    .update({ notes: value })
    .eq('id', penWorkId)
    .eq('barn_id', barnId)
    .is('deleted_at', null)
  if (error) return { ok: false, note: null, error: error.message }
  return { ok: true, note: value }
}

/**
 * Close a sort pen out at the end of the sale day. Stamps closed_at = now and
 * closed_by = the signed-in user (the same audit shape as created_by). It does
 * NOT touch the cattle — the animals stay where they are (their current_pen_id is
 * unchanged), so a closed pen can still be reopened or have its cattle moved
 * later. barn_id is passed through and re-checked by RLS, so a pen can only be
 * closed within the user's own barn.
 */
export async function closeSortPen(
  penId: string,
  barnId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const { error } = await supabase
    .from('pen')
    .update({ closed_at: new Date().toISOString(), closed_by: user.id })
    .eq('id', penId)
    .eq('barn_id', barnId)
    .is('deleted_at', null)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Reopen a closed sort pen — clears closed_at / closed_by. Reversible counterpart
 * to closeSortPen; the cattle are untouched either way. RLS scopes the write to
 * the user's barn.
 */
export async function reopenSortPen(
  penId: string,
  barnId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('pen')
    .update({ closed_at: null, closed_by: null })
    .eq('id', penId)
    .eq('barn_id', barnId)
    .is('deleted_at', null)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Move a whole sort pen's cattle to one destination pen. The destination is
 * entered by number; the pen row is created for this sale day if it's new (the
 * same lazy pen creation used everywhere). Then every active animal still sitting
 * in the sort pen has its current_pen_id pointed at the destination — the whole
 * pen moves together, no splitting.
 *
 * This is an internal pen-to-pen move only. It changes nothing about billing: no
 * pen_work, no head counts, no frozen charges — only animal.current_pen_id. It's
 * reversible by moving again (no rows are deleted). RLS scopes every write to the
 * user's barn.
 */
export async function moveSortPen(input: {
  sortPenId: string
  saleDayId: string
  barnId: string
  destinationPenNumber: string
}): Promise<{ ok: boolean; error?: string; destination?: { id: string; pen_number: string }; moved?: number }> {
  const supabase = createClient()
  const number = input.destinationPenNumber.trim()
  if (!number) return { ok: false, error: 'Enter a destination pen number.' }

  let destId: string
  try {
    destId = await upsertPen(supabase, input.barnId, input.saleDayId, number)
  } catch {
    return { ok: false, error: 'Could not find or create the destination pen.' }
  }
  if (destId === input.sortPenId) return { ok: false, error: 'Pick a destination different from this pen.' }

  const { data: moved, error } = await supabase
    .from('animal')
    .update({ current_pen_id: destId })
    .eq('sale_day_id', input.saleDayId)
    .eq('current_pen_id', input.sortPenId)
    .is('deleted_at', null)
    .select('id')
  if (error) return { ok: false, error: error.message }
  return { ok: true, destination: { id: destId, pen_number: number }, moved: moved?.length ?? 0 }
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
