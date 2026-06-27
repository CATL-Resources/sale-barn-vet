'use client'

import { useState, useTransition } from 'react'
import { colors } from '@/components/ui/tokens'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { closeSortPen, reopenSortPen, moveSortPen } from '@/app/(office)/work-list/actions'
import type { SortPenSummary } from '@/lib/work-list/sort-pens'

// The Sort Pens screen, reached from the chute Pen List. Lists each sort pen for
// the sale day — the pens cattle were sorted into through the day — with head and
// the owner mix. Open pens can be closed out; closed pens can be reopened, and
// their whole pen of cattle assigned to one destination pen and moved there.
// Display + three small writes; it never touches billing or head counts.
export function SortPensView({
  saleDayId,
  barnId,
  pens,
  onChanged,
  onClose,
}: {
  saleDayId: string
  barnId: string
  pens: SortPenSummary[]
  onChanged: () => void
  onClose: () => void
}) {
  const open = pens.filter((p) => !p.closedAt)
  const closed = pens.filter((p) => p.closedAt)

  return (
    <Modal
      size="md"
      align="top"
      zIndex={70}
      onClose={onClose}
      overlayStyle={{ padding: 0 }}
      panelStyle={{ background: '#F5F5F0', borderRadius: 0, boxShadow: 'none' }}
    >
      <div style={{ background: colors.navy, flexShrink: 0, padding: 'calc(14px + env(safe-area-inset-top)) 16px 16px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={onClose} aria-label="Back" style={{ width: 34, height: 34, flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22 }}>‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>Sort Pens</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#55BAAA', marginTop: 1 }}>
              {open.length} open · {closed.length} closed
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
        {pens.length === 0 ? (
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: colors.navy }}>No Sort Pens Yet</div>
            <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Cattle sorted off at the chute show up here, pen by pen.</div>
          </div>
        ) : null}

        {open.length > 0 ? (
          <Section title="Open" count={open.length}>
            {open.map((p) => (
              <SortPenCard key={p.penId} pen={p} saleDayId={saleDayId} barnId={barnId} onChanged={onChanged} />
            ))}
          </Section>
        ) : null}

        {closed.length > 0 ? (
          <Section title="Closed" count={closed.length}>
            {closed.map((p) => (
              <SortPenCard key={p.penId} pen={p} saleDayId={saleDayId} barnId={barnId} onChanged={onChanged} />
            ))}
          </Section>
        ) : null}
      </div>
    </Modal>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', color: colors.navy }}>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>{count} {count === 1 ? 'pen' : 'pens'}</span>
      </div>
      {children}
    </div>
  )
}

function SortPenCard({
  pen,
  saleDayId,
  barnId,
  onChanged,
}: {
  pen: SortPenSummary
  saleDayId: string
  barnId: string
  onChanged: () => void
}) {
  const [busy, startBusy] = useTransition()
  const [dest, setDest] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [moved, setMoved] = useState<{ pen: string; head: number } | null>(null)
  const isClosed = !!pen.closedAt

  function doClose() {
    setError(null)
    startBusy(async () => {
      const res = await closeSortPen(pen.penId, barnId)
      if (res.ok) onChanged()
      else setError(res.error || 'Could not close the pen.')
    })
  }

  function doReopen() {
    setError(null)
    startBusy(async () => {
      const res = await reopenSortPen(pen.penId, barnId)
      if (res.ok) onChanged()
      else setError(res.error || 'Could not reopen the pen.')
    })
  }

  function doMove() {
    setError(null)
    setMoved(null)
    startBusy(async () => {
      const res = await moveSortPen({ sortPenId: pen.penId, saleDayId, barnId, destinationPenNumber: dest })
      if (res.ok) {
        setMoved({ pen: res.destination?.pen_number ?? dest.trim(), head: res.moved ?? 0 })
        setDest('')
        onChanged()
      } else {
        setError(res.error || 'Could not move the cattle.')
      }
    })
  }

  return (
    <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
      {/* Identity + head */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>Pen {pen.penNumber}</span>
        {isClosed ? (
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, background: '#F3F3F0', border: `1px solid ${colors.border}`, borderRadius: 999, padding: '3px 10px' }}>Closed</span>
        ) : null}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>{pen.head} head</span>
      </div>

      {/* Owner mix */}
      {pen.owners.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {pen.owners.map((o) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.teal, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
              <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>{o.head} head</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Cattle moved — none left in this pen.</div>
      )}

      {moved ? (
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.teal, background: colors.tealPillBg, border: `1px solid ${colors.teal}`, borderRadius: 10, padding: '9px 12px' }}>
          Moved {moved.head} head to pen {moved.pen}.
        </div>
      ) : null}

      {error ? <div style={{ fontSize: 12, fontWeight: 700, color: colors.danger }}>{error}</div> : null}

      {/* Actions */}
      {!isClosed ? (
        <Button variant="primary" type="button" onClick={doClose} disabled={busy} fullWidth style={{ height: 46, borderRadius: 11, fontSize: 15, fontWeight: 800 }}>
          {busy ? 'Closing…' : 'Close out pen'}
        </Button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pen.head > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#F8F8F5', border: `1px solid ${colors.border}`, borderRadius: 11, padding: 11 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: colors.textMuted }}>Move to destination pen</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  inputMode="text"
                  placeholder="Destination pen #"
                  aria-label="Destination pen number"
                  style={{ flex: 1, minWidth: 0, height: 46, boxSizing: 'border-box', borderRadius: 10, border: `1px solid ${colors.border}`, padding: '0 12px', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: colors.textPrimary, background: '#fff' }}
                />
                <Button variant="primary" type="button" onClick={doMove} disabled={busy || !dest.trim()} style={{ flexShrink: 0, height: 46, padding: '0 16px', borderRadius: 10, fontSize: 14, fontWeight: 800 }}>
                  {busy ? 'Moving…' : `Move ${pen.head} head`}
                </Button>
              </div>
            </div>
          ) : null}
          <Button variant="outline" type="button" onClick={doReopen} disabled={busy} fullWidth style={{ height: 44, borderRadius: 11, fontSize: 14, fontWeight: 700 }}>
            {busy ? 'Reopening…' : 'Reopen pen'}
          </Button>
        </div>
      )}
    </div>
  )
}
