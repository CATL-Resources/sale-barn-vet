// The Sale Dashboard screen body (renders inside OfficeShell). All numbers are
// computed in the page from the SAME helpers the rest of the app uses
// (metricsBySale, penWorkCharges + sumRollup, deriveStatus) and passed in here —
// this component only lays them out, so it never invents or re-derives a number.

import Link from 'next/link'
import { colors } from '@/components/ui/tokens'
import { formatUsd } from '@/lib/work-orders/pricing'
import { STATUS_LABEL } from '@/lib/work-orders/status'

export type DashMetrics = {
  orders: number
  openOrders: number
  headWorked: number
  headExpected: number
  toWork: number
  pensInUse: number
}
export type DashStatus = { complete: number; in_progress: number; not_started: number; total: number }
export type PartyLine = { id: string; name: string; count: number; head: number }
export type BuyersSellers = {
  sellerCount: number
  sellerLots: number
  sellerHead: number
  sellers: PartyLine[]
  buyerCount: number
  buyerLoads: number
  buyerHead: number
  buyers: PartyLine[]
}

const card: React.CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  boxShadow: '0 1px 2px rgba(14,38,70,0.04)',
}
// The dark, glossy feature surface used for the hero band and the Jump In cards.
const featureCard: React.CSSProperties = {
  background: 'var(--surface-feature)',
  borderRadius: 18,
  padding: 20,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 12px 30px rgba(0,0,0,0.18)',
}
const cardTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }
const microLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.textMuted }

// One stat in the hero band: a gradient card with a white number. The label and
// sub colors are passed per card (they're tuned to each gradient). The "To work"
// card is the dominant one — it spans two columns and prints a bigger number.
function StatCard({ grad, label, value, sub, labelColor, subColor, dominant }: { grad: string; label: string; value: string; sub?: string; labelColor: string; subColor: string; dominant?: boolean }) {
  return (
    <div style={{ background: grad, borderRadius: 14, padding: dominant ? '16px 18px' : '14px 16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, gridColumn: dominant ? 'span 2' : undefined }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: labelColor }}>{label}</div>
      <div style={{ fontSize: dominant ? 40 : 26, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, fontWeight: 700, color: subColor, marginTop: 2 }}>{sub}</div> : null}
    </div>
  )
}

function JumpCard({ href, title, summary, count }: { href: string; title: string; summary: string; count: string }) {
  return (
    <Link href={href} style={{ ...featureCard, padding: 18, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 7, color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{title}</span>
        <span style={{ color: colors.gold, fontWeight: 800, fontSize: 18 }}>›</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#C7D4EA', lineHeight: 1.35 }}>{summary}</div>
      <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 2, fontSize: 12, fontWeight: 800, color: colors.teal, background: 'rgba(85,186,170,0.16)', border: '1px solid rgba(85,186,170,0.42)', borderRadius: 999, padding: '3px 10px' }}>{count}</span>
      </div>
    </Link>
  )
}

function StatusRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: colors.navy, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </div>
  )
}

function PartyRows({ rows, unit, empty }: { rows: PartyLine[]; unit: string; empty: string }) {
  if (rows.length === 0) return <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPlaceholder, padding: '4px 0' }}>{empty}</div>
  return (
    <div>
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderTop: `1px solid ${colors.rowDivider}` }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>{r.count} {unit}{r.count === 1 ? '' : 's'} · {r.head} hd</span>
        </div>
      ))}
    </div>
  )
}

