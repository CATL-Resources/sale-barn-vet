'use client'

import { colors } from '@/components/ui/tokens'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STATUS_LABEL, type WorkStatus } from '@/lib/work-orders/status'
import type { Barn, PenWorkFull, SaleDay } from '@/lib/work-orders/types'
import { startCapture } from '@/lib/work-orders/start-capture'
import { setPenUp, setPenDefaults, setPenWorkNote } from '@/app/(office)/work-list/actions'
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

// A little printer outline for the "label printed" mark.
function PrinterIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M6 9V3h12v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="9" width="18" height="8" rx="2" stroke={color} strokeWidth={2} />
      <path d="M7 15h10v6H7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Small read-only marks on a card: a teal camera when the job has any photo, a
// teal flag when it has a note, and a muted printer once its pen card label has
// been printed (so the cards WITHOUT it are the new, unprinted ones). They're
// indicators only — tapping anywhere on the card opens the job popup.
const INDICATOR_LABEL = { photo: 'Has a photo', note: 'Has a note', printed: 'Label printed' } as const
function IndicatorTag({ kind }: { kind: 'photo' | 'note' | 'printed' }) {
  const printed = kind === 'printed'
  const tint = printed ? colors.textMuted : colors.teal
  return (
    <span
      aria-label={INDICATOR_LABEL[kind]}
      title={INDICATOR_LABEL[kind]}
      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: printed ? '#F3F3F0' : colors.tealPillBg, border: `1px solid ${printed ? colors.border : colors.teal}`, color: tint }}
    >
      {kind === 'photo' ? <CameraIcon size={14} /> : kind === 'note' ? <FlagIcon size={13} strokeWidth={2.4} style={{ color: colors.teal }} /> : <PrinterIcon size={14} color={tint} />}
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

