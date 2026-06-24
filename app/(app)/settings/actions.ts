'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SavePayload } from './types'

export type SaveResult = { ok: true } | { ok: false; error: string }

/**
 * Write the staged Settings changes for the signed-in user's barn.
 *
 * Only changed rows arrive in the payload. Everything is additive: turning a
 * field or option "off" sets a flag (is_displayed / active = false) — nothing is
 * ever deleted. Per-barn row-level security limits every write to the caller's
 * own barn (and barn-level columns to a barn admin).
 *
 * Fail-safe: on the first rejected write we stop and return the error string.
 * The form keeps the user's edits and does not show them as saved.
 */
export async function saveSettings(payload: SavePayload): Promise<SaveResult> {
  const supabase = createClient()

  // Barn id for inserts. RLS scopes this select to the caller's barn.
  const { data: barn, error: barnErr } = await supabase
    .from('barn')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (barnErr) return { ok: false, error: barnErr.message }
  if (!barn) return { ok: false, error: 'No barn is visible for your account.' }
  const barnId = barn.id

  try {
    if (payload.barn) {
      const { id, ...patch } = payload.barn
      const { error } = await supabase.from('barn').update(patch).eq('id', id)
      if (error) throw new Error(`Barn settings — ${error.message}`)
    }

    for (const { id, ...patch } of payload.fields) {
      const { error } = await supabase.from('barn_field_config').update(patch).eq('id', id)
      if (error) throw new Error(`Capture field — ${error.message}`)
    }

    for (const { id, ...patch } of payload.workTypes) {
      const { error } = await supabase.from('work_type').update(patch).eq('id', id)
      if (error) throw new Error(`Work type — ${error.message}`)
    }

    for (const { id, ...patch } of payload.options) {
      const { error } = await supabase.from('field_value_option').update(patch).eq('id', id)
      if (error) throw new Error(`Option — ${error.message}`)
    }
    if (payload.newOptions.length > 0) {
      const rows = payload.newOptions.map((o) => ({ ...o, barn_id: barnId, active: true }))
      const { error } = await supabase.from('field_value_option').insert(rows)
      if (error) throw new Error(`New option — ${error.message}`)
    }

    for (const { id, ...patch } of payload.pregStages) {
      const { error } = await supabase.from('preg_stage_config').update(patch).eq('id', id)
      if (error) throw new Error(`Pregnancy stage — ${error.message}`)
    }

    for (const { id, ...patch } of payload.ageDesignations) {
      const { error } = await supabase.from('age_designation_option').update(patch).eq('id', id)
      if (error) throw new Error(`Age row — ${error.message}`)
    }
    if (payload.newAgeDesignations.length > 0) {
      const rows = payload.newAgeDesignations.map((a) => ({ ...a, barn_id: barnId, active: true }))
      const { error } = await supabase.from('age_designation_option').insert(rows)
      if (error) throw new Error(`New age row — ${error.message}`)
    }

    // Quick notes: toggling active is the soft on/off at the chute; sort_priority
    // sets the order. Nothing is hard-deleted.
    for (const { id, ...patch } of payload.quickNotes) {
      const { error } = await supabase.from('quick_note_definition').update(patch).eq('id', id)
      if (error) throw new Error(`Quick note — ${error.message}`)
    }
    if (payload.newQuickNotes.length > 0) {
      // New notes added here are barn-level permanent notes (no sale day).
      const rows = payload.newQuickNotes.map((n) => ({
        barn_id: barnId,
        label: n.label,
        sort_priority: n.sort_priority,
        scope: 'permanent',
        active: true,
        is_flag: false,
      }))
      const { error } = await supabase.from('quick_note_definition').insert(rows)
      if (error) throw new Error(`New quick note — ${error.message}`)
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed.' }
  }

  revalidatePath('/settings')
  return { ok: true }
}
