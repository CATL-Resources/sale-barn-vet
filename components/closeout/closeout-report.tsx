'use client'

// The Sale Day Closeout report: a screen-only control strip (pick the form,
// download) above a printable paper that prints clean at letter size. Two forms
// off the same numbers — Summary (one line per customer) and Itemized (the
// summary page, then every work line). The grand total is identical either way
// because both read the same buildCloseout result.
//
// Colors are St. Onge Livestock's own letterhead navy/gold/teal (from the design
// handoff), NOT the app's HerdWork tokens — kept exact on purpose. Read-only:
// nothing here computes or writes billing; the numbers arrive already built.

import { useState } from 'react'
import { formatUsd } from '@/lib/work-orders/pricing'
import { exportCloseoutXlsx } from '@/lib/reports/closeout-export'
import type { CloseoutBuckets, CloseoutData, DetailGroup, SummaryRow } from '@/lib/reports/closeout-data'

// SOL letterhead palette (see handoff/design_handoff_sol_closeout_report).
const C = {
  navy: '#0E2646',
  paperBorder: '#D4D4D0',
  headerRule: '#E4E4DE',
  rowDivider: '#F0F0EC',
  detailRule: '#C9CDD6',
  gold: '#F3D12A',
  goldPressed: '#E3C01F',
  stripBg: '#FBF7E0',
  stripBorder: '#E6DCA8',
  stripDivider: '#E0D7AE',
  goldLabel: '#8A6D10',
  teal: '#55BAAA',
  tealPill: '#2E9486',
  muted: '#6B7280',
  mutedLabel: '#9AA1AC',
  body: '#222222',
  groupHeader: '#EEF1F6',
  zebra: '#F6F7F9',
  flowMuted: '#9FB4D4',
  flowArrow: '#5C7398',
  segInactive: '#CDD8EA',
}
const MONO = "'JetBrains Mono', monospace"
const SLAB = "'Alfa Slab One', serif"
const INTER = "'Inter', sans-serif"

const head = (n: number) => Math.round(n).toLocaleString('en-US')

export type CloseoutMeta = {
  saleDateLong: string // "Friday, June 26, 2026"
  saleDateShort: string // "Jun 26, 2026"
  generatedAt: string // "Jun 28, 2026 10:42 AM"
  appVersion: string
  fileName: string
}

