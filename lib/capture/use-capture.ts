'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { upsertPen } from '@/lib/work-orders/pens'
import type { TablesInsert } from '@/types/supabase'
import {
  emptyDraft,
  isBredStage,
  type AnimalDraft,
  type BatchInfo,
  type CaptureBootstrap,
  type SortPen,
} from './types'
import { applyPenDefaults, draftWithDefaults, fieldRequired, fieldShows, missingRequiredLabels, resolveFields, type PenFieldDefaults } from './fields'
import { isEid, isBackTag } from './scan-format'
import {
  findDuplicateEid,
  saveAnimalRecord,
  timeLabel,
  type DuplicateCheck,
  type DuplicateHit,
  type IdentifierInput,
  type IdType,
} from './save-animal'

export type ToastKind = 'error' | 'warn' | 'success'
export type ToastMsg = { kind: ToastKind; message: string } | null

export type StartBatchInput = {
  saleDayId: string | null
  penId: string | null
  penNumber: string | null
  workTypeId: string
  sellerPartyId: string | null
  sellerName: string
  headStarted: number | null
}

function errMsg(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return fallback
}

const FIELD_LABELS: Record<string, string> = {
  eid: 'EID',
  back_tag: 'Back tag',
  visual_tag: 'Tag #',
  metal_tag: 'Metal tag',
  age: 'Age',
  breed: 'Breed',
  hide_color: 'Color',
  preg_stage: 'Preg status',
  preg_timing: 'Month bred',
  fetal_sex: 'Fetal sex',
}

type ResolvedField = {
  is_displayed: boolean
  is_required: boolean
  sort_order: number
  display_label: string | null
  default_value: string | null
}

export type Step = 'start' | 'capture'

