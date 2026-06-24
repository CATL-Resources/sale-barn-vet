// Shared field-config resolution for the animal record — used by BOTH the chute
// Capture screen and the full-record edit pop-up, so neither hard-codes its own
// field list. The effective config for a work type is the barn-default rows
// (work_type_id IS NULL) overlaid with that work type's override rows.

import { emptyDraft, isBredStage, type AnimalDraft, type CaptureBootstrap } from './types'

export type ResolvedField = {
  is_displayed: boolean
  is_required: boolean
  sort_order: number
  display_label: string | null
  default_value: string | null
}

export type ResolvedFields = Map<string, ResolvedField>

// Safe baseline — what Capture falls back to when a work type resolves to no
// displayed fields at all (a barn with no field config), so the screen is never
// blank. eid + back tag to identify her, plus the two note fields.
const BASELINE_FALLBACK: Array<[string, number]> = [
  ['eid', 1],
  ['back_tag', 2],
  ['quick_notes', 3],
  ['notes', 4],
]

export function resolveFields(
  fields: CaptureBootstrap['fields'],
  workTypeId: string | null,
): ResolvedFields {
  const map: ResolvedFields = new Map()
  for (const f of fields) {
    if (f.work_type_id !== null) continue
    map.set(f.field_key, {
      is_displayed: f.is_displayed,
      is_required: f.is_required,
      sort_order: f.sort_order,
      display_label: f.display_label,
      default_value: f.default_value,
    })
  }
  if (workTypeId) {
    for (const f of fields) {
      if (f.work_type_id !== workTypeId) continue
      const base = map.get(f.field_key)
      map.set(f.field_key, {
        is_displayed: f.is_displayed,
        is_required: f.is_required,
        sort_order: f.sort_order,
        display_label: f.display_label ?? base?.display_label ?? null,
        default_value: f.default_value ?? base?.default_value ?? null,
      })
    }
  }

  // Never leave Capture blank: if nothing is set to display, fall back to a
  // minimal baseline set.
  const anyDisplayed = Array.from(map.values()).some((f) => f.is_displayed)
  if (!anyDisplayed) {
    const fb: ResolvedFields = new Map()
    for (const [key, sort_order] of BASELINE_FALLBACK) {
      fb.set(key, { is_displayed: true, is_required: false, sort_order, display_label: null, default_value: null })
    }
    return fb
  }

  return map
}

// Which fields show — purely from the resolved config. preg_timing additionally
// only shows for a bred stage. (Display is NOT wired to work_type.includes_preg_check
// any more; the config row is the single source of truth.)
export function fieldShows(
  key: string,
  opts: { resolved: ResolvedFields; pregStatus: string | null },
): boolean {
  const displayed = opts.resolved.get(key)?.is_displayed ?? false
  if (key === 'preg_timing') return displayed && isBredStage(opts.pregStatus)
  return displayed
}

export function fieldRequired(key: string, resolved: ResolvedFields): boolean {
  return resolved.get(key)?.is_required ?? false
}

export function fieldLabelText(key: string, resolved: ResolvedFields, fallback: string): string {
  return resolved.get(key)?.display_label || fallback
}

// Which draft property each config field_key prefills. Identifier and note
// fields are plain strings; the attribute fields are nullable strings — both
// take a string default cleanly. quick_notes (a list) and the sort pen are not
// config-defaulted, so they're left off.
const DEFAULT_TARGETS: Partial<Record<string, keyof AnimalDraft>> = {
  eid: 'eid',
  back_tag: 'backTag',
  visual_tag: 'visualTag',
  metal_tag: 'metalTag',
  hide_color: 'color',
  breed: 'breed',
  age: 'ageDesignation',
  preg_stage: 'pregStatus',
  preg_timing: 'pregTiming',
  fetal_sex: 'fetalSex',
  notes: 'notes',
}

// A fresh blank draft with each displayed field's default_value laid in. Only
// displayed fields are seeded (a hidden field's default never reaches the form
// or the save). Used for the new animal at the chute and after each save.
export function draftWithDefaults(resolved: ResolvedFields): AnimalDraft {
  const draft = emptyDraft()
  for (const key of Object.keys(DEFAULT_TARGETS)) {
    const target = DEFAULT_TARGETS[key]
    const f = resolved.get(key)
    if (!target || !f?.is_displayed) continue
    if (f.default_value == null || f.default_value === '') continue
    ;(draft as unknown as Record<string, string>)[target] = f.default_value
  }
  return draft
}