export function CloseoutReport({ data, meta }: { data: CloseoutData; meta: CloseoutMeta }) {
  const [form, setForm] = useState<'summary' | 'itemized'>('summary')
  const isSummary = form === 'summary'
  const customers = data.sellers.customerCount + data.buyers.customerCount

  async function onPdf() {
    window.print()
  }
  async function onExcel() {
    try {
      await exportCloseoutXlsx(data, {
        barnName: 'St. Onge Livestock',
        saleDateLabel: meta.saleDateLong,
        generatedAt: meta.generatedAt,
        fileName: meta.fileName,
      })
    } catch {
      /* a failed download is silent here — the print/PDF path still works */
    }
  }

  return (
    <div style={{ maxWidth: 904, margin: '0 auto', padding: '26px 18px 70px' }}>
      {/* ---- Flow strip (screen only) ---- */}
      <div className="no-print">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, margin: '0 2px 8px' }}>
          Sale Day Closeout
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap', background: C.navy, borderRadius: 14, padding: '13px 10px', gap: 2 }}>
          <FlowStep n="1" title="Sale Day" sub="pick the day" />
          <FlowArrow />
          <FlowStep n="2" title="Reports" sub="Billing tab" />
          <FlowArrow />
          <FlowStep n="3" title="Sale Day Closeout" sub="buyer & seller" />
          <FlowArrow />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 12px', color: '#fff' }}>
            <StepDot n="4" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15, marginBottom: 4 }}>Choose form</div>
              <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.25)' }}>
                <button type="button" onClick={() => setForm('summary')} style={segStyle(isSummary)}>Summary</button>
                <button type="button" onClick={() => setForm('itemized')} style={segStyle(!isSummary)}>Itemized</button>
              </div>
            </div>
          </div>
          <FlowArrow />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 12px', color: '#fff' }}>
            <StepDot n="5" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15, marginBottom: 4 }}>Download</div>
              <div style={{ display: 'inline-flex', gap: 6 }}>
                <button type="button" onClick={() => void onPdf()} style={goldBtn}>
                  <DownloadIcon />PDF
                </button>
                <button type="button" onClick={() => void onExcel()} style={outlineBtn}>Excel</button>
              </div>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: '8px 2px 24px', lineHeight: 1.5 }}>
          One report, two forms off the same numbers: <b style={{ color: C.navy }}>Summary</b> = one line per customer ·{' '}
          <b style={{ color: C.navy }}>Itemized</b> = summary page, then every work line. Same grand total either way.
        </p>
      </div>

      {/* ---- The printable document ---- */}
      {isSummary ? (
        <Paper>
          <Letterhead meta={meta} title="Sale Day Closeout" />
          <SummaryBody data={data} customers={customers} />
          <Footer left={`St. Onge Livestock · Sale Day Closeout · ${meta.saleDateShort}`} right="Page 1 · Summary" />
        </Paper>
      ) : (
        <>
          <Paper>
            <Letterhead meta={meta} title="Sale Day Closeout · Itemized" />
            <SummaryBody data={data} customers={customers} />
            <Footer left={`St. Onge Livestock · Sale Day Closeout · ${meta.saleDateShort}`} right="Page 1 · Summary" />
          </Paper>
          <Paper breakBefore>
            <DetailHeader meta={meta} />
            <DetailTables data={data} />
            <Footer left={`St. Onge Livestock · Sale Day Closeout (itemized) · ${meta.saleDateShort}`} right="Page 2 · Itemized detail" />
          </Paper>
        </>
      )}
    </div>
  )
}

// ---------- screen-only flow-strip bits ----------

function StepDot({ n }: { n: string }) {
  return (
    <span style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flex: '0 0 auto' }}>
      {n}
    </span>
  )
}
function FlowStep({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 12px', color: '#fff' }}>
      <StepDot n={n} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
        <div style={{ fontSize: 11, color: C.flowMuted, fontWeight: 600 }}>{sub}</div>
      </div>
    </div>
  )
}
function FlowArrow() {
  return <div style={{ alignSelf: 'center', color: C.flowArrow, fontSize: 16, padding: '0 2px' }}>→</div>
}
function segStyle(active: boolean): React.CSSProperties {
  return { fontFamily: 'inherit', fontSize: 11, fontWeight: 800, padding: '4px 10px', border: 'none', cursor: 'pointer', background: active ? C.gold : 'transparent', color: active ? C.navy : C.segInactive }
}
const goldBtn: React.CSSProperties = { fontFamily: 'inherit', background: C.gold, color: C.navy, fontSize: 12, fontWeight: 800, border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }
const outlineBtn: React.CSSProperties = { fontFamily: 'inherit', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 800, border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }
function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// ---------- paper + shared document bits ----------

function Paper({ children, breakBefore }: { children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <div
      className={`closeout-paper${breakBefore ? ' pb' : ''}`}
      style={{ background: '#fff', border: `1px solid ${C.paperBorder}`, borderRadius: 10, boxShadow: '0 14px 34px rgba(8,20,42,0.10)', padding: '34px 36px 26px', marginTop: breakBefore ? 30 : 0 }}
    >
      {children}
    </div>
  )
}

