'use client'

import { colors } from '@/components/ui/tokens'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { RequiredMark } from '@/components/ui/required-mark'
import { saveSettings } from './actions'
import type {
  AgeDesignation,
  BarnSettings,
  FieldConfig,
  FieldOption,
  PregStage,
  QuickNote,
  SavePayload,
  SettingsData,
  WorkType,
} from './types'

// ---- small constants (labels + colors shared with the read-only view) ----

const FIELD_LABELS: Record<string, string> = {
  eid: 'EID',
  metal_tag: 'Metal Tag',
  back_tag: 'Back Tag',
  visual_tag: 'Tag #',
  hide_color: 'Body Color',
  age: 'Age',
  breed: 'Breed',
  preg_stage: 'Preg Stage',
  preg_timing: 'Month Bred',
  fetal_sex: 'Fetal Sex',
  quick_notes: 'Quick Notes',
  notes: 'Notes',
}

const TAG_COLOR_HEX: Record<string, string> = {
  White: '#FFFFFF',
  Yellow: '#F3D12A',
  Green: '#3FA66A',
  Purple: '#6D28D9',
  Blue: '#3B82C4',
  Red: '#E2484A',
  Pink: '#EC4899',
}

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const ID_TYPES: { v: string; label: string }[] = [
  { v: 'EID', label: 'Official EID' },
  { v: 'METAL', label: 'Official Metal' },
  { v: 'BOTH', label: 'Either' },
]

// ---- colors (from globals.css tokens) ----

// ---- helpers ----

const isNew = (id: string) => id.startsWith('new:')
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const round = (n: number, dp: number) => {
  const f = 10 ** dp
  return Math.round(n * f) / f
}
const slug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

/**
 * Renumber a list to match a new order of ids, writing 0..n-1 into the order
 * column (sort_order or sort_priority). Only the rows whose number actually
 * changes land in the Save diff.
 */
function reindexBy<T extends { id: string }>(list: T[], orderedIds: string[], key: 'sort_order' | 'sort_priority'): T[] {
  const pos = new Map(orderedIds.map((id, i) => [id, i]))
  return list.map((row) => (pos.has(row.id) ? ({ ...row, [key]: pos.get(row.id)! } as T) : row))
}

const byOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order

// Drag-to-reorder for the settings lists. Pointer-based so it works the same with
// a finger or a mouse, no library. As you drag a row's grip past a neighbour the
// list re-sorts live; on drop the new order (0..n-1) is written to the order
// column and saved with everything else. Replaces the old up/down arrows.
function useDragReorder(orderedIds: string[], onReorder: (ids: string[]) => void) {
  const rowEls = useRef(new Map<string, HTMLElement | null>())
  const idsRef = useRef(orderedIds)
  idsRef.current = orderedIds
  const [dragId, setDragId] = useState<string | null>(null)

  const setRow = (id: string) => (el: HTMLElement | null) => { rowEls.current.set(id, el) }

  function onMove(e: React.PointerEvent) {
    if (!dragId) return
    const ids = idsRef.current
    const y = e.clientY
    // The slot the finger is over = the first row whose middle is below it.
    let target = ids.length - 1
    for (let i = 0; i < ids.length; i++) {
      const el = rowEls.current.get(ids[i])
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (y < r.top + r.height / 2) { target = i; break }
    }
    const from = ids.indexOf(dragId)
    if (from < 0 || from === target) return
    const next = [...ids]
    next.splice(from, 1)
    next.splice(target, 0, dragId)
    onReorder(next)
  }

  function end(e: React.PointerEvent) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setDragId(null)
  }

  const handleProps = (id: string): React.DOMAttributes<HTMLButtonElement> => ({
    onPointerDown: (e) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      setDragId(id)
    },
    onPointerMove: onMove,
    onPointerUp: end,
    onPointerCancel: end,
  })

  return { dragId, setRow, handleProps }
}

// ---- tiny UI atoms ----

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        width: 46, height: 28, borderRadius: 999, border: 'none', padding: 3, cursor: 'pointer',
        background: on ? colors.navy : colors.border, transition: 'background 150ms', display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start', alignItems: 'center', flexShrink: 0,
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(8,18,40,0.25)' }} />
    </button>
  )
}

function TogglePill({ on, onToggle, children }: { on: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      style={{
        height: 30, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700,
        border: `1px solid ${on ? colors.navy : colors.border}`, background: on ? colors.navy : '#fff', color: on ? '#fff' : colors.textMuted,
      }}
    >
      {children}
    </button>
  )
}

function GripIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill={color} aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="5" cy="4" r="1.4" /><circle cx="11" cy="4" r="1.4" />
      <circle cx="5" cy="8" r="1.4" /><circle cx="11" cy="8" r="1.4" />
      <circle cx="5" cy="12" r="1.4" /><circle cx="11" cy="12" r="1.4" />
    </svg>
  )
}