// A Pen List filter / group chip. Phone-comfortable tap target. The count is
// optional — the group toggles (By Pen / By Work Type) don't carry one.
function FilterChip({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
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
      {count != null ? <span style={{ fontSize: 12, fontWeight: 800, color: active ? '#fff' : colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>{count}</span> : null}
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
// unchanged. When staged it fills with a brighter, more saturated teal-green so a
// staged pen reads at a glance across the yard; the off state is unchanged.
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
        background: up ? colors.tealBright : colors.tealPillBg,
        border: `1px solid ${up ? colors.tealBright : colors.teal}`,
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
  // How the list is grouped (a flat pen-sorted list, or one section per work
  // type) and whether fully-worked ("done") jobs are hidden.
  const [groupBy, setGroupBy] = useState<'pen' | 'workType'>('pen')
  const [hideDone, setHideDone] = useState(false)
  // Per-pen capture defaults, kept locally so the gear's "has defaults" tint and
  // the editor's pre-fill update instantly after a save. Keyed by pen.
  const [defaultsState, setDefaultsState] = useState<Record<string, PenFieldDefaults>>(defaultsByPenId)
  const [editing, setEditing] = useState<{ penId: string; penLabel: string; workTypeId: string | null; workTypeName: string } | null>(null)
  const [defBusy, setDefBusy] = useState(false)

  const supabase = useMemo(() => createClient(), [])
  // Which jobs have at least one saved photo, and which have a note — so the card
  // can show its small indicator icons. The photo set is read by listing the
  // barn's folder in the pen-photos bucket (each pen_work with photos shows up as
  // a sub-folder); notes seed from the loaded rows. Both update in place when a
  // photo or note is added from the popup so the icons appear right away, and both
  // re-sync on every server refresh (below) so a change made on another device
  // shows up here without a manual reload.
  const [photoPens, setPhotoPens] = useState<Record<string, boolean>>({})
  const [noteByPwId, setNoteByPwId] = useState<Record<string, string | null>>(
    () => Object.fromEntries(penWorks.map((pw) => [pw.id, pw.notes])),
  )

  // The latest in-flight "Staged" pens, held in a ref so the reconcile effect can
  // read it without re-running each time a save starts or finishes.
  const upBusyRef = useRef(upBusy)
  upBusyRef.current = upBusy

  // List the barn's photo folders so the camera icons are right. Re-runs whenever
  // the server data refreshes (penWorks gets a fresh reference), so a photo added
  // on another device lights up the icon here too.
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
  }, [supabase, barn.id, penWorks])

  // Pull fresh server data on a timer and whenever the tab/app comes back to the
  // foreground, so staged markers, notes, defaults and photo icons changed on other
  // devices appear without anyone logging out and back in. router.refresh() re-runs
  // the page's server fetch and hands this component new props; the effects below
  // fold those props into the local optimistic state.
  useEffect(() => {
    const refresh = () => router.refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 20000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])

  // Re-seed the "Staged" markers from the server whenever fresh data arrives.
  // upByPenId only lists staged pens, so rebuilding from it also clears a pen that
  // was un-staged on another device. We keep the local value for any pen whose own
  // save is still in flight, so a refresh never reverts a tap mid-save.
  useEffect(() => {
    setUpState((prev) => {
      const busy = upBusyRef.current
      const next: Record<string, boolean> = { ...upByPenId }
      for (const penId of Object.keys(busy)) {
        if (busy[penId]) next[penId] = !!prev[penId]
      }
      return next
    })
  }, [upByPenId])

  // Re-seed notes and per-pen defaults from the server on every refresh, so edits
  // made on another device show here too.
  useEffect(() => {
    setNoteByPwId(Object.fromEntries(penWorks.map((pw) => [pw.id, pw.notes])))
  }, [penWorks])

  useEffect(() => {
    setDefaultsState(defaultsByPenId)
  }, [defaultsByPenId])

  const penUp = (penId: string | null | undefined) => !!(penId && upState[penId])

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

  type Row = (typeof rows)[number]

  const toWork = rows.length
  const headLeft = rows.reduce((a, r) => a + r.headLeft, 0)

  // "Done" = worked to the full head count but the office hasn't closed it out
  // yet (truly finished jobs are already dropped before this screen). The
  // Hide-done filter takes these out of the way.
  const isDone = (r: Row) => r.headLeft === 0 && r.worked > 0
  const doneCount = rows.filter(isDone).length

  // To Grab = still has work (every row here does) AND not up. A pen worked to
  // complete leaves on its own because it's no longer in the list at all.
  const toGrabCount = rows.filter((r) => !penUp(r.pw.pen?.id)).length

  // Apply the two filters (To Grab view + Hide done), then group: either one
  // flat pen-sorted list, or a section per work type (each pen-sorted).
  const filtered = rows.filter((r) => {
    if (toGrab && penUp(r.pw.pen?.id)) return false
    if (hideDone && isDone(r)) return false
    return true
  })

  const byPen = (a: Row, b: Row) => {
    const ap = a.pw.pen?.pen_number ?? ''
    const bp = b.pw.pen?.pen_number ?? ''
    if (!ap !== !bp) return ap ? -1 : 1 // jobs without a pen sink to the bottom
    return ap.localeCompare(bp, undefined, { numeric: true, sensitivity: 'base' })
  }

  const sections: { key: string; label: string | null; rows: Row[] }[] =
    groupBy === 'workType'
      ? (() => {
          const map = new Map<string, Row[]>()
          for (const r of filtered) {
            const key = r.pw.workType?.name ?? 'Other Work'
            const list = map.get(key)
            if (list) list.push(r)
            else map.set(key, [r])
          }
          return [...map.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
            .map(([label, rs]) => ({ key: label, label, rows: rs.sort(byPen) }))
        })()
      : [{ key: 'all', label: null, rows: [...filtered].sort(byPen) }]

  function go(pw: PenWorkFull) {
    startGo(async () => {
      await startCapture(pw.id, (href) => router.push(href))
    })
  }

  const headText = (r: { worked: number; expected: number; status: ListStatus }) =>
    r.status === 'in_progress' ? `${r.worked} of ${r.expected} head` : `${r.expected} head`

  const renderCard = (r: Row) => (
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
        {photoPens[r.pw.id] ? <IndicatorTag kind="photo" /> : null}
        {noteByPwId[r.pw.id] ? <IndicatorTag kind="note" /> : null}
        {r.pw.label_printed_at ? <IndicatorTag kind="printed" /> : null}
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
    </div>
  )

  return (
    <>
      {/* HEADER — one tight navy block: title + date on the left, the pen/head
          summary on a single condensed line to the right. Same on phone and tablet. */}
      <ScreenHeader
        title="Work List"
        subtitle={shortDate(saleDay.sale_date)}
        back={<HeaderBack href="/" label="Home" />}
        right={
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.gold, whiteSpace: 'nowrap', textAlign: 'right' }}>{toWork} {toWork === 1 ? 'pen' : 'pens'} · {headLeft} head left</span>
        }
      />

      <div className="wl-wrap">
      {/* CONTROLS — the view filter (All / To Grab / Hide done) and how the list
          is grouped (by pen or by work type). */}
      {rows.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <FilterChip active={!toGrab} label="All" count={toWork} onClick={() => setToGrab(false)} />
            <FilterChip active={toGrab} label="To Grab" count={toGrabCount} onClick={() => setToGrab(true)} />
            {doneCount > 0 || hideDone ? (
              <FilterChip active={hideDone} label="Hide done" count={doneCount} onClick={() => setHideDone((v) => !v)} />
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, marginRight: 2 }}>Group</span>
            <FilterChip active={groupBy === 'pen'} label="By Pen" onClick={() => setGroupBy('pen')} />
            <FilterChip active={groupBy === 'workType'} label="By Work Type" onClick={() => setGroupBy('workType')} />
          </div>
        </div>
      ) : null}

      {/* LIST */}
      {rows.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.navy }}>Nothing Left to Work</div>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Every job for this sale day is complete.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.navy }}>{toGrab ? 'Every Pen Is Up' : hideDone ? 'All Done Here' : 'Nothing to Show'}</div>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>
            {toGrab
              ? 'Nothing left to grab — every pen still needing work has been brought up.'
              : hideDone
                ? 'Every remaining job is fully worked. Turn off “Hide done” to see them.'
                : 'No pens match the current view.'}
          </div>
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {section.label ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', color: colors.navy }}>{section.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>{section.rows.length} {section.rows.length === 1 ? 'pen' : 'pens'}</span>
              </div>
            ) : null}
            {section.rows.map((r) => renderCard(r))}
          </div>
        ))
      )}

      {/* JOB POPUP — the work-order summary plus the one place to add and view a
          job's photos and note. */}
      {selected ? (
        <Detail
          pw={selected}
          worked={workedById[selected.id] ?? 0}
          products={productsById[selected.id] ?? []}
          supabase={supabase}
          barnId={barn.id}
          note={noteByPwId[selected.id] ?? null}
          onNoteSaved={(v) => setNoteByPwId((m) => ({ ...m, [selected.id]: v }))}
          onPhotoAdded={() => setPhotoPens((m) => ({ ...m, [selected.id]: true }))}
          onPhotoCountChanged={(n) => setPhotoPens((m) => ({ ...m, [selected.id]: n > 0 }))}
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
      <div style={{ background: colors.navy, flexShrink: 0, padding: 'calc(14px + env(safe-area-inset-top)) 16px 16px', color: '#fff' }}>
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

// A saved photo: the signed URL to show it and the storage path to delete it.
type Photo = { url: string; path: string }

// Shrink a picked image to a JPEG before upload. We cap the longest edge at
// ~1600px and re-encode at ~0.8 quality. This keeps the file small so uploads
// don't stall on a phone in the yard, and — important on iPhones — it turns a
// HEIC photo into a JPEG so it both uploads and displays everywhere. Returns the
// JPEG blob, or null when the browser can't read the image (the caller then
// uploads the original file so a picture is never lost).
const PHOTO_MAX_EDGE = 1600
const PHOTO_QUALITY = 0.8

// Read the image into something we can draw, trying the fast path first and
// falling back to loading it through an object URL.
async function decodeImage(
  file: File,
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void } | null> {
  try {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      cleanup: () => bitmap.close(),
    }
  } catch {
    try {
      const url = URL.createObjectURL(file)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('decode failed'))
        el.src = url
      })
      return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        cleanup: () => URL.revokeObjectURL(url),
      }
    } catch {
      return null
    }
  }
}

