'use client'

import { useEffect, useRef, useState } from 'react'
import type { CaptureApi } from '@/lib/capture/use-capture'
import { useScanRouter } from '@/lib/capture/use-scan-router'
import { ChevronLeft, ScanIcon, SortIcon, CloseOutIcon, FlagIcon, CheckIcon, XIcon } from './icons'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Button } from '@/components/ui/button'
import { RequiredMark } from '@/components/ui/required-mark'
import { AnimalAttributes } from './animal-attributes'
import { FlagBanner, FLAG_RED, FLAG_RED_BG } from './flag'

const isEid15 = (v: string) => /^\d{15}$/.test(v.trim())

// The full EID number, with the last four digits bolded for quick matching.
function EidNumber({ v, head, tail }: { v: string; head: string; tail: string }) {
  const n = v.trim()
  const cut = Math.max(0, n.length - 4)
  return (
    <span style={{ flex: 1, minWidth: 0, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-all', fontSize: 15, lineHeight: 1.2 }}>
      <span style={{ color: head, fontWeight: 600 }}>{n.slice(0, cut)}</span>
      <span style={{ color: tail, fontWeight: 800 }}>{n.slice(cut)}</span>
    </span>
  )
}

// Swallow Enter in a scan-target field so a wand's trailing Enter can't fall
// through and save/advance the record early — fill and wait.
function swallowEnter(e: { key: string; preventDefault: () => void; stopPropagation: () => void }) {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
  }
}

export function CaptureForm({
  api,
  onOpenCloseOut,
  onOpenAnimals,
  onTapSort,
}: {
  api: CaptureApi
  onOpenCloseOut: () => void
  onOpenAnimals: () => void
  onTapSort: () => void
}) {
  const {
    bootstrap,
    batch,
    draft,
    worked,
    sorted,
    sortPens,
    saving,
    resolved,
    required,
    patchDraft,
    saveNext,
    routeScan,
    commitEid,
    eidRequired,
    focusTick,
    secondaryEidOpen,
    setSecondaryEidOpen,
    flag,
  } = api
  const eidRef = useRef<HTMLInputElement>(null)
  const idRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [eidType, setEidType] = useState('')

  // Route every wand scan by its shape, no matter which field has focus.
  useScanRouter(routeScan, true)

  // Once the EID is set (scanned or committed), clear the manual-entry box so a
  // stray character from the scan burst can't linger behind the filled chip.
  useEffect(() => {
    if (draft.eid) setEidType('')
  }, [draft.eid])

  // When the operator opens the secondary EID slot, drop the cursor in it.
  useEffect(() => {
    if (secondaryEidOpen) idRefs.current['eid2']?.focus()
  }, [secondaryEidOpen])

  // After a scan fills an identifier, drop the cursor on the first empty
  // displayed field for manual entry (the back tag, then visual / metal tag).
  const stateRef = useRef({ draft, shows: api.shows })
  stateRef.current = { draft, shows: api.shows }
  useEffect(() => {
    if (!focusTick) return
    const { draft: d, shows: sh } = stateRef.current
    const pick = (['back_tag', 'visual_tag', 'metal_tag'] as const).find((k) => {
      const v = k === 'back_tag' ? d.backTag : k === 'visual_tag' ? d.visualTag : d.metalTag
      return sh(k) && !v.trim()
    })
    if (pick) {
      const refKey = pick === 'back_tag' ? 'backTag' : pick === 'visual_tag' ? 'visualTag' : 'metalTag'
      idRefs.current[refKey]?.focus()
    } else {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    }
  }, [focusTick])

  if (!batch) return null

  const head = batch.headStarted
  const left = head != null ? Math.max(0, head - worked) : null
  const goldPct = head && head > 0 ? Math.min(100, (worked / head) * 100) : 0
  const tealPct = head && head > 0 ? Math.min(100 - goldPct, (sorted / head) * 100) : 0

  const flaggedOn = bootstrap.quickNotes.filter((q) => q.is_flag && draft.quickNotes.includes(q.label))
  const sortPen = draft.sortPenId ? sortPens.find((p) => p.id === draft.sortPenId) : null
  const active = draft.eid.trim().length > 0

  // Manual EID typed into the EID box and confirmed with Enter (wand scans are
  // caught at the screen level, not here).
  async function onEidEnter() {
    const v = eidType.trim()
    if (!v) return
    await commitEid(v)
    setEidType('')
  }

  // Deliberate Save & next. Carry an uncommitted typed EID through as the value.
  async function onSaveNext() {
    const override = !draft.eid.trim() && eidType.trim() ? eidType.trim() : undefined
    const ok = await saveNext(override)
    if (ok) {
      setEidType('')
      eidRef.current?.focus()
    }
  }

  // --- identity inputs (typed tags) ---
  const navyInput = (key: 'backTag' | 'visualTag' | 'metalTag', label: string, placeholder: string) => {
    const fieldKey = key === 'backTag' ? 'back_tag' : key === 'visualTag' ? 'visual_tag' : 'metal_tag'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA', display: 'flex', alignItems: 'center', gap: 3 }}>{label}{required(fieldKey) && <RequiredMark />}</div>
        <input
          ref={(el) => { idRefs.current[key] = el }}
          value={draft[key]}
          onChange={(e) => patchDraft({ [key]: e.target.value } as Partial<typeof draft>)}
          onKeyDown={swallowEnter}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, height: 46, padding: '0 13px', borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, outline: 'none' }}
        />
      </div>
    )
  }

  const scanInput = (placeholder: string, dashed: boolean) => (
    <input
      ref={eidRef}
      autoFocus
      value={eidType}
      onChange={(e) => setEidType(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          void onEidEnter()
        }
      }}
      placeholder={placeholder}
      style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: dashed ? 14 : 16, fontWeight: 700, color: '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}
    />
  )

  // The sort toggle row that leads the Quick notes card (capture-only).
  const sortRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 11, marginBottom: 11, borderBottom: '1px solid #ECECE8' }}>
      <button
        type="button"
        onClick={onTapSort}
        style={{ flexShrink: 0, height: 42, padding: draft.sortPenId ? '0 13px' : '0 15px 0 13px', display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, background: draft.sortPenId ? '#55BAAA' : '#E1F5EE', border: '1px solid #55BAAA', color: draft.sortPenId ? '#FFFFFF' : '#1A6B5E', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
      >
        <SortIcon size={15} color={draft.sortPenId ? '#FFFFFF' : '#55BAAA'} sw={2.2} />
        Sort
        {draft.sortPenId && <CheckIcon size={15} color="#FFFFFF" sw={2.6} />}
      </button>
      <div style={{ fontSize: 11, fontWeight: 600, color: draft.sortPenId ? '#55BAAA' : '#717182', lineHeight: 1.3 }}>
        {draft.sortPenId ? "In the sort pen — out of this pen's count" : 'Pinned · pulls her into a shared sort pen, out of this count'}
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <ScreenHeader
        back={
          <a href={`/work-list/${batch.saleDayId}`} aria-label="Back to Pen List" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={22} color="#FFFFFF" />
          </a>
        }
        title={`${batch.penNumber ? `Pen ${batch.penNumber}` : 'No pen'}${batch.sellerName ? ` · ${batch.sellerName}` : ''}`}
        subtitle={batch.workTypeName}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onOpenAnimals}
              aria-label="Animals worked"
              style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 13px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.28)', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}
            >
              Animals {worked}
            </button>
            <button
              type="button"
              onClick={onOpenCloseOut}
              style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 13px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.28)', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              <CloseOutIcon size={14} color="#FFFFFF" sw={2.2} />
              Close out
            </button>
          </div>
        }
      />

      <div className="sbv-screenheader" style={{ position: 'relative', zIndex: 1, boxShadow: '0 6px 18px rgba(8,18,40,0.30)' }}>
        <div className="sbv-container" style={{ paddingTop: 0, paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
              {head != null ? `${worked} of ${head} head` : `${worked} head`}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: sorted > 0 ? '#7FD9CB' : '#8FA8CC', fontVariantNumeric: 'tabular-nums' }}>
              {sorted > 0 ? `${sorted} sorted${left != null ? ` · ${left} left` : ''}` : left != null ? `${left} left` : 'in this batch'}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.14)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ height: '100%', width: `${goldPct}%`, background: '#F3D12A' }} />
            <div style={{ height: '100%', width: `${tealPct}%`, background: '#55BAAA' }} />
          </div>
        </div>
      </div>

      <div className="sbv-scroll">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 12 }}>
          {flag && <FlagBanner title="Duplicate tag" detail={`${flag.eid} already worked · ${flag.time} · ${flag.status}`} />}

          {flaggedOn.length > 0 && (
            <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <FlagIcon size={26} color="#B45309" sw={2.4} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#7A4A06', letterSpacing: '-0.01em' }}>{flaggedOn.map((f) => f.label).join(' · ')}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#A86A12', marginTop: 1 }}>Flagged note — shows loud, doesn&apos;t block</div>
              </div>
            </div>
          )}

          {sortPen && (
            <div style={{ background: '#E1F5EE', border: '1px solid #55BAAA', borderRadius: 14, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <SortIcon size={24} color="#55BAAA" sw={2.2} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#155E54', letterSpacing: '-0.01em' }}>
                  Sort pen {sortPen.pen_number} · {sortPen.count + 1} head so far
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#55BAAA', marginTop: 1 }}>
                  Out of this pen&apos;s count — stays open all day
                </div>
              </div>
            </div>
          )}

          {/* identity */}
          <div style={{ background: '#0E2646', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#8FA8CC', textTransform: 'uppercase', marginBottom: 11 }}>
              Identity · {bootstrap.barn.official_id_type} barn
            </div>
            {api.shows('eid') && (
              <div style={{ marginBottom: 9 }}>
                {active ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA', display: 'flex', alignItems: 'center', gap: 3 }}>EID{eidRequired() && <RequiredMark />}</div>
                    <div style={{ flex: 1, minWidth: 0, minHeight: 50, display: 'flex', alignItems: 'center', gap: 9, padding: '6px 13px', borderRadius: 11, background: isEid15(draft.eid) ? '#E1F5EE' : '#FEF3C7', border: `1px solid ${isEid15(draft.eid) ? '#55BAAA' : '#F2C879'}` }}>
                      <ScanIcon size={19} color={isEid15(draft.eid) ? '#55BAAA' : '#B45309'} />
                      <EidNumber v={draft.eid} head={isEid15(draft.eid) ? '#55BAAA' : '#92580C'} tail={isEid15(draft.eid) ? '#0E2646' : '#7A4A06'} />
                      {!isEid15(draft.eid) && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#B45309', fontVariantNumeric: 'tabular-nums' }}>{draft.eid.replace(/\D/g, '').length}/15</span>}
                      <button type="button" aria-label="Clear EID" onClick={() => patchDraft({ eid: '' })} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                        <XIcon size={15} color={isEid15(draft.eid) ? '#55BAAA' : '#B45309'} sw={2.2} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA', display: 'flex', alignItems: 'center', gap: 3 }}>EID{eidRequired() && <RequiredMark />}</div>
                    <div style={{ flex: 1, minWidth: 0, height: 50, display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', borderRadius: 11, background: flag ? FLAG_RED_BG : '#FFFFFF', border: flag ? `2px solid ${FLAG_RED}` : '2px solid #55BAAA', boxShadow: flag ? 'none' : '0 0 0 3px rgba(85,186,170,0.35)' }}>
                      <ScanIcon size={19} color={flag ? FLAG_RED : '#55BAAA'} />
                      {scanInput('Scan or type EID', false)}
                      {eidType.trim() && !isEid15(eidType) ? (
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#B45309', fontVariantNumeric: 'tabular-nums' }}>{eidType.replace(/\D/g, '').length}/15</span>
                      ) : (
                        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: flag ? FLAG_RED : '#55BAAA' }}>
                          <span style={{ width: 6, height: 6, borderRadius: 999, background: flag ? FLAG_RED : '#55BAAA' }} />
                          READER ON
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {api.shows('back_tag') && navyInput('backTag', 'Back Tag', 'Scan the back tag barcode')}
            {api.shows('visual_tag') && navyInput('visualTag', 'Tag #', 'Type the tag number')}
            {api.shows('metal_tag') && navyInput('metalTag', 'Metal Tag', 'Type the metal tag')}

            {/* On-demand secondary EID — off the normal flow. */}
            {api.shows('eid') && (secondaryEidOpen || draft.eid2.trim() ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
                <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA' }}>2nd EID</div>
                <div style={{ flex: 1, minWidth: 0, height: 46, display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <input
                    ref={(el) => { idRefs.current['eid2'] = el }}
                    value={draft.eid2}
                    onChange={(e) => patchDraft({ eid2: e.target.value })}
                    onKeyDown={swallowEnter}
                    placeholder="Scan or type 2nd EID"
                    style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}
                  />
                  <button type="button" aria-label="Remove second EID" onClick={() => { patchDraft({ eid2: '' }); setSecondaryEidOpen(false) }} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                    <XIcon size={15} color="#C9D5EA" sw={2.2} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSecondaryEidOpen(true)}
                style={{ marginTop: 4, height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 999, background: 'transparent', border: '1px dashed rgba(255,255,255,0.32)', color: '#C9D5EA', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                + 2nd EID
              </button>
            ))}
          </div>

          {/* attributes + quick notes + note — shared, config-driven; keyed by
              the worked count so its expand/note state resets after each save. */}
          <AnimalAttributes
            key={worked}
            bootstrap={bootstrap}
            resolved={resolved}
            includesPregCheck={batch.includesPregCheck}
            draft={draft}
            patch={patchDraft}
            quickNotesLeading={sortRow}
          />
        </div>
      </div>

      {/* save bar */}
      <div style={{ flexShrink: 0, background: '#FFFFFF', borderTop: '1px solid #E4E4DE', padding: '12px 16px calc(18px + env(safe-area-inset-bottom))', boxShadow: '0 -6px 18px rgba(8,18,40,0.06)' }}>
        <Button
          variant="primary"
          type="button"
          onClick={() => void onSaveNext()}
          disabled={saving}
          fullWidth
          style={{ height: 56, gap: 9, borderRadius: 13, fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}
        >
          {draft.sortPenId ? <SortIcon size={20} color="#0E2646" sw={2.6} /> : <CheckIcon size={20} color="#0E2646" sw={2.6} />}
          {draft.sortPenId ? 'Sort & next' : 'Save & next'}
        </Button>
      </div>
    </div>
  )
}
