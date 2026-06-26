'use client'

// Customer Report inside the Reports hub: a row per party in scope, with Head
// Sold (head on work orders where they are the seller), Head Bought (head where
// they are the buyer), and Billed (their charges via penWorkCharges/sumRollup —
// never raw totals). Clicking a customer opens their charge drill-down. Read
// only.

import { useMemo, useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { formatUsd } from '@/lib/work-orders/pricing'
import type { Barn, PenWorkFull } from '@/lib/work-orders/types'
import { lineBuckets, billedParty } from '@/lib/reports/billing'
import { copyTsv, exportXlsx, type ExportColumn, type ExportRow } from '@/lib/reports/export'
import { CustomerDrilldown } from './customer-drilldown'

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'barn'

const COLS: ExportColumn[] = [
  { key: 'customer', label: 'Customer', kind: 'text' },
  { key: 'headSold', label: 'Head Sold', kind: 'int' },
  { key: 'headBought', label: 'Head Bought', kind: 'int' },
  { key: 'billed', label: 'Billed', kind: 'money' },
]

type Row = { id: string | null; customer: string; headSold: number; headBought: number; billed: number; isSeller: boolean; isBuyer: boolean }

export function CustomerReportView({
  penWorks,
  barn,
  barnName,
  search,
  scopeText,
  dayDateById,
}: {
  penWorks: PenWorkFull[]
  barn: Barn
  barnName: string
  search: string
  scopeText: string
  dayDateById: Map<string, string>
}) {
  const [drill, setDrill] = useState<{ id: string | null; name: string } | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  function note(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash((m) => (m === msg ? null : m)), 2000)
  }

  const { rows, totals } = useMemo(() => {
    const byParty = new Map<string, Row>()
    const get = (id: string | null, name: string): Row => {
      const key = id ?? `name:${name}`
      let r = byParty.get(key)
      if (!r) {
        r = { id, customer: name, headSold: 0, headBought: 0, billed: 0, isSeller: false, isBuyer: false }
        byParty.set(key, r)
      }
      return r
    }

    for (const pw of penWorks) {
      const b = lineBuckets(pw, barn)
      if (pw.seller_party_id) {
        const r = get(pw.seller_party_id, pw.seller?.name || 'Unassigned')
        r.headSold += b.head
        r.isSeller = true
      }
      if (pw.buyer_party_id) {
        const r = get(pw.buyer_party_id, pw.buyer?.name || 'Unassigned')
        r.headBought += b.head
        r.isBuyer = true
      }
      // Billed accrues to whoever the line bills (buyer post-sale, else seller).
      const bp = billedParty(pw)
      const r = get(bp.id, bp.name)
      r.billed += b.total
    }

    const all = [...byParty.values()].sort((a, b) => a.customer.localeCompare(b.customer))
    return {
      rows: all,
      totals: {
        customers: all.length,
        sellers: all.filter((r) => r.isSeller).length,
        buyers: all.filter((r) => r.isBuyer).length,
      },
    }
  }, [penWorks, barn])

  const q = search.trim().toLowerCase()
  const shown = q ? rows.filter((r) => r.customer.toLowerCase().includes(q)) : rows

  const exportRows: ExportRow[] = useMemo(() => {
    const out: ExportRow[] = shown.map((r) => ({ customer: r.customer, headSold: r.headSold, headBought: r.headBought, billed: r.billed }))
    const t = shown.reduce((a, r) => ({ headSold: a.headSold + r.headSold, headBought: a.headBought + r.headBought, billed: a.billed + r.billed }), { headSold: 0, headBought: 0, billed: 0 })
    out.push({ customer: 'TOTAL', ...t })
    return out
  }, [shown])

  async function onCopy() {
    const ok = await copyTsv(exportRows, COLS)
    note(ok ? `Copied ${shown.length} customer${shown.length === 1 ? '' : 's'}` : 'Copy failed — select the table by hand')
  }
  async function onExport() {
    try {
      await exportXlsx(
        exportRows,
        COLS,
        { fileType: 'Customer Report Export', barnName, scope: scopeText, filtersSummary: q ? `search "${search.trim()}"` : 'None', groupingSummary: 'By customer', rowCount: shown.length },
        `customers-${slug(barnName)}-${slug(scopeText)}.xlsx`,
        'Customers',
      )
      note(`Exported ${shown.length} customer${shown.length === 1 ? '' : 's'}`)
    } catch {
      note('Export failed — try again')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Totals strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, background: '#EEF1F6', border: '1px solid #DEE3EC', borderRadius: 11, padding: '12px 18px', flexWrap: 'wrap' }}>
        <Stat label="Customers" value={String(totals.customers)} accent />
        <Stat label="Sellers" value={String(totals.sellers)} />
        <Stat label="Buyers" value={String(totals.buyers)} />
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 13, fontWeight: 700, color: colors.teal }}>✓ {flash}</span>}
        <button type="button" onClick={() => void onCopy()} style={btn(false)}>Copy</button>
        <button type="button" onClick={() => void onExport()} style={btn(true)}>Export to Excel</button>
      </div>

      <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontVariantNumeric: 'tabular-nums', minWidth: 560 }}>
            <thead>
              <tr><Th>Customer</Th><Th right>Head Sold</Th><Th right>Head Bought</Th><Th right>Billed</Th></tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr
                  key={(r.id ?? r.customer) + i}
                  onClick={() => setDrill({ id: r.id, name: r.customer })}
                  style={{ background: i % 2 ? colors.hoverBg : '#fff', cursor: 'pointer' }}
                  title="Open charge detail"
                >
                  <Td strong navy>{r.customer}</Td>
                  <Td right>{r.headSold || '—'}</Td>
                  <Td right>{r.headBought || '—'}</Td>
                  <Td right strong>{formatUsd(r.billed)}</Td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '24px 14px', textAlign: 'center', fontSize: 14, color: colors.textMuted }}>No customers in this scope{q ? ' for that search' : ''}.</td></tr>
              )}
            </tbody>
            {shown.length > 0 && (
              <tfoot>
                <tr>
                  <Td strong navy>Total</Td>
                  <Td right strong navy>{shown.reduce((a, r) => a + r.headSold, 0)}</Td>
                  <Td right strong navy>{shown.reduce((a, r) => a + r.headBought, 0)}</Td>
                  <Td right strong navy>{formatUsd(shown.reduce((a, r) => a + r.billed, 0))}</Td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {drill && (
        <CustomerDrilldown party={drill} penWorks={penWorks} barn={barn} dayDateById={dayDateById} onClose={() => setDrill(null)} />
      )}
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
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '8px 12px', textAlign: right ? 'right' : 'left', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, whiteSpace: 'nowrap' }}>{children}</th>
}
function Td({ children, right, strong, navy }: { children: React.ReactNode; right?: boolean; strong?: boolean; navy?: boolean }) {
  return <td style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.rowDivider}`, textAlign: right ? 'right' : 'left', fontSize: 13, fontWeight: strong ? 800 : 600, color: navy ? colors.navy : colors.textPrimary, whiteSpace: 'nowrap' }}>{children}</td>
}
const btn = (gold: boolean): React.CSSProperties => ({ height: 36, padding: '0 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: gold ? 800 : 700, background: gold ? colors.gold : '#fff', border: `1px solid ${gold ? colors.gold : colors.border}`, color: colors.navy })
