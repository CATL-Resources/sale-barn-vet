// Shared field-config resolution for the animal record — used by BOTH the chute
// Capture screen and the full-record edit pop-up, so neither hard-codes its own
// field list. The effective config for a work type is the barn-default rows
// (work_type_id IS NULL) overlaid with that work type's override rows.

import { isBredStage, type CaptureBootstrap } from './types'

export type ResolvedField = {
  is_displayed: boolean
  is_required: boolean
  sort_order: number
  display_label: string | null
  default_value: string | null
}

export type ResolvedFields = Map<string, ResolvedField>

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
  return map
}

// Which fields show. preg keeps a fallback on the work type's preg-check flag, so
// a preg job with no per-work-type row still shows preg. preg_timing only shows
// for a bred stage.
export function fieldShows(
  key: string,
  opts: { resolved: ResolvedFields; includesPregCheck: boolean; pregStatus: string | null },
): boolean {
  const displayed = opts.resolved.get(key)?.is_displayed ?? false
  if (key === 'preg_stage') return displayed || opts.includesPregCheck
  if (key === 'preg_timing') return (displayed || opts.includesPregCheck) && isBredStage(opts.pregStatus)
  return displayed
}

export function fieldRequired(key: string, resolved: ResolvedFields): boolean {
  return resolved.get(key)?.is_required ?? false
}

export function fieldLabelText(key: string, resolved: ResolvedFields, fallback: string): string {
  return resolved.get(key)?.display_label || fallback
}
