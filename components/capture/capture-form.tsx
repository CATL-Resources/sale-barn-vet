'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import type { CaptureApi } from '@/lib/capture/use-capture'
import { useScanRouter } from '@/lib/capture/use-scan-router'
import { useOnScreenKeyboard } from '@/lib/capture/use-onscreen-keyboard'
import { isBackTag } from '@/lib/capture/scan-format'
import { isScannableField } from '@/lib/capture/fields'
import { ChevronLeft, ScanIcon, SortIcon, CloseOutIcon, FlagIcon, CheckIcon, XIcon, KeyboardIcon } from './icons'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Button } from '@/components/ui/button'
import { RequiredMark } from '@/components/ui/required-mark'
import { AnimalAttributes } from './animal-attributes'
import { OnScreenKeyboard } from './onscreen-keyboard'
import { FlagBanner, FLAG_RED, FLAG_RED_BG } from './flag'

const isEid15 = (v: string) => /^\d{15}$/.test(v.trim())

// An EID field takes digits only, 15 at most — strip anything else and cap the
// length so a stray letter or an over-long read can't sit in the box.
const cleanEid = (v: string) => v.replace(/\D/g, '').slice(0, 15)
// A back tag is the 8-char shape 46MA1234 — upper-case the letters as they're
// typed and never let it run past 8 characters.
const cleanBackTag = (v: string) => v.toUpperCase().slice(0, 8)

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
  scanActive,
}: {
  api: CaptureApi
  onOpenCloseOut: () => void
  onOpenAnimals: () => void
  onTapSort: () => void
  // Off while an overlay sheet is open, so the capture screen and the edit sheet
  // never both run the global scan listener at once.
  scanActive: boolean
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
    secondEidTarget,
    setSecondEidTarget,
    flag,
  } = api
  const eidRef = useRef<HTMLInputElement>(null)
  const idRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [eidType, setEidType] = useState('')

  // The app's own on-screen keyboard (for when a paired wand makes iOS hide the
  // native one). Types into whichever capture field has focus.
  const kbd = useOnScreenKeyboard()

  // Route every wand scan by its shape, no matter which field has focus. Off
  // while an overlay (the edit sheet) is open, so two scan listeners never run.
  useScanRouter(routeScan, scanActive)

  // Once the EID is set (scanned or committed), clear the manual-entry box so a
  // stray character from the scan burst can't linger behind the filled chip.
  useEffect(() => {
    if (draft.eid) setEidType('')
  }, [draft.eid])

  // A duplicate flag also clears the manual-entry box, so a duplicate tag that
  // was typed (not scanned) can't be left sitting in the field and saved.
  useEffect(() => {
    if (flag) setEidType('')
  }, [flag])

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

  // The EID box's value setter — used by both its onChange and the on-screen
  // keyboard. The moment a full EID settles, run the same guard a scan does so a
  // duplicate flags at once and clears, not only on Save.
  function setEidValue(v: string) {
    const clean = cleanEid(v)
    setEidType(clean)
    if (clean.length === 15) void commitEid(clean)
  }

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
    // The back-tag field takes only the 8-char shape 46MA1234: upper-case the
    // letters and cap the length as it's typed (or filled by the on-screen
    // keyboard). Other tag fields pass through untouched.
    const clean = (raw: string): string => (key === 'backTag' ? cleanBackTag(raw) : raw)
    // Back tag must read NN-LL-NNNN (e.g. 46MA1234). Flag once 8+ chars don't fit.
    const v = draft[key].trim()
    const badBackTag = key === 'backTag' && v.length >= 8 && !isBackTag(v)
    const bind = kbd.bind(fieldKey, draft[key], (val) => patchDraft({ [key]: clean(val) } as Partial<typeof draft>))
    return (
      <div style={{ marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA', display: 'flex', alignItems: 'center', gap: 3 }}>{label}{required(fieldKey) && <RequiredMark />}</div>
          <input
            ref={(el) => { idRefs.current[key] = el }}
            value={draft[key]}
            onChange={(e) => patchDraft({ [key]: clean(e.target.value) } as Partial<typeof draft>)}
            onKeyDown={swallowEnter}
            placeholder={placeholder}
            {...bind}
            onFocus={() => { bind.onFocus(); setSecondEidTarget(false) }}
            style={{ flex: 1, minWidth: 0, height: 46, padding: '0 13px', borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: `1px solid ${badBackTag ? '#E24B4A' : 'rgba(255,255,255,0.18)'}`, color: '#FFFFFF', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, outline: 'none' }}
          />
        </div>
        {badBackTag && (
          <div style={{ marginLeft: 70, marginTop: 4, fontSize: 11, fontWeight: 600, color: '#F3B0B0' }}>
            Back tag format is 46MA1234 — two numbers, two letters, four numbers.
          </div>
        )}
      </div>
    )
  }

  // The official EID starts with 840. Flag a non-840 entry at once (red text),
  // allowing the partial "8"/"84"/"840" while it's being typed.
  const eidTyped = eidType.trim()
  const eidBad840 = eidTyped.length >= 3 && !eidTyped.startsWith('840') && !'840'.startsWith(eidTyped)
  const scanInput = (placeholder: string, dashed: boolean) => {
    const bind = kbd.bind('eid', eidType, setEidValue)
    return (
      <input
        ref={eidRef}
        autoFocus
        value={eidType}
        onChange={(e) => setEidValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void onEidEnter()
          }
        }}
        placeholder={placeholder}
        title={eidBad840 ? 'EID should start with 840' : undefined}
        {...bind}
        onFocus={() => { bind.onFocus(); setSecondEidTarget(false) }}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: dashed ? 14 : 16, fontWeight: 700, color: eidBad840 ? '#E24B4A' : '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}
      />
    )
  }

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

  // The EID field — the rich scan/typed-tag block. Rendered in its config slot
  // among the identity fields below.
  const eidBlock = (
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
  )

  // Identity fields shown for this work type, in config sort_order. The on-demand
  // 2nd-EID slot stays pinned to the bottom of the card (it's off the normal flow).
  const identityInput = (key: string) => {
    switch (key) {
      case 'eid':
        return eidBlock
      case 'back_tag':
        return navyInput('backTag', 'Back Tag', 'Scan the back tag barcode')
      default:
        return null
    }
  }

  // Typed (non-scannable) ID fields render below the navy bar on a light card, in
  // dark-on-white inputs that match the other typed fields.
  const typedTagInput = (key: string) => {
    const meta =
      key === 'visual_tag'
        ? { prop: 'visualTag' as const, label: 'Tag #', ph: 'Type the tag number' }
        : key === 'metal_tag'
          ? { prop: 'metalTag' as const, label: 'Metal Tag', ph: 'Type the metal tag' }
          : null
    if (!meta) return null
    const { prop, label, ph } = meta
    const bind = kbd.bind(key, draft[prop], (val) => patchDraft({ [prop]: val } as Partial<typeof draft>))
    return (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 64, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 3 }}>{label}{required(key) && <RequiredMark />}</div>
        <input
          ref={(el) => { idRefs.current[prop] = el }}
          value={draft[prop]}
          onChange={(e) => patchDraft({ [prop]: e.target.value } as Partial<typeof draft>)}
          onKeyDown={swallowEnter}
          placeholder={ph}
          {...bind}
          onFocus={() => { bind.onFocus(); setSecondEidTarget(false) }}
          style={{ flex: 1, minWidth: 0, height: 46, padding: '0 13px', borderRadius: 11, background: '#FFFFFF', border: '1px solid #D4D4D0', color: '#1A1A1A', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, outline: 'none' }}
        />
      </div>
    )
  }

  const orderedIdentity = (['eid', 'back_tag', 'visual_tag', 'metal_tag'] as const)
    .filter((k) => api.shows(k))
    .sort((a, b) => (resolved.get(a)?.sort_order ?? 0) - (resolved.get(b)?.sort_order ?? 0))
  // Scannable IDs (EID, back tag, plus the tap-to-reveal 2nd EID) stay in the navy
  // bar; typed IDs (visual / metal tag) drop below it. Driven by the field
  // library's scannable property, not a hard-coded "visual tag goes below".
  const scannableIds = orderedIdentity.filter((k) => isScannableField(k))
  const typedIds = orderedIdentity.filter((k) => !isScannableField(k))

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
      />

      {/* Animals + Close out sit on their OWN row beneath the title, so the pen +
          consignor name gets the full width of the header and isn't clipped on a
          phone (it used to share the row with these two buttons). */}
      <div className="sbv-screenheader" style={{ flexShrink: 0 }}>
        {/* Two distinct buttons, pushed to the edges of the content column:
            Animals (teal) hugs the left like the title/labels, Close out (gold)
            hugs the right. Different colors so they don't read as one pair, and
            edge-aligned with the rest of the text instead of floating centered. */}
        <div className="sbv-container" style={{ paddingTop: 0, paddingBottom: 10, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={onOpenAnimals}
            aria-label="Animals worked"
            style={{ minHeight: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 16px', borderRadius: 999, background: 'rgba(85,186,170,0.16)', border: '1px solid rgba(85,186,170,0.55)', color: '#7FD3C4', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}
          >
            Animals {worked}
          </button>
          <button
            type="button"
            onClick={onOpenCloseOut}
            style={{ minHeight: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 16px', borderRadius: 999, background: 'rgba(243,209,42,0.16)', border: '1px solid rgba(243,209,42,0.55)', color: '#F3D12A', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            <CloseOutIcon size={15} color="#F3D12A" sw={2.2} />
            Close out
          </button>
        </div>
      </div>

      <div className="sbv-screenheader" style={{ position: 'relative', zIndex: 1, boxShadow: '0 6px 18px rgba(8,18,40,0.30)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
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

          {/* identity — SCANNABLE fields in the navy scan bar; typed tags below */}
          <div style={{ background: '#0E2646', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#8FA8CC', textTransform: 'uppercase', marginBottom: 11 }}>
              Identity · {bootstrap.barn.official_id_type} barn
            </div>
            {scannableIds.map((k) => (
              <Fragment key={k}>{identityInput(k)}</Fragment>
            ))}

            {/* Tap-to-reveal second EID — scannable, but a TAP-ONLY target: the
                next 15-digit EID lands here only while it's tapped (shown by the
                teal ring), then routing reverts to the primary EID. */}
            {api.shows('eid') && (secondaryEidOpen || draft.eid2.trim() ? (() => {
              const bind = kbd.bind('eid2', draft.eid2, (v) => patchDraft({ eid2: cleanEid(v) }))
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
                  <div style={{ width: 60, flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#C9D5EA' }}>2nd EID</div>
                  <div style={{ flex: 1, minWidth: 0, height: 46, display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', borderRadius: 11, background: 'rgba(255,255,255,0.08)', border: `1px solid ${secondEidTarget ? '#55BAAA' : 'rgba(255,255,255,0.18)'}`, boxShadow: secondEidTarget ? '0 0 0 3px rgba(85,186,170,0.35)' : 'none' }}>
                    <input
                      ref={(el) => { idRefs.current['eid2'] = el }}
                      value={draft.eid2}
                      onChange={(e) => patchDraft({ eid2: cleanEid(e.target.value) })}
                      onKeyDown={swallowEnter}
                      placeholder={secondEidTarget ? 'Scan the second EID' : 'Tap, then scan the 2nd EID'}
                      {...bind}
                      onFocus={() => { bind.onFocus(); setSecondEidTarget(true) }}
                      style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}
                    />
                    {secondEidTarget && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', color: '#7FD3C4' }}>SCANNING</span>}
                    <button type="button" aria-label="Remove second EID" onClick={() => { patchDraft({ eid2: '' }); setSecondaryEidOpen(false); setSecondEidTarget(false) }} style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      <XIcon size={15} color="#C9D5EA" sw={2.2} />
                    </button>
                  </div>
                </div>
              )
            })() : (
              <button
                type="button"
                onClick={() => { setSecondaryEidOpen(true); setSecondEidTarget(true) }}
                style={{ marginTop: 4, height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 999, background: 'transparent', border: '1px dashed rgba(255,255,255,0.32)', color: '#C9D5EA', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                + 2nd EID
              </button>
            ))}
          </div>

          {/* Typed ID tags (visual / metal) — typed by hand, so they sit below the
              navy scan bar with the other typed fields. */}
          {typedIds.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E4E4DE', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {typedIds.map((k) => typedTagInput(k))}
            </div>
          )}

          {/* attributes + quick notes + note — shared, config-driven; keyed by
              the worked count so its expand/note state resets after each save. */}
          <AnimalAttributes
            key={worked}
            bootstrap={bootstrap}
            resolved={resolved}
            draft={draft}
            patch={patchDraft}
            quickNotesLeading={sortRow}
            bindKeyboard={kbd.bind}
          />
        </div>
      </div>

      {/* save bar — with the always-visible app-keyboard toggle on the left */}
      <div style={{ flexShrink: 0, background: '#FFFFFF', borderTop: '1px solid #E4E4DE', padding: kbd.open ? '12px 16px' : '12px 16px calc(18px + env(safe-area-inset-bottom))', boxShadow: '0 -6px 18px rgba(8,18,40,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={kbd.toggle}
          aria-label={kbd.open ? 'Hide on-screen keyboard' : 'Show on-screen keyboard'}
          aria-pressed={kbd.open}
          style={{ flexShrink: 0, width: 56, height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 13, background: kbd.open ? '#0E2646' : '#F5F5F0', border: `1px solid ${kbd.open ? '#0E2646' : '#D4D4D0'}`, cursor: 'pointer' }}
        >
          <KeyboardIcon size={24} color={kbd.open ? '#FFFFFF' : '#0E2646'} sw={1.9} />
        </button>
        <Button
          variant="primary"
          type="button"
          onClick={() => void onSaveNext()}
          disabled={saving}
          fullWidth
          style={{ flex: 1, height: 56, gap: 9, borderRadius: 13, fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}
        >
          {draft.sortPenId ? <SortIcon size={20} color="#0E2646" sw={2.6} /> : <CheckIcon size={20} color="#0E2646" sw={2.6} />}
          {draft.sortPenId ? 'Sort & next' : 'Save & next'}
        </Button>
      </div>

      {kbd.open && (
        <OnScreenKeyboard onInsert={kbd.insert} onBackspace={kbd.backspace} onDone={kbd.dismiss} />
      )}
    </div>
  )
}
