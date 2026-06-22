'use client'

// The animal's attribute fields (age, breed, color, preg stage, month bred,
// fetal sex), quick notes, and the free note — rendered dynamically from the
// effective barn_field_config for the work type. Shared by the chute Capture
// screen and the full-record edit pop-up so neither hard-codes its own field
// list and both write identical records.

import { useState } from 'react'
import { tagColorHex, isPaleSwatch } from '@/lib/capture/colors'
import { isBredStage, type AnimalDraft, type CaptureBootstrap } from '@/lib/capture/types'
import { fieldRequired, fieldShows, type ResolvedFields } from '@/lib/capture/fields'
import { ChevronDown, ChevronUp, CalendarIcon, PencilIcon, FlagIcon, CheckIcon } from './icons'
import { OptionPicker, type Option } from './sheets'
import { SectionCard } from '@/components/ui/section-card'
import { RequiredMark } from '@/components/ui/required-mark'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Fields inside the white "Fields" card, rendered in resolved sort_order.
const CARD_FIELDS = ['age', 'breed', 'hide_color', 'preg_stage', 'preg_timing', 'fetal_sex'] as const

const fieldLabel = (label: string, hint?: string, requiredEmpty?: boolean) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 8 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{label}</div>
    {hint && <div style={{ fontSize: 12, fontWeight: 500, color: '#9A9AA6' }}>{hint}</div>}
    {requiredEmpty && <RequiredMark />}
  </div>
)

