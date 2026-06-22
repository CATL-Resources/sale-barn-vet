'use client'

// Full-record edit pop-up (and "add missed animal", with an empty form). Renders
// the five identifier fields plus the shared attribute fields, all driven by the
// same effective barn_field_config as Capture, and saves through the same shared
// path. EID is the only hard block (missing required EID, or a duplicate already
// in this pen_work). Observational required fields stay soft. Never writes any
// frozen_*/_total column; keeps head_worked in step with the live count while the
// order is open.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CaptureApi } from '@/lib/capture/use-capture'
import { emptyDraft, type AnimalDraft } from '@/lib/capture/types'
import {
  findDuplicateEid,
  saveAnimalRecord,
  softDeleteAnimal,
  syncHeadWorked,
  type CapturedAnimal,
  type DuplicateHit,
  type IdentifierInput,
  type IdType,
} from '@/lib/capture/save-animal'
import { AnimalAttributes } from './animal-attributes'
import { FlagBanner, FLAG_RED, FLAG_RED_BG, FieldFlagLabel } from './flag'
import { BottomSheet, SheetHeader } from './sheets'
import { RequiredMark } from '@/components/ui/required-mark'

export type EditTarget = { mode: 'add' } | { mode: 'edit'; animal: CapturedAnimal }

function draftFromAnimal(a: CapturedAnimal | null): AnimalDraft {
  if (!a) return emptyDraft()
  return {
    eid: a.eid ?? '',
    eid2: a.eid2 ?? '',
    backTag: a.backTag ?? '',
    visualTag: a.visualTag ?? '',
    metalTag: a.metalTag ?? '',
    color: a.color,
    breed: a.breed,
    ageDesignation: a.age_designation,
    pregStatus: a.preg_status,
    pregTiming: a.preg_timing,
    fetalSex: a.fetal_sex,
    quickNotes: a.quick_notes ?? [],
    notes: a.notes ?? '',
    sortPenId: a.current_pen_id,
  }
}

const TAG_FIELDS: { key: 'backTag' | 'visualTag' | 'metalTag'; fieldKey: string; label: string }[] = [
  { key: 'backTag', fieldKey: 'back_tag', label: 'Back tag' },
  { key: 'visualTag', fieldKey: 'visual_tag', label: 'Tag #' },
  { key: 'metalTag', fieldKey: 'metal_tag', label: 'Metal tag' },
]

