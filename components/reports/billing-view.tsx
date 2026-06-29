'use client'

// Billing view inside the Reports hub. Every dollar comes through the canonical
// money functions (penWorkCharges per line, sumRollup to aggregate) — never the
// raw *_total columns. The office bills in separate buckets to confirm against
// their other system, so each bucket is its own column:
//   Vet      = the pre-tax vet figure (vetTotal / (1 + tax))
//   Sales Tax= the remainder (vetTotal - pre-tax vet)
//   Admin    = adminTotal
//   SOL      = solTotal
//   Subtotal = pre-tax vet + admin + sol
//   Total    = lineCharge
// A hold line (is_hold) bills zero but its head stays visible — penWorkCharges
// already handles that. Read-only; nothing here recomputes or writes billing.

import { useMemo, useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { sumRollup, formatUsd } from '@/lib/work-orders/pricing'
import type { Barn, PenWorkFull } from '@/lib/work-orders/types'
import { lineBuckets, type LineBuckets } from '@/lib/reports/billing'
import { copyTsv, exportXlsx, type ExportColumn, type ExportRow } from '@/lib/reports/export'

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'barn'

const BUCKET_COLS: ExportColumn[] = [
  { key: 'customer', label: 'Customer / Work', kind: 'text' },
  { key: 'head', label: 'Head', kind: 'int' },
  { key: 'vet', label: 'Vet', kind: 'money' },
  { key: 'tax', label: 'Sales Tax', kind: 'money' },
  { key: 'admin', label: 'Admin', kind: 'money' },
  { key: 'sol', label: 'SOL', kind: 'money' },
  { key: 'subtotal', label: 'Subtotal', kind: 'money' },
  { key: 'total', label: 'Total', kind: 'money' },
]

type CustomerRow = {
  customer: string
  head: number
  vet: number
  tax: number
  admin: number
  sol: number
  subtotal: number
  total: number
}

// One row per pen_work — the line-level detail under the customer rollup. Buyer
// number and pen live on the line (a customer's work can span many pens), so
// they belong here, not on the summed customer row. Money is the same line total
// the rollup is built from; nothing here recomputes a charge.
type LineRow = {
  key: string
  customer: string
  buyerNo: string // blank on seller lines — they have no buyer number
  pen: string
  workType: string
  head: number
  total: number
}

export function BillingView({
  penWorks,
  barn,
  barnName,
  search,
  scopeText,
}: {
  penWorks: PenWorkFull[]
  barn: Barn
  barnName: string
  search: string
  scopeText: string
}) {
  const [flash, setFlash] = useState<string | null>(null)
  function note(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash((m) => (m === msg ? null : m)), 2000)
  }

  // Per-customer rollup. A line's customer is the buyer (post-sale) or the seller
  // (pre-sale) — whoever the work order bills.
  const { customers, byWorkType, lines, totals } = useMemo(() => {
    const byCustomer = new Map<string, CustomerRow>()
    const wt = new Map<string, { workType: string; charges: number; head: number; billed: number }>()
    const charges: LineBuckets['charge'][] = []
    const lineRows: LineRow[] = []

    for (const pw of penWorks) {
      const b = lineBuckets(pw, barn)
      charges.push(b.charge)

      const isBuyer = !!pw.buyer_party_id
      const name = (isBuyer ? pw.buyer?.name : pw.seller?.name) || 'Unassigned'
      const key = (isBuyer ? pw.buyer_party_id : pw.seller_party_id) || `name:${name}`
      const cur =
        byCustomer.get(key) ?? { customer: name, head: 0, vet: 0, tax: 0, admin: 0, sol: 0, subtotal: 0, total: 0 }
      cur.head += b.head
      cur.vet += b.vet
      cur.tax += b.tax
      cur.admin += b.admin
      cur.sol += b.sol
      cur.subtotal += b.subtotal
      cur.total += b.total
      byCustomer.set(key, cur)

      const wtName = pw.workType?.name || '—'
      const wcur = wt.get(wtName) ?? { workType: wtName, charges: 0, head: 0, billed: 0 }
      wcur.charges += 1
      wcur.head += b.head
      wcur.billed += b.total
      wt.set(wtName, wcur)

      // The line-level row. Buyer number prefers the snapshot text recorded on
      // the line, falling back to the joined buyer_number record; seller lines
      // have no buyer number, so leave it blank.
      lineRows.push({
        key: pw.id,
        customer: name,
        buyerNo: isBuyer ? pw.buyer_number_text ?? pw.buyerNumber?.number ?? '' : '',
        pen: pw.pen?.pen_number ?? '',
        workType: wtName,
        head: b.head,
        total: b.total,
      })
    }

    const roll = sumRollup(charges)
    const penSet = new Set(penWorks.map((pw) => pw.pen?.pen_number).filter(Boolean))
    // Lines sort by customer, then by pen (natural order so "2" sorts before
    // "10"), then by work type — the order an office eye scans them in.
    lineRows.sort(
      (a, b) =>
        a.customer.localeCompare(b.customer) ||
        a.pen.localeCompare(b.pen, undefined, { numeric: true }) ||
        a.workType.localeCompare(b.workType),
    )
    return {
      customers: [...byCustomer.values()].sort((a, b) => a.customer.localeCompare(b.customer)),
      byWorkType: [...wt.values()].sort((a, b) => a.workType.localeCompare(b.workType)),
      lines: lineRows,
      totals: {
        head: roll.headWorked,
        billed: roll.lineCharge,
        orders: penWorks.length,
        pens: penSet.size,
      },
    }
  }, [penWorks, barn])

  const q = search.trim().toLowerCase()
  const shownCustomers = q ? customers.filter((c) => c.customer.toLowerCase().includes(q)) : customers
  const shownWorkTypes = q ? byWorkType.filter((w) => w.workType.toLowerCase().includes(q)) : byWorkType
  // The line table matches on everything shown on the line — customer name,
  // buyer number, pen, and work type — so typing a buyer number narrows to that
  // buyer's lines.
  const shownLines = q
    ? lines.filter(
        (l) =>
          l.customer.toLowerCase().includes(q) ||
          l.buyerNo.toLowerCase().includes(q) ||
          l.pen.toLowerCase().includes(q) ||
          l.workType.toLowerCase().includes(q),
      )
    : lines

  // The export is the by-customer billing table (the filtered set), each bucket
  // its own column, plus a grand-total row so the file reconciles on its own.
  const exportRows: ExportRow[] = useMemo(() => {
    const rows: ExportRow[] = shownCustomers.map((c) => ({ ...c }))
    const t = shownCustomers.reduce(
      (a, c) => ({
        head: a.head + c.head,
        vet: a.vet + c.vet,
        tax: a.tax + c.tax,
        admin: a.admin + c.admin,
        sol: a.sol + c.sol,
        subtotal: a.subtotal + c.subtotal,
        total: a.total + c.total,
      }),
      { head: 0, vet: 0, tax: 0, admin: 0, sol: 0, subtotal: 0, total: 0 },
    )
    rows.push({ customer: 'TOTAL', ...t })
    return rows
  }, [shownCustomers])

  const filtersSummary = q ? `search "${search.trim()}"` : 'None'

  async function onCopy() {
    const ok = await copyTsv(exportRows, BUCKET_COLS)
    note(ok ? `Copied ${shownCustomers.length} customer${shownCustomers.length === 1 ? '' : 's'}` : 'Copy failed — select the table by hand')
  }
  async function onExport() {
    try {
      await exportXlsx(
        exportRows,
        BUCKET_COLS,
        { fileType: 'Billing Export', barnName, scope: scopeText, filtersSummary, groupingSummary: 'By customer', rowCount: shownCustomers.length },
        `billing-${slug(barnName)}-${slug(scopeText)}.xlsx`,
        'Billing',
      )
      note(`Exported ${shownCustomers.length} customer${shownCustomers.length === 1 ? '' : 's'}`)
    } catch {
      note('Export failed — try again')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Totals strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, background: '#EEF1F6', border: '1px solid #DEE3EC', borderRadius: 11, padding: '12px 18px', flexWrap: 'wrap' }}>
        <Stat label="Head worked" value={totals.head.toLocaleString('en-US')} />
        <Stat label="Work orders" value={String(totals.orders)} />
        <Stat label="Pens in use" value={String(totals.pens)} />
        <Stat label="Billed" value={formatUsd(totals.billed)} accent />
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 13, fontWeight: 700, color: colors.teal }}>✓ {flash}</span>}
        <button type="button" onClick={() => void onCopy()} style={btn(false)}>Copy</button>
        <button type="button" onClick={() => void onExport()} style={btn(true)}>Export to Excel</button>
      </div>

      {/* By customer */}
      <Card title="By customer">
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>Customer / Work</Th>
              <Th right>Head</Th>
              <Th right>Vet</Th>
              <Th right>Sales Tax</Th>
              <Th right>Admin</Th>
              <Th right>SOL</Th>
              <Th right>Subtotal</Th>
              <Th right>Total</Th>
            </tr>
          </thead>
          <tbody>
            {shownCustomers.map((c, i) => (
              <tr key={c.customer + i} style={{ background: i % 2 ? colors.hoverBg : '#fff' }}>
                <Td strong>{c.customer}</Td>
                <Td right>{c.head}</Td>
                <Td right>{formatUsd(c.vet)}</Td>
                <Td right>{formatUsd(c.tax)}</Td>
                <Td right>{formatUsd(c.admin)}</Td>
                <Td right>{formatUsd(c.sol)}</Td>
                <Td right>{formatUsd(c.subtotal)}</Td>
                <Td right strong navy>{formatUsd(c.total)}</Td>
              </tr>
            ))}
            {shownCustomers.length === 0 && (
              <tr><td colSpan={8} style={emptyCell}>No billing in this scope{q ? ' for that search' : ''}.</td></tr>
            )}
          </tbody>
          {shownCustomers.length > 0 && (
            <tfoot>
              <tr>
                <Td strong navy>Total</Td>
                <Td right strong navy>{shownCustomers.reduce((a, c) => a + c.head, 0)}</Td>
                <Td right strong navy>{formatUsd(shownCustomers.reduce((a, c) => a + c.vet, 0))}</Td>
                <Td right strong navy>{formatUsd(shownCustomers.reduce((a, c) => a + c.tax, 0))}</Td>
                <Td right strong navy>{formatUsd(shownCustomers.reduce((a, c) => a + c.admin, 0))}</Td>
                <Td right strong navy>{formatUsd(shownCustomers.reduce((a, c) => a + c.sol, 0))}</Td>
                <Td right strong navy>{formatUsd(shownCustomers.reduce((a, c) => a + c.subtotal, 0))}</Td>
                <Td right strong navy>{formatUsd(shownCustomers.reduce((a, c) => a + c.total, 0))}</Td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      {/* By line — one row per pen worked, with the buyer number and pen that
          the customer rollup sums away. */}
      <Card title="By line">
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Buyer #</Th>
              <Th>Pen</Th>
              <Th>Work Type</Th>
              <Th right>Head</Th>
              <Th right>Total</Th>
            </tr>
          </thead>
          <tbody>
            {shownLines.map((l, i) => (
              <tr key={l.key} style={{ background: i % 2 ? colors.hoverBg : '#fff' }}>
                <Td strong>{l.customer}</Td>
                <Td>{l.buyerNo || '—'}</Td>
                <Td>{l.pen || '—'}</Td>
                <Td>{l.workType}</Td>
                <Td right>{l.head}</Td>
                <Td right strong navy>{formatUsd(l.total)}</Td>
              </tr>
            ))}
            {shownLines.length === 0 && (
              <tr><td colSpan={6} style={emptyCell}>No billing lines in this scope{q ? ' for that search' : ''}.</td></tr>
            )}
          </tbody>
          {shownLines.length > 0 && (
            <tfoot>
              <tr>
                <Td strong navy>Total</Td>
                <Td> </Td>
                <Td> </Td>
                <Td> </Td>
                <Td right strong navy>{shownLines.reduce((a, l) => a + l.head, 0)}</Td>
                <Td right strong navy>{formatUsd(shownLines.reduce((a, l) => a + l.total, 0))}</Td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      {/* By work type */}
      <Card title="By work type">
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>Work Type</Th>
              <Th right>Charges</Th>
              <Th right>Head</Th>
              <Th right>Billed</Th>
            </tr>
          </thead>
          <tbody>
            {shownWorkTypes.map((w, i) => (
              <tr key={w.workType + i} style={{ background: i % 2 ? colors.hoverBg : '#fff' }}>
                <Td strong>{w.workType}</Td>
                <Td right>{w.charges}</Td>
                <Td right>{w.head}</Td>
                <Td right strong navy>{formatUsd(w.billed)}</Td>
              </tr>
            ))}
            {shownWorkTypes.length === 0 && (
              <tr><td colSpan={4} style={emptyCell}>No work types in this scope{q ? ' for that search' : ''}.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: accent ? colors.navy : colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </span>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '9px 14px 10px', background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>{title}</div>
        <div style={{ width: 26, height: 3, borderRadius: 2, background: colors.gold, marginTop: 5 }} />
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </section>
  )
}

const tableStyle: React.CSSProperties = { borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontVariantNumeric: 'tabular-nums', minWidth: 720 }
const emptyCell: React.CSSProperties = { padding: '24px 14px', textAlign: 'center', fontSize: 14, color: colors.textMuted }

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ position: 'sticky', top: 0, background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '8px 12px', textAlign: right ? 'right' : 'left', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}
function Td({ children, right, strong, navy }: { children: React.ReactNode; right?: boolean; strong?: boolean; navy?: boolean }) {
  return (
    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.rowDivider}`, textAlign: right ? 'right' : 'left', fontSize: 13, fontWeight: strong ? 800 : 600, color: navy ? colors.navy : colors.textPrimary, whiteSpace: 'nowrap' }}>
      {children}
    </td>
  )
}

const btn = (gold: boolean): React.CSSProperties => ({
  height: 36,
  padding: '0 14px',
  borderRadius: 9,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: gold ? 800 : 700,
  background: gold ? colors.gold : '#fff',
  border: `1px solid ${gold ? colors.gold : colors.border}`,
  color: colors.navy,
})