// The drag grip that replaces the up/down arrows. Press and drag it to move the
// row. `handleProps` carries the pointer wiring from useDragReorder.
function DragHandle({ active, handleProps }: { active: boolean; handleProps: React.DOMAttributes<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      {...handleProps}
      style={{
        width: 30, height: 34, borderRadius: 7, flexShrink: 0, padding: 0,
        border: `1px solid ${active ? colors.navy : colors.border}`,
        background: active ? colors.navy : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'grab', touchAction: 'none',
      }}
    >
      <GripIcon color={active ? '#fff' : '#9A9AA6'} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`, borderRadius: 9, padding: '7px 9px', fontSize: 14, fontWeight: 600,
  color: colors.textPrimary, background: '#fff', fontFamily: 'inherit', outline: 'none', minWidth: 0, width: '100%',
}

function TextField(props: { value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel: string; width?: number }) {
  return (
    <input
      type="text"
      value={props.value}
      placeholder={props.placeholder}
      aria-label={props.ariaLabel}
      onChange={(e) => props.onChange(e.target.value)}
      style={{ ...inputStyle, width: props.width ?? '100%', flex: props.width ? '0 0 auto' : '1 1 0%' }}
    />
  )
}

function NumField(props: { value: number | null; onChange: (v: number | null) => void; ariaLabel: string; step?: number; prefix?: string; suffix?: string; width?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      {props.prefix ? <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>{props.prefix}</span> : null}
      <input
        type="number"
        inputMode="decimal"
        step={props.step ?? 1}
        value={props.value ?? ''}
        aria-label={props.ariaLabel}
        onChange={(e) => props.onChange(e.target.value === '' ? null : Number(e.target.value))}
        style={{ ...inputStyle, width: props.width ?? 74, textAlign: 'right' }}
        className="tnum"
      />
      {props.suffix ? <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>{props.suffix}</span> : null}
    </span>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 500, color: '#9A9AA6', lineHeight: 1.4 }}>{children}</p>
}

function RowShell({ first, rowRef, children }: { first: boolean; rowRef?: (el: HTMLElement | null) => void; children: ReactNode }) {
  return (
    <div ref={rowRef} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: first ? 'none' : `1px solid ${colors.rowDivider}` }}>
      {children}
    </div>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: 10, height: 36, padding: '0 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700,
        border: `1px dashed ${colors.border}`, background: '#FBFBFA', color: colors.navy,
      }}
    >
      {children}
    </button>
  )
}

// A settings section that collapses to a single header row. Tap the header to
// open/close — so the whole screen is a short stack of headers instead of one
// long scroll. Replaces the always-open SectionCard on this screen.
function CollapsibleSection({
  title, summary, defaultOpen, children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <section style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          background: '#EEF1F6', border: 'none', borderBottom: open ? `1px solid ${colors.rowDivider}` : 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ width: 4, height: 18, borderRadius: 2, background: colors.gold, flexShrink: 0 }} />
        <span style={{ flex: '1 1 0%', fontSize: 15, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>{title}</span>
        {summary ? <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>{summary}</span> : null}
        <span style={{ color: colors.textMuted, fontSize: 13, fontWeight: 800, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
      </button>
      {open ? <div style={{ padding: '12px 16px 16px' }}>{children}</div> : null}
    </section>
  )
}

// One work type inside the Work Types section. Collapsed it's a single row;
// open it to edit THAT work type's own field list (which fields show, the order,
// and required) plus its rates. This is the per-work-type field list that used
// to be invisible. A work type with no list of its own follows the default until
// you Customize it.
function WorkTypeRow({
  wt, fields, patchWt, onFieldPatch, onReorder, onCustomize, onReset,
}: {
  wt: WorkType
  fields: FieldConfig[]
  patchWt: (p: Partial<WorkType>) => void
  onFieldPatch: (fieldId: string, p: Partial<FieldConfig>) => void
  onReorder: (ids: string[]) => void
  onCustomize: () => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const sorted = [...fields].sort(byOrder)
  const dnd = useDragReorder(sorted.map((f) => f.id), onReorder)
  const hasOwn = fields.length > 0
  const shown = fields.filter((f) => f.is_displayed).length
  const summary = [hasOwn ? `${shown} field${shown === 1 ? '' : 's'}` : 'Follows default', wt.includes_preg_check ? 'Preg' : '', wt.active ? '' : 'Off']
    .filter(Boolean)
    .join(' · ')
  return (
    <div style={{ borderTop: `1px solid ${colors.rowDivider}` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 2px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', opacity: wt.active ? 1 : 0.55 }}
      >
        <span style={{ flex: '1 1 0%', fontSize: 14, fontWeight: 700, color: colors.navy }}>{wt.name}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>{summary}</span>
        <span style={{ color: colors.textMuted, fontSize: 12, fontWeight: 800, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
      </button>
      {open ? (
        <div style={{ padding: '2px 0 14px' }}>
          {hasOwn ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '4px 0 6px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted }}>Fields for this work type</span>
                <button type="button" onClick={onReset} style={{ fontSize: 12, fontWeight: 700, color: colors.teal, background: colors.tealPillBg, border: `1px solid ${colors.teal}`, borderRadius: 999, padding: '5px 11px', cursor: 'pointer' }}>Reset to default</button>
              </div>
              {sorted.map((f, i) => (
                <div key={f.id} ref={dnd.setRow(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i === 0 ? 'none' : `1px solid ${colors.rowDivider}` }}>
                  <DragHandle active={dnd.dragId === f.id} handleProps={dnd.handleProps(f.id)} />
                  <span style={{ flex: '1 1 0%', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, color: f.is_displayed ? colors.textPrimary : '#9A9AA6' }}>
                    {f.display_label || FIELD_LABELS[f.field_key] || f.field_key}
                    {f.is_required && <RequiredMark />}
                  </span>
                  <TogglePill on={f.is_required} onToggle={() => onFieldPatch(f.id, { is_required: !f.is_required })}>Required</TogglePill>
                  <Switch on={f.is_displayed} onToggle={() => onFieldPatch(f.id, { is_displayed: !f.is_displayed })} label={`Show ${f.field_key}`} />
                </div>
              ))}
            </>
          ) : (
            <div style={{ padding: '2px 0 4px' }}>
              <Caption>This work type follows the Default Capture Fields list. Customize to give it its own set of fields.</Caption>
              <AddButton onClick={onCustomize}>+ Customize fields for this work type</AddButton>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.rowDivider}`, flexWrap: 'wrap' }}>
            <TogglePill on={wt.includes_preg_check} onToggle={() => patchWt({ includes_preg_check: !wt.includes_preg_check })}>Preg</TogglePill>
            <Switch on={wt.active} onToggle={() => patchWt({ active: !wt.active })} label={`${wt.name} active`} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9A9AA6' }}>Prices live in the Charges section.</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// All work-type prices in one place, side by side — every work type on its own