export function useCapture(
  bootstrap: CaptureBootstrap,
  userId: string | null,
  // When present, open already bound to an existing work order's batch (the
  // chute Barn Work List hands this in) instead of the new-batch start flow.
  initial?: { batch: BatchInfo; worked: number },
  // The office's per-pen capture defaults for the bound pen (pen_session
  // .field_defaults). Seeded into every new-animal draft for THIS pen only.
  penDefaults?: PenFieldDefaults,
) {
  const supabase = useMemo(() => createClient(), [])
  const barnId = bootstrap.barn.id

  // The pen these office defaults belong to. They may only ever seed a draft for
  // THIS pen — never another. Two things keep that true: the capture screen is
  // re-keyed per pen (opening a different pen remounts this hook with clean state
  // and that pen's own defaults), and penDefaultsForBatch re-checks the pen at
  // apply time, so even an in-session batch switch can't carry them across.
  const initialPenWorkId = initial?.batch.penWorkId ?? null
  const penDefaultsForBatch = useCallback(
    (b: BatchInfo | null): PenFieldDefaults | undefined =>
      b && b.penWorkId === initialPenWorkId ? penDefaults : undefined,
    [initialPenWorkId, penDefaults],
  )

  const [step, setStep] = useState<Step>(initial ? 'capture' : 'start')
  const [batch, setBatch] = useState<BatchInfo | null>(initial?.batch ?? null)
  // A bound batch opens straight on Capture, so seed the first draft with the
  // work type's field defaults plus the office's per-pen defaults — only ever for
  // the pen they belong to; else blank.
  const [draft, setDraft] = useState<AnimalDraft>(() =>
    initial
      ? applyPenDefaults(draftWithDefaults(resolveFields(bootstrap.fields, initial.batch.workTypeId)), penDefaultsForBatch(initial.batch))
      : emptyDraft(),
  )
  const [worked, setWorked] = useState(initial?.worked ?? 0)
  const [sorted, setSorted] = useState(0)
  const [stageTally, setStageTally] = useState<Record<string, number>>({})
  const [sortPens, setSortPens] = useState<SortPen[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastMsg>(null)
  // Bumped whenever a scan fills an identifier, so the form can move the cursor
  // to the first empty field for manual entry.
  const [focusTick, setFocusTick] = useState(0)
  // The secondary-EID slot is off the normal flow: it only appears (and catches
  // non-840 EID scans) once the operator opens it on the rare two-EID cow.
  const [secondaryEidOpen, setSecondaryEidOpen] = useState(false)
  // The duplicate-tag flag (the red banner). Set when an EID already worked in
  // this pen_work is entered; cleared on the next fresh scan or a good save.
  const [flag, setFlag] = useState<DuplicateHit | null>(null)
  const clearFlag = useCallback(() => setFlag(null), [])

  // EIDs already worked in this batch, kept in memory so a re-scan is flagged
  // INSTANTLY (no database round-trip) — by the time a query returned, the cow
  // could be down the alley. Updated on every save, seeded when a batch opens or
  // the animal list changes. The database check still runs as a backstop.
  const workedEids = useRef<Map<string, { time: string; status: string }>>(new Map())
  const localDuplicate = useCallback((value: string): DuplicateHit | null => {
    const hit = workedEids.current.get(value.trim())
    return hit ? { eid: value.trim(), time: hit.time, status: hit.status } : null
  }, [])

  const flash = useCallback((kind: ToastKind, message: string) => {
    setToast({ kind, message })
    if (kind !== 'warn') window.setTimeout(() => setToast(null), 3200)
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const patchDraft = useCallback((fields: Partial<AnimalDraft>) => {
    setDraft((d) => ({ ...d, ...fields }))
  }, [])

  // Live mirror of the entered EIDs, updated synchronously the instant a scan
  // routes — React state from a first wand read may not have re-rendered before a
  // second read fires right behind it, so reading draft.eid from routeScan's
  // closure can be stale. routeScan reads and writes these instead, so two
  // back-to-back EID scans never both land on the primary slot (clipping one).
  const liveEid = useRef(draft.eid)
  const liveEid2 = useRef(draft.eid2)
  useEffect(() => {
    liveEid.current = draft.eid
    liveEid2.current = draft.eid2
  }, [draft.eid, draft.eid2])

  // Effective field config for the active work type — the barn-wide rows overlaid
  // with this work type's overrides. Shared with the edit pop-up (lib/capture/fields).
  const resolved = useMemo(
    () => resolveFields(bootstrap.fields, batch?.workTypeId ?? null),
    [bootstrap.fields, batch],
  )

  // Which fields show / are required — shared helpers so Capture and the pop-up
  // agree. Display comes purely from the resolved config (no includes_preg_check).
  const shows = useCallback(
    (key: string): boolean => {
      if (!batch) return false
      return fieldShows(key, { resolved, pregStatus: draft.pregStatus })
    },
    [batch, resolved, draft.pregStatus],
  )

  const required = useCallback((key: string): boolean => fieldRequired(key, resolved), [resolved])

  // The barn's official ID (EID here). It's an identifier, so when it's the
  // official ID it HARD-BLOCKS the save — you can't record an animal with no
  // official tag. EID barn -> eid; Metal -> metal_tag; Both -> both.
  const officialIdKeys = useMemo(() => {
    const t = bootstrap.barn.official_id_type
    const keys = new Set<string>()
    if (t === 'EID' || t === 'Both') keys.add('eid')
    if (t === 'Metal' || t === 'Both') keys.add('metal_tag')
    return keys
  }, [bootstrap.barn.official_id_type])

  // EID is hard-required when it's shown and either marked required or it's the
  // barn's official ID.
  const eidRequired = useCallback(
    (): boolean => shows('eid') && (required('eid') || officialIdKeys.has('eid')),
    [shows, required, officialIdKeys],
  )

  const fieldLabel = useCallback(
    (key: string): string => resolved.get(key)?.display_label || FIELD_LABELS[key] || key,
    [resolved],
  )

  const loadSortPens = useCallback(
    async (saleDayId: string) => {
      const { data, error } = await supabase
        .from('animal')
        .select('current_pen_id, pen:pen!animal_current_pen_id_fkey(id,pen_number)')
        .eq('sale_day_id', saleDayId)
        .not('current_pen_id', 'is', null)
        .is('deleted_at', null)
      if (error) return
      const byPen = new Map<string, SortPen>()
      for (const row of (data ?? []) as Array<{
        current_pen_id: string | null
        pen: { id: string; pen_number: string } | null
      }>) {
        if (!row.pen) continue
        const found = byPen.get(row.pen.id)
        if (found) found.count += 1
        else byPen.set(row.pen.id, { id: row.pen.id, pen_number: row.pen.pen_number, count: 1 })
      }
      setSortPens(Array.from(byPen.values()).sort((a, b) => a.pen_number.localeCompare(b.pen_number)))
    },
    [supabase],
  )

  // When opened already bound to a work order, load that day's sort pens once.
  const boundLoaded = useRef(false)
  useEffect(() => {
    if (initial && !boundLoaded.current) {
      boundLoaded.current = true
      void loadSortPens(initial.batch.saleDayId)
    }
  }, [initial, loadSortPens])

  const resolveSaleDay = useCallback(
    async (saleDayId: string | null): Promise<string> => {
      if (saleDayId) return saleDayId
      const today = bootstrap.today
      const { data: existing } = await supabase
        .from('sale_day')
        .select('id')
        .eq('barn_id', barnId)
        .eq('sale_date', today)
        .is('deleted_at', null)
        .maybeSingle()
      if (existing) return existing.id
      const { data: created, error } = await supabase
        .from('sale_day')
        .insert({ barn_id: barnId, sale_date: today, status: 'open' })
        .select('id')
        .single()
      if (error || !created) throw error ?? new Error('Could not start the sale day')
      return created.id
    },
    [supabase, barnId, bootstrap.today],
  )

  const startBatch = useCallback(
    async (input: StartBatchInput): Promise<boolean> => {
      setSaving(true)
      try {
        const saleDayId = await resolveSaleDay(input.saleDayId)

        let penId = input.penId
        let penNumber = input.penNumber
        if (!penId && input.penNumber && input.penNumber.trim()) {
          penId = await upsertPen(supabase, barnId, saleDayId, input.penNumber.trim())
          penNumber = input.penNumber.trim()
        } else if (penId) {
          penNumber = bootstrap.pens.find((p) => p.id === penId)?.pen_number ?? penNumber
        }

        let sellerPartyId = input.sellerPartyId
        let sellerName = input.sellerName
        if (!sellerPartyId) {
          const name = input.sellerName.trim()
          if (!name) {
            flash('warn', 'Pick or add a consignor first')
            return false
          }
          const { data: party, error: pe } = await supabase
            .from('party')
            .insert({ barn_id: barnId, name })
            .select('id,name')
            .single()
          if (pe || !party) throw pe ?? new Error('Could not add consignor')
          sellerPartyId = party.id
          sellerName = party.name
        }

        const wt = bootstrap.workTypes.find((w) => w.id === input.workTypeId)
        if (!wt) {
          flash('warn', 'Pick a work type first')
          return false
        }

        const insert: TablesInsert<'pen_work'> = {
          barn_id: barnId,
          sale_day_id: saleDayId,
          pen_id: penId,
          work_type_id: input.workTypeId,
          seller_party_id: sellerPartyId,
          head_started: input.headStarted,
          origin: 'chute',
          created_by: userId,
        }
        const { data: created, error } = await supabase
          .from('pen_work')
          .insert(insert)
          .select('id')
          .single()
        if (error || !created) throw error ?? new Error('Could not start the batch')

        setBatch({
          penWorkId: created.id,
          saleDayId,
          penId,
          penNumber,
          workTypeId: wt.id,
          workTypeName: wt.name,
          includesPregCheck: wt.includes_preg_check,
          sellerPartyId,
          sellerName,
          animalTypeId: null,
          headStarted: input.headStarted,
          headExpected: null,
        })
        setWorked(0)
        setSorted(0)
        setStageTally({})
        setDraft(draftWithDefaults(resolveFields(bootstrap.fields, wt.id)))
        await loadSortPens(saleDayId)
        setStep('capture')
        return true
      } catch (e) {
        flash('error', errMsg(e, 'Could not start the batch'))
        return false
      } finally {
        setSaving(false)
      }
    },
    [supabase, barnId, userId, bootstrap.pens, bootstrap.workTypes, bootstrap.fields, resolveSaleDay, loadSortPens, flash],
  )

  // Sort allocation — shared, all-day pens.
  const clearSort = useCallback(() => patchDraft({ sortPenId: null }), [patchDraft])
  const chooseSortPen = useCallback((penId: string) => patchDraft({ sortPenId: penId }), [patchDraft])

  const createSortPen = useCallback(
    async (rawNumber: string): Promise<void> => {
      if (!batch) return
      const number = rawNumber.trim() || `Sort ${sortPens.length + 1}`
      try {
        const penId = await upsertPen(supabase, barnId, batch.saleDayId, number)
        setSortPens((prev) =>
          prev.some((p) => p.id === penId) ? prev : [...prev, { id: penId, pen_number: number, count: 0 }],
        )
        patchDraft({ sortPenId: penId })
      } catch (e) {
        flash('error', errMsg(e, 'Could not make the sort pen'))
      }
    },
    [supabase, barnId, batch, sortPens.length, patchDraft, flash],
  )

  const toggleQuickNote = useCallback(
    (label: string) => {
      setDraft((d) => ({
        ...d,
        quickNotes: d.quickNotes.includes(label)
          ? d.quickNotes.filter((l) => l !== label)
          : [...d.quickNotes, label],
      }))
    },
    [],
  )

  // Required means required: any shown field marked required must be filled
  // before a record saves (see missingRequiredLabels). The official EID has its
  // own stricter rule — it must also be a full 15-digit tag.

  // Is this EID already on another non-deleted animal in THIS pen_work? Returns
  // the worked-already detail for the flag banner, or null. (A match under a
  // DIFFERENT work order is allowed and is NOT flagged.)
  const checkDuplicate = useCallback(
    async (value: string): Promise<DuplicateCheck> => {
      if (!batch) return { hit: null, failed: false }
      return findDuplicateEid(supabase, { barnId, penWorkId: batch.penWorkId, eid: value })
    },
    [supabase, barnId, batch],
  )

  // Insert the current record via the shared save path (identical to the edit
  // pop-up). No required check, no form reset — callers handle those so a scan
  // can roll straight into the next cow.
  const buildAndInsert = useCallback(
    async (eidValue: string): Promise<boolean> => {
      if (!batch || saving) return false
      setSaving(true)
      try {
        const off = bootstrap.barn.official_id_type
        const identifiers: IdentifierInput[] = []
        const addId = (type: IdType, value: string, official: boolean) => {
          if (value.trim()) identifiers.push({ type, value, is_official: official })
        }
        if (shows('eid')) addId('eid', eidValue, off === 'EID' || off === 'Both')
        // A second EID (e.g. a non-840 / 900-series tag) — non-official, saved
        // only when the operator opened the slot and filled it.
        addId('secondary_eid', draft.eid2, false)
        if (shows('back_tag')) addId('back_tag', draft.backTag, false)
        if (shows('visual_tag')) addId('visual_tag', draft.visualTag, false)
        if (shows('metal_tag')) addId('metal_tag', draft.metalTag, off === 'Metal' || off === 'Both')

        const res = await saveAnimalRecord(supabase, {
          animal: {
            barn_id: barnId,
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
            created_by: userId,
          },
          identifiers,
        })
        if (!res.ok) throw new Error(res.error)

        // Remember this EID so a re-scan is flagged instantly.
        const savedEid = eidValue.trim()
        if (shows('eid') && savedEid) {
          workedEids.current.set(savedEid, { time: timeLabel(new Date().toISOString()), status: 'Open' })
        }

        // Freeze the started count on the first animal of a bound office order
        // whose head was never set. We set head_started from the office's
        // expected head so the order reads "in progress". The ".is(head_started,
        // null)" guard means we never overwrite a count that's already there, and
        // we never touch the frozen charge columns (the office froze the bill at
        // order creation). For chute-started batches headExpected is null, so this
        // is skipped.
        if (batch.headStarted == null && batch.headExpected != null) {
          const frozen = batch.headExpected
          await supabase
            .from('pen_work')
            .update({ head_started: frozen })
            .eq('id', batch.penWorkId)
            .is('head_started', null)
          setBatch((b) => (b ? { ...b, headStarted: frozen } : b))
        }

        setWorked((w) => w + 1)
        if (shows('preg_stage') && draft.pregStatus) {
          const code = draft.pregStatus
          setStageTally((t) => ({ ...t, [code]: (t[code] ?? 0) + 1 }))
        }
        if (draft.sortPenId) {
          const penId = draft.sortPenId
          setSorted((s) => s + 1)
          setSortPens((prev) => prev.map((p) => (p.id === penId ? { ...p, count: p.count + 1 } : p)))
        }
        flash('success', 'Saved')
        return true
      } catch (e) {
        flash('error', errMsg(e, 'Could not save — try again'))
        return false
      } finally {
        setSaving(false)
      }
    },
    [batch, saving, bootstrap.barn.official_id_type, barnId, draft, userId, shows, supabase, flash],
  )

  /**
   * Deliberate Save & next. Hard-block on a missing or duplicate official EID,
   * then on any other shown required field left blank; then save and open a
   * fresh record.
   */
  const saveNext = useCallback(
    async (eidOverride?: string): Promise<boolean> => {
      if (!batch) return false
      const ev = (eidOverride ?? draft.eid).trim()
      // HARD: the official EID is an identifier — no animal saves without a real
      // one, and it has to be a full 15-digit tag (catches a mistyped EID).
      if (eidRequired() && !/^\d{15}$/.test(ev)) {
        flash('error', ev ? 'EID must be the full 15 digits' : 'Scan or type the EID before saving')
        return false
      }
      // HARD: a duplicate official EID already worked in THIS pen_work — refuse,
      // raise the flag, and CLEAR the entered value so it isn't left in the field.
      // (The same EID under a different work order is fine and flows through.)
      let checkFailed = false
      if (ev) {
        const local = localDuplicate(ev)
        if (local) {
          setFlag(local)
          patchDraft({ eid: '' })
          return false
        }
        const res = await checkDuplicate(ev)
        if (res.hit) {
          setFlag(res.hit)
          patchDraft({ eid: '' })
          return false
        }
        // The lookup errored — we could NOT confirm this isn't a duplicate. We
        // still save (never block the chute), but we must NOT treat the error as
        // an all-clear; note it after the save so the operator knows to spot-check.
        checkFailed = res.failed
      }
      // HARD: every shown field marked "required" must be filled before the
      // record saves — not just the EID. A blank required field stops the save
      // and names the first one missing.
      const missing = missingRequiredLabels(resolved, draft)
      if (missing.length) {
        flash('error', missing.length === 1 ? `${missing[0]} is required before saving` : `Required before saving: ${missing.join(', ')}`)
        return false
      }
      const ok = await buildAndInsert(ev)
      if (ok) {
        setFlag(null)
        if (checkFailed) flash('warn', 'Couldn’t check for duplicates — saved anyway')
        // Re-seed for the next animal: config defaults, plus the pen's office
        // defaults — but only when the batch being worked is still the pen they
        // were set for (re-derived here, never carried from another pen).
        setDraft(applyPenDefaults(draftWithDefaults(resolved), penDefaultsForBatch(batch)))
        setSecondaryEidOpen(false)
      }
      return ok
    },
    [batch, draft, eidRequired, localDuplicate, checkDuplicate, buildAndInsert, patchDraft, resolved, flash, penDefaultsForBatch],
  )

  // Manual EID entry (typed into the EID box, not scanned). Fill and wait, same
  // hard refuse on a duplicate. Shape isn't checked here — the operator typed it
  // straight into the EID field on purpose.
  const commitEid = useCallback(
    async (value: string): Promise<void> => {
      if (!batch) return
      const v = value.trim()
      if (!v || v === draft.eid.trim()) return
      const local = localDuplicate(v)
      if (local) {
        setFlag(local)
        patchDraft({ eid: '' })
        return
      }
      const res = await checkDuplicate(v)
      if (res.hit) {
        setFlag(res.hit)
        patchDraft({ eid: '' })
        return
      }
      // A failed check (res.failed) is left to the Save step to surface — the
      // entry pre-check stays advisory and never clears or blocks the field.
      setFlag(null)
      patchDraft({ eid: v })
      setFocusTick((n) => n + 1)
    },
    [batch, draft.eid, localDuplicate, checkDuplicate, patchDraft],
  )

  /**
   * A screen-level scan, sorted by what it looks like — not by which field has
   * focus, so the operator never has to put the cursor anywhere first. It fills
   * the right field right away and WAITS (never auto-submits):
   *   - 15 digits starting 840        -> primary EID
   *   - 15 digits NOT starting 840    -> a second EID — only once the 2nd slot is
   *                                      open (otherwise nudge them to open it)
   *   - with the 2nd-EID slot open    -> EIDs fill in order, primary then second,
   *                                      so a cow wearing two 840 tags works too
   *   - anything else (e.g. 46MA1234) -> back tag barcode
   * The duplicate check runs in the background so the tag shows instantly; the
   * Save step still hard-refuses a real duplicate.
   */
  // After a scan fills the primary EID: flag a duplicate. The in-memory check is
  // instant (so the banner is up before the cow moves); the database check is a
  // backstop for tags worked on another device or before the set was seeded.
  const flagIfDuplicate = useCallback(
    async (value: string): Promise<void> => {
      const local = localDuplicate(value)
      if (local) {
        setFlag(local)
        patchDraft({ eid: '' })
        return
      }
      const res = await checkDuplicate(value)
      if (res.hit) {
        setFlag(res.hit)
        patchDraft({ eid: '' })
      }
      // A failed check is left to the Save step to surface; the scan pre-check
      // stays advisory and never clears the field on an error.
    },
    [localDuplicate, checkDuplicate, patchDraft],
  )

  const routeScan = useCallback(
    async (raw: string): Promise<void> => {
      if (!batch) return
      const code = raw.trim()
      if (!code) return
      // A fresh scan clears any leftover message and the duplicate flag.
      setToast(null)
      setFlag(null)

      // The scan router hands us ONE complete tag at a time — it commits the
      // moment a burst forms a whole shape, so a back tag and an EID scanned
      // together arrive here as two separate calls, each landing in its own
      // field. We just route by shape:
      //   - 8-char back tag (2 digits, 2 letters, 4 digits)  -> back-tag field
      //   - 15-digit EID                                     -> EID slot logic
      //   - neither (a garbled or two-wand-interleaved read) -> re-scan flag
      // A read that's neither shape is never dumped into a field or truncated.
      if (isBackTag(code)) {
        // Store the back tag in its canonical upper-case form (46MA1234).
        patchDraft({ backTag: code.toUpperCase() })
        setFocusTick((n) => n + 1)
        return
      }

      if (!isEid(code)) {
        flash('warn', `Unrecognized scan — rescan (${code})`)
        return
      }

      // A 15-digit EID. Live refs so two reads back-to-back don't both land on
      // the primary slot.
      const value = code
      if (value === liveEid.current.trim() || value === liveEid2.current.trim()) return
      const is840 = value.startsWith('840')

      if (secondaryEidOpen) {
        // Slot open: an 840 fills the primary if it's empty, else the second.
        if (!liveEid.current.trim() && is840) {
          liveEid.current = value
          patchDraft({ eid: value })
          setFocusTick((n) => n + 1)
          void flagIfDuplicate(value)
        } else {
          liveEid2.current = value
          patchDraft({ eid2: value })
          setFocusTick((n) => n + 1)
        }
      } else if (is840) {
        liveEid.current = value
        patchDraft({ eid: value })
        setFocusTick((n) => n + 1)
        void flagIfDuplicate(value)
      } else {
        // 15 digits but NOT an official 840 tag — flag it at once (Warn, never
        // blocks the save).
        flash('warn', 'That EID doesn’t start with 840 — open “2nd EID” if it’s a second tag')
      }
    },
    [batch, secondaryEidOpen, patchDraft, flash, flagIfDuplicate],
  )

  const closeBatch = useCallback(async (): Promise<boolean> => {
    if (!batch) return false
    setSaving(true)
    try {
      // Look at the order's current state before writing. Finishing is a
      // ONE-TIME event: the first close records the head count and freezes the
      // price. Closing again (after the office reopened it) must NOT overwrite
      // either — re-doing a finish is never a do-over of the count or the rate.
      const { data: current, error: readErr } = await supabase
        .from('pen_work')
        .select('work_complete, frozen_vet_charge')
        .eq('id', batch.penWorkId)
        .maybeSingle()
      if (readErr) throw readErr

      if (current?.work_complete) {
        // Already finished — leave head_worked and the frozen price untouched.
      } else if (current?.frozen_vet_charge != null) {
        // Was finished before, then reopened: re-mark complete only. The head
        // count and frozen price stay exactly as they were first recorded.
        const { error } = await supabase
          .from('pen_work')
          .update({ work_complete: true })
          .eq('id', batch.penWorkId)
        if (error) throw error
      } else {
        // First finish: record the head count and freeze the price now, from
        // the current rate card (the work type's rates) + the barn's rates.
        const wt = bootstrap.workTypes.find((w) => w.id === batch.workTypeId)
        if (!wt) {
          flash('error', 'Could not find the work-type rate to freeze')
          return false
        }
        const { error } = await supabase
          .from('pen_work')
          .update({
            work_complete: true,
            head_worked: worked,
            frozen_vet_charge: wt.vet_charge,
            frozen_sol_charge: wt.sol_charge,
            frozen_admin_rate: bootstrap.barn.admin_fee_rate,
            frozen_tax_rate: bootstrap.barn.sales_tax_rate,
          })
          .eq('id', batch.penWorkId)
        if (error) throw error
      }

      setBatch(null)
      setDraft(emptyDraft())
      setWorked(0)
      setSorted(0)
      setStageTally({})
      setStep('start')
      flash('success', 'Batch closed')
      return true
    } catch (e) {
      flash('error', errMsg(e, 'Could not close the batch'))
      return false
    } finally {
      setSaving(false)
    }
  }, [batch, worked, supabase, flash, bootstrap])

  // Re-sync the in-batch worked count AND the instant-duplicate set from the
  // live (non-deleted) animals. Called when a batch opens (so a resumed batch
  // knows what's already been worked) and after the animal-list pop-up adds or
  // removes a record.
  const refreshWorked = useCallback(async () => {
    if (!batch) return
    const { data: animals } = await supabase
      .from('animal')
      .select('id, created_at')
      .eq('pen_work_id', batch.penWorkId)
      .is('deleted_at', null)
    const list = animals ?? []
    setWorked(list.length)
    const map = new Map<string, { time: string; status: string }>()
    if (list.length) {
      const created = new Map(list.map((a) => [a.id, a.created_at as string]))
      const { data: idents } = await supabase
        .from('identifier')
        .select('animal_id, value')
        .eq('type', 'eid')
        .is('deleted_at', null)
        .in('animal_id', list.map((a) => a.id))
      for (const it of idents ?? []) {
        const c = created.get(it.animal_id)
        map.set(it.value, { time: c ? timeLabel(c) : '', status: 'Open' })
      }
    }
    workedEids.current = map
  }, [supabase, batch])

  // Seed the worked count + instant-duplicate set when a batch opens (covers a
  // resumed batch that already has animals). Keyed on the id so it doesn't re-run
  // when the batch object changes mid-capture (e.g. head_started gets frozen).
  const penWorkId = batch?.penWorkId
  useEffect(() => {
    if (penWorkId) void refreshWorked()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [penWorkId])

  // Keep the active batch in the address bar so a page refresh restores the SAME
  // pen_work and its already-saved animals, instead of dropping back to the start
  // screen and leaving the batch orphaned with no count. A batch opened from the
  // Pen List already arrives with ?penWork in the URL; a batch started here at the
  // chute did not — which is where a reload used to lose the running batch. We use
  // replaceState: it adds no history entry and doesn't refetch, so the live capture
  // state stays put and only a reload reads the URL back. (A single half-typed,
  // unsaved animal can still be lost on reload — that's fine; the saved animals and
  // the batch binding are what must survive.)
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Only touch the URL while we're actually on the capture screen, so closing a
    // batch (which navigates on to the Pen List) doesn't fight the navigation.
    if (window.location.pathname !== '/capture') return
    const url = new URL(window.location.href)
    const current = url.searchParams.get('penWork')
    if (penWorkId) {
      if (current !== penWorkId) {
        url.searchParams.set('penWork', penWorkId)
        window.history.replaceState(window.history.state, '', url.toString())
      }
    } else if (current) {
      // Batch closed or cleared — drop the param so a reload doesn't reopen it.
      url.searchParams.delete('penWork')
      window.history.replaceState(window.history.state, '', url.toString())
    }
  }, [penWorkId])

  return {
    bootstrap,
    step,
    batch,
    draft,
    worked,
    sorted,
    stageTally,
    sortPens,
    saving,
    toast,
    resolved,
    shows,
    required,
    fieldLabel,
    flag,
    clearFlag,
    patchDraft,
    toggleQuickNote,
    startBatch,
    saveNext,
    routeScan,
    commitEid,
    eidRequired,
    focusTick,
    secondaryEidOpen,
    setSecondaryEidOpen,
    closeBatch,
    clearSort,
    chooseSortPen,
    createSortPen,
    dismissToast,
    refreshWorked,
  }
}

export type CaptureApi = ReturnType<typeof useCapture>
