'use client'

import { colors } from '@/components/ui/tokens'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STATUS_LABEL, type WorkStatus } from '@/lib/work-orders/status'
import type { Barn, PenWorkFull, SaleDay } from '@/lib/work-orders/types'
import { startCapture } from '@/lib/work-orders/start-capture'
import { setPenUp, setPenDefaults, setPenWorkNote } from '@/app/(office)/work-list/actions'
import { markLabelPrinted } from '@/components/pen-card/actions'
import { AnimalListModal } from '@/components/work-orders/board/animal-list-modal'
import { AnimalAttributes } from '@/components/capture/animal-attributes'
import { resolveFields, applyPenDefaults, extractPenDefaults, type PenFieldDefaults } from '@/lib/capture/fields'
import { emptyDraft, type AnimalDraft, type CaptureBootstrap } from '@/lib/capture/types'
import { ScreenHeader } from '@/components/ui/screen-header'
import { HeaderBack } from '@/components/ui/header-back'
import { SectionCard } from '@/components/ui/section-card'
import { Button } from '@/components/ui/button'
import { CheckIcon, FlagIcon, CameraIcon } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { SortPensView } from '@/components/work-list/sort-pens-view'
import { fetchSortPens, type SortPenSummary } from '@/lib/work-list/sort-pens'

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

// The owner of a job: the consignor (seller) it's for, or the buyer on a
// buyer-side order. A pen is "mixed" when its open jobs name more than one
// distinct owner — animals from two customers share the one pen. One owner with
// two work types is NOT mixed.
function ownerKey(pw: PenWorkFull): string | null {
  return pw.seller_party_id ?? pw.buyer_party_id ?? null
}

// One job inside a mixed pen — just the bits the Mixed card and its roster show.
type MixedJob = {
  pw: PenWorkFull
  name: string
  worked: number
  expected: number
  status: ListStatus
}
type MixedGroup = { penId: string; penNumber: string; rows: MixedJob[] }

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

// --- Option E pen-card pieces -------------------------------------------------

// The three card states and their dot + text colors (Option E palette).
type CardStatus = 'not_started' | 'in_progress' | 'done'
const OE_STATUS: Record<CardStatus, { label: string; dot: string; text: string }> = {
  not_started: { label: 'Not Started', dot: '#C2C2CA', text: '#717182' },
  in_progress: { label: 'In Progress', dot: '#C8861A', text: '#8A5A12' },
  done: { label: 'Done', dot: '#2E9486', text: '#1F6F64' },
}

// Lucide sliders-horizontal — the field-defaults and Group control glyph.
function SlidersIcon({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  )
}

// Lucide chevron-right — the chute rail glyph.
function ChevronRightGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