export function AnimalEditSheet({
  api,
  target,
  onClose,
  onSaved,
}: {
  api: CaptureApi
  target: EditTarget
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const { bootstrap, batch, resolved } = api
  const animal = target.mode === 'edit' ? target.animal : null

  const [draft, setDraft] = useState<AnimalDraft>(() => draftFromAnimal(animal))
  const [flag, setFlag] = useState<DuplicateHit | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [workComplete, setWorkComplete] = useState(false)

  const patch = (p: Partial<AnimalDraft>) => setDraft((d) => ({ ...d, ...p }))

  useEffect(() => {
    if (!batch) return
    supabase
      .from('pen_work')
      .select('work_complete')
      .eq('id', batch.penWorkId)
      .maybeSingle()
      .then(({ data }) => setWorkComplete(!!data?.work_complete))
  }, [supabase, batch])

  if (!batch) return null

  const off = bootstrap.barn.official_id_type
  const eidOfficial = off === 'EID' || off === 'Both'
  const metalOfficial = off === 'Metal' || off === 'Both'
  const shows = api.shows
  const required = api.required
  const eidRequired = shows('eid') && (required('eid') || eidOfficial)
  const isEid15 = /^\d{15}$/.test(draft.eid.trim())

  async function save() {
    if (!batch) return
    setSaving(true)
    setErr(null)
    try {
      const ev = draft.eid.trim()
      // HARD: official EID must be present and a full 15-digit tag.
      if (eidRequired && !/^\d{15}$/.test(ev)) {
        setErr(ev ? 'EID must be the full 15 digits' : 'Scan or type the EID')
        return
      }
      // HARD: a duplicate EID already in THIS pen_work — refuse, flag, clear it.
      if (ev) {
        const dup = await findDuplicateEid(supabase, {
          barnId: bootstrap.barn.id,
          penWorkId: batch.penWorkId,
          eid: ev,
          excludeAnimalId: animal?.id,
        })
        if (dup) {
          setFlag(dup)
          patch({ eid: '' })
          return
        }
      }

      const identifiers: IdentifierInput[] = []
      const addId = (type: IdType, value: string, official: boolean) => identifiers.push({ type, value, is_official: official })
      if (shows('eid')) addId('eid', draft.eid, eidOfficial)
      addId('secondary_eid', draft.eid2, false)
      if (shows('back_tag')) addId('back_tag', draft.backTag, false)
      if (shows('visual_tag')) addId('visual_tag', draft.visualTag, false)
      if (shows('metal_tag')) addId('metal_tag', draft.metalTag, metalOfficial)

      const res = await saveAnimalRecord(supabase, {
        animalId: animal?.id ?? null,
        animal: {
          barn_id: bootstrap.barn.id,
          sale_day_id: batch.saleDayId,
          pen_work_id: batch.penWorkId,
          animal_type_id: batch.animalTypeId,
          color: shows('hide_color') ? draft.color : null,
          breed: shows('breed') ? draft.breed : null,
          age_value: null,
          age_designation: shows('age') ? draft.ageDesignation : null,
          preg_status: shows('preg_stage') ? draft.pregStatus : null,
          preg_timing: shows('preg_timing') ? draft.pregTiming : null,
          fetal_sex: shows('fetal_sex') ? draft.fetalSex : null,
          quick_notes: draft.quickNotes,
          notes: draft.notes.trim() || null,
          current_pen_id: draft.sortPenId,
        },
        identifiers,
      })
      if (!res.ok) {
        setErr(res.error)
        return
      }
      await syncHeadWorked(supabase, batch.penWorkId)
      await api.refreshWorked()
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!animal || !batch) return
    setSaving(true)
    setErr(null)
    const res = await softDeleteAnimal(supabase, animal.id)
    if (!res.ok) {
      setErr(res.error ?? 'Could not remove the animal')
      setSaving(false)
      return
    }
    await syncHeadWorked(supabase, batch.penWorkId)
    await api.refreshWorked()
    onSaved()
  }

  const idInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    opts?: { flagged?: boolean },
  ) => (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        height: 46,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        borderRadius: 10,
        background: opts?.flagged ? FLAG_RED_BG : '#FFFFFF',
        border: `1px solid ${opts?.flagged ? FLAG_RED : '#D4D4D0'}`,
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: opts?.flagged ? FLAG_RED : '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}
      />
      {opts?.flagged && <FieldFlagLabel text="DUPLICATE" />}
    </div>
  )

  const labelCol = (text: string, star?: boolean) => (
    <div style={{ width: 84, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 3 }}>
      {text}
      {star && <RequiredMark />}
    </div>
  )

  return (
    <BottomSheet open onClose={onClose}>
      <SheetHeader title={target.mode === 'add' ? 'Add animal' : 'Edit animal'} onClose={onClose} />

      <div style={{ overflowY: 'auto', padding: '0 16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {flag && <FlagBanner title="Duplicate tag" detail={`${flag.eid} already worked · ${flag.time} · ${flag.status}`} />}

        {/* identity */}
        <div style={{ background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {shows('eid') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {labelCol('EID', eidRequired && !isEid15)}
              {idInput(draft.eid, (v) => { setFlag(null); patch({ eid: v }) }, 'Scan or type EID', { flagged: !!flag })}
            </div>
          )}
          {shows('eid') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {labelCol('2nd EID')}
              {idInput(draft.eid2, (v) => patch({ eid2: v }), 'Optional · 900-series')}
            </div>
          )}
          {TAG_FIELDS.filter((t) => shows(t.fieldKey)).map((t) => (
            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {labelCol(t.label, required(t.fieldKey) && !draft[t.key].trim())}
              {idInput(draft[t.key], (v) => patch({ [t.key]: v } as Partial<AnimalDraft>), `Type the ${t.label.toLowerCase()}`)}
            </div>
          ))}
        </div>

        {/* shared attribute fields (config-driven) */}
        <AnimalAttributes
          bootstrap={bootstrap}
          resolved={resolved}
          includesPregCheck={batch.includesPregCheck}
          draft={draft}
          patch={patch}
        />

        {err && <div style={{ fontSize: 13, fontWeight: 700, color: FLAG_RED }}>{err}</div>}

        {target.mode === 'edit' && (
          <button
            type="button"
            disabled={saving || workComplete}
            onClick={() => void remove()}
            style={{ height: 46, borderRadius: 11, background: '#FFFFFF', border: `1px solid ${workComplete ? '#E4E4DE' : '#E2B4B4'}`, color: workComplete ? '#9A9AA6' : FLAG_RED, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: saving || workComplete ? 'default' : 'pointer' }}
          >
            {workComplete ? 'Remove (locked — office handles a finished order)' : 'Remove animal'}
          </button>
        )}
      </div>

      <div style={{ flexShrink: 0, background: '#FFFFFF', borderTop: '1px solid #E4E4DE', padding: '12px 16px 20px' }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          style={{ width: '100%', height: 54, borderRadius: 13, background: '#F3D12A', color: '#0E2646', border: 'none', fontFamily: 'inherit', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </BottomSheet>
  )
}
