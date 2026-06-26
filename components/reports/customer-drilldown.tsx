'use client'

// A customer's charge detail, opened from the Customer Report. Shows their work
// order lines as both seller and buyer, grouped by sale day, each with the same
// bucket breakdown as the Billing view (Vet, Sales Tax, Admin, SOL, Total) via
// penWorkCharges. Stands in for a statement. Read-only.
//
// LOAD FILTER: the office wants to narrow this to a specific load a customer
// brought, but the live schema has no load link on pen_work (no load_id, and no
// loads / lots tables). So there is no load filter here — see the PR note. The
// detail is grouped by sale day and work order instead.

import { colors } from '@/components/ui/tokens'
import { formatUsd } from '@/lib/work-orders/pricing'
import type { Barn, PenWorkFull } from '@/lib/work-orders/types'
import { lineBuckets } from '@/lib/reports/billing'

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export function CustomerDrilldown({
  party,
  penWorks,
  barn,
  dayDateById,
  onClose,
}: {
  party: { id: string | null; name: string }
  penWorks: PenWorkFull[]
  barn: Barn
  dayDateById: Map<string, string>
  onClose: () => void
}) {
  // This customer's lines — as seller OR buyer.
  const mine = penWorks.filter((pw) =>
    party.id ? pw.seller_party_id === party.id || pw.buyer_party_id === party.id : false,
  )

  // Group by sale day (newest first), then list the work orders within.
  const byDay = new Map<string, PenWorkFull[]>()
  for (const pw of mine) {
    const k = pw.sale_day_id
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(pw)
  }
  const days = [...byDay.keys()].sort((a, b) => (dayDateById.get(b) ?? '').localeCompare(dayDateById.get(a) ?? ''))

  const grand = mine.reduce(
    (acc, pw) => {
      const b = lineBuckets(pw, barn)
      return {
        head: acc.head + b.head,
        vet: acc.vet + b.vet,
        tax: acc.tax + b.tax,
        admin: acc.admin + b.admin,
        sol: acc.sol + b.sol,
        total: acc.total + b.total,
      }
    },
    { head: 0, vet: 0, tax: 0, admin: 0, sol: 0, total: 0 },
  )

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(8,18,40,0.45)' }} aria-hidden />
      <div
        role="dialog"
        aria-label={`Charges for ${party.name}`}
        style={{ position: 'fixed', zIndex: 81, top: '5vh', left: '50%', transform: 'translateX(-50%)', width: 'min(960px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 60px rgba(8,18,40,0.4)' }}
      >
        {/* Header */}
        <div style={{ background: colors.navy, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{party.name}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.navySubText, marginTop: 1 }}>Charge detail · seller and buyer lines</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.gold, whiteSpace: 'nowrap' }}>{formatUsd(grand.total)} · {grand.head} hd</span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mine.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', fontSize: 14, color: colors.textMuted }}>No work orders for this customer in the current scope.</div>
          ) : (
            days.map((dayId) => {
              const lines = byDay.get(dayId)!
              return (
                <section key={dayId} style={{ border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 14px', background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, fontSize: 13, fontWeight: 800, color: colors.navy }}>
                    {dayDateById.get(dayId) ? longDate(dayDateById.get(dayId)!) : 'Sale day'}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontVariantNumeric: 'tabular-nums', minWidth: 720 }}>
                      <thead>
                        <tr>
                          <Th>Role</Th><Th>Pen</Th><Th>Work Type</Th><Th right>Head</Th>
                          <Th right>Vet</Th><Th right>Sales Tax</Th><Th right>Admin</Th><Th right>SOL</Th><Th right>Total</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((pw, i) => {
                          const b = lineBuckets(pw, barn)
                          const role = pw.buyer_party_id === party.id ? 'Buyer' : 'Seller'
                          return (
                            <tr key={pw.id} style={{ background: i % 2 ? colors.hoverBg : '#fff' }}>
                              <Td>{role}{pw.is_hold ? ' · Hold' : ''}</Td>
                              <Td>{pw.pen?.pen_number ?? '—'}</Td>
                              <Td>{pw.workType?.name ?? '—'}</Td>
                              <Td right>{b.head}</Td>
                              <Td right>{formatUsd(b.vet)}</Td>
                              <Td right>{formatUsd(b.tax)}</Td>
                              <Td right>{formatUsd(b.admin)}</Td>
                              <Td right>{formatUsd(b.sol)}</Td>
                              <Td right strong>{formatUsd(b.total)}</Td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '7px 12px', textAlign: right ? 'right' : 'left', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, whiteSpace: 'nowrap' }}>{children}</th>
  )
}
function Td({ children, right, strong }: { children: React.ReactNode; right?: boolean; strong?: boolean }) {
  return (
    <td style={{ padding: '7px 12px', borderBottom: `1px solid ${colors.rowDivider}`, textAlign: right ? 'right' : 'left', fontSize: 13, fontWeight: strong ? 800 : 600, color: strong ? colors.navy : colors.textPrimary, whiteSpace: 'nowrap' }}>{children}</td>
  )
}
