// Scan shapes for the chute. The barn (St. Onge) uses two fixed tag formats, so
// we can tell them apart by shape alone and route each to its own field — even
// when two people scan the same animal at the same time.
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

export type ScanToken = { kind: 'eid' | 'back_tag'; value: string }

/**
 * Split a recognized machine-scan burst into ordered tokens. Two wands scanning
 * one animal at once can land as a SINGLE combined burst (a back tag and an EID
 * run together with no gap between them); this pulls them apart so each goes to
 * its own field instead of one clobbering the other.
 *
 * Greedy left-to-right: at each position take a back tag (digits-letters-digits)
 * or a 15-digit EID. The two shapes can't be confused — a back tag has letters
 * in the middle, an EID is all digits. Returns null if the buffer doesn't fully
 * decompose into valid tokens, so a garbled read is flagged for a re-scan rather
 * than dropped into the wrong field (and a digit is never truncated).
 */
export function splitScans(code: string): ScanToken[] | null {
  const s = code.trim()
  const tokens: ScanToken[] = []
  let i = 0
  while (i < s.length) {
    const rest = s.slice(i)
    if (/^\d{2}[A-Za-z]{2}\d{4}/.test(rest)) {
      tokens.push({ kind: 'back_tag', value: rest.slice(0, 8) })
      i += 8
    } else if (/^\d{15}/.test(rest)) {
      tokens.push({ kind: 'eid', value: rest.slice(0, 15) })
      i += 15
    } else {
      return null
    }
  }
  return tokens.length ? tokens : null
}
