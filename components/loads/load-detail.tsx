'use client'

// One load: its buyer/destination, a live kept-vs-expected head check, the
// animals on it (with the EID + back tag the health paper needs), and the
// actions — edit the destination/expected/notes, take animals off, copy/export
// the tags for GVL, or delete the load. All paperwork: nothing here moves a bill.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { colors } from '@/components/ui/tokens'
import { updateLoad, unassignAnimals, deleteLoad } from '@/app/(app)/loads/actions'
import { copyTsv, exportXlsx, type ExportColumn, type ExportRow } from '@/lib/reports/export'
import type { LoadAnimal, LoadRow } from '@/lib/loads/types'

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'load'

// EID + back tag stay TEXT so a long EID never turns into scientific notation.
const GVL_COLS: ExportColumn[] = [
  { key: 'eid', label: 'EID', kind: 'text' },
  { key: 'backTag', label: 'Back Tag', kind: 'text' },
  { key: 'visualTag', label: 'Visual Tag', kind: 'text' },
  { key: 'color', label: 'Color', kind: 'text' },
  { key: 'animalType', label: 'Type', kind: 'text' },
]

export function LoadDetail({ load, animals, barnName }: { load: LoadRow; animals: LoadAnimal[]; barnName: string }) {
  const router = useRouter()
  const [destinationName, setDestinationName] = useState(load.destinationName)
  const [destinationState, setDestinationState] = useState(load.destinationState)
  const [destinationAddress, setDestinationAddress] = useState(load.destinationAddress)
  const [expectedHead, setExpectedHead] = useState(load.expectedHead == null ? '' : String(load.expectedHead))
  const [notes, setNotes] = useState(load.notes)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function note(msg: string) {
    setFlash(msg)
    window.setTimeout(() => setFlash((m) => (m === msg ? null : m)), 2000)
  }

  const assigned = animals.length
  const expectedNum = expectedHead.trim() === '' ? null : Number(expectedHead)
  const expectedValid = expectedNum === null || (Number.isFinite(expectedNum) && expectedNum >= 0)
  const mismatch = expectedNum != null && expectedNum !== assigned

  async function onSave() {
    if (!expectedValid) {
      setErr('Expected head must be a number')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const res = await updateLoad(load.id, { destinationName, destinationState, destinationAddress, expectedHead: expectedNum, notes })
      if (!res.ok) {
        setErr(res.error)
        return
      }
      note('Saved')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function onUnassign() {
    const ids = [...selected]
    if (ids.length === 0) return
    setBusy(true)
    setErr(null)
    try {
      const res = await unassignAnimals(ids)
      if (!res.ok) {
        setErr(res.error)
        return
      }
      setSelected(new Set())
      note(`Took ${ids.length} off the load`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    setBusy(true)
    setErr(null)
    try {
      const res = await deleteLoad(load.id)
      if (!res.ok) {
        setErr(res.error)
        setBusy(false)
        return
      }
      router.push('/loads')
    } finally {
      /* navigating away */
    }
  }

  const exportRows: ExportRow[] = animals.map((a) => ({ eid: a.eid, backTag: a.backTag, visualTag: a.visualTag, color: a.color, animalType: a.animalType }))
  async function onCopy() {
    const ok = await copyTsv(exportRows, GVL_COLS)
    note(ok ? `Copied ${animals.length} animal${animals.length === 1 ? '' : 's'}` : 'Copy failed — select by hand')
  }
  async function onExport() {
    try {
      await exportXlsx(
        exportRows,
        GVL_COLS,
        { fileType: 'Load Export (GVL)', barnName, scope: `Buyer ${load.buyerNumber || '—'}${load.destination ? ` · ${load.destination}` : ''}`, filtersSummary: 'None', groupingSummary: 'One load', rowCount: animals.length },
        `load-${slug(load.buyerNumber || 'buyer')}.xlsx`,
        'Load',
      )
      note(`Exported ${animals.length} animal${animals.length === 1 ? '' : 's'}`)
    } catch {
      note('Export failed — try again')
    }
  }

  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allSelected = animals.length > 0 && animals.every((a) => selected.has(a.id))
  function toggleAll() {
    setSelected(() => (allSelected ? new Set() : new Set(animals.map((a) => a.id))))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <button type="button" onClick={() => router.push('/loads')} style={linkBtn}>‹ Loads</button>
          <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: colors.navy }}>Buyer {load.buyerNumber || '—'}</h1>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.textMuted }}>{load.buyerName || 'No buyer name'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted }}>Kept of expected</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: mismatch ? colors.danger : colors.navy, fontVariantNumeric: 'tabular-nums' }}>
            {assigned} of {expectedNum ?? '—'}{mismatch ? ' ≠' : ''}
          </div>
        </div>
      </div>

      {flash && <div style={{ fontSize: 13, fontWeight: 700, color: colors.teal }}>✓ {flash}</div>}
      {err && <div style={{ fontSize: 13, fontWeight: 700, color: colors.danger }}>{err}</div>}

      {/* Edit panel */}
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>Destination &amp; expected head</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={destinationName} onChange={(e) => setDestinationName(e.target.value)} placeholder="City / yard" style={{ ...input, flex: '2 1 160px' }} />
          <input value={destinationState} onChange={(e) => setDestinationState(e.target.value)} placeholder="ST" style={{ ...input, width: 70 }} />
          <input value={expectedHead} onChange={(e) => setExpectedHead(e.target.value)} inputMode="numeric" placeholder="Expected head" style={{ ...input, width: 130 }} />
        </div>
        <input value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} placeholder="Address (often filled in at paper time)" style={input} />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} style={{ ...input, height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} style={{ ...btn, background: '#fff', border: '1px solid #E2B4B4', color: '#B42318' }}>Delete load</button>
          <button type="button" onClick={() => void onSave()} disabled={saving} style={{ ...btn, background: colors.gold, border: `1px solid ${colors.gold}`, color: colors.navy }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {/* Animals + GVL export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: colors.navy }}>{animals.length} animal{animals.length === 1 ? '' : 's'}</span>
        <span style={{ flex: 1 }} />
        {selected.size > 0 && (
          <button type="button" onClick={() => void onUnassign()} disabled={busy} style={{ ...btn, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy }}>Take off load ({selected.size})</button>
        )}
        <button type="button" onClick={() => void onCopy()} disabled={animals.length === 0} style={{ ...btn, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy, opacity: animals.length ? 1 : 0.5 }}>Copy</button>
        <button type="button" onClick={() => void onExport()} disabled={animals.length === 0} style={{ ...btn, background: colors.gold, border: `1px solid ${colors.gold}`, color: colors.navy, opacity: animals.length ? 1 : 0.5 }}>Export for GVL</button>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 34 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
              <th style={th}>EID</th>
              <th style={th}>Back Tag</th>
              <th style={th}>Visual Tag</th>
              <th style={th}>Color</th>
              <th style={th}>Type</th>
            </tr>
          </thead>
          <tbody>
            {animals.map((a, i) => (
              <tr key={a.id} style={{ background: i % 2 ? colors.hoverBg : '#fff' }}>
                <td style={td}><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleRow(a.id)} aria-label="Select animal" /></td>
                <td style={td}>{a.eid || '—'}</td>
                <td style={td}>{a.backTag || '—'}</td>
                <td style={td}>{a.visualTag || '—'}</td>
                <td style={td}>{a.color || '—'}</td>
                <td style={td}>{a.animalType || '—'}</td>
              </tr>
            ))}
            {animals.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', fontSize: 14, color: colors.textMuted }}>No animals on this load.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,38,70,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy }}>Delete this load?</div>
            <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>The {animals.length} animal{animals.length === 1 ? '' : 's'} stay — they just come off the load. This can&apos;t move a bill.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ ...btn, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy }}>Cancel</button>
              <button type="button" onClick={() => void onDelete()} disabled={busy} style={{ ...btn, background: '#B42318', border: '1px solid #B42318', color: '#fff' }}>{busy ? 'Deleting…' : 'Delete load'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const input: React.CSSProperties = { height: 36, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 10px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: colors.textPrimary, outline: 'none', width: '100%' }
const btn: React.CSSProperties = { height: 36, padding: '0 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 800 }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: colors.teal, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }
const th: React.CSSProperties = { position: 'sticky', top: 0, background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '8px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: `1px solid ${colors.rowDivider}`, fontSize: 13, fontWeight: 600, color: colors.textPrimary, whiteSpace: 'nowrap' }
