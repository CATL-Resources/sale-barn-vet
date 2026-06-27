'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CaptureApi } from '@/lib/capture/use-capture'
import { fetchPenWorkAnimals, type CapturedAnimal } from '@/lib/capture/save-animal'
import { AlertIcon, CloseOutIcon, SortIcon } from './icons'
import { BottomSheet, SheetHeader } from './sheets'

// A short label for a held animal — whatever tag it has, so the operator can tell
// them apart while placing them.
function animalLabel(a: CapturedAnimal): string {
  return a.eid || a.backTag || a.visualTag || a.metalTag || 'Animal'
}

export function CloseOutSheet({ api, onClose }: { api: CaptureApi; onClose: () => void }) {
  const router = useRouter()
  const {
    batch,
    worked,
    sorted,
    stageTally,
    sortPens,
    bootstrap,
    saving,
    closeBatch,
    isMixed,
    holdLineId,
    consignorLines,
    closePen,
    assignAnimalToLine,
  } = api
  const supabase = useMemo(() => createClient(), [])

  // The animals sitting on the Hold line (mixed pen only) — they block the close
  // until each is placed with a consignor. Reloaded on open and after every place.
  const [held, setHeld] = useState<CapturedAnimal[]>([])
  const reloadHeld = useCallback(async () => {
    if (!isMixed || !holdLineId) {
      setHeld([])
      return
    }
    setHeld(await fetchPenWorkAnimals(supabase, holdLineId))
  }, [isMixed, holdLineId, supabase])
  useEffect(() => {
    void reloadHeld()
  }, [reloadHeld])

  if (!batch) return null

  const head = batch.headStarted
  const staying = Math.max(0, worked - sorted)
  const stageBoxes = bootstrap.pregStages
    .filter((s) => (stageTally[s.stage_code] ?? 0) > 0)
    .map((s) => ({ label: s.display_label, count: stageTally[s.stage_code] ?? 0 }))

  // Closing sends the crew back to the chute Work list for this sale day. A mixed
  // pen closes every consignor line at once (each frozen by its own head count),
  // and is blocked while anything is on Hold; a single-owner pen closes its one
  // line exactly as before.
  async function close() {
    const saleDayId = batch!.saleDayId
    const ok = isMixed ? (await closePen()).ok : await closeBatch()
    if (ok) {
      onClose()
      router.push(`/work-list/${saleDayId}`)
    }
  }

  async function place(animalId: string, toLineId: string) {
    if (!holdLineId) return
    const ok = await assignAnimalToLine(animalId, holdLineId, toLineId)
    if (ok) await reloadHeld()
  }

  const blocked = isMixed && held.length > 0

  return (
    <BottomSheet open onClose={onClose}>
      <SheetHeader title={isMixed ? 'Close Pen' : 'Close Out Batch'} onClose={onClose} />
      <div style={{ overflowY: 'auto', padding: '0 18px 22px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#717182', marginBottom: 16 }}>
          {batch.penNumber ? `Pen ${batch.penNumber} · ` : ''}
          {isMixed ? `${consignorLines.length} consignors` : batch.sellerName} · {batch.workTypeName}
        </div>

        {/* tally */}
        <div style={{ background: '#0E2646', borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: stageBoxes.length ? 14 : 0 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{worked}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#8FA8CC' }}>{head != null && !isMixed ? `of ${head} head worked` : 'head worked'}</span>
          </div>
          {stageBoxes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {stageBoxes.map((b) => (
                <div key={b.label} style={{ flex: '1 1 30%', minWidth: 70, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 10px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>{b.count}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8FA8CC' }}>{b.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HOLD — animals not yet assigned to a consignor. The pen can't close until
            each is placed; tap a consignor to place it. */}
        {isMixed && held.length > 0 && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 14, padding: 13, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <AlertIcon size={18} color="#B45309" sw={2.4} />
              <div style={{ fontSize: 15, fontWeight: 800, color: '#7A4A06' }}>{held.length} head not yet assigned — place them to close</div>
            </div>
            {held.map((a) => (
              <div key={a.id} style={{ background: '#FFFFFF', border: '1px solid #F1D9A8', borderRadius: 11, padding: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all' }}>{animalLabel(a)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {consignorLines.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      disabled={saving}
                      onClick={() => void place(a.id, l.id)}
                      style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: '#0E2646', color: '#FFFFFF', border: 'none' }}
                    >
                      {l.ownerName}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {sortPens.filter((p) => p.count > 0).map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', background: '#E1F5EE', border: '1px solid #55BAAA', borderRadius: 11, marginBottom: 10 }}>
            <SortIcon size={18} color="#55BAAA" sw={2.2} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#155E54' }}>Sort pen {p.pen_number} · {p.count} head</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#55BAAA', marginTop: 1 }}>Shared pen — stays open for the rest of the day</div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 11, marginBottom: 16 }}>
          <AlertIcon size={18} color="#B45309" sw={2.4} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#7A4A06' }}>
            {staying} staying in this pen · {sorted} sorted off. Closing stops this batch&apos;s count — you can still view it after.
          </div>
        </div>

        <button
          type="button"
          onClick={() => void close()}
          disabled={saving || blocked}
          style={{ width: '100%', height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 13, background: blocked ? '#EDE7C6' : '#F3D12A', color: '#0E2646', border: 'none', fontFamily: 'inherit', fontSize: 17, fontWeight: 800, cursor: saving || blocked ? 'default' : 'pointer', letterSpacing: '-0.01em', marginBottom: 10, opacity: saving ? 0.7 : 1 }}
        >
          <CloseOutIcon size={19} color="#0E2646" sw={2.6} />
          {isMixed ? (blocked ? `Place ${held.length} held first` : 'Close pen') : `Close Out ${worked} head`}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', height: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 13, background: '#FFFFFF', color: '#0E2646', border: '1px solid #D4D4D0', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          Keep Working
        </button>
      </div>
    </BottomSheet>
  )
}
