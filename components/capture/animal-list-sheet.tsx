'use client'

// The chute animal list for the current pen_work: every non-deleted animal,
// newest first, with a one-line summary. Tap a row to edit the full record;
// "Add missed animal" opens an empty pop-up. Add/remove are disabled once the
// order is finished (head-count changes on a frozen order belong to the office).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CaptureApi } from '@/lib/capture/use-capture'
import { fetchPenWorkAnimals, type CapturedAnimal } from '@/lib/capture/save-animal'
import { BottomSheet, SheetHeader } from './sheets'
import { PlusIcon } from './icons'

function primaryTag(a: CapturedAnimal): string {
  return (
    a.eid?.trim() || a.visualTag?.trim() || a.eid2?.trim() || a.backTag?.trim() || a.metalTag?.trim() || '— no tag —'
  )
}

function summaryLine(a: CapturedAnimal, api: CaptureApi): string {
  const parts: string[] = []
  if (a.visualTag) parts.push(`Tag ${a.visualTag}`)
  if (a.color) parts.push(a.color)
  if (a.age_designation) {
    const opt = api.bootstrap.ageOptions.find((o) => o.designation_value === a.age_designation)
    parts.push(opt?.age_label ?? a.age_designation)
  }
  if (a.breed) parts.push(a.breed)
  if (a.preg_status) {
    const st = api.bootstrap.pregStages.find((s) => s.stage_code === a.preg_status)
    parts.push(st?.display_label ?? a.preg_status)
  }
  return parts.join(' · ')
}

export function AnimalListSheet({
  api,
  open,
  reloadKey,
  onClose,
  onEdit,
}: {
  api: CaptureApi
  open: boolean
  reloadKey: number
  onClose: () => void
  onEdit: (animal: CapturedAnimal | null) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const penWorkId = api.batch?.penWorkId ?? null
  const [rows, setRows] = useState<CapturedAnimal[] | null>(null)
  const [workComplete, setWorkComplete] = useState(false)

  const reload = useCallback(async () => {
    if (!penWorkId) return
    const [list, pw] = await Promise.all([
      fetchPenWorkAnimals(supabase, penWorkId),
      supabase.from('pen_work').select('work_complete').eq('id', penWorkId).maybeSingle(),
    ])
    setRows(list)
    setWorkComplete(!!pw.data?.work_complete)
  }, [supabase, penWorkId])

  useEffect(() => {
    if (open) {
      setRows(null)
      void reload()
    }
  }, [open, reloadKey, reload])

  if (!open || !api.batch) return null
  const count = rows?.length ?? 0

  return (
    <BottomSheet open={open} onClose={onClose}>
      <SheetHeader title={`Animals · ${count}`} onClose={onClose} />

      <div style={{ padding: '0 16px 10px', flexShrink: 0 }}>
        <button
          type="button"
          disabled={workComplete}
          onClick={() => onEdit(null)}
          style={{ width: '100%', height: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, background: workComplete ? '#F1F2F6' : '#E1F5EE', border: `1px solid ${workComplete ? '#E4E4DE' : '#55BAAA'}`, color: workComplete ? '#9A9AA6' : '#155E54', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: workComplete ? 'default' : 'pointer' }}
        >
          <PlusIcon size={18} color={workComplete ? '#9A9AA6' : '#55BAAA'} sw={2.2} />
          Add missed animal
        </button>
        {workComplete && (
          <div style={{ fontSize: 12, fontWeight: 600, color: '#717182', marginTop: 8 }}>
            This order is finished — add and remove are handled in the office. You can still fix a record&apos;s details.
          </div>
        )}
      </div>

      <div style={{ overflowY: 'auto', padding: '0 16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows === null ? (
          <div style={{ padding: '32px 4px', textAlign: 'center', fontSize: 14, color: '#717182' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '40px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0E2646' }}>No animals yet</div>
            <div style={{ fontSize: 13, color: '#717182', marginTop: 4 }}>Worked animals show here, newest first.</div>
          </div>
        ) : (
          rows.map((a) => {
            const sum = summaryLine(a, api)
            const notes = a.quick_notes ?? []
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onEdit(a)}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, background: '#FFFFFF', border: '1px solid #E4E4DE', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0E2646', fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>{primaryTag(a)}</div>
                  {sum && <div style={{ fontSize: 13, fontWeight: 600, color: '#717182', marginTop: 1 }}>{sum}</div>}
                  {notes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                      {notes.map((n) => (
                        <span key={n} style={{ height: 22, padding: '0 9px', display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: '#EEF1F6', border: '1px solid #DEE3EC', fontSize: 11, fontWeight: 700, color: '#3C5278' }}>{n}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span aria-hidden style={{ flexShrink: 0, color: '#A8AEC0', fontSize: 18 }}>›</span>
              </button>
            )
          })
        )}
      </div>
    </BottomSheet>
  )
}