async function shrinkToJpeg(file: File): Promise<Blob | null> {
  const decoded = await decodeImage(file)
  if (!decoded) return null
  try {
    const { width, height } = decoded
    if (!width || !height) return null
    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    decoded.draw(ctx, w, h)
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY))
  } catch {
    return null
  } finally {
    decoded.cleanup()
  }
}

// The job popup. Top half is the work-order summary (who, what, which pen, how
// many head). Below it sit the two add controls and the saved photos + note —
// this popup is the single place a job's photos and note are added and viewed.
function Detail({
  pw, worked, products, supabase, barnId, note, onNoteSaved, onPhotoAdded, onPhotoCountChanged, onBack, onStart, going,
}: {
  pw: PenWorkFull
  worked: number
  products: string[]
  supabase: ReturnType<typeof createClient>
  barnId: string
  note: string | null
  onNoteSaved: (note: string | null) => void
  onPhotoAdded: () => void
  onPhotoCountChanged: (count: number) => void
  onBack: () => void
  onStart: () => void
  going: boolean
}) {
  const isBuyer = !!pw.buyer_party_id
  const p = isBuyer ? pw.buyer : pw.seller
  const status: ListStatus = worked > 0 ? 'in_progress' : 'not_started'
  const name = p?.name ?? '—'
  const expected = pw.head_expected ?? pw.head_started ?? 0
  const headValue = status === 'in_progress' ? `${worked} of ${expected} head` : `${expected} head`
  const ownerNo = isBuyer ? buyerNo(pw) : null
  const hasProducts = products.length > 0

  // Don't update state after the popup closes (it unmounts on close).
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])

  // Photos for this job, signed for display (the bucket is private). We keep each
  // photo's storage path alongside its URL so the current one can be deleted.
  // Loaded on open and again right after an upload or delete so the carousel
  // stays in step without a reload.
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photoLoading, setPhotoLoading] = useState(true)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadFailed, setUploadFailed] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // List this job's photos and sign them. Returns how many there are so callers
  // (add / delete) can clamp the carousel and tell the parent the new count.
  const loadPhotos = useCallback(async (): Promise<number> => {
    setPhotoFailed(false)
    const { data, error } = await supabase.storage
      .from('pen-photos')
      .list(`${barnId}/${pw.id}`, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    if (!mounted.current) return 0
    if (error || !data) { setPhotoFailed(true); setPhotos([]); setPhotoLoading(false); return 0 }
    const files = data.filter((e) => e.id !== null) // real files, not nested folders
    if (!files.length) { setPhotos([]); setPhotoLoading(false); return 0 }
    const paths = files.map((f) => `${barnId}/${pw.id}/${f.name}`)
    const { data: signed } = await supabase.storage.from('pen-photos').createSignedUrls(paths, 3600)
    if (!mounted.current) return 0
    const next: Photo[] = (signed ?? [])
      .map((s, i) => ({ url: s.signedUrl, path: paths[i] }))
      .filter((p): p is Photo => !!p.url)
    setPhotos(next)
    setPhotoLoading(false)
    return next.length
  }, [supabase, barnId, pw.id])

  useEffect(() => { loadPhotos() }, [loadPhotos])

  // Upload a picked image to this job's folder, then reload and jump to it. We
  // shrink + re-encode to JPEG first (small files, and HEIC from iPhones becomes
  // a JPEG that uploads and displays); if the browser can't read the image we
  // fall back to uploading the original so a picture is never lost.
  async function addPhoto(file: File) {
    setUploading(true); setUploadFailed(false)
    try {
      const shrunk = await shrinkToJpeg(file).catch(() => null)
      const ext = shrunk ? 'jpg' : ((file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg')
      const path = `${barnId}/${pw.id}/${Date.now()}.${ext}`
      const body: Blob | File = shrunk ?? file
      const contentType = shrunk ? 'image/jpeg' : (file.type || undefined)
      const { error } = await supabase.storage.from('pen-photos').upload(path, body, { contentType, upsert: false })
      if (error) throw error
      onPhotoAdded() // light up the card's photo icon right away
      const n = await loadPhotos()
      if (mounted.current) { setPhotoIdx(Number.MAX_SAFE_INTEGER); onPhotoCountChanged(n) } // show the newest (clamped on render)
    } catch {
      if (mounted.current) setUploadFailed(true)
    } finally {
      if (mounted.current) setUploading(false)
    }
  }

  // Delete the photo currently shown, after a confirm. Reload, clamp the
  // carousel to what's left, and tell the parent the new count so the card's
  // camera icon clears once the last photo is gone.
  async function deleteCurrentPhoto(path: string) {
    if (!window.confirm('Delete this photo? This can’t be undone.')) return
    setDeleting(true); setDeleteFailed(false)
    try {
      const { error } = await supabase.storage.from('pen-photos').remove([path])
      if (error) throw error
      const n = await loadPhotos()
      if (mounted.current) { setPhotoIdx((i) => Math.max(0, Math.min(i, n - 1))); onPhotoCountChanged(n) }
    } catch {
      if (mounted.current) setDeleteFailed(true)
    } finally {
      if (mounted.current) setDeleting(false)
    }
  }

  // The note, kept locally so it shows the moment it's saved. The editor opens
  // pre-filled with whatever's there now.
  const [localNote, setLocalNote] = useState<string | null>(note)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteFailed, setNoteFailed] = useState(false)

  function openNote() {
    setNoteDraft(localNote ?? '')
    setNoteFailed(false)
    setNoteEditing(true)
  }

  async function saveNote() {
    setNoteSaving(true); setNoteFailed(false)
    const res = await setPenWorkNote(pw.id, barnId, noteDraft)
    if (!mounted.current) return
    if (res.ok) {
      setLocalNote(res.note)
      onNoteSaved(res.note)
      setNoteEditing(false)
    } else {
      setNoteFailed(true)
    }
    setNoteSaving(false)
  }

  const count = photos.length
  const cur = count ? Math.min(photoIdx, count - 1) : 0
  const addBtnStyle = { flex: 1, height: 48, gap: 8, borderRadius: 12, fontSize: 15, fontWeight: 800 } as const

  return (
    <Modal
      size="md"
      align="top"
      zIndex={70}
      onClose={onBack}
      overlayStyle={{ padding: 0 }}
      panelStyle={{ background: '#F5F5F0', borderRadius: 0, boxShadow: 'none' }}
    >
        <div style={{ background: colors.navy, flexShrink: 0, padding: 'calc(14px + env(safe-area-inset-top)) 16px 16px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={onBack} aria-label="Back" style={{ width: 34, height: 34, flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22 }}>‹</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>{penLabel(pw)} · {name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#55BAAA', marginTop: 1 }}>{pw.workType?.name ?? 'Work'} · {headValue}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 11, flex: 1, overflowY: 'auto' }}>
          <SectionCard title="Work Order">
            <DetailRow label={isBuyer ? 'Buyer' : 'Consignor'} value={ownerNo ? `${name} · #${ownerNo}` : name} />
            <DetailRow label="Work Type" value={pw.workType?.name ?? '—'} />
            <DetailRow label="Pen" value={penLabel(pw)} />
            <DetailRow label="Head" value={headValue} last={!pw.animalType && !hasProducts} />
            {pw.animalType ? <DetailRow label="Animal Type" value={pw.animalType.name} last={!hasProducts} /> : null}
            {hasProducts ? <DetailRow label="Products" value={products.join(' · ')} last /> : null}
          </SectionCard>

          {/* The two add controls — the one place photos and notes go on a job. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) addPhoto(f)
              e.target.value = '' // let the same file be picked again
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" type="button" onClick={() => { if (!uploading) fileRef.current?.click() }} disabled={uploading} style={addBtnStyle}>
              <CameraIcon size={18} /> {uploading ? 'Adding…' : 'Add a picture'}
            </Button>
            <Button variant="outline" type="button" onClick={openNote} style={addBtnStyle}>
              <FlagIcon size={15} strokeWidth={2.4} /> {localNote ? 'Edit note' : 'Add a note'}
            </Button>
          </div>
          {uploadFailed ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.danger }}>Couldn’t add the picture — try again.</div>
          ) : null}

          {/* Saved photos, with paging when there's more than one. */}
          {photoLoading || count > 0 ? (
            <SectionCard title="Photos">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, maxHeight: '42vh', borderRadius: 10, background: '#0A1B33', overflow: 'hidden' }}>
                  {photoLoading ? (
                    <span style={{ color: '#8FA8CC', fontSize: 14, fontWeight: 600 }}>Loading…</span>
                  ) : (
                    // Only the current photo is rendered, decoded off the main
                    // thread and lazily — we never preload the whole roll.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos[cur]?.url} alt={`Photo ${cur + 1}`} decoding="async" loading="lazy" style={{ maxWidth: '100%', maxHeight: '42vh', objectFit: 'contain' }} />
                  )}
                </div>
                {count > 1 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <Button variant="outline" type="button" onClick={() => setPhotoIdx((i) => (Math.min(i, count - 1) - 1 + count) % count)} style={{ height: 38, padding: '0 14px', borderRadius: 9, fontSize: 14, fontWeight: 700 }}>‹ Prev</Button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>Photo {cur + 1} of {count}</span>
                    <Button variant="outline" type="button" onClick={() => setPhotoIdx((i) => (Math.min(i, count - 1) + 1) % count)} style={{ height: 38, padding: '0 14px', borderRadius: 9, fontSize: 14, fontWeight: 700 }}>Next ›</Button>
                  </div>
                ) : null}
                {!photoLoading && count > 0 ? (
                  <Button variant="outline" type="button" onClick={() => { const t = photos[cur]; if (t && !deleting) deleteCurrentPhoto(t.path) }} disabled={deleting} style={{ height: 40, borderRadius: 10, fontSize: 14, fontWeight: 700, color: colors.danger }}>
                    {deleting ? 'Deleting…' : 'Delete photo'}
                  </Button>
                ) : null}
                {deleteFailed ? <div style={{ fontSize: 12, fontWeight: 700, color: colors.danger }}>Couldn’t delete the photo — try again.</div> : null}
              </div>
            </SectionCard>
          ) : photoFailed ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: colors.danger }}>Couldn’t load photos — try again.</div>
          ) : null}

          {/* The note: an editor while editing, otherwise the saved text (if any). */}
          {noteEditing ? (
            <SectionCard title="Note">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Type a note for this job…"
                  rows={4}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', borderRadius: 10, border: `1px solid ${colors.border}`, padding: '10px 12px', fontFamily: 'inherit', fontSize: 14, color: colors.textPrimary, background: '#fff' }}
                />
                {noteFailed ? <div style={{ fontSize: 12, fontWeight: 700, color: colors.danger }}>Couldn’t save the note — try again.</div> : null}
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="outline" type="button" onClick={() => setNoteEditing(false)} disabled={noteSaving} style={{ flexShrink: 0, height: 44, padding: '0 16px', borderRadius: 11, fontSize: 14, fontWeight: 700 }}>Cancel</Button>
                  <Button variant="primary" type="button" onClick={saveNote} disabled={noteSaving} fullWidth style={{ flex: 1, height: 44, borderRadius: 11, fontSize: 15, fontWeight: 800 }}>
                    {noteSaving ? 'Saving…' : 'Save note'}
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : localNote ? (
            <SectionCard title="Note">
              <div style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{localNote}</div>
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
