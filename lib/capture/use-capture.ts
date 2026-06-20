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

  // The first required + shown field with no value, by label (null = all good).
  const requiredMissing = useCallback(
    (eidValue: string): string | null => {
      if (!batch) return null
      const order = ['eid', 'back_tag', 'visual_tag', 'metal_tag', 'age', 'breed', 'hide_color', 'preg_stage', 'preg_timing', 'fetal_sex']
      for (const key of order) {
        if (!required(key) || !shows(key)) continue
        const present =
          key === 'eid' ? !!eidValue.trim()
          : key === 'back_tag' ? !!draft.backTag.trim()
          : key === 'visual_tag' ? !!draft.visualTag.trim()
          : key === 'metal_tag' ? !!draft.metalTag.trim()
          : key === 'age' ? !!draft.ageDesignation
          : key === 'breed' ? !!draft.breed
          : key === 'hide_color' ? !!draft.color
          : key === 'preg_stage' ? !!draft.pregStatus
          : key === 'preg_timing' ? !!draft.pregTiming
          : key === 'fetal_sex' ? !!draft.fetalSex
          : true
        if (!present) return fieldLabel(key)
      }
      return null
    },
    [batch, required, shows, draft, fieldLabel],
  )

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

  /** Deliberate Save & next: check required, save, then open a fresh record. */
  const saveNext = useCallback(
    async (eidOverride?: string): Promise<boolean> => {
      if (!batch) return false
      const ev = (eidOverride ?? draft.eid).trim()
      const missing = requiredMissing(ev)
      if (missing) {
        flash('warn', `${missing} needed to save`)
        return false
      }
      if (ev && (await isDuplicateEid(ev))) {
        flash('warn', 'This tag is already in this batch')
        return false
      }
      const ok = await buildAndInsert(ev)
      if (ok) setDraft(emptyDraft())
      return ok
    },
    [batch, draft.eid, requiredMissing, isDuplicateEid, buildAndInsert, flash],
  )

  /**
   * An EID scan. EMPTY record -> fill the EID and wait. ACTIVE record -> this is
   * the next cow: save the current one (when required fields are satisfied) and
   * carry the new tag in. The identifying scan never saves its own record.
   */
  const handleScan = useCallback(
    async (value: string): Promise<void> => {
      if (!batch) return
      const v = value.trim()
      if (!v) return
      if (v === draft.eid.trim() || (await isDuplicateEid(v))) {
        flash('warn', 'This tag is already in this batch')
        return
      }
      if (!draft.eid.trim()) {
        patchDraft({ eid: v })
        return
      }
      const missing = requiredMissing(draft.eid)
      if (missing) {
        flash('warn', `${missing} needed before the next cow`)
        return
      }
      const ok = await buildAndInsert(draft.eid)
      if (ok) setDraft({ ...emptyDraft(), eid: v })
    },
    [batch, draft.eid, isDuplicateEid, requiredMissing, buildAndInsert, patchDraft, flash],
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
    handleScan,
    closeBatch,
    clearSort,
    chooseSortPen,
    createSortPen,
    dismissToast,
  }
}

export type CaptureApi = ReturnType<typeof useCapture>
