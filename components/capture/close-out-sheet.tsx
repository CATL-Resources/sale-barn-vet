'use client'

import { useRouter } from 'next/navigation'
import type { CaptureApi } from '@/lib/capture/use-capture'
import { AlertIcon, CloseOutIcon, SortIcon } from './icons'
import { BottomSheet, SheetHeader } from './sheets'

export function CloseOutSheet({ api, onClose }: { api: CaptureApi; onClose: () => void }) {
  const router = useRouter()
  const { batch, worked, sorted, stageTally, sortPens, bootstrap, saving, closeBatch } = api
  if (!batch) return null

  const head = batch.headStarted
  const staying = Math.max(0, worked - sorted)
  const stageBoxes = bootstrap.pregStages
    .filter((s) => (stageTally[s.stage_code] ?? 0) > 0)
    .map((s) => ({ label: s.display_label, count: stageTally[s.stage_code] ?? 0 }))

  // Closing a pen sends the crew back to the Work Orders list for this sale day,
  // where the board already floats anything still to do up to the top and drops
  // the pen we just finished to the bottom. (It used to land on "new batch".)
  async function close() {
    const saleDayId = batch!.saleDayId
    const ok = await closeBatch()
    if (ok) {
      onClose()
      router.push(`/work-orders/${saleDayId}`)
    }
  }

  return (
    <BottomSheet open onClose={onClose}>
      <SheetHeader title="Close out batch" onClose={onClose} />
      <div style={{ overflowY: 'auto', padding: '0 18px 22px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#717182', marginBottom: 16 }}>
          {batch.penNumber ? `Pen ${batch.penNumber} · ` : ''}
          {batch.sellerName} · {batch.workTypeName}
        </div>

        {/* tally */}
        <div style={{ background: '#0E2646', borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: stageBoxes.length ? 14 : 0 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{worked}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#8FA8CC' }}>{head != null ? `of ${head} head worked` : 'head worked'}</span>
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

        {sortPens.filter((p) => p.count > 0).map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', background: '#E1F5EE', border: '1px solid #55BAAA', borderRadius: 11, marginBottom: 10 }}>
            <SortIcon size={18} color="#2E9486" sw={2.2} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#155E54' }}>Sort pen {p.pen_number} · {p.count} head</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2E9486', marginTop: 1 }}>Shared pen — stays open for the rest of the day</div>
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
          disabled={saving}
          style={{ width: '100%', height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 13, background: '#F3D12A', color: '#0E2646', border: 'none', fontFamily: 'inherit', fontSize: 17, fontWeight: 800, cursor: saving ? 'default' : 'pointer', letterSpacing: '-0.01em', marginBottom: 10, opacity: saving ? 0.7 : 1 }}
        >
          <CloseOutIcon size={19} color="#0E2646" sw={2.6} />
          Close out {worked} head
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', height: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 13, background: '#FFFFFF', color: '#0E2646', border: '1px solid #D4D4D0', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          Keep working
        </button>
      </div>
    </BottomSheet>
  )
}