function Letterhead({ meta, title }: { meta: CloseoutMeta; title: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px solid ${C.navy}`, paddingBottom: 14 }}>
      <div>
        <div style={{ fontFamily: SLAB, fontSize: 30, lineHeight: 0.95, color: C.navy, letterSpacing: '-0.01em' }}>St. Onge Livestock</div>
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4, marginTop: 6 }}>PO Box 290, St. Onge, SD 57779 · 1-800-249-1995</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.navy, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3A4658', marginTop: 2 }}>{meta.saleDateLong}</div>
        <div style={{ fontSize: 10, color: C.mutedLabel, marginTop: 6 }}>Generated {meta.generatedAt} · Sale Barn Vet v{meta.appVersion}</div>
      </div>
    </div>
  )
}

function DetailHeader({ meta }: { meta: CloseoutMeta }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px solid ${C.navy}`, paddingBottom: 14 }}>
      <div>
        <div style={{ fontFamily: SLAB, fontSize: 24, lineHeight: 0.95, color: C.navy, letterSpacing: '-0.01em' }}>St. Onge Livestock</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>Itemized detail · every work line</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>Sale Day Closeout · Itemized</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3A4658', marginTop: 2 }}>{meta.saleDateLong}</div>
      </div>
    </div>
  )
}

function Footer({ left, right }: { left: string; right: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.mutedLabel, marginTop: 18, borderTop: `1px solid ${C.headerRule}`, paddingTop: 8 }}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

// ---------- summary form ----------

