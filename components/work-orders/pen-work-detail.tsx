'use client'

import { useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { penWorkCharges, formatUsd } from '@/lib/work-orders/pricing'
import type { Barn, PenWorkFull } from '@/lib/work-orders/types'
import type { CountField } from '@/lib/work-orders/use-pen-works'
import type { LineStatus } from '@/lib/work-orders/status'
import type { ResolveMode } from '@/app/(office)/work-orders/actions'

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

function resolveBtn(bg: string, disabled = false): React.CSSProperties {
  return {
    height: 30,
    padding: '0 13px',
    borderRadius: 8,
    border: 'none',
    background: disabled ? '#C7CCD6' : bg,
    color: '#FFFFFF',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  }
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
  lineStatus,
  moveTargets,
  onResolve,
  onMove,
}: {
  pw: PenWorkFull
  barn: Barn
  onCommitCount: (field: CountField, value: number | null) => void
  onCommitHeadBilled: (value: number | null) => void
  lineStatus: LineStatus
  moveTargets: { id: string; name: string }[]
  onResolve: (mode: ResolveMode, reason?: string) => Promise<boolean>
  onMove: (n: number, targetId: string) => Promise<boolean>
}) {
  const charges = penWorkCharges(pw, barn)
  const [reason, setReason] = useState('')
  const [moveN, setMoveN] = useState('')
  const [moveTarget, setMoveTarget] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }
  const moveCount = toIntOrNull(moveN)

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

      {/* RESOLUTION — only when the worked count differs from the ordered count.
          A soft to-do; nothing here blocks billing. */}
      {lineStatus === 'needs_resolution' && (
        <div style={{ flexBasis: '100%', borderTop: '1px solid #E4E4DE', paddingTop: 12, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={caption}>NEEDS RESOLUTION</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.bronze }}>
            Worked {pw.head_worked ?? '—'} vs ordered {pw.head_expected ?? '—'} — resolve when you can; it never blocks billing.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
            {/* Accept actual: bill what was worked. */}
            <button type="button" disabled={busy} onClick={() => run(() => onResolve('accept_actual'))} style={resolveBtn(colors.teal, busy)}>
              Accept Actual{pw.head_worked != null ? ` · bill ${pw.head_worked}` : ''}
            </button>

            {/* Approve the difference: keep billed as-is, reason required. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (required)"
                style={{ height: 30, width: 180, border: `1px solid ${colors.border}`, borderRadius: 7, padding: '0 9px', fontSize: 13, fontFamily: 'inherit', background: colors.white, color: colors.textPrimary }}
              />
              <button
                type="button"
                disabled={busy || !reason.trim()}
                onClick={() => run(async () => { const ok = await onResolve('approve_difference', reason); if (ok) setReason(''); return ok })}
                style={resolveBtn(colors.navy, busy || !reason.trim())}
              >
                Approve the Difference
              </button>
            </div>

            {/* Reassign head to another owner in this pen (the move engine). */}
            {moveTargets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    inputMode="numeric"
                    value={moveN}
                    onChange={(e) => setMoveN(e.target.value)}
                    placeholder="Head"
                    className="tnum"
                    style={{ height: 30, width: 56, border: `1px solid ${colors.border}`, borderRadius: 7, padding: '0 8px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', textAlign: 'right', background: colors.white, color: colors.textPrimary }}
                  />
                  <select
                    value={moveTarget}
                    onChange={(e) => setMoveTarget(e.target.value)}
                    style={{ height: 30, minWidth: 140, border: `1px solid ${colors.border}`, borderRadius: 7, padding: '0 8px', fontSize: 13, fontFamily: 'inherit', background: colors.white, color: colors.textPrimary }}
                  >
                    <option value="">Reassign to…</option>
                    {moveTargets.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={busy || !moveTarget || !(moveCount != null && moveCount > 0)}
                  onClick={() => run(async () => { const ok = await onMove(moveCount as number, moveTarget); if (ok) { setMoveN(''); setMoveTarget('') } return ok })}
                  style={resolveBtn(colors.navy, busy || !moveTarget || !(moveCount != null && moveCount > 0))}
                >
                  Reassign Head
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, fontWeight: 500, color: colors.textMuted, maxWidth: 200 }}>
                Add another owner to this pen on the board to reassign head between them.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
