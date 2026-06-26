// Natural compare for tag / EID / pen columns: purely-numeric values sort first,
// in numeric order (0003 < 0012 < 0100), and anything with a letter sorts after
// them (… < 4AI). Blanks always sort to the bottom. Numeric values are compared
// without Number() so a 15-digit EID never loses precision.

const DIGITS = /^\d+$/

function compareNumericStrings(a: string, b: string): number {
  // Strip leading zeros, then a longer run of digits is the larger number; equal
  // length falls back to a plain compare. Original strings break ties so two pens
  // that differ only by leading zeros still order consistently.
  const sa = a.replace(/^0+/, '') || '0'
  const sb = b.replace(/^0+/, '') || '0'
  if (sa.length !== sb.length) return sa.length - sb.length
  if (sa !== sb) return sa < sb ? -1 : 1
  return a < b ? -1 : a > b ? 1 : 0
}

export function naturalCompare(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  const na = DIGITS.test(a)
  const nb = DIGITS.test(b)
  if (na && nb) return compareNumericStrings(a, b)
  if (na !== nb) return na ? -1 : 1 // pure numbers ahead of anything with letters
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

// Plain text compare, blanks last.
export function textCompare(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}