export function SaleDashboard({
  saleDayId, saleName, workingState, metrics, billed, status, bs,
}: {
  saleDayId: string
  saleName: string
  workingState: string
  metrics: DashMetrics
  billed: number
  status: DashStatus
  bs: BuyersSellers
}) {
  const wo = `/work-orders/${saleDayId}`
  const pl = `/work-list/${saleDayId}`
  const completePct = status.total > 0 ? Math.round((status.complete / status.total) * 100) : 0
  const inProgPct = status.total > 0 ? Math.round((status.in_progress / status.total) * 100) : 0
  const open = workingState.toLowerCase() === 'open'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: colors.navy, letterSpacing: '-0.02em' }}>Sale Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textMuted }}>{saleName}</span>
          <span style={{ fontSize: 12, fontWeight: 800, padding: '2px 10px', borderRadius: 999, background: open ? colors.tealPillBg : '#F3F3F0', color: open ? colors.teal : colors.textMuted, border: `1px solid ${open ? colors.teal : colors.border}` }}>
            {open ? 'Working' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Hero band — the five live stats in one feature card, "To work" dominant.
          The values are unchanged; only the presentation is. */}
      <div style={featureCard}>
        <div className="office-tiles">
          <StatCard grad="var(--stat-worked)" label="Head Worked" value={`${metrics.headWorked} / ${metrics.headExpected}`} sub="worked of expected" labelColor="#9FB4D4" subColor="#7FD3C6" />
          <StatCard grad="var(--stat-towork)" label="To Work" value={String(metrics.toWork)} sub="head left" labelColor="#C7D4EA" subColor="#7FD3C6" dominant />
          <StatCard grad="var(--stat-pens)" label="Pens In Use" value={String(metrics.pensInUse)} labelColor="#BDE7E0" subColor="#7FD3C6" />
          <StatCard grad="var(--stat-orders)" label="Work Orders" value={String(metrics.orders)} sub={`${metrics.openOrders} open`} labelColor="#9FB4D4" subColor="#7FD3C6" />
          <StatCard grad="var(--stat-billed)" label="Billed · office so far" value={formatUsd(billed)} sub="live preview" labelColor="#FBE7C8" subColor="#FFF1DC" />
        </div>
      </div>

      {/* Jump In */}
      <div>
        <div style={{ ...microLabel, marginBottom: 8 }}>Jump In</div>
        <div className="office-jumpin">
          <JumpCard href={wo} title="Work Orders" summary="Review counts, resolve, and bill the day's orders." count={`${metrics.orders} order${metrics.orders === 1 ? '' : 's'} · ${metrics.openOrders} open`} />
          <JumpCard href={pl} title="Pen List" summary="Work cows pen by pen at the chute." count={`${metrics.pensInUse} pen${metrics.pensInUse === 1 ? '' : 's'} · ${metrics.toWork} head to work`} />
          <JumpCard href="/reports" title="Reports" summary="Day and customer billing summaries." count="Coming soon" />
          <JumpCard href={`/print/closeout/${saleDayId}`} title="Sale Day Closeout" summary="Print or download the day's billing — sellers and buyers, with a grand total." count="Summary or itemized" />
        </div>
      </div>

      {/* Status + Buyers & Sellers */}
      <div className="office-twocol">
        {/* Work Order Status */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={cardTitle}>Work Order Status</span>
            <Link href={wo} style={{ fontSize: 13, fontWeight: 800, color: colors.teal, textDecoration: 'none' }}>Open board ›</Link>
          </div>
          {/* progress bar: complete (teal) then in-progress (amber) */}
          <div style={{ height: 10, borderRadius: 999, background: '#EDEDE9', overflow: 'hidden', display: 'flex', marginTop: 12 }}>
            <span style={{ width: `${completePct}%`, background: colors.teal }} />
            <span style={{ width: `${inProgPct}%`, background: colors.warning }} />
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusRow label={STATUS_LABEL.complete} count={status.complete} color={colors.teal} />
            <StatusRow label={STATUS_LABEL.in_progress} count={status.in_progress} color={colors.warning} />
            <StatusRow label={STATUS_LABEL.not_started} count={status.not_started} color={colors.textFaint} />
          </div>
        </div>

        {/* Buyers & Sellers */}
        <div style={{ ...card, padding: 16 }}>
          <span style={cardTitle}>Buyers &amp; Sellers</span>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={microLabel}>Sellers · pre-sale</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>{bs.sellerCount} · {bs.sellerLots} lots · {bs.sellerHead} hd</span>
            </div>
            <PartyRows rows={bs.sellers} unit="lot" empty="No consignors yet." />
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={microLabel}>Buyers · post-sale</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>{bs.buyerCount} · {bs.buyerLoads} loads · {bs.buyerHead} hd</span>
            </div>
            <PartyRows rows={bs.buyers} unit="load" empty="No buyers yet." />
          </div>
          <Link href="/customers" style={{ display: 'inline-flex', marginTop: 14, height: 38, alignItems: 'center', padding: '0 16px', borderRadius: 9, border: `1px solid ${colors.border}`, background: '#fff', color: colors.navy, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
            View all customers ›
          </Link>
        </div>
      </div>

      {/* Consignments strip — the white panel + gold action match the design.
          There's no consignment data model yet, so the action stays disabled and
          there are no cards to list. */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={cardTitle}>Consignments</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, background: colors.cardHeader, border: `1px solid ${colors.cardHeaderBorder}`, borderRadius: 999, padding: '2px 9px' }}>Coming soon</span>
          </div>
          <button type="button" disabled aria-disabled="true" title="Coming soon — needs a consignment record first" style={{ height: 38, padding: '0 16px', borderRadius: 9, border: 'none', background: colors.gold, color: colors.navy, fontSize: 13, fontWeight: 800, cursor: 'not-allowed', opacity: 0.55 }}>
            + Add Consignment
          </button>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, marginTop: 10 }}>Track consignments per sale. Not built yet — nothing to show.</div>
      </div>
    </div>
  )
}
