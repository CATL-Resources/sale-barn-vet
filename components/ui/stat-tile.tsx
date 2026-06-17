import type { ReactNode } from 'react'

/** Navy stat tile: big figure + small caption. `gold` for the $ figure. */
export function StatTile({
  value,
  label,
  gold = false,
}: {
  value: ReactNode
  label: string
  gold?: boolean
}) {
  return (
    <div className="sbv-navy-surface sbv-stat-tile">
      <div
        className="tnum"
        style={{
          fontSize: gold ? 16 : 19,
          fontWeight: 800,
          color: gold ? '#F3D12A' : '#FFFFFF',
          letterSpacing: '-0.02em',
          lineHeight: gold ? 1.18 : 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#8FA8CC',
          lineHeight: 1.2,
          marginTop: 5,
        }}
      >
        {label}
      </div>
    </div>
  )
}
