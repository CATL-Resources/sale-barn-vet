// Minimal RFC-4180 CSV reader — no dependencies. Handles quoted fields,
// commas and newlines inside quotes, and "" escapes. Every value is returned
// as a string (we never coerce numbers — customer_number, zip, phone and
// premise_id must stay text).

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Parse a CSV string into an array of objects keyed by the header row. */
export function parseCsvObjects(text) {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const header = rows[0]
  const out = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    if (cells.length === 1 && cells[0] === '') continue // skip blank lines
    const obj = {}
    for (let c = 0; c < header.length; c++) obj[header[c]] = cells[c] ?? ''
    out.push(obj)
  }
  return out
}