// row with its Vet and SOL charge, so you can scan and compare them at a glance
// instead of digging into each work type. Edits save the same way as before.
function ChargesTable({ workTypes, patchWt }: { workTypes: WorkType[]; patchWt: (id: string, p: Partial<WorkType>) => void }) {
  const cell: React.CSSProperties = { width: 96, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }
  return (
    <div>
      <Caption>Per-head charges for every work type, side by side. Vet and SOL set what each job bills.</Caption>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 6px' }}>
        <span style={{ flex: '1 1 0%', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted }}>Work Type</span>
        <span style={{ ...cell, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, paddingRight: 6 }}>Vet</span>
        <span style={{ ...cell, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, paddingRight: 6 }}>SOL</span>
      </div>
      {workTypes.map((w, i) => (
        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? `1px solid ${colors.rowDivider}` : `1px solid ${colors.rowDivider}`, opacity: w.active ? 1 : 0.55 }}>
          <span style={{ flex: '1 1 0%', fontSize: 14, fontWeight: 700, color: colors.navy }}>{w.name}{w.active ? '' : ' · Off'}</span>
          <span style={cell}>
            <NumField ariaLabel={`${w.name} vet charge`} prefix="$" step={0.5} width={56} value={w.vet_charge} onChange={(v) => patchWt(w.id, { vet_charge: v == null ? 0 : round(v, 2) })} />
          </span>
          <span style={cell}>
            <NumField ariaLabel={`${w.name} SOL charge`} prefix="$" step={0.5} width={56} value={w.sol_charge} onChange={(v) => patchWt(w.id, { sol_charge: v == null ? 0 : round(v, 2) })} />
          </span>
        </div>
      ))}
    </div>
  )
}

// =====================================================================

