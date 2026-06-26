'use client'

// The hub's scope selector. Defaults to the current / most recent sale day and
// widens to a date range or all sale days in one or two clicks — the three mode
// pills switch in a single tap; a range then just needs its other end picked.

import { colors } from '@/components/ui/tokens'
import type { ReportScope, SaleDayLite } from '@/lib/reports/types'

function shortDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const pill = (active: boolean): React.CSSProperties => ({
  height: 34,
  padding: '0 14px',
  borderRadius: 999,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  background: active ? colors.navy : '#fff',
  border: `1px solid ${active ? colors.navy : colors.border}`,
  color: active ? '#fff' : colors.textPrimary,
})

const daySelect: React.CSSProperties = {
  height: 34,
  borderRadius: 9,
  border: `1px solid ${colors.border}`,
  background: '#fff',
  color: colors.navy,
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  padding: '0 10px',
  cursor: 'pointer',
  maxWidth: 200,
}

export function ScopeSelector({
  scope,
  saleDays,
  onChange,
}: {
  scope: ReportScope
  saleDays: SaleDayLite[]
  onChange: (s: ReportScope) => void
}) {
  const recent = saleDays[0]?.id ?? ''
  const currentDay = scope.kind === 'day' ? scope.dayId : recent

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted }}>Scope</span>

      <button type="button" style={pill(scope.kind === 'day')} aria-pressed={scope.kind === 'day'} onClick={() => onChange({ kind: 'day', dayId: currentDay })}>
        One day
      </button>
      <button
        type="button"
        style={pill(scope.kind === 'range')}
        aria-pressed={scope.kind === 'range'}
        onClick={() => onChange({ kind: 'range', fromId: currentDay || recent, toId: currentDay || recent })}
      >
        Range
      </button>
      <button type="button" style={pill(scope.kind === 'all')} aria-pressed={scope.kind === 'all'} onClick={() => onChange({ kind: 'all' })}>
        All days
      </button>

      {scope.kind === 'day' && (
        <select aria-label="Sale day" value={scope.dayId} onChange={(e) => onChange({ kind: 'day', dayId: e.target.value })} style={daySelect}>
          {saleDays.map((d) => (
            <option key={d.id} value={d.id}>{shortDay(d.sale_date)}</option>
          ))}
        </select>
      )}

      {scope.kind === 'range' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <select aria-label="From sale day" value={scope.fromId} onChange={(e) => onChange({ ...scope, fromId: e.target.value })} style={daySelect}>
            {saleDays.map((d) => (
              <option key={d.id} value={d.id}>{shortDay(d.sale_date)}</option>
            ))}
          </select>
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>to</span>
          <select aria-label="To sale day" value={scope.toId} onChange={(e) => onChange({ ...scope, toId: e.target.value })} style={daySelect}>
            {saleDays.map((d) => (
              <option key={d.id} value={d.id}>{shortDay(d.sale_date)}</option>
            ))}
          </select>
        </span>
      )}
    </div>
  )
}
