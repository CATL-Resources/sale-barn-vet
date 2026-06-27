'use client'

import type { ConsignorLine } from '@/lib/capture/consignor-lines'

// The per-cow consignor picker, shown ONLY when the pen is mixed for the current
// work. It lists ONLY the consignors who have cattle in this pen (the pen's
// existing lines for this work type), by name — no description text, the attached
// photo is the visual reference. Tapping picks whose the cow in the chute is; the
// choice is sticky and carries to the next cow until changed. The Hold chip parks
// a cow whose owner isn't known yet.
export function ConsignorPicker({
  lines,
  value,
  onPick,
}: {
  lines: ConsignorLine[]
  value: string | null
  onPick: (id: string) => void
}) {
  return (
    <div style={{ background: '#0E2646', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#8FA8CC', textTransform: 'uppercase' }}>
        Whose cow is this
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {lines.map((l) => {
          const on = value === l.id
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onPick(l.id)}
              aria-pressed={on}
              style={{
                minHeight: 44,
                padding: '0 16px',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 15,
                fontWeight: 800,
                background: on ? '#F3D12A' : 'rgba(255,255,255,0.08)',
                color: on ? '#0E2646' : '#FFFFFF',
                border: `1px solid ${on ? '#F3D12A' : 'rgba(255,255,255,0.18)'}`,
              }}
            >
              {l.ownerName}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onPick('hold')}
          aria-pressed={value === 'hold'}
          style={{
            minHeight: 44,
            padding: '0 16px',
            borderRadius: 999,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 800,
            background: value === 'hold' ? '#F59E0B' : 'rgba(245,158,11,0.14)',
            color: value === 'hold' ? '#0E2646' : '#F4B860',
            border: `1px solid ${value === 'hold' ? '#F59E0B' : 'rgba(245,158,11,0.5)'}`,
          }}
        >
          Hold
        </button>
      </div>
    </div>
  )
}