function SummaryBody({ data, customers }: { data: CloseoutData; customers: number }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <SummaryCard label="Sellers" badge={`${data.sellers.customerCount} consignors`} badgeBg={C.teal} sub={data.sellers.subtotal} />
        <SummaryCard label="Buyers" badge={`${data.buyers.customerCount} loads`} badgeBg={C.gold} sub={data.buyers.subtotal} />
      </div>

      {/* Combined total strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.stripBg, border: `1px solid ${C.stripBorder}`, borderRadius: 10, padding: '12px 18px', marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.navy }}>Sale Day Total</span>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{customers} customers · {head(data.grand.head)} head</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'baseline', fontFamily: MONO }}>
          <StripFig label="Vet" value={formatUsd(data.grand.vet)} />
          <StripFig label="Admin" value={formatUsd(data.grand.admin)} />
          <StripFig label="SOL" value={formatUsd(data.grand.sol)} />
          <div style={{ textAlign: 'right', paddingLeft: 22, borderLeft: `1px solid ${C.stripDivider}` }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.goldLabel, fontFamily: INTER }}>Total</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.navy, marginTop: 1, letterSpacing: '-0.01em' }}>{formatUsd(data.grand.total)}</div>
          </div>
        </div>
      </div>

      <SectionLabel>Sellers <Pill>consignors</Pill></SectionLabel>
      <SummaryTable rows={data.sellers.summary} subtotal={data.sellers.subtotal} subtotalLabel="Sellers subtotal" withBuyerNo={false} />

      <SectionLabel>Buyers <Pill>loads</Pill></SectionLabel>
      <SummaryTable rows={data.buyers.summary} subtotal={data.buyers.subtotal} subtotalLabel="Buyers subtotal" withBuyerNo />

      <GrandTotalRow grand={data.grand} />
    </>
  )
}

function SummaryCard({ label, badge, badgeBg, sub }: { label: string; badge: string; badgeBg: string; sub: CloseoutBuckets }) {
  return (
    <div style={{ border: `1px solid ${C.paperBorder}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.navy, padding: '9px 14px' }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.navy, background: badgeBg, borderRadius: 999, padding: '2px 9px' }}>{badge}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <CardEyebrow>Total billed</CardEyebrow>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, fontFamily: MONO, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{formatUsd(sub.total)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <CardEyebrow>Head</CardEyebrow>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, fontFamily: MONO }}>{head(sub.head)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 13, borderTop: '1px solid #EFEFEA', paddingTop: 11 }}>
          <CardBucket label="Vet" value={formatUsd(sub.vet)} />
          <CardBucket label="Admin" value={formatUsd(sub.admin)} />
          <CardBucket label="SOL" value={formatUsd(sub.sol)} />
        </div>
      </div>
    </div>
  )
}
function CardEyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.mutedLabel }}>{children}</div>
}
function CardBucket({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.mutedLabel }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.body, fontFamily: MONO, marginTop: 2 }}>{value}</div>
    </div>
  )
}
function StripFig({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted, fontFamily: INTER }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginTop: 2 }}>{value}</div>
    </div>
  )
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 0 6px', fontSize: 12, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.navy }}>{children}</div>
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: C.tealPill, borderRadius: 999, padding: '1px 8px', letterSpacing: '0.02em', textTransform: 'none' }}>{children}</span>
}

function SummaryTable({ rows, subtotal, subtotalLabel, withBuyerNo }: { rows: SummaryRow[]; subtotal: CloseoutBuckets; subtotalLabel: string; withBuyerNo: boolean }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Sth>Customer</Sth>
          {withBuyerNo && <Sth right>Buyer #</Sth>}
          <Sth right>Head</Sth>
          <Sth right>Vet</Sth>
          <Sth right>Admin</Sth>
          <Sth right>SOL</Sth>
          <Sth right>Total</Sth>
        </tr>
      </thead>
      <tbody style={{ fontFamily: MONO }}>
        {rows.map((r, i) => (
          <tr key={r.customer + i}>
            <Std text>{r.customer}</Std>
            {withBuyerNo && <Std right muted>{r.buyerNo || '—'}</Std>}
            <Std right>{head(r.head)}</Std>
            <Std right>{formatUsd(r.vet)}</Std>
            <Std right>{formatUsd(r.admin)}</Std>
            <Std right>{formatUsd(r.sol)}</Std>
            <Std right>{formatUsd(r.total)}</Std>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <Std text>None</Std>
            {withBuyerNo && <Std> </Std>}
            <Std right>0</Std>
            <Std right>{formatUsd(0)}</Std>
            <Std right>{formatUsd(0)}</Std>
            <Std right>{formatUsd(0)}</Std>
            <Std right>{formatUsd(0)}</Std>
          </tr>
        )}
        <tr>
          <SubTd text>{subtotalLabel}</SubTd>
          {withBuyerNo && <td style={{ borderTop: `1px solid ${C.navy}` }} />}
          <SubTd right>{head(subtotal.head)}</SubTd>
          <SubTd right>{formatUsd(subtotal.vet)}</SubTd>
          <SubTd right>{formatUsd(subtotal.admin)}</SubTd>
          <SubTd right>{formatUsd(subtotal.sol)}</SubTd>
          <SubTd right>{formatUsd(subtotal.total)}</SubTd>
        </tr>
      </tbody>
    </table>
  )
}

function GrandTotalRow({ grand }: { grand: CloseoutBuckets }) {
  const cell: React.CSSProperties = { textAlign: 'right', padding: '9px 8px', fontSize: 13, fontWeight: 800, color: C.navy, borderTop: `2px solid ${C.navy}`, background: C.stripBg }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
      <tbody style={{ fontFamily: MONO }}>
        <tr>
          <td style={{ ...cell, width: '34%', textAlign: 'left', fontFamily: INTER }}>Grand total · all customers</td>
          <td style={{ ...cell, width: '12%' }}>{head(grand.head)}</td>
          <td style={{ ...cell, width: '14%' }}>{formatUsd(grand.vet)}</td>
          <td style={{ ...cell, width: '13%' }}>{formatUsd(grand.admin)}</td>
          <td style={{ ...cell, width: '13%' }}>{formatUsd(grand.sol)}</td>
          <td style={{ ...cell, width: '14%' }}>{formatUsd(grand.total)}</td>
        </tr>
      </tbody>
    </table>
  )
}

// summary-table cell helpers
function Sth({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ textAlign: right ? 'right' : 'left', padding: '7px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.muted, borderBottom: `1px solid ${C.headerRule}` }}>{children}</th>
}
function Std({ children, right, text, muted }: { children: React.ReactNode; right?: boolean; text?: boolean; muted?: boolean }) {
  return <td style={{ textAlign: right ? 'right' : 'left', padding: '6px 8px', fontSize: 12, fontWeight: text || muted ? (muted ? 700 : 600) : 400, color: muted ? C.muted : C.body, borderBottom: `1px solid ${C.rowDivider}`, fontFamily: text ? INTER : MONO }}>{children}</td>
}
function SubTd({ children, right, text }: { children: React.ReactNode; right?: boolean; text?: boolean }) {
  return <td style={{ textAlign: right ? 'right' : 'left', padding: '7px 8px 6px', fontSize: 12, fontWeight: 800, color: C.navy, borderTop: `1px solid ${C.navy}`, fontFamily: text ? INTER : MONO }}>{children}</td>
}

// ---------- itemized detail ----------

function DetailTables({ data }: { data: CloseoutData }) {
  return (
    <>
      <DetailSectionLabel>Sellers</DetailSectionLabel>
      <DetailTable groups={data.sellers.detail} subtotal={data.sellers.subtotal} allLabel="All sellers · subtotal" withBuyerNo={false} />

      <DetailSectionLabel marginTop={20}>Buyers</DetailSectionLabel>
      <DetailTable groups={data.buyers.detail} subtotal={data.buyers.subtotal} allLabel="All buyers · subtotal" withBuyerNo />

      {data.holds.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 11, color: C.mutedLabel, fontStyle: 'italic' }}>
          Holds (unassigned) — {data.holds.map((h) => `Pen ${h.pen} · ${h.workType} · ${head(h.head)} hd`).join('; ')} · not billed (excluded from totals).
        </div>
      )}

      <DetailGrandTotal grand={data.grand} />
    </>
  )
}

function DetailSectionLabel({ children, marginTop = 18 }: { children: React.ReactNode; marginTop?: number }) {
  return <div style={{ margin: `${marginTop}px 0 6px`, fontSize: 12, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.navy }}>{children}</div>
}

function DetailTable({ groups, subtotal, allLabel, withBuyerNo }: { groups: DetailGroup[]; subtotal: CloseoutBuckets; allLabel: string; withBuyerNo: boolean }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <Dth w="6%">Pen</Dth>
          <Dth w="26%">Work Type</Dth>
          <Dth w="8%" right>Head</Dth>
          <Dth w="10%" right>Vet/hd</Dth>
          <Dth w="10%" right>SOL/hd</Dth>
          <Dth w="11%" right>Vet</Dth>
          <Dth w="8%" right>Admin</Dth>
          <Dth w="7%" right>SOL</Dth>
          <Dth w="14%" right>Line Total</Dth>
        </tr>
      </thead>
      <tbody style={{ fontFamily: MONO }}>
        {groups.map((g, gi) => (
          <GroupBlock key={g.customer + gi} group={g} withBuyerNo={withBuyerNo} />
        ))}
        {groups.length === 0 && (
          <tr><td colSpan={9} style={{ padding: '8px 10px', fontSize: 11.5, color: C.mutedLabel, fontFamily: INTER }}>No lines.</td></tr>
        )}
        <tr>
          <td colSpan={2} style={{ ...allSubCell, textAlign: 'left', fontFamily: INTER }}>{allLabel}</td>
          <td style={{ ...allSubCell, textAlign: 'right' }}>{head(subtotal.head)}</td>
          <td style={allSubCell} />
          <td style={allSubCell} />
          <td style={{ ...allSubCell, textAlign: 'right' }}>{formatUsd(subtotal.vet)}</td>
          <td style={{ ...allSubCell, textAlign: 'right' }}>{formatUsd(subtotal.admin)}</td>
          <td style={{ ...allSubCell, textAlign: 'right' }}>{formatUsd(subtotal.sol)}</td>
          <td style={{ ...allSubCell, textAlign: 'right' }}>{formatUsd(subtotal.total)}</td>
        </tr>
      </tbody>
    </table>
  )
}

function GroupBlock({ group, withBuyerNo }: { group: DetailGroup; withBuyerNo: boolean }) {
  const parts = [group.customer]
  if (withBuyerNo && group.buyerNo) parts.push(`Buyer #${group.buyerNo}`)
  if (group.workTypeLabel) parts.push(group.workTypeLabel)
  const [name, ...rest] = parts
  return (
    <>
      <tr>
        <td colSpan={9} style={{ padding: '6px 10px', fontSize: 11.5, fontWeight: 800, color: C.navy, background: C.groupHeader, fontFamily: INTER }}>
          {name}
          {rest.length > 0 && <span style={{ color: C.muted, fontWeight: 600 }}> · {rest.join(' · ')}</span>}
        </td>
      </tr>
      {group.lines.map((l, i) => (
        <tr key={i} style={{ background: i % 2 ? C.zebra : undefined }}>
          <Dtd>{l.pen}</Dtd>
          <Dtd text>{l.workType}</Dtd>
          <Dtd right>{head(l.head)}</Dtd>
          <Dtd right>{formatUsd(l.vetPerHd)}</Dtd>
          <Dtd right>{formatUsd(l.solPerHd)}</Dtd>
          <Dtd right>{formatUsd(l.vet)}</Dtd>
          <Dtd right>{formatUsd(l.admin)}</Dtd>
          <Dtd right>{formatUsd(l.sol)}</Dtd>
          <Dtd right>{formatUsd(l.lineTotal)}</Dtd>
        </tr>
      ))}
      <tr>
        <td colSpan={2} style={{ ...custSubCell, textAlign: 'left', fontFamily: INTER }}>Customer subtotal</td>
        <td style={{ ...custSubCell, textAlign: 'right' }}>{head(group.subtotal.head)}</td>
        <td style={custSubCell} />
        <td style={custSubCell} />
        <td style={{ ...custSubCell, textAlign: 'right' }}>{formatUsd(group.subtotal.vet)}</td>
        <td style={{ ...custSubCell, textAlign: 'right' }}>{formatUsd(group.subtotal.admin)}</td>
        <td style={{ ...custSubCell, textAlign: 'right' }}>{formatUsd(group.subtotal.sol)}</td>
        <td style={{ ...custSubCell, textAlign: 'right' }}>{formatUsd(group.subtotal.total)}</td>
      </tr>
    </>
  )
}

function DetailGrandTotal({ grand }: { grand: CloseoutBuckets }) {
  const cell: React.CSSProperties = { textAlign: 'right', padding: '9px 8px', fontSize: 13, fontWeight: 800, color: C.navy, borderTop: `2px solid ${C.navy}`, background: C.stripBg }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
      <tbody style={{ fontFamily: MONO }}>
        <tr>
          <td style={{ ...cell, width: '34%', textAlign: 'left', fontFamily: INTER }}>Grand total · all customers</td>
          <td style={{ ...cell, width: '8%' }}>{head(grand.head)}</td>
          <td style={{ ...cell, width: '12%', background: C.stripBg }} />
          <td style={{ ...cell, width: '12%', background: C.stripBg }} />
          <td style={{ ...cell, width: '11%' }}>{formatUsd(grand.vet)}</td>
          <td style={{ ...cell, width: '9%' }}>{formatUsd(grand.admin)}</td>
          <td style={{ ...cell, width: '8%' }}>{formatUsd(grand.sol)}</td>
          <td style={{ ...cell, width: '14%' }}>{formatUsd(grand.total)}</td>
        </tr>
      </tbody>
    </table>
  )
}

// detail-table cell helpers
function Dth({ children, right, w }: { children: React.ReactNode; right?: boolean; w: string }) {
  return <th style={{ width: w, textAlign: right ? 'right' : 'left', padding: '6px 8px', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', color: C.muted, borderBottom: `1px solid ${C.detailRule}` }}>{children}</th>
}
function Dtd({ children, right, text }: { children: React.ReactNode; right?: boolean; text?: boolean }) {
  return <td style={{ textAlign: right ? 'right' : 'left', padding: '5px 8px', fontSize: 11.5, color: C.body, borderBottom: `1px solid ${C.rowDivider}`, fontFamily: text ? INTER : MONO }}>{children}</td>
}
const custSubCell: React.CSSProperties = { padding: '6px 8px', fontSize: 11.5, fontWeight: 800, color: C.navy, borderTop: `1px solid ${C.detailRule}` }
const allSubCell: React.CSSProperties = { padding: '7px 8px', fontSize: 12, fontWeight: 800, color: C.navy, background: C.groupHeader, borderTop: `2px solid ${C.navy}` }