// Small outline glyphs for the attachment marks on a card (Option E: 13px,
// stroke #9A9AA6) — an image when the pen has a photo, a file when it has a note.
function ImageGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9A9AA6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Has a photo" role="img" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L5 21" />
    </svg>
  )
}
function FileTextGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9A9AA6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Has a note" role="img" style={{ flexShrink: 0 }}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h2" />
    </svg>
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
  // The open Mixed-pen roster (the owners sharing one pen), or null when closed.
  const [mixedRoster, setMixedRoster] = useState<MixedGroup | null>(null)
  // Sort pens for this sale day (the pens cattle were sorted into at the chute).
  // Loaded on demand on the client — never on the page's server fetch — so it
  // never slows the Pen List's first paint. Re-pulled whenever the server data
  // refreshes (penWorks gets a new reference) and right after a close/reopen/move.
  const [sortPens, setSortPens] = useState<SortPenSummary[]>([])
  const [sortOpen, setSortOpen] = useState(false)
  const [going, startGo] = useTransition()
  // The yard-crew "Staged" markers, kept locally so a tap flips instantly; seeded
  // from the server and persisted through setPenUp. Keyed by pen, so two jobs in
  // the same pen read (and toggle) the one marker together.
  const [upState, setUpState] = useState<Record<string, boolean>>(upByPenId)
  const [upBusy, setUpBusy] = useState<Record<string, boolean>>({})
  const [, startUp] = useTransition()
  // The "To Grab" view: only pens still needing work that aren't staged yet.
  const [toGrab, setToGrab] = useState(false)
  // How the list is grouped: a flat pen-sorted list, or one section per work type.
  const [groupBy, setGroupBy] = useState<'pen' | 'workType'>('pen')
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
  // Which jobs have had their pen card label printed — seeded from the server
  // (label_printed_at) and flipped on locally the instant the print button is
  // tapped, so the printed mark shows right away. Re-seeded on every refresh, so
  // a print done on another device shows here too.
  const [printedByPwId, setPrintedByPwId] = useState<Record<string, boolean>>(
    () => Object.fromEntries(penWorks.map((pw) => [pw.id, !!pw.label_printed_at])),
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
    setPrintedByPwId(Object.fromEntries(penWorks.map((pw) => [pw.id, !!pw.label_printed_at])))
  }, [penWorks])

  // Reload the sort pens — after a close/reopen/move, and on every server refresh.
  const refetchSortPens = useCallback(() => {
    fetchSortPens(supabase, saleDay.id).then(setSortPens).catch(() => {})
  }, [supabase, saleDay.id])

  useEffect(() => {
    let alive = true
    fetchSortPens(supabase, saleDay.id)
      .then((list) => { if (alive) setSortPens(list) })
      .catch(() => {})
    return () => { alive = false }
  }, [supabase, saleDay.id, penWorks])

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
  // yet (truly finished jobs are already dropped before this screen). Drives the
  // card's Done status and the muted "Review" rail.
  const isDone = (r: Row) => r.headLeft === 0 && r.worked > 0

  // To Grab = still has work (every row here does) AND not up. A pen worked to
  // complete leaves on its own because it's no longer in the list at all.
  const toGrabCount = rows.filter((r) => !penUp(r.pw.pen?.id)).length

  // Apply the To Grab view, then group: one flat pen-sorted list, or a section
  // per work type (each pen-sorted).
  const filtered = rows.filter((r) => !(toGrab && penUp(r.pw.pen?.id)))

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

  // Print this job's pen card label (the existing Dymo 30323 print view), then
  // stamp it printed. The window opens synchronously inside the click so the
  // popup isn't blocked; the printed mark flips on right away and the stamp is
  // fire-and-forget. Per work order — each job prints and marks its own label.
  function printCard(pw: PenWorkFull) {
    window.open(`/print/pen-card/${pw.id}`, '_blank', 'noopener,noreferrer,width=720,height=520')
    setPrintedByPwId((m) => ({ ...m, [pw.id]: true }))
    void markLabelPrinted(pw.id)
  }

  const headText = (r: { worked: number; expected: number; status: ListStatus }) =>
    r.status === 'in_progress' ? `${r.worked} of ${r.expected} head` : `${r.expected} head`

  // Option E pen card: three columns — gradient pen anchor, info, and the gold
  // chute rail. The body (anchor + info) opens pen details; the rail opens chute
  // capture; the stage/print/field-defaults controls each stop the tap so they
  // never trigger the body or the rail.
  const renderCard = (r: Row) => {
    const ds: CardStatus = r.worked === 0 ? 'not_started' : isDone(r) ? 'done' : 'in_progress'
    const s = OE_STATUS[ds]
    const penId = r.pw.pen?.id ?? null
    const up = penUp(penId)
    const busy = !!(penId && upBusy[penId])
    const printed = !!printedByPwId[r.pw.id]
    return (
      <div key={r.pw.id} className="wl-oe-card">
        {/* Body — pen anchor + info — opens pen details. */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`${penLabel(r.pw)} details`}
          onClick={() => setSelected(r.pw)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r.pw) } }}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch', cursor: 'pointer' }}
        >
          {/* Column 1 — pen anchor */}
          <div style={{ width: 62, flexShrink: 0, borderRight: '1px solid #08203A', background: 'linear-gradient(158deg, #14264A 0%, #103E43 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#93B9B4' }}>PEN</span>
            <span className="tnum" style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{r.pw.pen?.pen_number ?? '—'}</span>
          </div>
          {/* Column 2 — info */}
          <div style={{ flex: 1, minWidth: 0, padding: '13px 14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: 0, fontSize: 14, fontWeight: 700, color: '#2E9486', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}{r.isBuyer ? ` · Buyer #${buyerNo(r.pw) ?? '—'}` : ''}</span>
              <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: s.text }}>{s.label}</span>
              </span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="tnum" style={{ minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#717182', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.pw.workType?.name ?? 'Work'} · {r.worked > 0 ? (
                  <span role="button" tabIndex={0} aria-label="Show the animals worked" onClick={(e) => { e.stopPropagation(); setAnimalsFor(r.pw) }} style={{ color: '#2E9486', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>{headText(r)}</span>
                ) : headText(r)}
              </span>
              <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {photoPens[r.pw.id] ? <ImageGlyph /> : null}
                {noteByPwId[r.pw.id] ? <FileTextGlyph /> : null}
              </span>
            </div>
            <div style={{ marginTop: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              {penId ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-pressed={up}
                  aria-label={up ? 'Staged — tap to clear' : 'Mark this pen staged'}
                  onClick={(e) => { e.stopPropagation(); if (!busy) toggleUp(penId) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!busy) toggleUp(penId) } }}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, padding: '0 13px 0 11px', borderRadius: 999, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, background: up ? '#2E9486' : '#fff', border: up ? 'none' : '1px solid #A9D9D2', color: up ? '#fff' : '#2E9486', fontSize: 12, fontWeight: 700 }}
                >
                  <CheckIcon size={14} strokeWidth={3} style={{ color: up ? '#fff' : '#2E9486' }} />{up ? 'Staged' : 'Stage'}
                </span>
              ) : null}
              <span style={{ flex: 1 }} />
              <button
                type="button"
                aria-label={printed ? 'Reprint pen card' : 'Print pen card'}
                onClick={(e) => { e.stopPropagation(); printCard(r.pw) }}
                style={{ flexShrink: 0, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: 'none', cursor: 'pointer', background: printed ? '#EAF4F2' : 'transparent' }}
              >
                <PrinterIcon size={15} color={printed ? '#2E9486' : '#7C8196'} />
              </button>
              {penId && bootstrap ? (
                <button
                  type="button"
                  aria-label="Field defaults for this pen"
                  onClick={(e) => { e.stopPropagation(); openDefaults(r.pw) }}
                  style={{ flexShrink: 0, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: 'none', cursor: 'pointer', background: defaultsState[penId] ? '#EFEFEA' : 'transparent' }}
                >
                  <SlidersIcon size={15} color={defaultsState[penId] ? '#2E9486' : '#7C8196'} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {/* Column 3 — chute rail. Gold when actionable; muted "Review" when done. */}
        <button
          type="button"
          aria-label={ds === 'done' ? 'Review at the chute' : ds === 'in_progress' ? 'Resume at the chute' : 'Open at the chute'}
          onClick={(e) => { e.stopPropagation(); go(r.pw) }}
          disabled={going}
          style={{ width: 44, flexShrink: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderLeft: ds === 'done' ? '1px solid #E4E4DE' : 'none', cursor: going ? 'default' : 'pointer', background: ds === 'done' ? '#EFEFEA' : colors.gold }}
        >
          <ChevronRightGlyph size={18} color={colors.navy} />
        </button>
      </div>
    )
  }

  // In the By Pen view, fold a pen's jobs into ONE "Mixed" card when that pen
  // holds more than one distinct owner (animals from two customers share it).
  // One owner with two work types is NOT mixed — those stay separate cards, just
  // like before. We group by pen id, so the rows' order doesn't matter; a pen
  // with finished-only jobs never reaches this screen, so it never shows here.
  type ListItem = { kind: 'single'; row: Row } | { kind: 'mixed'; group: MixedGroup }
  const toItems = (rs: Row[]): ListItem[] => {
    const order: string[] = []
    const groups = new Map<string, Row[]>()
    for (const r of rs) {
      const key = r.pw.pen?.id ?? `nopen:${r.pw.id}`
      const list = groups.get(key)
      if (list) list.push(r)
      else { groups.set(key, [r]); order.push(key) }
    }
    const items: ListItem[] = []
    for (const key of order) {
      const grp = groups.get(key)!
      const penId = grp[0].pw.pen?.id
      const penNumber = grp[0].pw.pen?.pen_number
      const owners = new Set(grp.map((r) => ownerKey(r.pw)).filter((x): x is string => !!x))
      if (penId && penNumber && owners.size > 1) {
        items.push({ kind: 'mixed', group: { penId, penNumber, rows: grp } })
      } else {
        for (const r of grp) items.push({ kind: 'single', row: r })
      }
    }
    return items
  }

  // The Mixed card: pen number, a clear "Mixed" marker, total head, and the
  // owner breakdown (each customer with their head). Read-only — it shows what
  // the work orders already say and changes no head or billing. Tapping it opens
  // the roster; the pen-level Staged chip stays on the card (staging is per pen).
  const renderMixedCard = (g: MixedGroup) => {
    const ownerKeys = new Set(g.rows.map((r) => ownerKey(r.pw) ?? r.pw.id))
    const ownerCount = ownerKeys.size
    const totalHead = g.rows.reduce((a, r) => a + r.expected, 0)
    const totalWorked = g.rows.reduce((a, r) => a + r.worked, 0)
    const headStr = totalWorked > 0 ? `${totalWorked} of ${totalHead} head` : `${totalHead} head`
    const workTypes = new Set(g.rows.map((r) => r.pw.workType?.name).filter(Boolean) as string[])
    const wtLabel = workTypes.size === 1 ? [...workTypes][0] : `${workTypes.size} work types`
    // Pen status overall: done only if every job is done; in progress if any
    // animal worked; else not started.
    const allDone = g.rows.every((r) => r.worked > 0 && r.worked >= r.expected)
    const anyWorked = g.rows.some((r) => r.worked > 0)
    const ds: CardStatus = allDone ? 'done' : anyWorked ? 'in_progress' : 'not_started'
    const s = OE_STATUS[ds]
    const up = penUp(g.penId)
    const busy = !!upBusy[g.penId]
    const anyPhoto = g.rows.some((r) => photoPens[r.pw.id])
    const anyNote = g.rows.some((r) => noteByPwId[r.pw.id])
    return (
      <div key={`mixed:${g.penId}`} className="wl-oe-card">
        <div
          role="button"
          tabIndex={0}
          aria-label={`Pen ${g.penNumber} — mixed pen, ${ownerCount} owners`}
          onClick={() => setMixedRoster(g)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMixedRoster(g) } }}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch', cursor: 'pointer' }}
        >
          {/* Column 1 — pen anchor */}
          <div style={{ width: 62, flexShrink: 0, borderRight: '1px solid #08203A', background: 'linear-gradient(158deg, #14264A 0%, #103E43 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#93B9B4' }}>PEN</span>
            <span className="tnum" style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{g.penNumber}</span>
          </div>
          {/* Column 2 — info */}
          <div style={{ flex: 1, minWidth: 0, padding: '13px 14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: 0, fontSize: 14, fontWeight: 700, color: '#2E9486', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Mixed · {ownerCount} owners</span>
              <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: s.text }}>{s.label}</span>
              </span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="tnum" style={{ minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#717182', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wtLabel} · {headStr}</span>
              <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {anyPhoto ? <ImageGlyph /> : null}
                {anyNote ? <FileTextGlyph /> : null}
              </span>
            </div>
            <div style={{ marginTop: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                role="button"
                tabIndex={0}
                aria-pressed={up}
                aria-label={up ? 'Staged — tap to clear' : 'Mark this pen staged'}
                onClick={(e) => { e.stopPropagation(); if (!busy) toggleUp(g.penId) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!busy) toggleUp(g.penId) } }}
                style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, padding: '0 13px 0 11px', borderRadius: 999, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, background: up ? '#2E9486' : '#fff', border: up ? 'none' : '1px solid #A9D9D2', color: up ? '#fff' : '#2E9486', fontSize: 12, fontWeight: 700 }}
              >
                <CheckIcon size={14} strokeWidth={3} style={{ color: up ? '#fff' : '#2E9486' }} />{up ? 'Staged' : 'Stage'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: colors.textMuted, whiteSpace: 'nowrap' }}>View owners</span>
            </div>
          </div>
        </div>
        {/* Column 3 — rail opens the owner roster (the pen's review). */}
        <button
          type="button"
          aria-label={`Review pen ${g.penNumber} owners`}
          onClick={(e) => { e.stopPropagation(); setMixedRoster(g) }}
          style={{ width: 44, flexShrink: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderLeft: ds === 'done' ? '1px solid #E4E4DE' : 'none', cursor: 'pointer', background: ds === 'done' ? '#EFEFEA' : colors.gold }}
        >
          <ChevronRightGlyph size={18} color={colors.navy} />
        </button>
      </div>
    )
  }

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
      {/* FILTER BAR — a segmented All / To Grab control plus a Group toggle that
          re-sections the list (By Pen / By Work). */}
      {rows.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', background: '#ECECE5', borderRadius: 10, padding: 3 }}>
            {([['all', 'All', toWork], ['grab', 'To Grab', toGrabCount]] as const).map(([key, label, count]) => {
              const active = key === 'all' ? !toGrab : toGrab
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setToGrab(key === 'grab')}
                  aria-pressed={active}
                  style={{ flex: 1, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: active ? colors.navy : 'transparent', color: active ? '#fff' : '#5A6072', fontSize: 13.5, fontWeight: 700 }}
                >
                  {label}<span className="tnum" style={{ fontSize: 12, fontWeight: 700, opacity: 0.65 }}>{count}</span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setGroupBy((g) => (g === 'pen' ? 'workType' : 'pen'))}
            aria-label={groupBy === 'pen' ? 'Grouped by pen — switch to by work type' : 'Grouped by work type — switch to by pen'}
            style={{ flexShrink: 0, height: 38, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 13px', borderRadius: 10, background: '#fff', border: '1px solid #D8D8D0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: colors.navy }}
          >
            <SlidersIcon size={15} color="#4A5172" />{groupBy === 'pen' ? 'By Pen' : 'By Work'}
          </button>
        </div>
      ) : null}

      {/* SORT PENS — the pens cattle were sorted into; reachable even when the
          work list is empty (end of day, closing pens out). Hidden when there are
          none for the day. */}
      {sortPens.length > 0 ? (
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', boxSizing: 'border-box', height: 50, padding: '0 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', background: colors.tealPillBg, border: `1px solid ${colors.teal}`, color: colors.teal, textAlign: 'left' }}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>Sort Pens</span>
          <span style={{ fontSize: 12, fontWeight: 800, background: colors.teal, color: '#fff', borderRadius: 999, padding: '2px 9px', fontVariantNumeric: 'tabular-nums' }}>{sortPens.length}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.teal, whiteSpace: 'nowrap' }}>
            {sortPens.filter((p) => !p.closedAt).length} open · {sortPens.filter((p) => p.closedAt).length} closed ›
          </span>
        </button>
      ) : null}

      {/* LIST */}
      {rows.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.navy }}>Nothing Left to Work</div>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Every job for this sale day is complete.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.navy }}>{toGrab ? 'Every Pen Is Up' : 'Nothing to Show'}</div>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>
            {toGrab
              ? 'Nothing left to grab — every pen still needing work has been brought up.'
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
            {(groupBy === 'pen'
              ? toItems(section.rows)
              : section.rows.map((r): ListItem => ({ kind: 'single', row: r }))
            ).map((it) => (it.kind === 'mixed' ? renderMixedCard(it.group) : renderCard(it.row)))}
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

      {/* MIXED PEN ROSTER — the owners sharing one pen. Read-only; the one action
          is opening an owner's job to work it (the same capture flow as a normal
          card). Head moves and reassignment are a later slice. */}
      {mixedRoster ? (
        <MixedRoster
          group={mixedRoster}
          going={going}
          onOpenJob={(pw) => { setMixedRoster(null); go(pw) }}
          onClose={() => setMixedRoster(null)}
        />
      ) : null}

      {/* SORT PENS — close out, reopen, and assign a destination + move. */}
      {sortOpen ? (
        <SortPensView
          saleDayId={saleDay.id}
          barnId={barn.id}
          pens={sortPens}
          onChanged={refetchSortPens}
          onClose={() => setSortOpen(false)}
        />
      ) : null}

      {/* FIELD DEFAULTS — the per-pen editor (same fields the work type captures) */}
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

// The roster behind a Mixed card: every owner sharing the pen, with their head,
// work type and status. Read-only here — the one action is opening a job to work
// it (the same capture flow the normal cards use). Head moves / reassignment are
// a later slice, so nothing here changes head or billing.
function MixedRoster({
  group, going, onOpenJob, onClose,
}: {
  group: MixedGroup
  going: boolean
  onOpenJob: (pw: PenWorkFull) => void
  onClose: () => void
}) {
  const totalHead = group.rows.reduce((a, r) => a + r.expected, 0)
  const totalWorked = group.rows.reduce((a, r) => a + r.worked, 0)
  const headStr = totalWorked > 0 ? `${totalWorked} of ${totalHead} head` : `${totalHead} head`
  const ownerCount = new Set(group.rows.map((r) => ownerKey(r.pw) ?? r.pw.id)).size
  // Sort by owner name so an owner's work types sit together.
  const jobs = [...group.rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>Pen {group.penNumber}</span>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.navy, background: colors.gold, borderRadius: 999, padding: '3px 10px' }}>Mixed</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#55BAAA', marginTop: 1 }}>{ownerCount} owners · {headStr}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
        {jobs.map((r) => {
          const headValue = r.status === 'in_progress' ? `${r.worked} of ${r.expected} head` : `${r.expected} head`
          return (
            <div key={r.pw.id} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: colors.navy, minWidth: 0 }}>{r.name}</span>
                <div style={{ flex: 1 }} />
                <StatusPill status={r.status} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>{r.pw.workType?.name ?? 'Work'} · {headValue}</div>
              <Button
                variant={r.status === 'in_progress' ? 'outline' : 'primary'}
                type="button"
                onClick={() => onOpenJob(r.pw)}
                disabled={going}
                fullWidth
                style={{ height: 48, gap: 8, borderRadius: 12, fontSize: 16, fontWeight: 800 }}
              >
                {going ? 'Opening…' : r.status === 'in_progress' ? 'Resume' : 'Start Working'} ›
              </Button>
            </div>
          )
        })}
      </div>
    </Modal>
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
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>Field Defaults · {penLabel}</div>
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
