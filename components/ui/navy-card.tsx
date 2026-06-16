import type { CSSProperties, ReactNode } from 'react'

/**
 * The signature navy-gradient surface (hairline border + inset top highlight).
 * Base for stat tiles and data cards. See style-guide.md §4 "Stat tile / data card".
 */
export function NavyCard({
  className = '',
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div
      className={`sbv-navy-surface ${className}`}
      style={{ borderRadius: 12, ...style }}
    >
      {children}
    </div>
  )
}
