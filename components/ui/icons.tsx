// Lucide icon subset used by Sale Barn Vet (outline, stroke=currentColor).
// Lifted from handoff/code + handoff/assets/icons.
import type { CSSProperties } from 'react'

type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties }

function svgProps(size: number, strokeWidth: number, style?: CSSProperties) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  }
}

export function MenuIcon({ size = 22, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, style)} aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

export function SearchIcon({ size = 17, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, style)} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 16, strokeWidth = 2.5, style }: IconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, style)} aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 15, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, style)} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 22, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, style)} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export function PlusIcon({ size = 22, strokeWidth = 2.5, style }: IconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, style)} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

export function FlagIcon({ size = 12, strokeWidth = 2.5, style }: IconProps) {
  return (
    <svg {...svgProps(size, strokeWidth, style)} aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}
