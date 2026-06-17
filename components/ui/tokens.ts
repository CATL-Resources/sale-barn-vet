// Sale Barn Vet design tokens — lifted verbatim from handoff/style-guide.md (sections 1–3).
// Single source of truth for colors/gradients/radii used by the UI primitives.

export const colors = {
  navy: '#0E2646',
  gold: '#F3D12A',
  goldPressed: '#E3C01F',
  teal: '#55BAAA',
  tealDeep: '#2E9486',
  page: '#F5F5F0',
  canvas: '#E9E9E4',
  white: '#FFFFFF',
  cardHeader: '#EEF1F6',
  cardHeaderBorder: '#DEE3EC',
  border: '#D4D4D0',
  rowDivider: '#ECECE8',
  textPrimary: '#1A1A1A',
  textMuted: '#717182',
  textPlaceholder: '#9A9AA6',
  navySubText: '#8FA8CC',
  drawerSelected: '#F3F6FB',
  danger: '#E24B4A',
  dangerBg: '#FCEBEB',
  warning: '#F59E0B',
} as const

export const navyGradient =
  'linear-gradient(150deg, #1D4A7C 0%, #12325C 45%, #0E2646 100%)'

export const radius = {
  frame: 18,
  card: 12,
  tile: 11,
  field: 10,
  pill: 999,
} as const

export const ease = 'cubic-bezier(0.2, 0.7, 0.2, 1)'
