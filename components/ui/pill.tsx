import type { ReactNode } from 'react'

/** Selectable pill/chip. Unselected: white + border. Selected: navy fill + white text. */
export function Pill({
  selected = false,
  children,
}: {
  selected?: boolean
  children: ReactNode
}) {
  return (
    <span className="sbv-pill" data-selected={selected}>
      {children}
    </span>
  )
}
