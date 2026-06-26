'use client'

// The Animals report: every animal worked in the selected sale day, in a dense
// office table you can filter on any column, sort, group (one or two fields),
// select, copy, and export to Excel. Read-only — nothing here changes billing;
// the Sort Pen is display only.

import { useMemo, useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { ScreenHeader } from '@/components/ui/screen-header'
import { HeaderBack } from '@/components/ui/header-back'
import { COLUMNS, GROUP_FIELDS, type AnimalRow, type ColKey, type ColumnDef } from '@/lib/animals/types'
import { naturalCompare, textCompare } from '@/lib/animals/natural-sort'
import { buildTsv, exportXlsx } from '@/lib/animals/export'

const APP_VERSION = '0.1.0'

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'barn'

const compareFor = (kind: ColumnDef['sort']) => (kind === 'natural' ? naturalCompare : textCompare)

export function AnimalsReport({
  saleDayId,
  saleDate,
  barnName,
  rows,
  hasSecondaryEid,
  embedded = false,
  search: externalSearch,
  onSearch,
  scopeText,
}: {
  saleDayId: string
  saleDate: string
  barnName: string
  rows: AnimalRow[]
  hasSecondaryEid: boolean
  // When embedded in the Reports hub, the hub owns the page header and the one
  // shared search box, and supplies the sale-day scope (which can span days). In
  // standalone mode (the /animals page) these are omitted and the report renders
  // its own header and search box.
  embedded?: boolean
  search?: string
  onSearch?: (v: string) => void
  scopeText?: string
}) {
  // Drop the Secondary EID column unless some animal actually has one.
  const columns = useMemo(
    () => COLUMNS.filter((c) => c.key !== 'secondaryEid' || hasSecondaryEid),
    [hasSecondaryEid],
  )
  const colByKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns])

  const [catFilters, setCatFilters] = useState<Record<string, string[]>>({})
  const [textFilters, setTextFilters] = useState<Record<string, string>>({})
  // The hub drives search when embedded; otherwise the report owns it.
  const [internalSearch, setInternalSearch] = useState('')
  const search = embedded ? externalSearch ?? '' : internalSearch
  const setSearch = embedded ? onSearch ?? (() => {}) : setInternalSearch
  const [sort, setSort] = useState<{ key: ColKey; dir: 'asc' | 'desc' } | null>(null)
  const [groupBy, setGroupBy] = useState<ColKey[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openFilter, setOpenFilter] = useState<ColKey | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  function note(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash((m) => (m === msg ? null : m)), 2000)
  }

  // Distinct values for each category column's multi-select.
  const optionsByCol = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const c of columns) {
      if (c.filter !== 'category') continue
      const set = new Set<string>()
      for (const r of rows) set.add(r[c.key] || '—')
      out[c.key] = [...set].sort((a, b) => compareFor(c.sort)(a, b))
    }
    return out
  }, [rows, columns])

  // Filter: category (AND across columns, OR within a column), text "contains",
  // and a global search across every column.
  const filtered = useMemo(() => {
    const gs = search.trim().toLowerCase()
    const cats = Object.entries(catFilters).filter(([, v]) => v && v.length)
    const texts = Object.entries(textFilters)
      .map(([k, q]) => [k, q.trim().toLowerCase()] as const)
      .filter(([, q]) => q)
    return rows.filter((r) => {
      for (const [k, vals] of cats) if (!vals.includes(r[k as ColKey] || '—')) return false
      for (const [k, q] of texts) if (!r[k as ColKey].toLowerCase().includes(q)) return false
      if (gs && !columns.some((c) => r[c.key].toLowerCase().includes(gs))) return false
      return true
    })
  }, [rows, catFilters, textFilters, search, columns])

  // Default order: Sort Pen, then EID (both natural). Used on its own and as the
  // stable tiebreak under any explicit column sort.
  const defaultCompare = (a: AnimalRow, b: AnimalRow) =>
    naturalCompare(a.sortPen, b.sortPen) || naturalCompare(a.eid, b.eid)

  const sorted = useMemo(() => {
    const arr = [...filtered]
    if (!sort) {
      arr.sort(defaultCompare)
      return arr
    }
    const cmp = compareFor(colByKey.get(sort.key)?.sort ?? 'text')
    const mul = sort.dir === 'asc' ? 1 : -1
    arr.sort((a, b) => cmp(a[sort.key], b[sort.key]) * mul || defaultCompare(a, b))
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, colByKey])

  const headCount = sorted.length

  // Grouping. Mixed-pen detection applies when grouping by Sort Pen without also
  // splitting on Seller — a pen drawing from more than one seller is "Mixed".
  const groups = useMemo(() => {
    if (groupBy.length === 0) return null
    const mixedEligible = groupBy.includes('sortPen') && !groupBy.includes('seller')
    const order: string[] = []
    const map = new Map<string, AnimalRow[]>()
    for (const r of sorted) {
      const id = groupBy.map((k) => r[k] || '—').join(' ▸ ')
      if (!map.has(id)) {
        map.set(id, [])
        order.push(id)
      }
      map.get(id)!.push(r)
    }
    return order.map((id) => {
      const rs = map.get(id)!
      const sellerCounts = new Map<string, number>()
      for (const r of rs) sellerCounts.set(r.seller || '—', (sellerCounts.get(r.seller || '—') ?? 0) + 1)
      const mixed = mixedEligible && sellerCounts.size > 1
      const breakdown = [...sellerCounts.entries()].sort((a, b) => b[1] - a[1] || textCompare(a[0], b[0]))
      return { id, label: id, rows: rs, head: rs.length, mixed, breakdown }
    })
  }, [sorted, groupBy])

  // Copy / export act on the selected rows, or the whole filtered set if none.
  const exportRows = useMemo(
    () => (selected.size ? sorted.filter((r) => selected.has(r.id)) : sorted),
    [sorted, selected],
  )

  const activeFilterCount =
    Object.values(catFilters).filter((v) => v && v.length).length +
    Object.values(textFilters).filter((v) => v && v.trim()).length +
    (search.trim() ? 1 : 0)

  function clearAll() {
    setCatFilters({})
    setTextFilters({})
    setSearch('')
  }

  function describeFilters(): string {
    const parts: string[] = []
    for (const c of columns) {
      const cat = catFilters[c.key]
      if (cat && cat.length) parts.push(`${c.label}: ${cat.join(', ')}`)
      const txt = textFilters[c.key]
      if (txt && txt.trim()) parts.push(`${c.label} contains "${txt.trim()}"`)
    }
    if (search.trim()) parts.push(`search "${search.trim()}"`)
    return parts.length ? parts.join('; ') : 'None'
  }
  const sortSummary = sort
    ? `${colByKey.get(sort.key)?.label ?? sort.key} ${sort.dir}`
    : 'Sort Pen, then EID (default)'
  const groupingSummary = groupBy.length ? groupBy.map((k) => colByKey.get(k)?.label ?? k).join(', ') : 'None'

  async function onCopy() {
    if (exportRows.length === 0) return
    try {
      await navigator.clipboard.writeText(buildTsv(exportRows, columns))
      note(`Copied ${exportRows.length} row${exportRows.length === 1 ? '' : 's'}`)
    } catch {
      note('Copy failed — select the table by hand')
    }
  }

  async function onExport() {
    if (exportRows.length === 0) return
    try {
      await exportXlsx(
        exportRows,
        columns,
        {
          appVersion: APP_VERSION,
          barnName,
          scope: exportScope,
          filtersSummary: describeFilters(),
          sortSummary,
          groupingSummary,
          rowCount: exportRows.length,
        },
        `animals-${slug(barnName)}-${slug(exportScope)}.xlsx`,
      )
      note(`Exported ${exportRows.length} row${exportRows.length === 1 ? '' : 's'}`)
    } catch {
      note('Export failed — try again')
    }
  }

  // Select-all-in-view toggles the whole filtered set.
  const allInView = sorted.length > 0 && sorted.every((r) => selected.has(r.id))
  function toggleAll() {
    setSelected(() => (allInView ? new Set() : new Set(sorted.map((r) => r.id))))
  }
  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSort(key: ColKey) {
    setSort((s) => (!s || s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))
  }

  function toggleGroupField(key: ColKey) {
    setGroupBy((g) => {
      if (g.includes(key)) return g.filter((k) => k !== key)
      if (g.length >= 2) return [g[1], key] // keep at most two; drop the oldest
      return [...g, key]
    })
    setCollapsed(new Set())
  }

  function toggleCollapsed(id: string) {
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const colCount = columns.length + 1 // + the checkbox column

  // The export's scope label + filename: the hub's scope text when embedded, else
  // the single sale day.
  const exportScope = embedded ? scopeText ?? 'Scope' : saleDate

  const content = (
    <>
      <div style={{ width: '100%', maxWidth: 'var(--content-max)', margin: '0 auto', padding: embedded ? 0 : 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {embedded ? (
            <span style={{ fontSize: 14, fontWeight: 800, color: colors.navy, whiteSpace: 'nowrap' }}>
              {headCount} {headCount === 1 ? 'animal' : 'animals'} · {headCount} head
            </span>
          ) : (
            <div style={{ flex: '1 1 240px', maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8, height: 40, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, padding: '0 12px' }}>
              <span aria-hidden style={{ color: colors.textPlaceholder, fontSize: 14 }}>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all columns"
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: colors.textPrimary }}
              />
            </div>
          )}

          {/* Group by */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted }}>Group</span>
            {GROUP_FIELDS.map((g) => {
              const on = groupBy.includes(g.key)
              const ord = groupBy.indexOf(g.key)
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => toggleGroupField(g.key)}
                  aria-pressed={on}
                  style={{ height: 34, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: on ? colors.navy : '#fff', border: `1px solid ${on ? colors.navy : colors.border}`, color: on ? '#fff' : colors.textPrimary }}
                >
                  {g.label}{on && groupBy.length > 1 ? ` ${ord + 1}` : ''}
                </button>
              )
            })}
          </div>

          <div style={{ flex: 1 }} />

          {activeFilterCount > 0 && (
            <button type="button" onClick={clearAll} style={{ height: 36, padding: '0 12px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy }}>
              Clear all ({activeFilterCount})
            </button>
          )}
          {flash && <span style={{ fontSize: 13, fontWeight: 700, color: colors.teal }}>✓ {flash}</span>}
          <button type="button" onClick={onCopy} disabled={exportRows.length === 0} style={{ height: 36, padding: '0 14px', borderRadius: 9, cursor: exportRows.length ? 'pointer' : 'default', opacity: exportRows.length ? 1 : 0.5, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy }}>
            Copy{selected.size ? ` (${selected.size})` : ''}
          </button>
          <button type="button" onClick={() => void onExport()} disabled={exportRows.length === 0} style={{ height: 36, padding: '0 14px', borderRadius: 9, cursor: exportRows.length ? 'pointer' : 'default', opacity: exportRows.length ? 1 : 0.5, fontFamily: 'inherit', fontSize: 13, fontWeight: 800, background: colors.gold, border: `1px solid ${colors.gold}`, color: colors.navy }}>
            Export to Excel{selected.size ? ` (${selected.size})` : ''}
          </button>
        </div>

        {/* Table */}
        {rows.length === 0 ? (
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.navy }}>No animals worked yet</div>
            <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Animals show here as the crew works this sale day at the chute.</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'auto', maxHeight: 'calc(100dvh - 220px)' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontVariantNumeric: 'tabular-nums', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 3, background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '8px 10px', width: 34 }}>
                    <input type="checkbox" aria-label="Select all in view" checked={allInView} ref={(el) => { if (el) el.indeterminate = !allInView && selected.size > 0 }} onChange={toggleAll} />
                  </th>
                  {columns.map((c) => {
                    const isSorted = sort?.key === c.key
                    const hasFilter = (catFilters[c.key]?.length ?? 0) > 0 || !!(textFilters[c.key]?.trim())
                    return (
                      <th key={c.key} style={{ position: 'sticky', top: 0, zIndex: 2, background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: 0, whiteSpace: 'nowrap' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px' }}>
                          <button type="button" onClick={() => toggleSort(c.key)} style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', color: colors.textMuted, textTransform: 'uppercase', textAlign: 'left' }}>
                            {c.label}
                            <span style={{ color: isSorted ? colors.navy : colors.textFaint }}>{isSorted ? (sort!.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                          </button>
                          <button type="button" aria-label={`Filter ${c.label}`} onClick={() => setOpenFilter((k) => (k === c.key ? null : c.key))} style={{ flexShrink: 0, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, background: hasFilter ? colors.teal : 'transparent', border: `1px solid ${hasFilter ? colors.teal : colors.border}`, color: hasFilter ? '#fff' : colors.textMuted, cursor: 'pointer', fontSize: 10 }}>▾</button>
                          {openFilter === c.key && (
                            <FilterPopover
                              col={c}
                              options={optionsByCol[c.key] ?? []}
                              selectedValues={catFilters[c.key] ?? []}
                              textValue={textFilters[c.key] ?? ''}
                              onSetCategory={(vals) => setCatFilters((f) => ({ ...f, [c.key]: vals }))}
                              onSetText={(v) => setTextFilters((f) => ({ ...f, [c.key]: v }))}
                              onClose={() => setOpenFilter(null)}
                            />
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {groups
                  ? groups.map((g) => (
                      <GroupBlock
                        key={g.id}
                        group={g}
                        columns={columns}
                        colCount={colCount}
                        collapsed={collapsed.has(g.id)}
                        onToggle={() => toggleCollapsed(g.id)}
                        selected={selected}
                        onToggleRow={toggleRow}
                      />
                    ))
                  : sorted.map((r, i) => (
                      <Row key={r.id} row={r} columns={columns} zebra={i % 2 === 1} selected={selected.has(r.id)} onToggle={() => toggleRow(r.id)} />
                    ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={colCount} style={{ padding: '32px 16px', textAlign: 'center', fontSize: 14, color: colors.textMuted }}>
                      No animals match these filters. <button type="button" onClick={clearAll} style={{ background: 'none', border: 'none', color: colors.teal, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Clear all</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )

  // Embedded: the hub renders the page header and the shared search; just hand
  // back the report body. Standalone: render the report's own screen header too.
  if (embedded) return content
  return (
    <>
      <ScreenHeader
        title="Animals"
        subtitle={longDate(saleDate)}
        back={<HeaderBack href={`/day/${saleDayId}`} label="Back to Sale Dashboard" />}
        right={
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.gold, whiteSpace: 'nowrap' }}>
            {headCount} {headCount === 1 ? 'animal' : 'animals'} · {headCount} head
          </span>
        }
      />
      {content}
    </>
  )
}

function cellStyle(zebra: boolean): React.CSSProperties {
  return { padding: '7px 10px', fontSize: 13, fontWeight: 600, color: colors.textPrimary, borderBottom: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap', background: zebra ? colors.hoverBg : '#fff' }
}

function Row({ row, columns, zebra, selected, onToggle }: { row: AnimalRow; columns: ColumnDef[]; zebra: boolean; selected: boolean; onToggle: () => void }) {
  return (
    <tr style={{ background: selected ? colors.drawerSelected : undefined }}>
      <td style={{ ...cellStyle(zebra), width: 34, background: selected ? colors.drawerSelected : cellStyle(zebra).background }}>
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label="Select row" />
      </td>
      {columns.map((c) => {
        const v = row[c.key]
        const strong = c.key === 'eid'
        return (
          <td key={c.key} style={{ ...cellStyle(zebra), background: selected ? colors.drawerSelected : cellStyle(zebra).background, fontWeight: strong ? 700 : 600, color: v ? (strong ? colors.navy : colors.textPrimary) : colors.textFaint }}>
            {v || '—'}
          </td>
        )
      })}
    </tr>
  )
}

type GroupShape = { id: string; label: string; rows: AnimalRow[]; head: number; mixed: boolean; breakdown: [string, number][] }

function GroupBlock({ group, columns, colCount, collapsed, onToggle, selected, onToggleRow }: { group: GroupShape; columns: ColumnDef[]; colCount: number; collapsed: boolean; onToggle: () => void; selected: Set<string>; onToggleRow: (id: string) => void }) {
  return (
    <>
      <tr>
        <td colSpan={colCount} style={{ position: 'sticky', top: 36, zIndex: 1, background: colors.columnSubheaderBg, borderTop: `1px solid ${colors.cardHeaderBorder}`, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '7px 10px' }}>
          <button type="button" onClick={onToggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <span style={{ color: colors.textMuted, fontSize: 11, width: 12, display: 'inline-block' }}>{collapsed ? '▶' : '▼'}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>{group.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>· {group.head} hd</span>
            {group.mixed && (
              <span style={{ fontSize: 11, fontWeight: 800, color: colors.warning, background: '#FDF1DC', border: `1px solid ${colors.warning}`, borderRadius: 999, padding: '1px 8px', letterSpacing: '0.02em' }}>
                Mixed — {group.breakdown.map(([s, n]) => `${s} ${n}`).join(', ')}
              </span>
            )}
          </button>
        </td>
      </tr>
      {!collapsed && group.rows.map((r, i) => (
        <Row key={r.id} row={r} columns={columns} zebra={i % 2 === 1} selected={selected.has(r.id)} onToggle={() => onToggleRow(r.id)} />
      ))}
    </>
  )
}

function FilterPopover({ col, options, selectedValues, textValue, onSetCategory, onSetText, onClose }: { col: ColumnDef; options: string[]; selectedValues: string[]; textValue: string; onSetCategory: (vals: string[]) => void; onSetText: (v: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const shown = col.filter === 'category' ? options.filter((o) => !q.trim() || o.toLowerCase().includes(q.trim().toLowerCase())) : []
  const sel = new Set(selectedValues)
  function toggle(v: string) {
    const next = new Set(sel)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    onSetCategory([...next])
  }
  return (
    <>
      {/* click-away backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} aria-hidden />
      <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 41, marginTop: 2, width: 230, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 10, boxShadow: '0 12px 30px rgba(14,38,70,0.18)', padding: 10, textTransform: 'none' }}>
        {col.filter === 'text' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              autoFocus
              value={textValue}
              onChange={(e) => onSetText(e.target.value)}
              placeholder={`Contains…`}
              style={{ width: '100%', boxSizing: 'border-box', height: 34, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 13, color: colors.textPrimary }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => onSetText('')} style={popBtn}>Clear</button>
              <button type="button" onClick={onClose} style={{ ...popBtn, color: colors.teal }}>Done</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a value…" style={{ width: '100%', boxSizing: 'border-box', height: 32, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 13, color: colors.textPrimary }} />
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {shown.map((o) => (
                <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: colors.textPrimary, borderRadius: 6 }}>
                  <input type="checkbox" checked={sel.has(o)} onChange={() => toggle(o)} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o}</span>
                </label>
              ))}
              {shown.length === 0 && <div style={{ padding: '8px 4px', fontSize: 12, color: colors.textPlaceholder }}>No values.</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => onSetCategory([])} style={popBtn}>Clear</button>
              <button type="button" onClick={onClose} style={{ ...popBtn, color: colors.teal }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const popBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colors.textMuted, padding: '2px 4px' }
