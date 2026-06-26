// Shared Copy (tab-separated) and Excel (XLSX) export for the Reports hub money
// views (Billing, Customer Report, etc.). Generic over plain string/number rows
// so every view reuses it. Money columns go out as real numbers so the office
// can total them in Excel; text columns (names, ids) stay text so nothing gets
// coerced. Browser-only (XLSX.writeFile downloads via the DOM).

import type { CellObject } from 'xlsx'

const FORMAT_VERSION = '1'
const APP_NAME = 'Sale Barn Vet'
const APP_VERSION = '0.1.0'

// 'text' = a plain string; 'money' = a dollar amount (2-decimal number in XLSX);
// 'int' = a whole number (head counts, line counts).
export type ExportKind = 'text' | 'money' | 'int'
export type ExportColumn = { key: string; label: string; kind?: ExportKind }
export type ExportRow = Record<string, string | number>

export type ReportFileMeta = {
  fileType: string // e.g. "Billing Export"
  barnName: string
  scope: string // the sale-day scope (one day, a range, or all)
  filtersSummary: string
  groupingSummary: string
  rowCount: number
}

const money2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2)
const tsvSafe = (v: string) => v.replace(/[\t\r\n]+/g, ' ')

function tsvCell(value: string | number | undefined, kind: ExportKind): string {
  if (value === undefined || value === null) return ''
  if (kind === 'money') return money2(Number(value) || 0)
  if (kind === 'int') return String(Math.round(Number(value) || 0))
  return tsvSafe(String(value))
}

// Tab-separated with a header row — pastes clean into Excel, Sheets, and GVL.
export function buildTsv(rows: ExportRow[], columns: ExportColumn[]): string {
  const header = columns.map((c) => c.label).join('\t')
  const body = rows.map((r) => columns.map((c) => tsvCell(r[c.key], c.kind ?? 'text')).join('\t')).join('\n')
  return body ? `${header}\n${body}` : header
}

// xlsx is heavy, so it's loaded on demand only when someone actually exports.
export async function exportXlsx(
  rows: ExportRow[],
  columns: ExportColumn[],
  meta: ReportFileMeta,
  filename: string,
  sheetName: string,
): Promise<void> {
  const XLSX = await import('xlsx')

  // Build the data grid. Money/int cells go out as numbers; everything else as
  // text — so a 15-digit id never turns into scientific notation and dollars can
  // still be summed.
  const header = columns.map((c) => c.label)
  const body = rows.map((r) =>
    columns.map((c) => {
      const kind = c.kind ?? 'text'
      const v = r[c.key]
      if (kind === 'money') return Math.round((Number(v) || 0) * 100) / 100
      if (kind === 'int') return Math.round(Number(v) || 0)
      return v === undefined || v === null ? '' : String(v)
    }),
  )
  const ws = XLSX.utils.aoa_to_sheet([header, ...body])

  // Cell formats: money gets a 2-decimal accounting-style number format; text
  // columns are pinned to text so ids stay literal.
  const ref = ws['!ref']
  if (ref) {
    const range = XLSX.utils.decode_range(ref)
    for (let row = 1; row <= range.e.r; row++) {
      columns.forEach((c, col) => {
        const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })] as CellObject | undefined
        if (!cell) return
        const kind = c.kind ?? 'text'
        if (kind === 'money') cell.z = '#,##0.00'
        else if (kind === 'text') {
          cell.t = 's'
          cell.z = '@'
        }
      })
    }
  }
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(c.label.length + 2, c.kind === 'money' ? 12 : 14) }))

  const created = new Date()
  const info: string[][] = [
    ['Format version', FORMAT_VERSION],
    ['App', APP_NAME],
    ['App version', APP_VERSION],
    ['File type', meta.fileType],
    ['Created', created.toLocaleString()],
    ['Barn', meta.barnName],
    ['Scope', meta.scope],
    ['Filters', meta.filtersSummary],
    ['Grouping', meta.groupingSummary],
    ['Rows', String(meta.rowCount)],
  ]
  const infoWs = XLSX.utils.aoa_to_sheet(info)
  infoWs['!cols'] = [{ wch: 16 }, { wch: 60 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.utils.book_append_sheet(wb, infoWs, 'File Info')
  XLSX.writeFile(wb, filename)
}

// Copy helper: writes the TSV to the clipboard, returns whether it worked.
export async function copyTsv(rows: ExportRow[], columns: ExportColumn[]): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildTsv(rows, columns))
    return true
  } catch {
    return false
  }
}
