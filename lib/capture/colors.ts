// Tag-color swatches. The barn stores a color *name* (age_designation_option
// .designation_value) but no hex, so we map the name to the exact shade from the
// approved design board. Unknown names fall back to a neutral gray. A real
// per-barn swatch_hex column can replace this later.
const MAP: Record<string, string> = {
  white: '#FFFFFF',
  yellow: '#F3D12A',
  green: '#3FA66A',
  purple: '#6D28D9',
  blue: '#3B82C4',
  red: '#E2484A',
  orange: '#F2842B',
  pink: '#EC4899',
  black: '#1A1A1A',
  brown: '#8B5E34',
  gray: '#9A9AA6',
  grey: '#9A9AA6',
  tan: '#D2B48C',
  lime: '#84CC16',
  teal: '#14B8A6',
  gold: '#F3D12A',
  silver: '#C9C9C4',
}

export function tagColorHex(name: string): string {
  return MAP[name.trim().toLowerCase()] ?? '#9A9AA6'
}

// Pale swatches need a darker ring so the dot stays visible on white.
export function isPaleSwatch(name: string): boolean {
  const n = name.trim().toLowerCase()
  return n === 'white' || n === 'silver' || n === 'yellow'
}
