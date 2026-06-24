'use client'

import { colors } from '@/components/ui/tokens'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { SectionCard } from '@/components/ui/section-card'
import { RequiredMark } from '@/components/ui/required-mark'
import { saveSettings } from './actions'
import type {
  AgeDesignation,
  BarnSettings,
  FieldConfig,
  FieldOption,
  PregStage,
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

/** Swap a row with its neighbour by exchanging sort_order (only those two change). */
function reordered<T extends { id: string; sort_order: number }>(list: T[], id: string, dir: 'up' | 'down'): T[] {
  const sorted = [...list].sort((a, b) => a.sort_order - b.sort_order)
  const i = sorted.findIndex((x) => x.id === id)
  const j = dir === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= sorted.length) return list
  const so = sorted[i].sort_order
  sorted[i] = { ...sorted[i], sort_order: sorted[j].sort_order }
  sorted[j] = { ...sorted[j], sort_order: so }
  return sorted
}

const byOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order

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

function Reorder({ onUp, onDown, canUp, canDown }: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }) {
  const btn = (enabled: boolean): React.CSSProperties => ({
    width: 30, height: 26, borderRadius: 7, border: `1px solid ${colors.border}`, background: '#fff',
    color: enabled ? colors.navy : '#CBCBC6', cursor: enabled ? 'pointer' : 'default', fontSize: 13, fontWeight: 800,
    lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  })
  return (
    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
      <button type="button" aria-label="Move up" disabled={!canUp} onClick={onUp} style={btn(canUp)}>↑</button>
      <button type="button" aria-label="Move down" disabled={!canDown} onClick={onDown} style={btn(canDown)}>↓</button>
    </div>
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

function RowShell({ first, children }: { first: boolean; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: first ? 'none' : `1px solid ${colors.rowDivider}` }}>
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

// =====================================================================

export function SettingsForm({ data, isBarnAdmin }: { data: SettingsData; isBarnAdmin: boolean }) {
  const router = useRouter()

  const [barn, setBarn] = useState<BarnSettings>(() => clone(data.barn))
  const [fields, setFields] = useState<FieldConfig[]>(() => clone(data.fields))
  const [workTypes, setWorkTypes] = useState<WorkType[]>(() => clone(data.workTypes))
  const [options, setOptions] = useState<FieldOption[]>(() => clone(data.options))
  const [pregStages, setPregStages] = useState<PregStage[]>(() => clone(data.pregStages))
  const [ages, setAges] = useState<AgeDesignation[]>(() => clone(data.ageDesignations))

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
    setOptions(clone(data.options))
    setPregStages(clone(data.pregStages))
    setAges(clone(data.ageDesignations))
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

    const initFields = new Map(initial.fields.map((f) => [f.id, f]))
    const changedFields = fields
      .filter((f) => {
        const o = initFields.get(f.id)
        return o && (o.is_displayed !== f.is_displayed || o.is_required !== f.is_required || o.sort_order !== f.sort_order || o.default_value !== f.default_value)
      })
      .map(({ id, is_displayed, is_required, sort_order, default_value }) => ({ id, is_displayed, is_required, sort_order, default_value }))

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

    return {
      barn: barnPatch,
      fields: changedFields,
      workTypes: changedWt,
      options: changedOptions,
      newOptions,
      pregStages: changedStages,
      ageDesignations: changedAges,
      newAgeDesignations: newAges,
    }
  }, [barn, fields, workTypes, options, pregStages, ages, initial])

  const dirty =
    !!payload.barn ||
    payload.fields.length > 0 ||
    payload.workTypes.length > 0 ||
    payload.options.length > 0 ||
    payload.newOptions.length > 0 ||
    payload.pregStages.length > 0 ||
    payload.ageDesignations.length > 0 ||
    payload.newAgeDesignations.length > 0

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
    setOptions(clone(initial.options))
    setPregStages(clone(initial.pregStages))
    setAges(clone(initial.ageDesignations))
    setError(null)
    setSaved(false)
  }

  // ---- per-row mutators ----
  const patchField = (id: string, p: Partial<FieldConfig>) => setFields((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const patchWt = (id: string, p: Partial<WorkType>) => setWorkTypes((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const patchStage = (id: string, p: Partial<PregStage>) => setPregStages((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const patchAge = (id: string, p: Partial<AgeDesignation>) => setAges((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const patchOpt = (id: string, p: Partial<FieldOption>) => setOptions((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)))

  function reorderOption(fieldKey: string, id: string, dir: 'up' | 'down') {
    setOptions((prev) => {
      const subset = prev.filter((o) => o.field_key === fieldKey)
      const others = prev.filter((o) => o.field_key !== fieldKey)
      return [...others, ...reordered(subset, id, dir)]
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

  const breeds = options.filter((o) => o.field_key === 'breed').sort(byOrder)
  const bodyColors = options.filter((o) => o.field_key === 'hide_color').sort(byOrder)
  const shownCount = fields.filter((f) => f.is_displayed).length

  return (
    <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: colors.navy }}>Barn Settings</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.textMuted, lineHeight: 1.45 }}>
          Your barn’s setup. Edit anything below, then press <strong>Save Changes</strong>. The capture screen shows whatever you turn on here, in this order.
        </p>
      </div>

      {/* ---- Barn ---- */}
      <SectionCard title="Barn">
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
      </SectionCard>

      {/* ---- Capture fields ---- */}
      <SectionCard title={`Capture Fields · ${shownCount} on`}>
        <Caption>Switch a field on or off, mark it required, set its order, and give it a default. The chute screen follows this list.</Caption>
        <div>
          {[...fields].sort(byOrder).map((f, i) => (
            <div key={f.id} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${colors.rowDivider}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Reorder canUp={i > 0} canDown={i < fields.length - 1} onUp={() => setFields((xs) => reordered(xs, f.id, 'up'))} onDown={() => setFields((xs) => reordered(xs, f.id, 'down'))} />
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
      </SectionCard>

      {/* ---- Age ---- */}
      <SectionCard title="Age — Tag Color → Age">
        <RowShell first>
          <span style={{ flex: '1 1 0%', fontSize: 13, fontWeight: 600, color: colors.textMuted }}>Allow a numeric age too</span>
          <Switch on={barn.age_numeric_enabled} onToggle={() => setBarn((b) => ({ ...b, age_numeric_enabled: !b.age_numeric_enabled }))} label="Numeric age" />
        </RowShell>
        <Caption>Each row maps an observed tag color to an age. Turn a row off to retire it.</Caption>
        <div>
          {[...ages].sort(byOrder).map((a, i) => (
            <div key={a.id} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${colors.rowDivider}`, opacity: a.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Reorder canUp={i > 0} canDown={i < ages.length - 1} onUp={() => setAges((xs) => reordered(xs, a.id, 'up'))} onDown={() => setAges((xs) => reordered(xs, a.id, 'down'))} />
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
      </SectionCard>

      {/* ---- Pregnancy ---- */}
      <SectionCard title="Pregnancy">
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
            {[...pregStages].sort(byOrder).map((s, i) => (
              <RowShell key={s.id} first={i === 0}>
                <Reorder canUp={i > 0} canDown={i < pregStages.length - 1} onUp={() => setPregStages((xs) => reordered(xs, s.id, 'up'))} onDown={() => setPregStages((xs) => reordered(xs, s.id, 'down'))} />
                <span style={{ width: 86, fontSize: 11, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.03em' }}>{s.stage_code}</span>
                <TextField ariaLabel={`Label for ${s.stage_code}`} value={s.display_label} onChange={(v) => patchStage(s.id, { display_label: v })} />
                <Switch on={s.active} onToggle={() => patchStage(s.id, { active: !s.active })} label={`${s.stage_code} on`} />
              </RowShell>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ---- Breed + Body color option lists ---- */}
      <OptionList title="Breed Choices" caption="A fixed pick list — never free text. Pin the ones that show up front; turn a choice off to retire it." list={breeds} fieldKey="breed" patchOpt={patchOpt} reorder={reorderOption} add={addOption} />
      <OptionList title="Body Color Choices" caption="Off at St. Onge, but the list is here for any barn that turns it on. Strict pick list — never free text." list={bodyColors} fieldKey="hide_color" patchOpt={patchOpt} reorder={reorderOption} add={addOption} />

      {/* ---- Work types & rates ---- */}
      <SectionCard title="Work Types & Rates">
        <Caption>Per-head charges. A preg tag means the preg fields show for that work. Turn a work type off to retire it.</Caption>
        <div>
          {workTypes.map((w, i) => (
            <div key={w.id} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${colors.rowDivider}`, opacity: w.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: '1 1 0%', fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{w.name}</span>
                <TogglePill on={w.includes_preg_check} onToggle={() => patchWt(w.id, { includes_preg_check: !w.includes_preg_check })}>Preg</TogglePill>
                <Switch on={w.active} onToggle={() => patchWt(w.id, { active: !w.active })} label={`${w.name} active`} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>Vet</span>
                <NumField ariaLabel={`${w.name} vet charge`} prefix="$" step={0.5} value={w.vet_charge} onChange={(v) => patchWt(w.id, { vet_charge: v == null ? 0 : round(v, 2) })} />
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>SOL</span>
                <NumField ariaLabel={`${w.name} SOL charge`} prefix="$" step={0.5} value={w.sol_charge} onChange={(v) => patchWt(w.id, { sol_charge: v == null ? 0 : round(v, 2) })} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ---- Quick notes (read-only) ---- */}
      <SectionCard title="Quick Notes">
        <Caption>The tap labels at the chute. Editing these comes later — shown here for reference.</Caption>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {data.quickNotes.map((n) => (
            <span key={n.label} className="sbv-pill" data-selected={(n.sort_priority ?? 0) > 0}>{n.label}</span>
          ))}
          {data.quickNotes.length === 0 ? <span style={{ fontSize: 13, color: '#9A9AA6' }}>None set up.</span> : null}
        </div>
      </SectionCard>

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
  title, caption, list, fieldKey, patchOpt, reorder, add,
}: {
  title: string
  caption: string
  list: FieldOption[]
  fieldKey: string
  patchOpt: (id: string, p: Partial<FieldOption>) => void
  reorder: (fieldKey: string, id: string, dir: 'up' | 'down') => void
  add: (fieldKey: string) => void
}) {
  return (
    <SectionCard title={title}>
      <Caption>{caption}</Caption>
      <div>
        {list.map((o, i) => (
          <RowShell key={o.id} first={i === 0}>
            <Reorder canUp={i > 0} canDown={i < list.length - 1} onUp={() => reorder(fieldKey, o.id, 'up')} onDown={() => reorder(fieldKey, o.id, 'down')} />
            <TextField ariaLabel="Option label" placeholder="New choice" value={o.label} onChange={(v) => patchOpt(o.id, { label: v })} />
            <TogglePill on={o.is_pinned} onToggle={() => patchOpt(o.id, { is_pinned: !o.is_pinned })}>Pinned</TogglePill>
            <Switch on={o.active} onToggle={() => patchOpt(o.id, { active: !o.active })} label="Option on" />
          </RowShell>
        ))}
        {list.length === 0 ? <span style={{ fontSize: 13, color: '#9A9AA6' }}>None yet.</span> : null}
      </div>
      <AddButton onClick={() => add(fieldKey)}>+ Add Choice</AddButton>
    </SectionCard>
  )
}
