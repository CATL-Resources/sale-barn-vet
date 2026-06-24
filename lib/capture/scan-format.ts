// Scan shapes for the chute. The barn (St. Onge) uses two fixed tag formats, so
// we can tell them apart by shape alone and route each to its own field — even
// when two people scan the same animal at the same time. The scan router
// (use-scan-router) commits a burst the instant it forms one of these shapes, so
// a back tag and an EID that run together split cleanly without one clobbering
// the other; these are the predicates it tests against.
//
//   EID       — 15 digits; the official tag starts with 840.
//   Back tag  — 8 chars: two digits, two letters, four digits (e.g. 46MA1234).
//
// (If another barn ever uses a different back-tag format, this is the one place
// to make it configurable.)

export const EID_RE = /^\d{15}$/
export const BACK_TAG_RE = /^\d{2}[A-Za-z]{2}\d{4}$/

export const isEid = (s: string): boolean => EID_RE.test(s.trim())
export const isOfficialEid = (s: string): boolean => isEid(s) && s.trim().startsWith('840')
export const isBackTag = (s: string): boolean => BACK_TAG_RE.test(s.trim())
