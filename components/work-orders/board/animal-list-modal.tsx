'use client'

import { colors } from '@/components/ui/tokens'
import { useEffect, useState } from 'react'
import { getPenWorkAnimals, type PenWorkAnimal } from '@/app/(office)/work-orders/actions'

// Columns shown on screen and used for every copy/export, in this order.
const COLS: { key: keyof PenWorkAnimal | 'preg'; label: string }[] = [
  { key: 'eid', label: 'EID' },
  { key: 'backTag', label: 'Back tag' },
  { key: 'visualTag', label: 'Tag #' },
  { key: 'metalTag', label: 'Metal' },
  { key: 'age', label: 'Age' },
  { key: 'color', label: 'Color' },
  { key: 'breed', label: 'Breed' },
  { key: 'preg', label: 'Preg' },
]

function cell(a: PenWorkAnimal, key: string): string {
  if (key === 'preg') return [a.pregStatus, a.pregTiming].filter(Boolean).join(' · ')
  const v = (a as unknown as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : ''
}

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function AnimalListModal({ penWorkId, title, onClose }: { penWorkId: string; title: string; onClose: () => void }) {
  const [rows, setRows] = useState<PenWorkAnimal[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getPenWorkAnimals(penWorkId).then((r) => { if (alive) setRows(r) })
    return () => { alive = false }
  }, [penWorkId])

  function flash(msg: string) {
    setCopied(msg)
    setTimeout(() => setCopied(null), 1800)
  }

  async function writeClip(text: string, msg: string) {
    try {
      await navigator.clipboard.writeText(text)
      flash(msg)
    } catch {
      flash('Copy failed — select the table by hand')
    }
  }

  // Tab-separated with a header row: pastes straight into Excel / Google Sheets.
  function copyTable() {
    if (!rows || rows.length === 0) return
    const header = COLS.map((c) => c.label).join('\t')
    const body = rows.map((a) => COLS.map((c) => cell(a, c.key as string)).join('\t')).join('\n')
    void writeClip(`${header}\n${body}`, 'Table copied')
  }

  // Just the official IDs, one per line — the column health papers care about most.
  function copyEids() {
    if (!rows) return
    const eids = rows.map((a) => a.eid).filter((x): x is string => !!x)
    if (eids.length === 0) { flash('No EIDs to copy'); return }
    void writeClip(eids.join('\n'), `${eids.length} EID${eids.length === 1 ? '' : 's'} copied`)
  }

  function downloadCsv() {
    if (!rows || rows.length === 0) return
    const header = COLS.map((c) => csvEscape(c.label)).join(',')
    const body = rows.map((a) => COLS.map((c) => csvEscape(cell(a, c.key as string))).join(',')).join('\n')
    const blob = new Blob([`${header}\n${body}\n`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'animal-list'}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const count = rows?.length ?? 0
  const btn: React.CSSProperties = {
    height: 36, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8,
    background: '#fff', border: `1px solid ${colors.border}`, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colors.navy, cursor: 'pointer',
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(14,38,70,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, maxHeight: '88vh', background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px rgba(14,38,70,0.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ flexShrink: 0, padding: '16px 18px', borderBottom: `1px solid ${colors.rowDivider}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>Animal list</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, marginTop: 2 }}>{title} · {count} {count === 1 ? 'animal' : 'animals'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F2F4', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 18, color: colors.navy }}>✕</button>
        </div>

        {/* toolbar */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '12px 18px', borderBottom: `1px solid ${colors.rowDivider}`, background: '#FAFBFC', flexWrap: 'wrap' }}>
          <button type="button" onClick={copyTable} disabled={count === 0} style={{ ...btn, opacity: count === 0 ? 0.5 : 1 }}>📋 Copy table</button>
          <button type="button" onClick={copyEids} disabled={count === 0} style={{ ...btn, opacity: count === 0 ? 0.5 : 1 }}>📋 Copy EIDs</button>
          <button type="button" onClick={downloadCsv} disabled={count === 0} style={{ ...btn, opacity: count === 0 ? 0.5 : 1 }}>⭳ Download CSV</button>
          <div style={{ flex: 1 }} />
          {copied ? <span style={{ fontSize: 13, fontWeight: 700, color: colors.teal }}>✓ {copied}</span> : <span style={{ fontSize: 12, fontWeight: 500, color: colors.textPlaceholder }}>For health papers</span>}
        </div>

        {/* body */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {rows === null ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: colors.textMuted }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.navy }}>No animals recorded yet</div>
              <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Animals show here as the crew works this pen at the chute.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, background: '#F1F3F8', textAlign: 'right', padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: colors.textMuted, borderBottom: '1px solid #DEE3EC', width: 44 }}>#</th>
                  {COLS.map((c) => (
                    <th key={c.key as string} style={{ position: 'sticky', top: 0, background: '#F1F3F8', textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: colors.textMuted, borderBottom: '1px solid #DEE3EC', whiteSpace: 'nowrap' }}>{c.label.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => (
                  <tr key={a.animalId} style={{ background: i % 2 === 1 ? '#FAFBFC' : '#fff' }}>
                    <td style={{ textAlign: 'right', padding: '8px 10px', fontSize: 12, fontWeight: 600, color: colors.textPlaceholder, borderBottom: `1px solid ${colors.rowDivider}` }}>{i + 1}</td>
                    {COLS.map((c) => {
                      const v = cell(a, c.key as string)
                      const isEid = c.key === 'eid'
                      return (
                        <td key={c.key as string} style={{ padding: '8px 12px', fontSize: 13, fontWeight: isEid ? 700 : 600, color: v ? (isEid ? colors.navy : colors.textPrimary) : '#C2C2CA', borderBottom: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap' }}>{v || '—'}</td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
