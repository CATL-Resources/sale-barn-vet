'use client'

import { colors } from '@/components/ui/tokens'
import { SearchIcon, FilterIcon } from '@/components/ui/icons'
import type { View } from '@/lib/work-orders/types'

const VIEWS: { id: View; label: string }[] = [
  { id: 'owner', label: 'By owner' },
  { id: 'pen', label: 'By pen' },
  { id: 'type', label: 'By type' },
]

const control: React.CSSProperties = {
  height: 40,
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: 9,
  display: 'flex',
  alignItems: 'center',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 500,
  color: colors.textPrimary,
}

export function Toolbar({
  view,
  onView,
  search,
  onSearch,
  buyerNumber,
  onBuyerNumber,
  countLabel,
}: {
  view: View
  onView: (v: View) => void
  search: string
  onSearch: (s: string) => void
  buyerNumber: string
  onBuyerNumber: (s: string) => void
  countLabel: string
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ ...control, flex: '1 1 240px', minWidth: 200, gap: 8, padding: '0 12px' }}>
        <SearchIcon size={16} style={{ color: colors.textPlaceholder }} />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search consignor or buyer"
          style={inputStyle}
        />
      </div>

      <div style={{ ...control, width: 220, gap: 8, padding: '0 12px' }}>
        <input
          value={buyerNumber}
          onChange={(e) => onBuyerNumber(e.target.value)}
          placeholder="Buyer #"
          style={inputStyle}
        />
      </div>

      <div style={{ ...control, overflow: 'hidden', padding: 0 }}>
        {VIEWS.map((v, i) => {
          const active = v.id === view
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onView(v.id)}
              style={{
                height: '100%',
                padding: '0 14px',
                border: 'none',
                borderLeft: i > 0 ? `1px solid ${colors.border}` : 'none',
                background: active ? colors.navy : colors.white,
                color: active ? '#FFFFFF' : colors.textMuted,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        title="Filter (coming soon)"
        style={{ ...control, gap: 7, padding: '0 14px', cursor: 'pointer', color: colors.navy }}
      >
        <FilterIcon size={16} style={{ color: colors.navy }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Filter</span>
      </button>

      <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: colors.textMuted }}>
        {countLabel}
      </span>
    </div>
  )
}