export function SettingsForm({ data, isBarnAdmin }: { data: SettingsData; isBarnAdmin: boolean }) {
  const router = useRouter()

  const [barn, setBarn] = useState<BarnSettings>(() => clone(data.barn))
  const [fields, setFields] = useState<FieldConfig[]>(() => clone(data.fields))
  const [workTypes, setWorkTypes] = useState<WorkType[]>(() => clone(data.workTypes))
  // Each work type's own field list, keyed by work_type_id.
  const [wtFields, setWtFields] = useState<Record<string, FieldConfig[]>>(() => clone(data.workTypeFields))
  const [options, setOptions] = useState<FieldOption[]>(() => clone(data.options))
  const [pregStages, setPregStages] = useState<PregStage[]>(() => clone(data.pregStages))
  const [ages, setAges] = useState<AgeDesignation[]>(() => clone(data.ageDesignations))
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(() => clone(data.quickNotes))
  const [newNoteText, setNewNoteText] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When the server sends fresh data (after a save + refresh), reset to it.
  const sig = useMemo(() => JSON.stringify(data), [data])
  const lastSig = useRef(sig)
  useEffect(() => {
    if (lastSig.current === sig) return
    lastSig.current = sig
    setBarn(clone(data.barn))
    setFields(clone(data.fields))
    setWorkTypes(clone(data.workTypes))
    setWtFields(clone(data.workTypeFields))
    setOptions(clone(data.options))
    setPregStages(clone(data.pregStages))
    setAges(clone(data.ageDesignations))
    setQuickNotes(clone(data.quickNotes))
    setNewNoteText('')
    setError(null)
  }, [sig, data])

  const initial = data // the server truth we diff against

  // ---- build the change set ----
  const payload = useMemo<SavePayload>(() => {
    const barnPatch: SavePayload['barn'] = (() => {
      const p: Record<string, unknown> = {}
      if (barn.name !== initial.barn.name) p.name = barn.name
      if (barn.official_id_type !== initial.barn.official_id_type) p.official_id_type = barn.official_id_type
      if (barn.age_numeric_enabled !== initial.barn.age_numeric_enabled) p.age_numeric_enabled = barn.age_numeric_enabled
      if (JSON.stringify(barn.preg_active_months) !== JSON.stringify(initial.barn.preg_active_months)) p.preg_active_months = barn.preg_active_months
      if (barn.admin_fee_rate !== initial.barn.admin_fee_rate) p.admin_fee_rate = barn.admin_fee_rate
      if (barn.sales_tax_rate !== initial.barn.sales_tax_rate) p.sales_tax_rate = barn.sales_tax_rate
      if (barn.special_sol_charge !== initial.barn.special_sol_charge) p.special_sol_charge = barn.special_sol_charge
      return Object.keys(p).length ? ({ id: barn.id, ...p } as SavePayload['barn']) : undefined
    })()

    const fieldChanged = (o: FieldConfig | undefined, f: FieldConfig) =>
      !!o && (o.is_displayed !== f.is_displayed || o.is_required !== f.is_required || o.sort_order !== f.sort_order || o.default_value !== f.default_value)
    const slimField = ({ id, is_displayed, is_required, sort_order, default_value }: FieldConfig) =>
      ({ id, is_displayed, is_required, sort_order, default_value })

    const initFields = new Map(initial.fields.map((f) => [f.id, f]))
    const changedDefaultFields = fields.filter((f) => fieldChanged(initFields.get(f.id), f)).map(slimField)

    // Per-work-type field rows. Edits to existing rows ride in `fields` (same
    // table, matched by id); brand-new rows (customizing a work type that had
    // none) go to newFields for insert.
    const initWtFields = new Map<string, FieldConfig>()
    for (const list of Object.values(initial.workTypeFields)) for (const f of list) initWtFields.set(f.id, f)
    const allWtFields = Object.values(wtFields).flat()
    const changedWtFields = allWtFields.filter((f) => !isNew(f.id) && fieldChanged(initWtFields.get(f.id), f)).map(slimField)
    const newFields = Object.entries(wtFields).flatMap(([workTypeId, list]) =>
      list
        .filter((f) => isNew(f.id))
        .map((f) => ({ work_type_id: workTypeId, field_key: f.field_key, is_displayed: f.is_displayed, is_required: f.is_required, sort_order: f.sort_order, default_value: f.default_value })),
    )
    const changedFields = [...changedDefaultFields, ...changedWtFields]

    const initWt = new Map(initial.workTypes.map((w) => [w.id, w]))
    const changedWt = workTypes
      .filter((w) => {
        const o = initWt.get(w.id)
        return o && (o.includes_preg_check !== w.includes_preg_check || o.vet_charge !== w.vet_charge || o.sol_charge !== w.sol_charge || o.active !== w.active)
      })
      .map(({ id, includes_preg_check, vet_charge, sol_charge, active }) => ({ id, includes_preg_check, vet_charge, sol_charge, active }))

    const initOpt = new Map(initial.options.map((o) => [o.id, o]))
    const changedOptions = options
      .filter((o) => {
        if (isNew(o.id)) return false
        const p = initOpt.get(o.id)
        return p && (p.label !== o.label || p.is_pinned !== o.is_pinned || p.active !== o.active || p.sort_order !== o.sort_order)
      })
      .map(({ id, label, is_pinned, active, sort_order }) => ({ id, label, is_pinned, active, sort_order }))
    const newOptions = options
      .filter((o) => isNew(o.id) && o.label.trim() !== '')
      .map((o) => ({ field_key: o.field_key, value: o.value.trim() || slug(o.label) || o.label.trim(), label: o.label.trim(), is_pinned: o.is_pinned, sort_order: o.sort_order }))

    const initStage = new Map(initial.pregStages.map((s) => [s.id, s]))
    const changedStages = pregStages
      .filter((s) => {
        const o = initStage.get(s.id)
        return o && (o.display_label !== s.display_label || o.active !== s.active || o.sort_order !== s.sort_order)
      })
      .map(({ id, display_label, active, sort_order }) => ({ id, display_label, active, sort_order }))

    const initAge = new Map(initial.ageDesignations.map((a) => [a.id, a]))
    const changedAges = ages
      .filter((a) => {
        if (isNew(a.id)) return false
        const o = initAge.get(a.id)
        return o && (o.designation_value !== a.designation_value || o.age_label !== a.age_label || o.age_code !== a.age_code || o.age_min_years !== a.age_min_years || o.age_max_years !== a.age_max_years || o.sort_order !== a.sort_order || o.active !== a.active)
      })
      .map(({ id, designation_value, age_label, age_code, age_min_years, age_max_years, sort_order, active }) => ({ id, designation_value, age_label, age_code, age_min_years, age_max_years, sort_order, active }))
    const newAges = ages
      .filter((a) => isNew(a.id) && a.designation_value.trim() !== '' && a.age_label.trim() !== '')
      .map(({ designation_value, age_label, age_code, age_min_years, age_max_years, sort_order }) => ({ designation_value: designation_value.trim(), age_label: age_label.trim(), age_code: age_code.trim(), age_min_years, age_max_years, sort_order }))

    const initNote = new Map(initial.quickNotes.map((n) => [n.id, n]))
    const changedNotes = quickNotes
      .filter((n) => {
        if (isNew(n.id)) return false
        const o = initNote.get(n.id)
        return o && (o.active !== n.active || o.sort_priority !== n.sort_priority)
      })
      .map(({ id, active, sort_priority }) => ({ id, active, sort_priority }))
    const newNotes = quickNotes
      .filter((n) => isNew(n.id) && n.label.trim() !== '')
      .map(({ label, sort_priority }) => ({ label: label.trim(), sort_priority }))

    return {
      barn: barnPatch,
      fields: changedFields,
      workTypes: changedWt,
      options: changedOptions,
      newOptions,
      pregStages: changedStages,
      ageDesignations: changedAges,
      newAgeDesignations: newAges,
      quickNotes: changedNotes,
      newQuickNotes: newNotes,
      newFields,
    }
  }, [barn, fields, workTypes, wtFields, options, pregStages, ages, quickNotes, initial])

  const dirty =
    !!payload.barn ||
    payload.fields.length > 0 ||
    payload.workTypes.length > 0 ||
    payload.options.length > 0 ||
    payload.newOptions.length > 0 ||
    payload.pregStages.length > 0 ||
    payload.ageDesignations.length > 0 ||
    payload.newAgeDesignations.length > 0 ||
    payload.quickNotes.length > 0 ||
    payload.newQuickNotes.length > 0 ||
    payload.newFields.length > 0

  async function onSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await saveSettings(payload)
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh() // pull stored truth; the effect above re-syncs the form
    } else {
      setError(res.error)
    }
  }

  function onDiscard() {
    setBarn(clone(initial.barn))
    setFields(clone(initial.fields))
    setWorkTypes(clone(initial.workTypes))
    setWtFields(clone(initial.workTypeFields))
    setOptions(clone(initial.options))
    setPregStages(clone(initial.pregStages))
    setAges(clone(initial.ageDesignations))
    setQuickNotes(clone(initial.quickNotes))
    setNewNoteText('')
    setError(null)
    setSaved(false)
  }

  // ---- per-row mutators ----
  const patchField = (id: string, p: Partial<FieldConfig>) => setFields((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const patchWt = (id: string, p: Partial<WorkType>) => setWorkTypes((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))

  // ---- per-work-type field mutators ----
  const patchWtField = (wtId: string, fieldId: string, p: Partial<FieldConfig>) =>
    setWtFields((m) => ({ ...m, [wtId]: (m[wtId] ?? []).map((f) => (f.id === fieldId ? { ...f, ...p } : f)) }))
  const reorderWtFields = (wtId: string, ids: string[]) =>
    setWtFields((m) => ({ ...m, [wtId]: reindexBy(m[wtId] ?? [], ids, 'sort_order') }))
  // Give a work type its own list by copying the current default set into it as
  // brand-new rows (saved as inserts).
  const customizeWtFields = (wtId: string) =>
    setWtFields((m) => ({
      ...m,
      [wtId]: [...fields].sort(byOrder).map((d) => ({
        id: `new:wtf:${wtId}:${d.field_key}`,
        field_key: d.field_key,
        display_label: null,
        is_displayed: d.is_displayed,
        is_required: d.is_required,
        sort_order: d.sort_order,
        default_value: null,
      })),
    }))
  // Snap a work type's fields back to match the default (which fields show, the
  // order, required) — matched by field_key, keeping the rows so it saves as edits.
  const resetWtFields = (wtId: string) => {
    const byKey = new Map(fields.map((d) => [d.field_key, d]))
    setWtFields((m) => ({
      ...m,
      [wtId]: (m[wtId] ?? []).map((f) => {
        const d = byKey.get(f.field_key)
        return d ? { ...f, is_displayed: d.is_displayed, is_required: d.is_required, sort_order: d.sort_order } : f
      }),
    }))
  }
  const patchStage = (id: string, p: Partial<PregStage>) => setPregStages((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const patchAge = (id: string, p: Partial<AgeDesignation>) => setAges((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const patchOpt = (id: string, p: Partial<FieldOption>) => setOptions((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))

  function reorderOptions(fieldKey: string, ids: string[]) {
    setOptions((prev) => {
      const subset = prev.filter((o) => o.field_key === fieldKey)
      const others = prev.filter((o) => o.field_key !== fieldKey)
      return [...others, ...reindexBy(subset, ids, 'sort_order')]
    })
  }
  function addOption(fieldKey: string) {
    setOptions((prev) => {
      const maxOrder = prev.filter((o) => o.field_key === fieldKey).reduce((m, o) => Math.max(m, o.sort_order), 0)
      return [...prev, { id: `new:${fieldKey}:${Date.now()}:${Math.random()}`, field_key: fieldKey, value: '', label: '', is_pinned: false, sort_order: maxOrder + 1, active: true }]
    })
  }
  function addAge() {
    setAges((prev) => {
      const maxOrder = prev.reduce((m, a) => Math.max(m, a.sort_order), 0)
      return [...prev, { id: `new:age:${Date.now()}:${Math.random()}`, designation_value: '', age_label: '', age_code: '', age_min_years: null, age_max_years: null, sort_order: maxOrder + 1, active: true }]
    })
  }

  const patchNote = (id: string, p: Partial<QuickNote>) => setQuickNotes((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  function addNote() {
    const label = newNoteText.trim()
    if (!label) return
    setQuickNotes((prev) => {
      const maxOrder = prev.reduce((m, n) => Math.max(m, n.sort_priority), -1)
      return [...prev, { id: `new:qn:${Date.now()}:${Math.random()}`, label, scope: 'permanent', active: true, sort_priority: maxOrder + 1, is_flag: false }]
    })
    setNewNoteText('')
  }

  const breeds = options.filter((o) => o.field_key === 'breed').sort(byOrder)
  const bodyColors = options.filter((o) => o.field_key === 'hide_color').sort(byOrder)
  const shownCount = fields.filter((f) => f.is_displayed).length
  const sortedFields = [...fields].sort(byOrder)
  const sortedAges = [...ages].sort(byOrder)
  const sortedStages = [...pregStages].sort(byOrder)
  const sortedNotes = [...quickNotes].sort((a, b) => a.sort_priority - b.sort_priority)
  const activeNoteCount = quickNotes.filter((n) => n.active).length

  // One drag-reorder controller per list. Dropping a row writes the new order
  // (0..n-1) into that list's order column; Save persists it.
  const fieldsDnd = useDragReorder(sortedFields.map((f) => f.id), (ids) => setFields((xs) => reindexBy(xs, ids, 'sort_order')))
  const agesDnd = useDragReorder(sortedAges.map((a) => a.id), (ids) => setAges((xs) => reindexBy(xs, ids, 'sort_order')))
  const stagesDnd = useDragReorder(sortedStages.map((s) => s.id), (ids) => setPregStages((xs) => reindexBy(xs, ids, 'sort_order')))
  const notesDnd = useDragReorder(sortedNotes.map((n) => n.id), (ids) => setQuickNotes((xs) => reindexBy(xs, ids, 'sort_priority')))

  return (
    <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: colors.navy }}>Barn Settings</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.textMuted, lineHeight: 1.45 }}>
          Your barn’s setup. Edit anything below, then press <strong>Save Changes</strong>. The capture screen shows whatever you turn on here, in this order.
        </p>
      </div>

      {/* ---- Barn ---- */}
      <CollapsibleSection title="Barn" summary="Name · fees · tax">
        {!isBarnAdmin ? (
          <Caption>Only a barn admin can change these. You can view them, but Save will skip the barn-level fields.</Caption>
        ) : null}
        <RowShell first>
          <span style={labelCell}>Barn Name</span>
          <TextField ariaLabel="Barn name" value={barn.name} onChange={(v) => setBarn((b) => ({ ...b, name: v }))} />
        </RowShell>
        <RowShell first={false}>
          <span style={labelCell}>Official ID That Counts</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
            {ID_TYPES.map((t) => (
              <TogglePill key={t.v} on={barn.official_id_type === t.v} onToggle={() => setBarn((b) => ({ ...b, official_id_type: t.v }))}>
                {t.label}
              </TogglePill>
            ))}
          </div>
        </RowShell>
        <RowShell first={false}>
          <span style={labelCell}>Admin Fee</span>
          <NumField ariaLabel="Admin fee percent" step={0.1} suffix="%" value={round(barn.admin_fee_rate * 100, 4)} onChange={(v) => setBarn((b) => ({ ...b, admin_fee_rate: v == null ? 0 : round(v / 100, 6) }))} />
        </RowShell>
        <RowShell first={false}>
          <span style={labelCell}>Sales Tax</span>
          <NumField ariaLabel="Sales tax percent" step={0.1} suffix="%" value={round(barn.sales_tax_rate * 100, 4)} onChange={(v) => setBarn((b) => ({ ...b, sales_tax_rate: v == null ? 0 : round(v / 100, 6) }))} />
        </RowShell>
        <RowShell first={false}>
          <span style={labelCell}>Special SOL (per head)</span>
          <NumField ariaLabel="Special SOL charge per head" step={0.25} prefix="$" value={round(barn.special_sol_charge, 2)} onChange={(v) => setBarn((b) => ({ ...b, special_sol_charge: v == null ? 0 : round(v, 2) }))} />
        </RowShell>
      </CollapsibleSection>

      {/* ---- Default capture fields ---- */}
      <CollapsibleSection title="Default Capture Fields" summary={`${shownCount} on`}>
        <Caption>The starting field set. A work type uses this list unless you give it its own (under Work Types below). Switch a field on or off, mark it required, drag to set the order, and give it a default.</Caption>
        <div>
          {sortedFields.map((f, i) => (
            <div key={f.id} ref={fieldsDnd.setRow(f.id)} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${colors.rowDivider}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <DragHandle active={fieldsDnd.dragId === f.id} handleProps={fieldsDnd.handleProps(f.id)} />
                <span style={{ flex: '1 1 0%', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, color: f.is_displayed ? colors.textPrimary : '#9A9AA6' }}>
                  {f.display_label || FIELD_LABELS[f.field_key] || f.field_key}
                  {f.is_required && <RequiredMark />}
                </span>
                <TogglePill on={f.is_required} onToggle={() => patchField(f.id, { is_required: !f.is_required })}>Required</TogglePill>
                <Switch on={f.is_displayed} onToggle={() => patchField(f.id, { is_displayed: !f.is_displayed })} label={`Show ${f.field_key}`} />
              </div>
              {/* Identifiers (EID, the tags) never get a default — you can't
                  pre-fill a tag, so no default-value box for them. */}
              {!['eid', 'back_tag', 'visual_tag', 'metal_tag'].includes(f.field_key) && (
                <div style={{ marginTop: 8, marginLeft: 70 }}>
                  <TextField ariaLabel={`Default value for ${f.field_key}`} placeholder="Default value (optional)" value={f.default_value ?? ''} onChange={(v) => patchField(f.id, { default_value: v === '' ? null : v })} />
                </div>
              )}
            </div>
          ))}
          {fields.length === 0 ? <Caption>No capture fields set up.</Caption> : null}
        </div>
      </CollapsibleSection>

      {/* ---- Age ---- */}
      <CollapsibleSection title="Age — Tag Color → Age" summary={`${sortedAges.length} colors`}>
        <RowShell first>
          <span style={{ flex: '1 1 0%', fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Allow a numeric age too</span>
          <Switch on={barn.age_numeric_enabled} onToggle={() => setBarn((b) => ({ ...b, age_numeric_enabled: !b.age_numeric_enabled }))} label="Numeric age" />
        </RowShell>
        <Caption>Each row maps an observed tag color to an age. Turn a row off to retire it.</Caption>
        <div>
          {sortedAges.map((a, i) => (
            <div key={a.id} ref={agesDnd.setRow(a.id)} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${colors.rowDivider}`, opacity: a.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DragHandle active={agesDnd.dragId === a.id} handleProps={agesDnd.handleProps(a.id)} />
                <span style={{ width: 16, height: 16, borderRadius: 999, flexShrink: 0, background: TAG_COLOR_HEX[a.designation_value] ?? '#D4D4D0', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.12)' }} />
                <TextField ariaLabel="Tag color" placeholder="Color" width={92} value={a.designation_value} onChange={(v) => patchAge(a.id, { designation_value: v })} />
                <TextField ariaLabel="Age label" placeholder="Age label" value={a.age_label} onChange={(v) => patchAge(a.id, { age_label: v })} />
                <Switch on={a.active} onToggle={() => patchAge(a.id, { active: !a.active })} label="Age row on" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: 70 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Code</span>
                <TextField ariaLabel="Age code" placeholder="1yr" width={70} value={a.age_code} onChange={(v) => patchAge(a.id, { age_code: v })} />
                <NumField ariaLabel="Min years" prefix="min" value={a.age_min_years} onChange={(v) => patchAge(a.id, { age_min_years: v })} />
                <NumField ariaLabel="Max years" prefix="max" value={a.age_max_years} onChange={(v) => patchAge(a.id, { age_max_years: v })} />
              </div>
            </div>
          ))}
        </div>
        <AddButton onClick={addAge}>+ Add Age Color</AddButton>
      </CollapsibleSection>

      {/* ---- Pregnancy ---- */}
      <CollapsibleSection title="Pregnancy" summary="Months · stages">
        <Caption>Breeding window — months a “when bred” answer can fall in.</Caption>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {MONTHS_FULL.map((m) => {
            const on = barn.preg_active_months.includes(m)
            return (
              <TogglePill key={m} on={on} onToggle={() => setBarn((b) => ({ ...b, preg_active_months: on ? b.preg_active_months.filter((x) => x !== m) : [...b.preg_active_months, m] }))}>
                {m.slice(0, 3)}
              </TogglePill>
            )
          })}
        </div>
        <div style={{ marginTop: 12 }}>
          <Caption>Pregnancy stages — rename or retire. The stage code stays fixed.</Caption>
          <div>
            {sortedStages.map((s, i) => (
              <RowShell key={s.id} first={i === 0} rowRef={stagesDnd.setRow(s.id)}>
                <DragHandle active={stagesDnd.dragId === s.id} handleProps={stagesDnd.handleProps(s.id)} />
                <span style={{ width: 86, fontSize: 11, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.03em' }}>{s.stage_code}</span>
                <TextField ariaLabel={`Label for ${s.stage_code}`} value={s.display_label} onChange={(v) => patchStage(s.id, { display_label: v })} />
                <Switch on={s.active} onToggle={() => patchStage(s.id, { active: !s.active })} label={`${s.stage_code} on`} />
              </RowShell>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* ---- Breed + Body color option lists ---- */}
      <OptionList title="Breed Choices" caption="A fixed pick list — never free text. Pin the ones that show up front; turn a choice off to retire it." list={breeds} fieldKey="breed" patchOpt={patchOpt} onReorder={reorderOptions} add={addOption} />
      <OptionList title="Body Color Choices" caption="Off at St. Onge, but the list is here for any barn that turns it on. Strict pick list — never free text." list={bodyColors} fieldKey="hide_color" patchOpt={patchOpt} onReorder={reorderOptions} add={addOption} />

      {/* ---- Work types & rates ---- */}
      <CollapsibleSection title="Work Type Fields" summary={`${workTypes.length} types`}>
        <Caption>Each work type has its own field list. Tap one to open it — its field list is exactly what shows at the chute for that job. “Reset to default” snaps it back to the Default Capture Fields list. (Prices are in the Charges section below.)</Caption>
        <div>
          {workTypes.map((w) => (
            <WorkTypeRow
              key={w.id}
              wt={w}
              fields={wtFields[w.id] ?? []}
              patchWt={(p) => patchWt(w.id, p)}
              onFieldPatch={(fid, p) => patchWtField(w.id, fid, p)}
              onReorder={(ids) => reorderWtFields(w.id, ids)}
              onCustomize={() => customizeWtFields(w.id)}
              onReset={() => resetWtFields(w.id)}
            />
          ))}
        </div>
      </CollapsibleSection>

      {/* ---- Charges: every work type's price, side by side ---- */}
      <CollapsibleSection title="Charges" summary={`${workTypes.length} types`}>
        <ChargesTable workTypes={workTypes} patchWt={patchWt} />
      </CollapsibleSection>

      {/* ---- Quick notes ---- */}
      <CollapsibleSection title="Quick Notes" summary={`${activeNoteCount} on`}>
        <Caption>The tap labels at the chute. Turn one off to hide it without losing it, reorder to pin the important ones to the top, or add a new one. Order here matches the chute.</Caption>
        <div>
          {sortedNotes.map((n, i) => (
            <RowShell key={n.id} first={i === 0} rowRef={notesDnd.setRow(n.id)}>
              <DragHandle active={notesDnd.dragId === n.id} handleProps={notesDnd.handleProps(n.id)} />
              <span style={{ flex: '1 1 0%', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: n.active ? colors.textPrimary : '#9A9AA6' }}>
                {n.label}
                {n.is_flag ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', color: colors.bronze, background: '#FDF1DC', border: '1px solid #F1D9A8', borderRadius: 999, padding: '1px 7px' }}>FLAG</span> : null}
              </span>
              <Switch on={n.active} onToggle={() => patchNote(n.id, { active: !n.active })} label={`${n.label} on`} />
            </RowShell>
          ))}
          {sortedNotes.length === 0 ? <span style={{ fontSize: 13, color: '#9A9AA6' }}>None set up.</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <TextField
            ariaLabel="New quick note"
            placeholder="New quick note (e.g. Lump jaw)"
            value={newNoteText}
            onChange={setNewNoteText}
          />
          <button
            type="button"
            onClick={addNote}
            disabled={!newNoteText.trim()}
            style={{ flexShrink: 0, height: 38, padding: '0 16px', borderRadius: 9, border: 'none', cursor: newNoteText.trim() ? 'pointer' : 'default', fontSize: 14, fontWeight: 700, background: colors.navy, color: '#fff', opacity: newNoteText.trim() ? 1 : 0.5 }}
          >
            Add
          </button>
        </div>
      </CollapsibleSection>

      {/* ---- sticky Save bar ---- */}
      {dirty || saving || saved || error ? (
        <div style={{ position: 'sticky', bottom: 0, marginTop: 6, padding: '10px 12px', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(6px)', borderTop: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: '0 -6px 20px rgba(14,38,70,0.10)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: '1 1 0%', fontSize: 13, fontWeight: 600, color: error ? colors.danger : saved && !dirty ? colors.teal : colors.textMuted, lineHeight: 1.35 }}>
            {error ? `Couldn’t save — ${error}` : saving ? 'Saving…' : saved && !dirty ? 'Saved ✓' : 'Unsaved changes'}
          </span>
          {dirty && !saving ? (
            <button type="button" onClick={onDiscard} style={{ height: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${colors.border}`, background: '#fff', color: colors.textMuted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Discard
            </button>
          ) : null}
          <button type="button" onClick={onSave} disabled={saving || !dirty} className="sbv-gold-btn" style={{ width: 'auto', height: 44, padding: '0 22px', fontSize: 15, opacity: saving || !dirty ? 0.55 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

const labelCell: React.CSSProperties = { flex: '1 1 0%', fontSize: 13, fontWeight: 600, color: colors.textMuted }

// ---- option-list editor (breed / body color) ----
function OptionList({
  title, caption, list, fieldKey, patchOpt, onReorder, add,
}: {
  title: string
  caption: string
  list: FieldOption[]
  fieldKey: string
  patchOpt: (id: string, p: Partial<FieldOption>) => void
  onReorder: (fieldKey: string, ids: string[]) => void
  add: (fieldKey: string) => void
}) {
  const dnd = useDragReorder(list.map((o) => o.id), (ids) => onReorder(fieldKey, ids))
  return (
    <CollapsibleSection title={title} summary={`${list.length} choices`}>
      <Caption>{caption}</Caption>
      <div>
        {list.map((o, i) => (
          <RowShell key={o.id} first={i === 0} rowRef={dnd.setRow(o.id)}>
            <DragHandle active={dnd.dragId === o.id} handleProps={dnd.handleProps(o.id)} />
            <TextField ariaLabel="Option label" placeholder="New choice" value={o.label} onChange={(v) => patchOpt(o.id, { label: v })} />
            <TogglePill on={o.is_pinned} onToggle={() => patchOpt(o.id, { is_pinned: !o.is_pinned })}>Pinned</TogglePill>
            <Switch on={o.active} onToggle={() => patchOpt(o.id, { active: !o.active })} label="Option on" />
          </RowShell>
        ))}
        {list.length === 0 ? <span style={{ fontSize: 13, color: '#9A9AA6' }}>None yet.</span> : null}
      </div>
      <AddButton onClick={() => add(fieldKey)}>+ Add Choice</AddButton>
    </CollapsibleSection>
  )
}
