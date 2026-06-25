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

// Plain-language names for the required-blocking message, when a field has no
// custom display label of its own.
const REQUIRED_LABELS: Record<string, string> = {
  back_tag: 'Back Tag',
  visual_tag: 'Tag #',
  metal_tag: 'Metal Tag',
  hide_color: 'Color',
  breed: 'Breed',
  age: 'Age',
  preg_stage: 'Stage',
  preg_timing: 'Month Bred',
  fetal_sex: 'Fetal Sex',
  quick_notes: 'Quick Notes',
  notes: 'Notes',
}

// Is a single field's value present in the draft? quick_notes counts as filled
// when at least one note is picked; every other field is a plain string.
function requiredFieldFilled(key: string, draft: AnimalDraft): boolean {
  if (key === 'quick_notes') return draft.quickNotes.length > 0
  const target = DEFAULT_TARGETS[key]
  if (!target) return true // a field we don't know how to read — never block on it
  const v = draft[target]
  return typeof v === 'string' ? v.trim() !== '' : v != null
}

// The fields that are SHOWN and marked required but still empty, in field order,
// as their display labels. EID is left out on purpose — it has its own hard
// 15-digit rule at save time. Used to hard-block the save so a "required" field
// actually stops the record until it's filled (not just shows a star).
// preg_timing only counts when it's actually on screen (a bred stage is picked).
export function missingRequiredLabels(resolved: ResolvedFields, draft: AnimalDraft): string[] {
  return Array.from(resolved.entries())
    .filter(([key, f]) => f.is_displayed && f.is_required && key !== 'eid' && key !== 'secondary_eid')
    .sort((a, b) => a[1].sort_order - b[1].sort_order)
    .filter(([key]) => fieldShows(key, { resolved, pregStatus: draft.pregStatus }))
    .filter(([key]) => !requiredFieldFilled(key, draft))
    .map(([key, f]) => f.display_label || REQUIRED_LABELS[key] || key)
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

// ---- Per-pen defaults (office "Set Default" → pen_session.field_defaults) ----
// The office can preset the "every animal in this pen is the same" fields for a
// pen: the attribute + note fields the shared AnimalAttributes renders. Identity
// tags (EID, back tag, visual, metal) are per-animal and never defaulted. Values
// stay TEXT — nothing here is coerced to a number — and stay fully editable per
// animal at the chute.
const PEN_DEFAULT_STRING_KEYS = ['color', 'breed', 'ageDesignation', 'pregStatus', 'pregTiming', 'fetalSex'] as const

export type PenFieldDefaults = Partial<
  Pick<AnimalDraft, 'color' | 'breed' | 'ageDesignation' | 'pregStatus' | 'pregTiming' | 'fetalSex' | 'quickNotes' | 'notes'>
>

// Pull the set defaults out of an editor draft — blank means "no default".
export function extractPenDefaults(draft: AnimalDraft): PenFieldDefaults {
  const out: PenFieldDefaults = {}
  for (const k of PEN_DEFAULT_STRING_KEYS) {
    const v = draft[k]
    if (typeof v === 'string' && v.trim() !== '') out[k] = v
  }
  if (draft.quickNotes.length) out.quickNotes = draft.quickNotes
  if (draft.notes.trim() !== '') out.notes = draft.notes
  return out
}

// Read the stored jsonb back into a clean, typed object — unknown keys and
// wrong-typed values are dropped so a bad row can never corrupt a draft.
export function parsePenDefaults(raw: unknown): PenFieldDefaults {
  if (!raw || typeof raw !== 'object') return {}
  const src = raw as Record<string, unknown>
  const out: PenFieldDefaults = {}
  for (const k of PEN_DEFAULT_STRING_KEYS) {
    const v = src[k]
    if (typeof v === 'string' && v.trim() !== '') out[k] = v
  }
  if (Array.isArray(src.quickNotes)) {
    const qs = src.quickNotes.filter((x): x is string => typeof x === 'string')
    if (qs.length) out.quickNotes = qs
  }
  if (typeof src.notes === 'string' && src.notes.trim() !== '') out.notes = src.notes
  return out
}

// Lay a pen's preset defaults over a base draft (which already carries the work
// type's config defaults). Only non-blank values land; everything stays editable.
export function applyPenDefaults(base: AnimalDraft, defaults: PenFieldDefaults | null | undefined): AnimalDraft {
  if (!defaults) return base
  const out: AnimalDraft = { ...base }
  for (const k of PEN_DEFAULT_STRING_KEYS) {
    const v = defaults[k]
    if (typeof v === 'string' && v.trim() !== '') (out as unknown as Record<string, string>)[k] = v
  }
  if (defaults.quickNotes && defaults.quickNotes.length) out.quickNotes = [...defaults.quickNotes]
  if (typeof defaults.notes === 'string' && defaults.notes.trim() !== '') out.notes = defaults.notes
  return out
}
