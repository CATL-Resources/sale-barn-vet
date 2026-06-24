'use client'

import { useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { penWorkCharges, formatUsd } from '@/lib/work-orders/pricing'
import type { Barn, PenWorkFull } from '@/lib/work-orders/types'
import type { CountField } from '@/lib/work-orders/use-pen-works'

function toIntOrNull(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

const caption: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: colors.textPlaceholder,
  marginBottom: 7,
}

function CountInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number | null
  onCommit: (v: number | null) => void
}) {
  const [text, setText] = useState(value == null ? '' : String(value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: colors.textMuted }}>{label}</span>
      <input
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onCommit(toIntOrNull(text))}
        className="tnum"
        style={{
          width: 64,
          height: 30,
          border: `1px solid ${colors.border}`,
          borderRadius: 7,
          padding: '0 8px',
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'inherit',
          color: colors.textPrimary,
          textAlign: 'right',
          background: colors.white,
        }}
      />
    </div>
  )
}

function ReadStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: colors.textMuted }}>{label}</span>
      <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
        {value}
      </span>
    </div>
  )
}

export function PenWorkDetail({
  pw,
  barn,
  onCommitCount,
  onCommitHeadBilled,
}: {
  pw: PenWorkFull
  barn: Barn
  onCommitCount: (field: CountField, value: number | null) => void
  onCommitHeadBilled: (value: number | null) => void
}) {
  const charges = penWorkCharges(pw, barn)

  return (
    <div
      style={{
        background: colors.hoverBg,
        padding: '11px 14px 13px 36px',
        borderBottom: `1px solid ${colors.rowDivider}`,
        display: 'flex',
        gap: 28,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={caption}>POINT-IN-TIME COUNTS</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <CountInput
            label="Started"
            value={pw.head_started}
            onCommit={(v) => onCommitCount('head_started', v)}
          />
          <CountInput
            label="Expected"
            value={pw.head_expected}
            onCommit={(v) => onCommitCount('head_expected', v)}
          />
          <CountInput
            label="Returned"
            value={pw.head_returned}
            onCommit={(v) => onCommitCount('head_returned', v)}
          />
        </div>
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: '#E4E4DE' }} />

      {/* Billing count: Worked is the chute's number (read-only here); Billed is
          the office's lever. Defaults to the worked count until set. */}
      <div>
        <div style={caption}>BILLING</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <ReadStat label="Worked (chute)" value={pw.head_worked == null ? '—' : String(pw.head_worked)} />
          <CountInput
            label="Billed"
            value={pw.head_billed ?? pw.head_worked}
            onCommit={onCommitHeadBilled}
          />
        </div>
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: '#E4E4DE' }} />

      <div>
        <div style={caption}>CHARGE BREAKDOWN</div>
        <div style={{ display: 'flex', gap: 22 }}>
          <ReadStat label="Vet" value={formatUsd(charges.vetTotal)} />
          <ReadStat label="Admin" value={formatUsd(charges.adminTotal)} />
          <ReadStat label="SOL" value={formatUsd(charges.solTotal)} />
        </div>
      </div>
    </div>
  )
}
