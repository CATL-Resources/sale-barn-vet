'use client'

import { colors } from '@/components/ui/tokens'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STATUS_LABEL, type WorkStatus } from '@/lib/work-orders/status'
import type { Barn, PenWorkFull, SaleDay } from '@/lib/work-orders/types'
import { startCapture } from '@/lib/work-orders/start-capture'
import { setPenUp, setPenDefaults } from '@/app/(office)/work-list/actions'
import { AnimalListModal } from '@/components/work-orders/board/animal-list-modal'
import { AnimalAttributes } from '@/components/capture/animal-attributes'
import { resolveFields, applyPenDefaults, extractPenDefaults, type PenFieldDefaults } from '@/lib/capture/fields'
import { emptyDraft, type AnimalDraft, type CaptureBootstrap } from '@/lib/capture/types'
import { ScreenHeader } from '@/components/ui/screen-header'
import { HeaderBack } from '@/components/ui/header-back'
import { SectionCard } from '@/components/ui/section-card'
import { Button, buttonClass } from '@/components/ui/button'
import { CheckIcon, FlagIcon, CameraIcon } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'

// Only two states show here — finished jobs are filtered out before this screen.
type ListStatus = 'not_started' | 'in_progress'

const STATUS_STYLE: Record<ListStatus, { bg: string; border: string; color: string; dot: string }> = {
  not_started: { bg: '#F3F3F0', border: '#E4E4DE', color: '#717182', dot: '#C2C2CA' },
  in_progress: { bg: '#FDF1DC', border: '#F1D9A8', color: '#B45309', dot: '#F59E0B' },
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// The pen as shown to the crew: "Pen 4". Falls back when a job has no pen yet.
function penLabel(pw: PenWorkFull) {
  return pw.pen?.pen_number ? `Pen ${pw.pen.pen_number}` : 'No pen'
}

// Buyer number: the typed text first, then the linked buyer-number record.
function buyerNo(pw: PenWorkFull): string | null {
  return pw.buyer_number_text?.trim() || pw.buyerNumber?.number?.trim() || null
}

// Notes show as a small teal flag (no "Note" word). Tapping it opens the note —
// same as tapping the card. Shown only when the job has a note.
function NoteFlag({ onOpen }: { onOpen: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Show the note"
      onClick={(e) => { e.stopPropagation(); onOpen() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpen() } }}
      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: colors.tealPillBg, border: `1px solid ${colors.teal}`, color: colors.teal, cursor: 'pointer' }}
    >
      <FlagIcon size={14} strokeWidth={2.4} style={{ color: colors.teal }} />
    </span>
  )
}

// Marker shown on a card when the job has saved photos. Tapping opens the viewer.
function PhotoMarker({ onOpen }: { onOpen: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="View photos"
      onClick={(e) => { e.stopPropagation(); onOpen() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpen() } }}
      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: colors.tealPillBg, border: `1px solid ${colors.teal}`, color: colors.teal, cursor: 'pointer' }}
    >
      <CameraIcon size={15} />
    </span>
  )
}

function StatusPill({ status }: { status: ListStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 11px', borderRadius: 999, background: s.bg, border: `1px solid ${s.border}`, fontSize: 12, fontWeight: 700, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot }} />{STATUS_LABEL[status as WorkStatus]}
    </span>
  )
}

// A Pen List filter chip (All / To Grab). Phone-comfortable tap target.
function FilterChip({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 40,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '0 16px',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 700,
        background: active ? colors.navy : '#fff',
        border: `1px solid ${active ? colors.navy : colors.border}`,
        color: active ? '#fff' : colors.textPrimary,
      }}
    >
      {label}
      <span style={{ fontSize: 12, fontWeight: 800, color: active ? '#fff' : colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </button>
  )
}

