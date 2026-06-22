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
) {
  const supabase = useMemo(() => createClient(), [])
  const barnId = bootstrap.barn.id

  const [step, setStep] = useState<Step>(initial ? 'capture' : 'start')
  const [batch, setBatch] = useState<BatchInfo | null>(initial?.batch ?? null)
  const [draft, setDraft] = useState<AnimalDraft>(emptyDraft)
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

  const flash = useCallback((kind: ToastKind, message: string) => {
    setToast({ kind, message })
    if (kind !== 'warn') window.setTimeout(() => setToast(null), 3200)
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const patchDraft = useCallback((fields: Partial<AnimalDraft>) => {
    setDraft((d) => ({ ...d, ...fields }))
  }, [])

  // Resolve each field for the active work type: start from the barn-wide rows
  // (work_type_id IS NULL), then let a row for this work type override its flags.
  const resolved = useMemo(() => {
    const map = new Map<string, ResolvedField>()
    for (const f of bootstrap.fields) {
      if (f.work_type_id !== null) continue
      map.set(f.field_key, {
        is_displayed: f.is_displayed,
        is_required: f.is_required,
        sort_order: f.sort_order,
        display_label: f.display_label,
        default_value: f.default_value,
      })
    }
    if (batch) {
      for (const f of bootstrap.fields) {
        if (f.work_type_id !== batch.workTypeId) continue
        const base = map.get(f.field_key)
        map.set(f.field_key, {
          is_displayed: f.is_displayed,
          is_required: f.is_required,
          sort_order: f.sort_order,
          display_label: f.display_label ?? base?.display_label ?? null,
          default_value: f.default_value ?? base?.default_value ?? null,
        })
      }
    }
    return map
  }, [bootstrap.fields, batch])

  // Which fields show. preg keeps a fallback on the work type's preg-check flag
  // so a preg job with no per-work-type row still shows preg (no regression).
  const shows = useCallback(
    (key: string): boolean => {
      if (!batch) return false
      const displayed = resolved.get(key)?.is_displayed ?? false
      if (key === 'preg_stage') return displayed || batch.includesPregCheck
      if (key === 'preg_timing') return (displayed || batch.includesPregCheck) && isBredStage(draft.pregStatus)
      return displayed
    },
    [batch, resolved, draft.pregStatus],
  )

  const required = useCallback((key: string): boolean => resolved.get(key)?.is_required ?? false, [resolved])

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
        setDraft(emptyDraft())
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
    [supabase, barnId, userId, bootstrap.pens, bootstrap.workTypes, resolveSaleDay, loadSortPens, flash],
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

  // Observational required fields (age, breed, color, preg…) are soft: a blank
  // one shows the REQUIRED chip on the field but never blocks the save, so
  // "Not checked" is still a complete record. Only the official EID hard-blocks.

  // Is this EID already on a non-deleted animal in the current batch?
  const isDuplicateEid = useCallback(
    async (value: string): Promise<boolean> => {
      if (!batch) return false
      const { data: animals } = await supabase
        .from('animal')
        .select('id')
        .eq('pen_work_id', batch.penWorkId)
        .is('deleted_at', null)
      const ids = (animals ?? []).map((a) => a.id)
      if (!ids.length) return false
      const { data, error } = await supabase
        .from('identifier')
        .select('id')
        .eq('barn_id', barnId)
        .eq('type', 'eid')
        .eq('value', value.trim())
        .is('deleted_at', null)
        .in('animal_id', ids)
      if (error) return false
      return (data ?? []).length > 0
    },
    [supabase, barnId, batch],
  )

  // Insert the current record. No required check, no form reset — callers handle
  // those so a scan can roll straight into the next cow.
  const buildAndInsert = useCallback(
    async (eidValue: string): Promise<boolean> => {
      if (!batch || saving) return false
      setSaving(true)
      try {
        const off = bootstrap.barn.official_id_type
        const animalRow: TablesInsert<'animal'> = {
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
        }
        const { data: animal, error } = await supabase.from('animal').insert(animalRow).select('id').single()
        if (error || !animal) throw error ?? new Error('Could not save the animal')

        const idRows: TablesInsert<'identifier'>[] = []
        const addId = (type: string, value: string, official: boolean) => {
          const v = value.trim()
          if (v) idRows.push({ animal_id: animal.id, barn_id: barnId, type, value: v, is_official: official, created_by: userId })
        }
        if (shows('eid')) addId('eid', eidValue, off === 'EID' || off === 'Both')
        // A second EID (e.g. a non-840 / 900-series tag) — non-official, saved
        // only when the operator opened the slot and filled it.
        addId('secondary_eid', draft.eid2, false)
        if (shows('back_tag')) addId('back_tag', draft.backTag, false)
        if (shows('visual_tag')) addId('visual_tag', draft.visualTag, false)
        if (shows('metal_tag')) addId('metal_tag', draft.metalTag, off === 'Metal' || off === 'Both')
        if (idRows.length) {
          const { error: ie } = await supabase.from('identifier').insert(idRows)
          if (ie) throw ie
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
   * Deliberate Save & next. Hard-block on a missing or duplicate official EID;
   * then save and open a fresh record. Observational required fields are soft —
   * the REQUIRED chip flags them but they never block the save, so "Not checked"
   * is still a complete record.
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
      // HARD: the same EID can't be in this batch twice.
      if (ev && (await isDuplicateEid(ev))) {
        flash('warn', 'This tag is already in this batch')
        return false
      }
      const ok = await buildAndInsert(ev)
      if (ok) {
        setDraft(emptyDraft())
        setSecondaryEidOpen(false)
      }
      return ok
    },
    [batch, draft.eid, eidRequired, isDuplicateEid, buildAndInsert, flash],
  )

  // Manual EID entry (typed into the EID box, not scanned). Fill and wait, same
  // hard refuse on a duplicate. Shape isn't checked here — the operator typed it
  // straight into the EID field on purpose.
  const commitEid = useCallback(
    async (value: string): Promise<void> => {
      if (!batch) return
      const v = value.trim()
      if (!v || v === draft.eid.trim()) return
      if (await isDuplicateEid(v)) {
        flash('warn', 'This tag is already in this batch')
        return
      }
      patchDraft({ eid: v })
      setFocusTick((n) => n + 1)
    },
    [batch, draft.eid, isDuplicateEid, patchDraft, flash],
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
  const warnIfDuplicate = useCallback(
    async (value: string): Promise<void> => {
      if (await isDuplicateEid(value)) flash('warn', 'This tag is already in this batch')
    },
    [isDuplicateEid, flash],
  )

  const routeScan = useCallback(
    async (raw: string): Promise<void> => {
      if (!batch) return
      const code = raw.trim()
      if (!code) return
      // A fresh scan clears any leftover message (e.g. a "this tag is already in
      // this batch" warning from the previous scan) so it can't make the new,
      // good tag look like a duplicate too. The background check below re-raises
      // it only if THIS tag is actually a repeat.
      setToast(null)
      const fifteenDigits = /^\d{15}$/.test(code)

      if (fifteenDigits) {
        // Re-scan of a tag already on this cow — ignore it.
        if (code === draft.eid.trim() || code === draft.eid2.trim()) return

        // With the 2nd-EID slot open, full EIDs fill in order — the first empty
        // of [primary, second]. That covers a cow wearing two 840 tags, which
        // the 840-vs-900 shape rule alone can't tell apart.
        if (secondaryEidOpen) {
          if (!draft.eid.trim()) {
            patchDraft({ eid: code })
            setFocusTick((n) => n + 1)
            void warnIfDuplicate(code)
          } else {
            patchDraft({ eid2: code })
            setFocusTick((n) => n + 1)
          }
          return
        }

        // Slot closed: an 840 tag is the primary EID; show it at once and check
        // for a duplicate in the background.
        if (code.startsWith('840')) {
          patchDraft({ eid: code })
          setFocusTick((n) => n + 1)
          void warnIfDuplicate(code)
          return
        }

        // A non-840 (900-series) 15-digit tag is a second EID — nudge them to
        // open the 2nd-EID slot first.
        flash('warn', 'Tap “2nd EID” first to scan a second tag')
        return
      }

      // Everything else is the back tag barcode.
      patchDraft({ backTag: code })
      setFocusTick((n) => n + 1)
    },
    [batch, draft.eid, draft.eid2, secondaryEidOpen, patchDraft, flash, warnIfDuplicate],
  )

  const closeBatch = useCallback(async (): Promise<boolean> => {
    if (!batch) return false
    setSaving(true)
    try {
      const { error } = await supabase
        .from('pen_work')
        .update({ work_complete: true, head_worked: worked })
        .eq('id', batch.penWorkId)
      if (error) throw error
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
  }, [batch, worked, supabase, flash])

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
  }
}

export type CaptureApi = ReturnType<typeof useCapture>
