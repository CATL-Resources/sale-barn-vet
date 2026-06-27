'use client'

// Full-record edit pop-up (and "add missed animal", with an empty form). Renders
// the five identifier fields plus the shared attribute fields, all driven by the
// same effective barn_field_config as Capture, and saves through the same shared
// path. Hard blocks: a missing/duplicate required EID, and any other shown
// required field left blank (same rule as the chute). Never writes any
// frozen_*/_total column; keeps head_worked in step with the live count while the
// order is open.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CaptureApi } from '@/lib/capture/use-capture'
import { emptyDraft, type AnimalDraft } from '@/lib/capture/types'
import { missingRequiredLabels } from '@/lib/capture/fields'
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
import { useOnScreenKeyboard } from '@/lib/capture/use-onscreen-keyboard'
import { useScanRouter } from '@/lib/capture/use-scan-router'
import { isBackTag, isEid } from '@/lib/capture/scan-format'
import { AnimalAttributes } from './animal-attributes'
import { OnScreenKeyboard } from './onscreen-keyboard'
import { FlagBanner, FLAG_RED, FLAG_RED_BG, FieldFlagLabel } from './flag'
import { BottomSheet, SheetHeader } from './sheets'
import { AlertIcon, KeyboardIcon } from './icons'
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
  // Two-step guard for Remove: the first tap only arms it, the second confirms.
  // So a single mis-tap can never wipe an animal.
  const [confirmRemove, setConfirmRemove] = useState(false)
  // Which EID field a scan fills (the user taps to aim). Back tags route by shape.
  const [scanTarget, setScanTarget] = useState<'eid' | 'eid2'>('eid')

  const patch = (p: Partial<AnimalDraft>) => setDraft((d) => ({ ...d, ...p }))

  // The app's own on-screen keyboard — same one the chute capture loop uses. A
  // paired EID wand is a Bluetooth keyboard, so iOS hides its soft keyboard;
  // without this there's no way to type a note or tag in the edit sheet. It types
  // into whichever field below has focus (the EID/tag inputs and the note).
  const kbd = useOnScreenKeyboard()

  // While the sheet is open, the SAME Part A scan engine fills its fields. Tap the
  // EID, 2nd EID, or back-tag field to aim, then scan: a back tag routes by shape
  // to the back-tag field, an EID lands in whichever EID field is the active
  // target, and the duplicate guard still fires on a full EID. The capture
  // screen's own scan listener is off while this sheet is open, so only one runs.
  const routeSheetScan = (raw: string) => {
    if (!batch) return
    const code = raw.trim()
    if (!code) return
    setErr(null)
    if (isBackTag(code)) {
      if (api.shows('back_tag')) { setFlag(null); patch({ backTag: code.toUpperCase() }) }
      return
    }
    if (isEid(code)) {
      if (scanTarget === 'eid2') {
        patch({ eid2: code })
      } else {
        setFlag(null)
        patch({ eid: code })
        void guardEid(code)
      }
      return
    }
    setErr('Unrecognized scan — rescan')
  }
  useScanRouter(routeSheetScan, true)

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
      // A lookup error (dup.failed) is NOT treated as all-clear: it's logged by
      // findDuplicateEid and we save anyway (never block), rather than silently
      // assuming no duplicate.
      if (ev) {
        const dup = await findDuplicateEid(supabase, {
          barnId: bootstrap.barn.id,
          penWorkId: batch.penWorkId,
          eid: ev,
          excludeAnimalId: animal?.id,
        })
        if (dup.hit) {
          setFlag(dup.hit)
          patch({ eid: '' })
          return
        }
      }
      // HARD: every shown required field must be filled (same rule as the chute).
      const missing = missingRequiredLabels(resolved, draft)
      if (missing.length) {
        setErr(missing.length === 1 ? `${missing[0]} is required` : `Required: ${missing.join(', ')}`)
        return
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

  // The shared duplicate guard, fired the moment a full EID settles from typing
  // or a scan: a duplicate already on THIS pen_work flags at once and the value
  // is cleared, so it can't be left in the field and saved (which would count and
  // bill the same head twice). The same EID under a different work order is fine.
  async function guardEid(value: string): Promise<void> {
    if (!batch) return
    const v = value.trim()
    if (!/^\d{15}$/.test(v)) return
    const dup = await findDuplicateEid(supabase, {
      barnId: bootstrap.barn.id,
      penWorkId: batch.penWorkId,
      eid: v,
      excludeAnimalId: animal?.id,
    })
    if (dup.hit) {
      setFlag(dup.hit)
      patch({ eid: '' })
    }
    // A failed check stays advisory here — the Save step decides; we never clear
    // the field on an error.
  }

  const idInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    bindKey: string,
    opts?: { flagged?: boolean; onFocus?: () => void },
  ) => {
    const bind = kbd.bind(bindKey, value, onChange)
    return (
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
          {...bind}
          onFocus={() => { bind.onFocus(); opts?.onFocus?.() }}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: opts?.flagged ? FLAG_RED : '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}
        />
        {opts?.flagged && <FieldFlagLabel text="DUPLICATE" />}
      </div>
    )
  }

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

        {/* Remove sits at the TOP, far from Save, and asks before it deletes, so
            a single mis-tap can't wipe an animal. A finished order is locked —
            the office handles those. */}
        {target.mode === 'edit' &&
          (workComplete ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: '8px 12px', borderRadius: 11, background: '#F5F5F0', border: '1px solid #E4E4DE', color: '#9A9AA6', fontSize: 12.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.25 }}>
              Remove is locked — the office handles a finished order
            </div>
          ) : confirmRemove ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 12, borderRadius: 12, background: FLAG_RED_BG, border: `1px solid ${FLAG_RED}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertIcon size={18} color={FLAG_RED} />
                <span style={{ fontSize: 14, fontWeight: 800, color: FLAG_RED }}>Remove this animal?</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8A3B3B', lineHeight: 1.3 }}>
                This takes the record out of this batch and drops the head count by one.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmRemove(false)}
                  style={{ flex: 1, minHeight: 44, borderRadius: 11, background: '#FFFFFF', border: '1px solid #D4D4D0', color: '#1A1A1A', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void remove()}
                  style={{ flex: 1, minHeight: 44, borderRadius: 11, background: FLAG_RED, border: `1px solid ${FLAG_RED}`, color: '#FFFFFF', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmRemove(true)}
              style={{ alignSelf: 'flex-start', minHeight: 44, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, background: '#FFFFFF', border: '1px solid #E2B4B4', color: FLAG_RED, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}
            >
              Remove animal
            </button>
          ))}

        {/* identity */}
        <div style={{ background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {shows('eid') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {labelCol('EID', eidRequired && !isEid15)}
              {idInput(draft.eid, (v) => { setFlag(null); patch({ eid: v }); void guardEid(v) }, 'Scan or type EID', 'eid', { flagged: !!flag, onFocus: () => setScanTarget('eid') })}
            </div>
          )}
          {shows('eid') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {labelCol('2nd EID')}
              {idInput(draft.eid2, (v) => patch({ eid2: v }), 'Optional · 900-series', 'eid2', { onFocus: () => setScanTarget('eid2') })}
            </div>
          )}
          {TAG_FIELDS.filter((t) => shows(t.fieldKey)).map((t) => (
            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {labelCol(t.label, required(t.fieldKey) && !draft[t.key].trim())}
              {idInput(draft[t.key], (v) => patch({ [t.key]: v } as Partial<AnimalDraft>), `Type the ${t.label.toLowerCase()}`, t.key, { onFocus: () => setScanTarget('eid') })}
            </div>
          ))}
        </div>

        {/* shared attribute fields (config-driven) — the note binds to the same
            app keyboard so it can be typed with a wand paired. */}
        <AnimalAttributes
          bootstrap={bootstrap}
          resolved={resolved}
          draft={draft}
          patch={patch}
          bindKeyboard={kbd.bind}
        />

        {err && <div style={{ fontSize: 13, fontWeight: 700, color: FLAG_RED }}>{err}</div>}
      </div>

      <div style={{ flexShrink: 0, background: '#FFFFFF', borderTop: '1px solid #E4E4DE', padding: kbd.open ? '12px 16px' : '12px 16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={kbd.toggle}
          aria-label={kbd.open ? 'Hide on-screen keyboard' : 'Show on-screen keyboard'}
          aria-pressed={kbd.open}
          style={{ flexShrink: 0, width: 54, height: 54, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 13, background: kbd.open ? '#0E2646' : '#F5F5F0', border: `1px solid ${kbd.open ? '#0E2646' : '#D4D4D0'}`, cursor: 'pointer' }}
        >
          <KeyboardIcon size={24} color={kbd.open ? '#FFFFFF' : '#0E2646'} sw={1.9} />
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          style={{ flex: 1, height: 54, borderRadius: 13, background: '#F3D12A', color: '#0E2646', border: 'none', fontFamily: 'inherit', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {kbd.open && (
        <OnScreenKeyboard onInsert={kbd.insert} onBackspace={kbd.backspace} onDone={kbd.dismiss} />
      )}
    </BottomSheet>
  )
}