// A small up-caret for the "Staged" notation.
function CaretUp({ color, size = 11 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M6 15l6-6 6 6" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// A small gear for the "Set Default" notation.
function GearIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The yard-crew "Staged" marker — a small TEAL control in the actions row (no
// purple anywhere on this screen). It's a role="button" span with its own tap
// zone. Tap toggles it; the behavior, the To Grab filter, and auto-clear are all
// unchanged — only the color and size.
function StagedChip({ up, busy, onToggle }: { up: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={up}
      aria-label={up ? 'Staged — tap to clear' : 'Mark this pen staged'}
      onClick={(e) => { e.stopPropagation(); if (!busy) onToggle() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!busy) onToggle() } }}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        height: 40,
        padding: '0 14px',
        borderRadius: 999,
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.6 : 1,
        background: up ? colors.teal : colors.tealPillBg,
        border: `1px solid ${colors.teal}`,
        color: up ? '#fff' : colors.teal,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {up ? <CheckIcon size={12} strokeWidth={3} style={{ color: '#fff' }} /> : <CaretUp color={colors.teal} />}
      Staged
    </span>
  )
}

// The "Set Default" notation — a small gear, sized like the Staged chip. Tinted
// teal when this pen already has defaults set. Its own tap zone inside the card.
function SetDefaultChip({ hasDefaults, onOpen }: { hasDefaults: boolean; onOpen: () => void }) {
  const tint = hasDefaults ? colors.teal : colors.textMuted
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={hasDefaults ? 'Edit this pen’s default fields' : 'Set default fields for this pen'}
      onClick={(e) => { e.stopPropagation(); onOpen() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpen() } }}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 10,
        cursor: 'pointer',
        background: hasDefaults ? colors.tealPillBg : '#fff',
        border: `1px solid ${hasDefaults ? colors.teal : colors.border}`,
        color: tint,
      }}
    >
      <GearIcon color={tint} size={18} />
    </span>
  )
}

// Attach a photo to this job. Opens the device camera / file picker and uploads
// the image to Supabase Storage keyed by this pen_work. The hidden file input
// lives inside this span (the card is a div, so nesting an input is fine), and
// every tap stops the card's own open-detail tap.
function PhotoButton({ busy, onPick }: { busy: boolean; onPick: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = '' // let the same file be picked again
        }}
      />
      <span
        role="button"
        tabIndex={0}
        aria-label="Attach a photo"
        onClick={(e) => { e.stopPropagation(); if (!busy) inputRef.current?.click() }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!busy) inputRef.current?.click() } }}
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 10,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
          background: '#fff',
          border: `1px solid ${colors.border}`,
          color: colors.textMuted,
        }}
      >
        <CameraIcon size={18} />
      </span>
    </>
  )
}

