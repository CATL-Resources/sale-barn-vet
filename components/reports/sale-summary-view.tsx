'use client'

// Animal Sale Summary inside the Reports hub: the seller-to-buyer movement
// report. Animals grouped by Seller -> Buyer (read from each animal's pen_work),
// with the tag-level list beneath. Reuses the rows the hub already fetched for
// the Animals view. Read and export only.
//
// WEIGHT: the spec asks for Average Weight (group) and a Weight column (tags),
// but the live schema has no weight on the animal (or anywhere). So those are
// omitted here rather than faked — see the PR note. Sex uses the only sex field
// that exists, fetal_sex.

import { useMemo, useState } from 'react'
import { colors } from '@/components/ui/tokens'
import type { AnimalRow } from '@/lib/animals/types'
import { copyTsv, exportXlsx, type ExportColumn, type ExportRow } from '@/lib/reports/export'

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'barn'

const tagOf = (r: AnimalRow) => r.eid || r.backTag || r.visualTag || r.metalTag || r.secondaryEid || ''
const pairOf = (r: AnimalRow) => `${r.seller || '—'} → ${r.buyer || '—'}`

const COLS: ExportColumn[] = [
  { key: 'tag', label: 'Tag', kind: 'text' },
  { key: 'type', label: 'Type', kind: 'text' },
  { key: 'sex', label: 'Sex', kind: 'text' },
  { key: 'pair', label: 'Seller → Buyer', kind: 'text' },
  { key: 'pen', label: 'Pen', kind: 'text' },
]

export function SaleSummaryView({
  rows,
  search,
  scopeText,
  barnName,
}: {
  rows: AnimalRow[]
  search: string
  scopeText: string
  barnName: string
}) {
  const [flash, setFlash] = useState<string | null>(null)
  function note(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash((m) => (m === msg ? null : m)), 2000)
  }

  const q = search.trim().toLowerCase()
  const shown = useMemo(() => {
    if (!q) return rows
    return rows.filter((r) =>
      [tagOf(r), r.animalType, r.fetalSex, r.seller, r.buyer, r.sortPen].some((v) => v.toLowerCase().includes(q)),
    )
  }, [rows, q])

  // Group by Seller -> Buyer, sorted by group head desc then label.
  const groups = useMemo(() => {
    const map = new Map<string, AnimalRow[]>()
    for (const r of shown) {
      const k = pairOf(r)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return [...map.entries()]
      .map(([pair, rs]) => ({ pair, rows: rs, head: rs.length }))
      .sort((a, b) => b.head - a.head || a.pair.localeCompare(b.pair))
  }, [shown])

  const exportRows: ExportRow[] = useMemo(
    () => shown.map((r) => ({ tag: tagOf(r), type: r.animalType, sex: r.fetalSex, pair: pairOf(r), pen: r.sortPen })),
    [shown],
  )

  async function onCopy() {
    const ok = await copyTsv(exportRows, COLS)
    note(ok ? `Copied ${shown.length} animal${shown.length === 1 ? '' : 's'}` : 'Copy failed — select the table by hand')
  }
  async function onExport() {
    try {
      await exportXlsx(
        exportRows,
        COLS,
        { fileType: 'Animal Sale Summary Export', barnName, scope: scopeText, filtersSummary: q ? `search "${search.trim()}"` : 'None', groupingSummary: 'By Seller → Buyer', rowCount: shown.length },
        `sale-summary-${slug(barnName)}-${slug(scopeText)}.xlsx`,
        'Sale Summary',
      )
      note(`Exported ${shown.length} animal${shown.length === 1 ? '' : 's'}`)
    } catch {
      note('Export failed — try again')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: colors.navy }}>{shown.length} {shown.length === 1 ? 'animal' : 'animals'} · {groups.length} {groups.length === 1 ? 'pairing' : 'pairings'}</span>
        <span style={{ flex: 1 }} />
        {flash && <span style={{ fontSize: 13, fontWeight: 700, color: colors.teal }}>✓ {flash}</span>}
        <button type="button" onClick={() => void onCopy()} style={btn(false)}>Copy</button>
        <button type="button" onClick={() => void onExport()} style={btn(true)}>Export to Excel</button>
      </div>

      {/* Average Weight isn't available — say so once, plainly. */}
      <div style={{ fontSize: 12.5, fontWeight: 600, color: colors.bronze, background: '#FDF1DC', border: `1px solid ${colors.warning}`, borderRadius: 9, padding: '8px 12px' }}>
        Average Weight and the Weight column are omitted — the schema has no weight on the animal yet. Sex shows fetal sex (the only sex field that exists).
      </div>

      {groups.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: '40px 16px', textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
          No animals in this scope{q ? ' for that search' : ''}.
        </div>
      ) : (
        <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100dvh - 320px)', overflowY: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontVariantNumeric: 'tabular-nums', minWidth: 640 }}>
              <thead>
                <tr><Th>Tag</Th><Th>Type</Th><Th>Sex</Th><Th>Seller → Buyer</Th><Th>Pen</Th></tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <GroupBlock key={g.pair} pair={g.pair} head={g.head} rows={g.rows} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function GroupBlock({ pair, head, rows }: { pair: string; head: number; rows: AnimalRow[] }) {
  return (
    <>
      <tr>
        <td colSpan={5} style={{ position: 'sticky', top: 30, zIndex: 1, background: colors.columnSubheaderBg, borderTop: `1px solid ${colors.cardHeaderBorder}`, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '7px 12px' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>{pair}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginLeft: 8 }}>· {head} hd</span>
        </td>
      </tr>
      {rows.map((r, i) => (
        <tr key={r.id} style={{ background: i % 2 ? colors.hoverBg : '#fff' }}>
          <Td strong navy>{tagOf(r) || '—'}</Td>
          <Td>{r.animalType || '—'}</Td>
          <Td>{r.fetalSex || '—'}</Td>
          <Td>{pairOf(r)}</Td>
          <Td>{r.sortPen || '—'}</Td>
        </tr>
      ))}
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ position: 'sticky', top: 0, zIndex: 2, background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '8px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, whiteSpace: 'nowrap' }}>{children}</th>
}
function Td({ children, strong, navy }: { children: React.ReactNode; strong?: boolean; navy?: boolean }) {
  return <td style={{ padding: '7px 12px', borderBottom: `1px solid ${colors.rowDivider}`, textAlign: 'left', fontSize: 13, fontWeight: strong ? 800 : 600, color: navy ? colors.navy : colors.textPrimary, whiteSpace: 'nowrap' }}>{children}</td>
}
const btn = (gold: boolean): React.CSSProperties => ({ height: 36, padding: '0 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: gold ? 800 : 700, background: gold ? colors.gold : '#fff', border: `1px solid ${gold ? colors.gold : colors.border}`, color: colors.navy })