export function AnimalAttributes({
  bootstrap,
  resolved,
  includesPregCheck,
  draft,
  patch,
  quickNotesLeading,
}: {
  bootstrap: CaptureBootstrap
  resolved: ResolvedFields
  includesPregCheck: boolean
  draft: AnimalDraft
  patch: (p: Partial<AnimalDraft>) => void
  quickNotesLeading?: React.ReactNode
}) {
  const [breedExpanded, setBreedExpanded] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)

  const shows = (k: string) => fieldShows(k, { resolved, includesPregCheck, pregStatus: draft.pregStatus })
  const required = (k: string) => fieldRequired(k, resolved)

  const orderedFields = CARD_FIELDS.filter((k) => shows(k)).sort(
    (a, b) => (resolved.get(a)?.sort_order ?? 0) - (resolved.get(b)?.sort_order ?? 0),
  )

  const monthOptions: Option[] = (bootstrap.barn.preg_active_months.length ? bootstrap.barn.preg_active_months : MONTHS).map(
    (m) => ({ id: m, label: m }),
  )

  const toggleNote = (label: string) =>
    patch({
      quickNotes: draft.quickNotes.includes(label)
        ? draft.quickNotes.filter((l) => l !== label)
        : [...draft.quickNotes, label],
    })

  function renderField(key: string) {
    switch (key) {
      case 'age':
        return (
          <div key="age">
            {fieldLabel('Age', 'by tag color', required('age') && !draft.ageDesignation)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bootstrap.ageOptions.map((a) => {
                const selected = draft.ageDesignation === a.designation_value
                const hex = tagColorHex(a.designation_value)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => patch({ ageDesignation: selected ? null : a.designation_value })}
                    style={{ height: 40, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, background: selected ? '#0E2646' : '#FFFFFF', color: selected ? '#FFFFFF' : '#1A1A1A', border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}
                  >
                    <span style={{ width: 13, height: 13, borderRadius: 999, background: hex, border: isPaleSwatch(a.designation_value) ? '1.5px solid #C9C9C4' : '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
                    {a.age_label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      case 'breed':
        return (
          <PillField key="breed" label="Breed" options={bootstrap.breedOptions} value={draft.breed} onPick={(v) => patch({ breed: v })} expanded={breedExpanded} setExpanded={setBreedExpanded} requiredEmpty={required('breed') && !draft.breed} />
        )
      case 'hide_color':
        return (
          <PillField key="hide_color" label="Color" options={bootstrap.colorOptions} value={draft.color} onPick={(v) => patch({ color: v })} expanded={false} setExpanded={() => {}} alwaysAll requiredEmpty={required('hide_color') && !draft.color} />
        )
      case 'preg_stage':
        return (
          <div key="preg_stage">
            {fieldLabel('Stage', undefined, required('preg_stage') && !draft.pregStatus)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bootstrap.pregStages.map((s) => {
                const selected = draft.pregStatus === s.stage_code
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => patch({ pregStatus: selected ? null : s.stage_code, pregTiming: isBredStage(s.stage_code) ? draft.pregTiming : null })}
                    style={{ height: 44, padding: '0 16px', borderRadius: 11, background: selected ? '#0E2646' : '#FFFFFF', color: selected ? '#FFFFFF' : '#1A1A1A', border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {s.display_label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      case 'preg_timing':
        return (
          <div key="preg_timing">
            {fieldLabel('Month Bred', 'shows for a bred stage', required('preg_timing') && !draft.pregTiming)}
            <button
              type="button"
              onClick={() => setMonthOpen(true)}
              style={{ height: 46, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 11, background: '#FFFFFF', border: '1px solid #D4D4D0', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              <CalendarIcon size={17} color="#717182" />
              <span style={{ fontSize: 15, fontWeight: 700, color: draft.pregTiming ? '#1A1A1A' : '#9A9AA6' }}>{draft.pregTiming ?? 'Pick month'}</span>
              <ChevronDown size={16} color="#9A9AA6" />
            </button>
          </div>
        )
      case 'fetal_sex':
        return (
          <div key="fetal_sex">
            {fieldLabel('Fetal Sex', undefined, required('fetal_sex') && !draft.fetalSex)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Heifer', 'Bull'].map((fx) => {
                const selected = draft.fetalSex === fx
                return (
                  <button
                    key={fx}
                    type="button"
                    onClick={() => patch({ fetalSex: selected ? null : fx })}
                    style={{ height: 40, padding: '0 16px', borderRadius: 999, background: selected ? '#0E2646' : '#FFFFFF', color: selected ? '#FFFFFF' : '#1A1A1A', border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {fx}
                  </button>
                )
              })}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      {orderedFields.length > 0 && (
        <SectionCard title="Fields">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{orderedFields.map((k) => renderField(k))}</div>
        </SectionCard>
      )}

      {shows('quick_notes') && (
        <SectionCard title="Quick notes">
          {quickNotesLeading}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {bootstrap.quickNotes.map((q) => {
              const on = draft.quickNotes.includes(q.label)
              const flag = q.is_flag
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleNote(q.label)}
                  style={{ height: 42, padding: on && flag ? '0 13px 0 14px' : '0 16px', display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, background: on ? (flag ? '#FEF3C7' : '#0E2646') : '#FFFFFF', border: `1px solid ${on ? (flag ? '#F59E0B' : '#0E2646') : '#D4D4D0'}`, color: on ? (flag ? '#7A4A06' : '#FFFFFF') : '#1A1A1A', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  {on && flag && <FlagIcon size={13} color="#B45309" sw={2.4} />}
                  {q.label}
                  {on && !flag && <CheckIcon size={15} color="#FFFFFF" sw={2.6} />}
                </button>
              )
            })}
          </div>
        </SectionCard>
      )}

      {shows('notes') &&
        (noteOpen || draft.notes ? (
          <div style={{ background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 14, padding: 12 }}>
            <textarea
              autoFocus
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Note for this animal"
              rows={2}
              style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: '#1A1A1A', background: 'transparent' }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <PencilIcon size={16} color="#9A9AA6" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#9A9AA6' }}>Add a Note</span>
          </button>
        ))}

      <OptionPicker
        open={monthOpen}
        title="Month bred"
        options={monthOptions}
        selectedId={draft.pregTiming}
        onPick={(m) => {
          patch({ pregTiming: m })
          setMonthOpen(false)
        }}
        onClose={() => setMonthOpen(false)}
      />
    </>
  )
}

function PillField({
  label,
  options,
  value,
  onPick,
  expanded,
  setExpanded,
  alwaysAll = false,
  requiredEmpty = false,
}: {
  label: string
  options: { id: string; value: string; label: string; is_pinned: boolean }[]
  value: string | null
  onPick: (v: string | null) => void
  expanded: boolean
  setExpanded: (b: boolean) => void
  alwaysAll?: boolean
  requiredEmpty?: boolean
}) {
  const pinned = options.filter((o) => o.is_pinned)
  const hasMore = options.length > pinned.length
  const shown = alwaysAll || expanded ? options : pinned

  const pill = (o: { id: string; value: string; label: string }) => {
    const selected = value === o.value
    return (
      <button
        key={o.id}
        type="button"
        onClick={() => onPick(selected ? null : o.value)}
        style={{ height: 38, padding: '0 15px', borderRadius: 999, background: selected ? '#0E2646' : '#FFFFFF', color: selected ? '#FFFFFF' : '#1A1A1A', border: `1px solid ${selected ? '#0E2646' : '#D4D4D0'}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
      >
        {o.label}
      </button>
    )
  }

  return (
    <div>
      {fieldLabel(label, undefined, requiredEmpty)}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {shown.map(pill)}
        {!alwaysAll && hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{ height: 38, padding: '0 13px 0 12px', display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, background: '#FFFFFF', color: '#717182', border: '1px dashed #C2C2CA', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {expanded ? 'less' : '+ more'}
            {expanded ? <ChevronUp size={15} color="#717182" sw={2.2} /> : <ChevronDown size={15} color="#717182" sw={2.2} />}
          </button>
        )}
      </div>
    </div>
  )
}