export function WorkListScreen({
  saleDay, barn, penWorks, workedById, productsById, upByPenId, bootstrap, defaultsByPenId,
}: {
  saleDay: SaleDay
  barn: Barn
  penWorks: PenWorkFull[]
  workedById: Record<string, number>
  productsById: Record<string, string[]>
  upByPenId: Record<string, boolean>
  bootstrap: CaptureBootstrap | null
  defaultsByPenId: Record<string, PenFieldDefaults>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<PenWorkFull | null>(null)
  const [animalsFor, setAnimalsFor] = useState<PenWorkFull | null>(null)
  const [going, startGo] = useTransition()
  // The yard-crew "Staged" markers, kept locally so a tap flips instantly; seeded
  // from the server and persisted through setPenUp. Keyed by pen, so two jobs in
  // the same pen read (and toggle) the one marker together.
  const [upState, setUpState] = useState<Record<string, boolean>>(upByPenId)
  const [upBusy, setUpBusy] = useState<Record<string, boolean>>({})
  const [, startUp] = useTransition()
  // The "To Grab" view: only pens still needing work that aren't staged yet.
  const [toGrab, setToGrab] = useState(false)
  // Per-pen capture defaults, kept locally so the gear's "has defaults" tint and
  // the editor's pre-fill update instantly after a save. Keyed by pen.
  const [defaultsState, setDefaultsState] = useState<Record<string, PenFieldDefaults>>(defaultsByPenId)
  const [editing, setEditing] = useState<{ penId: string; penLabel: string; workTypeId: string | null; workTypeName: string } | null>(null)
  const [defBusy, setDefBusy] = useState(false)

  // Photo attach: per-job uploading state + a brief result note.
  const supabase = useMemo(() => createClient(), [])
  const [photoBusy, setPhotoBusy] = useState<Record<string, boolean>>({})
  const [photoMsg, setPhotoMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)
  // Which jobs have at least one saved photo (so the card can show a marker).
  // Read once on mount by listing the barn's folder in the pen-photos bucket —
  // each pen_work that has photos shows up as a sub-folder there.
  const [photoPens, setPhotoPens] = useState<Record<string, boolean>>({})
  // The job whose photos the viewer is showing.
  const [viewing, setViewing] = useState<PenWorkFull | null>(null)

  useEffect(() => {
    let alive = true
    supabase.storage
      .from('pen-photos')
      .list(barn.id, { limit: 1000 })
      .then(({ data }) => {
        if (!alive || !data) return
        // Folder entries (one per pen_work that has photos) come back with a null id.
        const next: Record<string, boolean> = {}
        for (const entry of data) if (entry.id === null) next[entry.name] = true
        setPhotoPens(next)
      })
    return () => { alive = false }
  }, [supabase, barn.id])

  const penUp = (penId: string | null | undefined) => !!(penId && upState[penId])

  // Attach a photo to a job: upload it to the pen-photos bucket, keyed by barn +
  // pen_work id so it's linked to this job. Client-side upload via the browser
  // Supabase client (bucket RLS scopes it to the barn). Never blocks the screen;
  // shows a short result note under the card.
  async function uploadPhoto(penWorkId: string, file: File) {
    setPhotoBusy((m) => ({ ...m, [penWorkId]: true }))
    setPhotoMsg(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${barn.id}/${penWorkId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('pen-photos').upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (error) throw error
      setPhotoMsg({ id: penWorkId, ok: true, text: 'Photo saved' })
      setPhotoPens((m) => ({ ...m, [penWorkId]: true })) // marker shows right away
    } catch {
      setPhotoMsg({ id: penWorkId, ok: false, text: 'Couldn’t upload — try again' })
    } finally {
      setPhotoBusy((m) => ({ ...m, [penWorkId]: false }))
      window.setTimeout(() => setPhotoMsg((cur) => (cur && cur.id === penWorkId ? null : cur)), 3200)
    }
  }

  function toggleUp(penId: string) {
    const next = !upState[penId]
    setUpState((m) => ({ ...m, [penId]: next }))
    setUpBusy((m) => ({ ...m, [penId]: true }))
    startUp(async () => {
      const res = await setPenUp(penId, saleDay.id, barn.id, next)
      if (!res.ok) setUpState((m) => ({ ...m, [penId]: !next })) // revert on failure
      setUpBusy((m) => ({ ...m, [penId]: false }))
    })
  }

  function openDefaults(pw: PenWorkFull) {
    if (!pw.pen?.id) return
    setEditing({
      penId: pw.pen.id,
      penLabel: penLabel(pw),
      workTypeId: pw.workType?.id ?? null,
      workTypeName: pw.workType?.name ?? 'Work',
    })
  }

  // Save (or clear, when empty) a pen's defaults, then update local state so the
  // gear tint reflects it without a reload.
  function saveDefaults(penId: string, defaults: PenFieldDefaults) {
    setDefBusy(true)
    startUp(async () => {
      const res = await setPenDefaults(penId, saleDay.id, barn.id, defaults)
      if (res.ok) {
        setDefaultsState((m) => {
          const next = { ...m }
          if (Object.keys(defaults).length) next[penId] = defaults
          else delete next[penId]
          return next
        })
        setEditing(null)
      }
      setDefBusy(false)
    })
  }

  const rows = useMemo(() => {
    return penWorks
      .map((pw) => {
        const isBuyer = !!pw.buyer_party_id
        const p = isBuyer ? pw.buyer : pw.seller
        const worked = workedById[pw.id] ?? 0
        // Expected head: what the office planned (fall back to the started count).
        const expected = pw.head_expected ?? pw.head_started ?? 0
        // Status is purely "has any animal been recorded yet?"
        const status: ListStatus = worked > 0 ? 'in_progress' : 'not_started'
        const headLeft = Math.max(0, expected - worked)
        return { pw, isBuyer, name: p?.name ?? '—', worked, expected, status, headLeft }
      })
      .sort((a, b) => {
        // In progress first, then not started; within each, by pen number.
        const rank = (s: ListStatus) => (s === 'in_progress' ? 0 : 1)
        if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status)
        const ap = a.pw.pen?.pen_number ?? ''
        const bp = b.pw.pen?.pen_number ?? ''
        if (!ap !== !bp) return ap ? -1 : 1 // jobs without a pen sink to the bottom
        return ap.localeCompare(bp, undefined, { numeric: true, sensitivity: 'base' })
      })
  }, [penWorks, workedById])

  const toWork = rows.length
  const headLeft = rows.reduce((a, r) => a + r.headLeft, 0)

  // To Grab = still has work (every row here does — finished pens are dropped
  // before this screen) AND not up. A pen that gets worked to complete leaves on
  // its own because it's no longer in the list at all.
  const toGrabRows = rows.filter((r) => !penUp(r.pw.pen?.id))
  const toGrabCount = toGrabRows.length
  const visibleRows = toGrab ? toGrabRows : rows

  function go(pw: PenWorkFull) {
    startGo(async () => {
      await startCapture(pw.id, (href) => router.push(href))
    })
  }

  const headText = (r: { worked: number; expected: number; status: ListStatus }) =>
    r.status === 'in_progress' ? `${r.worked} of ${r.expected} head` : `${r.expected} head`

  return (
    <>
      {/* HEADER — one tight navy block: title + date on the left, the pen/head
          summary on a single condensed line to the right. Same on phone and tablet. */}
      <ScreenHeader
        title="Work List"
        subtitle={shortDate(saleDay.sale_date)}
        back={<HeaderBack href={`/day/${saleDay.id}`} label="Back to Sale Dashboard" />}
        right={
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.gold, whiteSpace: 'nowrap', textAlign: 'right' }}>{toWork} {toWork === 1 ? 'pen' : 'pens'} · {headLeft} head left</span>
        }
      />

      <div className="wl-wrap">
      {/* FILTERS — All vs the yard's To Grab view (pens still needing work that
          aren't up yet). */}
      {rows.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterChip active={!toGrab} label="All" count={toWork} onClick={() => setToGrab(false)} />
          <FilterChip active={toGrab} label="To Grab" count={toGrabCount} onClick={() => setToGrab(true)} />
        </div>
      ) : null}

      {/* LIST */}
      {rows.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.navy }}>Nothing Left to Work</div>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Every job for this sale day is complete.</div>
        </div>
      ) : visibleRows.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.navy }}>Every Pen Is Up</div>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Nothing left to grab — every pen still needing work has been brought up.</div>
        </div>
      ) : (
        visibleRows.map((r) => (
          <div
            key={r.pw.id}
            role="button"
            tabIndex={0}
            className="wl-card"
            onClick={() => setSelected(r.pw)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r.pw) } }}
          >
            {/* Row 1 — identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>{penLabel(r.pw)}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.teal, minWidth: 0 }}>{r.name}</span>
              {r.isBuyer ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: colors.navy, background: colors.gold, borderRadius: 999, padding: '2px 8px' }}>Buyer #{buyerNo(r.pw) ?? '—'}</span> : null}
              <div style={{ flex: 1 }} />
              {photoPens[r.pw.id] ? <PhotoMarker onOpen={() => setViewing(r.pw)} /> : null}
              {r.pw.notes ? <NoteFlag onOpen={() => setSelected(r.pw)} /> : null}
              <StatusPill status={r.status} />
            </div>

            {/* meta — work type + the tap-to-see-animals head count */}
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>
              {r.pw.workType?.name ?? 'Work'} · {r.worked > 0 ? (
                <span role="button" tabIndex={0} aria-label="Show the animals worked" onClick={(e) => { e.stopPropagation(); setAnimalsFor(r.pw) }} style={{ color: colors.teal, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>{headText(r)}</span>
              ) : headText(r)}
            </div>

            {/* Row 2 — actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {r.pw.pen?.id ? (
                <StagedChip up={penUp(r.pw.pen.id)} busy={!!upBusy[r.pw.pen.id]} onToggle={() => toggleUp(r.pw.pen!.id)} />
              ) : null}
              {r.pw.pen?.id && bootstrap ? (
                <SetDefaultChip hasDefaults={!!defaultsState[r.pw.pen.id]} onOpen={() => openDefaults(r.pw)} />
              ) : null}
              <PhotoButton busy={!!photoBusy[r.pw.id]} onPick={(f) => uploadPhoto(r.pw.id, f)} />
              <div style={{ flex: 1 }} />
              <span
                role="button"
                tabIndex={0}
                aria-label={r.status === 'in_progress' ? 'Resume' : 'Open'}
                onClick={(e) => { e.stopPropagation(); go(r.pw) }}
                className={buttonClass(r.status === 'in_progress' ? 'outline' : 'primary', false, 'wl-rowaction')}
                style={{ flexShrink: 0, height: 40, gap: 7, padding: '0 18px', borderRadius: 9, fontSize: 14, cursor: going ? 'default' : 'pointer', opacity: going ? 0.6 : 1 }}
              >
                {r.status === 'in_progress' ? 'Resume' : 'Open'} ›
              </span>
            </div>

            {photoBusy[r.pw.id] ? (
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted }}>Uploading photo…</div>
            ) : photoMsg && photoMsg.id === r.pw.id ? (
              <div style={{ fontSize: 12, fontWeight: 700, color: photoMsg.ok ? colors.teal : colors.danger }}>{photoMsg.text}</div>
            ) : null}
          </div>
        ))
      )}

      {/* READ-ONLY DETAIL */}
      {selected ? (
        <Detail
          pw={selected}
          worked={workedById[selected.id] ?? 0}
          products={productsById[selected.id] ?? []}
          onBack={() => setSelected(null)}
          onStart={() => go(selected)}
          going={going}
        />
      ) : null}

      {/* ANIMALS WORKED — tapping the "x of y head" count opens the list */}
      {animalsFor ? (
        <AnimalListModal
          penWorkId={animalsFor.id}
          title={`${penLabel(animalsFor)} · ${(animalsFor.buyer_party_id ? animalsFor.buyer : animalsFor.seller)?.name ?? '—'}`}
          onClose={() => setAnimalsFor(null)}
        />
      ) : null}

      {/* PHOTOS — tapping the photo marker opens this job's saved photos full size */}
      {viewing ? (
        <PhotoViewer
          supabase={supabase}
          barnId={barn.id}
          penWorkId={viewing.id}
          title={`${penLabel(viewing)} · ${(viewing.buyer_party_id ? viewing.buyer : viewing.seller)?.name ?? '—'}`}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {/* SET DEFAULTS — the per-pen editor (same fields the work type captures) */}
      {editing && bootstrap ? (
        <PenDefaultsEditor
          bootstrap={bootstrap}
          workTypeId={editing.workTypeId}
          penLabel={editing.penLabel}
          workTypeName={editing.workTypeName}
          initial={defaultsState[editing.penId] ?? {}}
          busy={defBusy}
          onSave={(d) => saveDefaults(editing.penId, d)}
          onClear={() => saveDefaults(editing.penId, {})}
          onClose={() => setEditing(null)}
        />
      ) : null}
      </div>
    </>
  )
}

// The per-pen defaults editor. Reuses the shared AnimalAttributes so it renders
// exactly the fields this work type captures (no hard-coded list) — the office
// sets defaults on the ones they want and leaves the rest blank. Saves through
// setPenDefaults into pen_session.field_defaults.
function PenDefaultsEditor({
  bootstrap, workTypeId, penLabel, workTypeName, initial, busy, onSave, onClear, onClose,
}: {
  bootstrap: CaptureBootstrap
  workTypeId: string | null
  penLabel: string
  workTypeName: string
  initial: PenFieldDefaults
  busy: boolean
  onSave: (d: PenFieldDefaults) => void
  onClear: () => void
  onClose: () => void
}) {
  const resolved = useMemo(() => resolveFields(bootstrap.fields, workTypeId), [bootstrap.fields, workTypeId])
  const [draft, setDraft] = useState<AnimalDraft>(() => applyPenDefaults(emptyDraft(), initial))
  const patch = (p: Partial<AnimalDraft>) => setDraft((d) => ({ ...d, ...p }))

  // Only the attribute / note fields can be defaulted; identity tags are per-animal.
  const hasFields = ['age', 'breed', 'hide_color', 'preg_stage', 'fetal_sex', 'quick_notes', 'notes'].some(
    (k) => resolved.get(k)?.is_displayed,
  )
  const setCount = Object.keys(extractPenDefaults(draft)).length

  return (
    <Modal
      size="md"
      align="top"
      zIndex={70}
      onClose={onClose}
      overlayStyle={{ padding: 0 }}
      panelStyle={{ background: '#F5F5F0', borderRadius: 0, boxShadow: 'none' }}
    >
      <div style={{ background: colors.navy, flexShrink: 0, padding: '14px 16px 16px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={onClose} aria-label="Back" style={{ width: 34, height: 34, flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22 }}>‹</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>Set Defaults · {penLabel}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#55BAAA', marginTop: 1 }}>{workTypeName} · pre-fills every animal in this pen</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 11, flex: 1, overflowY: 'auto' }}>
        {hasFields ? (
          <AnimalAttributes bootstrap={bootstrap} resolved={resolved} draft={draft} patch={patch} />
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.navy }}>No default-able fields</div>
            <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>This work type only collects per-animal tags, which can’t be defaulted.</div>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, background: '#fff', borderTop: `1px solid ${colors.border}`, padding: '12px 16px 18px', display: 'flex', gap: 10 }}>
        <Button variant="outline" type="button" onClick={onClear} disabled={busy} style={{ flexShrink: 0, height: 52, padding: '0 18px', borderRadius: 13, fontSize: 15, fontWeight: 700 }}>
          Clear
        </Button>
        <Button variant="primary" type="button" onClick={() => onSave(extractPenDefaults(draft))} disabled={busy || !hasFields} fullWidth style={{ flex: 1, height: 52, borderRadius: 13, fontSize: 16, fontWeight: 800 }}>
          {busy ? 'Saving…' : setCount > 0 ? `Save ${setCount} default${setCount === 1 ? '' : 's'}` : 'Save (no defaults)'}
        </Button>
      </div>
    </Modal>
  )
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${colors.rowDivider}` }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function Detail({
  pw, worked, products, onBack, onStart, going,
}: {
  pw: PenWorkFull
  worked: number
  products: string[]
  onBack: () => void
  onStart: () => void
  going: boolean
}) {
  const isBuyer = !!pw.buyer_party_id
  const p = isBuyer ? pw.buyer : pw.seller
  const status: ListStatus = worked > 0 ? 'in_progress' : 'not_started'
  const name = p?.name ?? '—'
  const expected = pw.head_expected ?? pw.head_started ?? 0
  const hasProducts = products.length > 0
  return (
    <Modal
      size="md"
      align="top"
      zIndex={70}
      onClose={onBack}
      overlayStyle={{ padding: 0 }}
      panelStyle={{ background: '#F5F5F0', borderRadius: 0, boxShadow: 'none' }}
    >
        <div style={{ background: colors.navy, flexShrink: 0, padding: '14px 16px 16px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={onBack} aria-label="Back" style={{ width: 34, height: 34, flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22 }}>‹</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>{penLabel(pw)} · {name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#55BAAA', marginTop: 1 }}>{pw.workType?.name ?? 'Work'} · {expected} head expected</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
          <SectionCard title="Work Order">
            <DetailRow label="Consignor" value={`${name} · ${isBuyer ? 'Buyer' : 'Seller'}`} />
            <DetailRow label="Work Type" value={pw.workType?.name ?? '—'} />
            <DetailRow label="Animal Type" value={pw.animalType?.name ?? '—'} last={!hasProducts} />
            {hasProducts ? <DetailRow label="Products" value={products.join(' · ')} last /> : null}
          </SectionCard>

          {pw.notes ? (
            <SectionCard title="Notes">
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary, lineHeight: 1.45 }}>{pw.notes}</div>
            </SectionCard>
          ) : null}
        </div>

        <div style={{ flexShrink: 0, background: '#fff', borderTop: `1px solid ${colors.border}`, padding: '12px 16px 18px' }}>
          <Button
            variant={status === 'in_progress' ? 'outline' : 'primary'}
            type="button"
            onClick={onStart}
            disabled={going}
            fullWidth
            style={{ height: 56, gap: 9, borderRadius: 13, fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}
          >
            {going ? 'Opening…' : status === 'in_progress' ? 'Resume' : 'Start Working'} ›
          </Button>
        </div>
    </Modal>
  )
}

// Full-size viewer for a job's saved photos. Reads straight from the same place
// the upload writes — the pen-photos bucket under <barn>/<pen_work> — and signs
// each object (the bucket is private). Pages through when there's more than one.
function PhotoViewer({
  supabase, barnId, penWorkId, title, onClose,
}: {
  supabase: ReturnType<typeof createClient>
  barnId: string
  penWorkId: string
  title: string
  onClose: () => void
}) {
  const [urls, setUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data, error } = await supabase.storage
        .from('pen-photos')
        .list(`${barnId}/${penWorkId}`, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
      if (!alive) return
      if (error || !data) { setFailed(true); setLoading(false); return }
      const files = data.filter((e) => e.id !== null) // real files, not nested folders
      if (!files.length) { setLoading(false); return }
      const paths = files.map((f) => `${barnId}/${penWorkId}/${f.name}`)
      const { data: signed } = await supabase.storage.from('pen-photos').createSignedUrls(paths, 3600)
      if (!alive) return
      setUrls((signed ?? []).map((s) => s.signedUrl).filter((u): u is string => !!u))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [supabase, barnId, penWorkId])

  const count = urls.length
  const cur = count ? Math.min(idx, count - 1) : 0
  const navBtnStyle = { height: 40, padding: '0 16px', borderRadius: 9, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' } as const

  return (
    <Modal size="lg" zIndex={80} onClose={onClose} panelStyle={{ background: colors.navy }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ flex: 1, minWidth: 0, color: '#fff' }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#55BAAA', marginTop: 1 }}>
            {loading ? 'Loading photos…' : count ? `Photo ${cur + 1} of ${count}` : 'Photos'}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, flexShrink: 0, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 9, cursor: 'pointer', color: '#fff', fontSize: 18 }}>✕</button>
      </div>

      <div style={{ minHeight: 320, maxHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, background: '#0A1B33' }}>
        {loading ? (
          <span style={{ color: '#8FA8CC', fontSize: 14, fontWeight: 600 }}>Loading…</span>
        ) : failed ? (
          <span style={{ color: '#F3B0B0', fontSize: 14, fontWeight: 600 }}>Couldn’t load photos — try again.</span>
        ) : count === 0 ? (
          <span style={{ color: '#8FA8CC', fontSize: 14, fontWeight: 600 }}>No photos yet.</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urls[cur]} alt={`Photo ${cur + 1}`} style={{ maxWidth: '100%', maxHeight: '66vh', objectFit: 'contain', borderRadius: 8 }} />
        )}
      </div>

      {count > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <button type="button" onClick={() => setIdx((i) => (i - 1 + count) % count)} style={navBtnStyle}>‹ Prev</button>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{cur + 1} / {count}</span>
          <button type="button" onClick={() => setIdx((i) => (i + 1) % count)} style={navBtnStyle}>Next ›</button>
        </div>
      ) : null}
    </Modal>
  )
}
