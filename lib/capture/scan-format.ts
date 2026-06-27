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

// The back-tag barcode scanner is programmed to WRAP its code: it sends this
// prefix, then the 8-char body, then a carriage return (which the browser sees as
// an Enter key). The prefix is a literal dollar sign — escape it (as \$) anywhere
// it is used to build a regex, since $ is a regex metacharacter. Because it is
// neither a digit nor a letter, it can never collide with an EID or a back-tag
// body, which is what lets the assembler bracket a back tag even when it arrives
// right behind an EID.
export const BACK_TAG_PREFIX = '$'

// The 8-char body the prefix wraps (same shape as a back tag): two digits, two
// letters, four digits, e.g. 46MA1234. Named for the assembler that validates the
// body it collected between the "$" and the carriage return.
export const isBackTagBody = (s: string): boolean => BACK_TAG_RE.test(s)

// The character class the back-tag body must have at each position, for the
// pattern-aware assembler: digit, digit, letter, letter, digit, digit, digit, digit.
const BACK_TAG_BODY_CLASSES = [/\d/, /\d/, /[A-Za-z]/, /[A-Za-z]/, /\d/, /\d/, /\d/, /\d/]

// Could `s` still grow into a full back-tag body? True when it is no longer than
// the body and every character so far fits its position's class — i.e. it is a
// valid PREFIX of the digit,digit,letter,letter,digit,digit,digit,digit pattern.
export function backTagBodyCanExtend(s: string): boolean {
  if (s.length > BACK_TAG_BODY_CLASSES.length) return false
  for (let i = 0; i < s.length; i++) if (!BACK_TAG_BODY_CLASSES[i].test(s[i])) return false
  return true
}

// Could `s` still grow into a 15-digit EID? True when it is all digits and no
// longer than 15 (a valid prefix of an EID).
export const eidCanExtend = (s: string): boolean => s.length <= 15 && /^\d*$/.test(s)
