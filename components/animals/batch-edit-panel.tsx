'use client'

// The batch-edit popover for the Animals report: pick ONE animal field and a
// value, and it's set on every selected animal. The field list and the value
// choices are exactly the single-animal edit set (the shared AnimalAttributes
// card + quick notes + the free note) — loaded from the same capture bootstrap,
// so batch edit never offers a field the chute/edit screens don't. One field per
// apply; the writing and the guardrails live in updateAnimalsBatch.

import { useEffect, useMemo, useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { createClient } from '@/lib/supabase/client'
import { fetchCaptureBootstrap } from '@/lib/capture/queries'
import type { CaptureBootstrap } from '@/lib/capture/types'
import type { BatchField } from '@/app/(office)/animals/actions'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type FieldDef = { key: BatchField; label: string; kind: 'option' | 'text' }
const FIELDS: FieldDef[] = [
  { key: 'color', label: 'Color', kind: 'option' },
  { key: 'breed', label: 'Breed', kind: 'option' },
  { key: 'age_designation', label: 'Age', kind: 'option' },
  { key: 'preg_status', label: 'Stage', kind: 'option' },
  { key: 'preg_timing', label: 'Month bred', kind: 'option' },
  { key: 'fetal_sex', label: 'Fetal sex', kind: 'option' },
  { key: 'quick_notes', label: 'Quick note', kind: 'option' },
  { key: 'notes', label: 'Note', kind: 'text' },
]

type Choice = { value: string; label: string }

function optionsFor(field: BatchField, b: CaptureBootstrap): Choice[] {
  switch (field) {
    case 'color':
      return b.colorOptions.map((o) => ({ value: o.value, label: o.label }))
    case 'breed':
      return b.breedOptions.map((o) => ({ value: o.value, label: o.label }))
    case 'age_designation':
      return b.ageOptions.map((a) => ({ value: a.designation_value, label: a.age_label }))
    case 'preg_status':
      return b.pregStages.map((s) => ({ value: s.stage_code, label: s.display_label }))
    case 'preg_timing':
      return (b.barn.preg_active_months.length ? b.barn.preg_active_months : MONTHS).map((m) => ({ value: m, label: m }))
    case 'fetal_sex':
      return [
        { value: 'Heifer', label: 'Heifer' },
        { value: 'Bull', label: 'Bull' },
      ]
    case 'quick_notes':
      return b.quickNotes.map((q) => ({ value: q.label, label: q.label }))
    default:
      return []
  }
}

export function BatchEditPanel({
  count,
  busy,
  error,
  onApply,
  onClose,
}: {
  count: number
  busy: boolean
  error: string | null
  onApply: (field: BatchField, value: string) => void
  onClose: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [bootstrap, setBootstrap] = useState<CaptureBootstrap | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  const [field, setField] = useState<BatchField | null>(null)
  const [value, setValue] = useState('') // the chosen option value, or the note text

  useEffect(() => {
    let alive = true
    fetchCaptureBootstrap(supabase)
      .then((b) => {
        if (!alive) return
        if (b) setBootstrap(b)
        else setLoadErr(true)
      })
      .catch(() => {
        if (alive) setLoadErr(true)
      })
    return () => {
      alive = false
    }
  }, [supabase])

  const def = FIELDS.find((f) => f.key === field) ?? null
  const choices = field && def?.kind === 'option' && bootstrap ? optionsFor(field, bootstrap) : []
  const canApply = !!field && value.trim().length > 0 && !busy
  const noun = `${count} animal${count === 1 ? '' : 's'}`

  function pickField(key: BatchField) {
    setField(key)
    setValue('')
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40 }} aria-hidden />
      <div
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          zIndex: 41,
          marginTop: 2,
          width: 280,
          maxHeight: 420,
          overflowY: 'auto',
          background: '#fff',
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          boxShadow: '0 12px 30px rgba(14,38,70,0.18)',
          padding: 12,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: colors.navy, marginBottom: 8 }}>
          Edit {noun}
        </div>

        {loadErr ? (
          <div style={{ fontSize: 13, color: colors.danger, padding: '6px 2px' }}>Couldn’t load the field choices. Try again.</div>
        ) : !bootstrap ? (
          <div style={{ fontSize: 13, color: colors.textMuted, padding: '6px 2px' }}>Loading fields…</div>
        ) : (
          <>
            {/* Field picker */}
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, marginBottom: 6 }}>
              Field
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: field ? 12 : 0 }}>
              {FIELDS.map((f) => {
                const on = field === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => pickField(f.key)}
                    style={chip(on)}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>

            {/* Value control for the chosen field */}
            {field && def?.kind === 'text' && (
              <div>
                <div style={valueLabel}>New note (replaces the note on each)</div>
                <textarea
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Note for these animals"
                  rows={2}
                  style={{ width: '100%', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: colors.textPrimary, resize: 'vertical' }}
                />
              </div>
            )}
            {field && def?.kind === 'option' && (
              <div>
                <div style={valueLabel}>{field === 'quick_notes' ? 'Note to add' : 'Set to'}</div>
                {choices.length === 0 ? (
                  <div style={{ fontSize: 13, color: colors.textMuted }}>No choices set up for this field.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {choices.map((c) => {
                      const on = value === c.value
                      return (
                        <button key={c.value} type="button" onClick={() => setValue(on ? '' : c.value)} style={chip(on)}>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {error && <div style={{ fontSize: 13, color: colors.danger, marginTop: 10 }}>{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={onClose} style={{ ...actionBtn, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy }}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!canApply}
                onClick={() => field && onApply(field, value.trim())}
                style={{ ...actionBtn, background: canApply ? colors.gold : '#EFEFEA', border: `1px solid ${canApply ? colors.gold : colors.border}`, color: colors.navy, cursor: canApply ? 'pointer' : 'default' }}
              >
                {busy ? 'Applying…' : `Apply to ${noun}`}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

const valueLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, marginBottom: 6 }
const actionBtn: React.CSSProperties = { height: 34, padding: '0 12px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 800 }
function chip(on: boolean): React.CSSProperties {
  return {
    height: 32,
    padding: '0 11px',
    borderRadius: 999,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    background: on ? colors.navy : '#fff',
    border: `1px solid ${on ? colors.navy : colors.border}`,
    color: on ? '#fff' : colors.textPrimary,
  }
}
