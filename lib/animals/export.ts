// Copy (tab-separated) and Excel (XLSX) export for the Animals report. Tag / ID
// columns are written as TEXT in the XLSX so a 15-digit EID never becomes
// scientific notation. Browser-only (XLSX.writeFile downloads via the DOM).

import type { CellObject } from 'xlsx'
import { TEXT_FORMAT_COLS, type AnimalRow, type ColumnDef } from './types'

const FORMAT_VERSION = '1'
const APP_NAME = 'Sale Barn Vet'
const FILE_TYPE = 'Animal Export'

export type ExportMeta = {
  appVersion: string
  barnName: string
  scope: string // the sale-day scope this file covers (one day, a range, or all)
  filtersSummary: string
  sortSummary: string
  groupingSummary: string
  rowCount: number
}

const tsvSafe = (v: string): string => v.replace(/[\t\r\n]+/g, ' ')

// Tab-separated with a header row — pastes clean into Excel, Sheets, and GVL.
export function buildTsv(rows: AnimalRow[], columns: ColumnDef[]): string {
  const header = columns.map((c) => c.label).join('\t')
  const body = rows.map((r) => columns.map((c) => tsvSafe(r[c.key])).join('\t')).join('\n')
  return body ? `${header}\n${body}` : header
}

// xlsx is loaded on demand (it's heavy) so it never weighs down the page for
// someone who's only browsing the report.
export async function exportXlsx(rows: AnimalRow[], columns: ColumnDef[], meta: ExportMeta, filename: string): Promise<void> {
  const XLSX = await import('xlsx')
  // Animals sheet — header row + one row per animal. Every value is already a
  // string, so cells come out as text; tag/ID columns also get the @ format.
  const aoa: string[][] = [columns.map((c) => c.label), ...rows.map((r) => columns.map((c) => r[c.key]))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  const textColIdx = columns.map((c, i) => (TEXT_FORMAT_COLS.includes(c.key) ? i : -1)).filter((i) => i >= 0)
  const ref = ws['!ref']
  if (ref) {
    const range = XLSX.utils.decode_range(ref)
    for (let row = 1; row <= range.e.r; row++) {
      for (const col of textColIdx) {
        const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })] as CellObject | undefined
        if (cell) {
          cell.t = 's'
          cell.z = '@'
        }
      }
    }
  }
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(c.label.length + 2, 12) }))

  // File Info sheet — provenance + the exact view this file represents.
  const created = new Date()
  const info: string[][] = [
    ['Format version', FORMAT_VERSION],
    ['App', APP_NAME],
    ['App version', meta.appVersion],
    ['File type', FILE_TYPE],
    ['Created', created.toLocaleString()],
    ['Barn', meta.barnName],
    ['Scope', meta.scope],
    ['Filters', meta.filtersSummary],
    ['Sort', meta.sortSummary],
    ['Grouping', meta.groupingSummary],
    ['Rows', String(meta.rowCount)],
  ]
  const infoWs = XLSX.utils.aoa_to_sheet(info)
  infoWs['!cols'] = [{ wch: 16 }, { wch: 60 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Animals')
  XLSX.utils.book_append_sheet(wb, infoWs, 'File Info')
  XLSX.writeFile(wb, filename)
}
