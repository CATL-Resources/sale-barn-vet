// The Sale Day Closeout Excel file: one .xlsx with two tabs — "Summary"
// (per-customer rollup) and "Detail" (every work line) — both built no matter
// which form is on screen. Money cells go out as real numbers with a 2-decimal
// format so the office can total them; labels stay text. Mirrors the SheetJS
// approach in export.ts and loads xlsx on demand (it's heavy).

import type { CellObject, WorkSheet } from 'xlsx'
import type { CloseoutBuckets, CloseoutData } from './closeout-data'

export type CloseoutExportMeta = {
  barnName: string
  saleDateLabel: string // e.g. "Friday, June 26, 2026"
  generatedAt: string // e.g. "Jun 28, 2026 10:42 AM"
  fileName: string
}

type Kind = 'text' | 'int' | 'money'
type Cell = string | number | null

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

// Turn a grid of cells into a worksheet, formatting money columns as #,##0.00
// and pinning text cells so a number-like name never turns into a date/float.
function makeSheet(XLSX: typeof import('xlsx'), grid: Cell[][], kinds: Kind[], widths: number[]): WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(grid.map((row) => row.map((c) => (c === null ? '' : c))))
  const ref = ws['!ref']
  if (ref) {
    const range = XLSX.utils.decode_range(ref)
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let col = 0; col <= range.e.c; col++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: col })] as CellObject | undefined
        if (!cell) continue
        if (typeof cell.v === 'number' && kinds[col] === 'money') cell.z = '#,##0.00'
      }
    }
  }
  ws['!cols'] = widths.map((wch) => ({ wch }))
  return ws
}

function moneyRow(label: string, b: CloseoutBuckets, buyerNoBlank = true): Cell[] {
  // Summary columns: Customer, Buyer #, Head, Vet, Admin, SOL, Total
  return [label, buyerNoBlank ? '' : '', Math.round(b.head), round2(b.vet), round2(b.admin), round2(b.sol), round2(b.total)]
}

export async function exportCloseoutXlsx(data: CloseoutData, meta: CloseoutExportMeta): Promise<void> {
  const XLSX = await import('xlsx')

  // ---- Summary tab ----
  const sumKinds: Kind[] = ['text', 'text', 'int', 'money', 'money', 'money', 'money']
  const sumHeader = ['Customer', 'Buyer #', 'Head', 'Vet', 'Admin', 'SOL', 'Total']
  const summaryGrid: Cell[][] = [
    [`St. Onge Livestock — Sale Day Closeout`],
    [meta.saleDateLabel],
    [`Generated ${meta.generatedAt}`],
    [],
    ['Sellers (consignors)'],
    sumHeader,
    ...data.sellers.summary.map((r) => [r.customer, '', Math.round(r.head), round2(r.vet), round2(r.admin), round2(r.sol), round2(r.total)] as Cell[]),
    moneyRow('Sellers subtotal', data.sellers.subtotal),
    [],
    ['Buyers (loads)'],
    sumHeader,
    ...data.buyers.summary.map((r) => [r.customer, r.buyerNo, Math.round(r.head), round2(r.vet), round2(r.admin), round2(r.sol), round2(r.total)] as Cell[]),
    moneyRow('Buyers subtotal', data.buyers.subtotal),
    [],
    moneyRow('Grand total · all customers', data.grand),
  ]
  const summaryWs = makeSheet(XLSX, summaryGrid, sumKinds, [30, 10, 8, 12, 12, 12, 13])

  // ---- Detail tab ----
  // Columns: Customer, Buyer #, Pen, Work Type, Head, Vet/hd, SOL/hd, Vet, Admin, SOL, Line Total
  const detKinds: Kind[] = ['text', 'text', 'text', 'text', 'int', 'money', 'money', 'money', 'money', 'money', 'money']
  const detHeader = ['Customer', 'Buyer #', 'Pen', 'Work Type', 'Head', 'Vet/hd', 'SOL/hd', 'Vet', 'Admin', 'SOL', 'Line Total']
  const detailGrid: Cell[][] = [['Sellers (consignors)'], detHeader]
  for (const g of data.sellers.detail) {
    for (const l of g.lines) {
      detailGrid.push([g.customer, '', l.pen, l.workType, Math.round(l.head), round2(l.vetPerHd), round2(l.solPerHd), round2(l.vet), round2(l.admin), round2(l.sol), round2(l.lineTotal)])
    }
  }
  detailGrid.push(['All sellers · subtotal', '', '', '', Math.round(data.sellers.subtotal.head), '', '', round2(data.sellers.subtotal.vet), round2(data.sellers.subtotal.admin), round2(data.sellers.subtotal.sol), round2(data.sellers.subtotal.total)])
  detailGrid.push([])
  detailGrid.push(['Buyers (loads)'])
  detailGrid.push(detHeader)
  for (const g of data.buyers.detail) {
    for (const l of g.lines) {
      detailGrid.push([g.customer, g.buyerNo, l.pen, l.workType, Math.round(l.head), round2(l.vetPerHd), round2(l.solPerHd), round2(l.vet), round2(l.admin), round2(l.sol), round2(l.lineTotal)])
    }
  }
  detailGrid.push(['All buyers · subtotal', '', '', '', Math.round(data.buyers.subtotal.head), '', '', round2(data.buyers.subtotal.vet), round2(data.buyers.subtotal.admin), round2(data.buyers.subtotal.sol), round2(data.buyers.subtotal.total)])
  if (data.holds.length) {
    detailGrid.push([])
    detailGrid.push(['Holds (not billed — excluded from totals)'])
    detailGrid.push(['Owner', '', 'Pen', 'Work Type', 'Head'])
    for (const h of data.holds) detailGrid.push([h.owner, '', h.pen, h.workType, Math.round(h.head)])
  }
  detailGrid.push([])
  detailGrid.push(['Grand total · all customers', '', '', '', Math.round(data.grand.head), '', '', round2(data.grand.vet), round2(data.grand.admin), round2(data.grand.sol), round2(data.grand.total)])
  const detailWs = makeSheet(XLSX, detailGrid, detKinds, [28, 10, 7, 22, 7, 9, 9, 12, 11, 11, 13])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
  XLSX.utils.book_append_sheet(wb, detailWs, 'Detail')
  XLSX.writeFile(wb, meta.fileName)
}
