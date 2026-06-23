'use client'

import { colors } from '@/components/ui/tokens'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { STATUS_LABEL, type WorkStatus } from '@/lib/work-orders/status'
import type { Barn, PenWorkFull, SaleDay } from '@/lib/work-orders/types'
import { startCapture } from '@/lib/work-orders/start-capture'
import { setPenUp } from '@/app/(office)/work-list/actions'
import { AnimalListModal } from '@/components/work-orders/board/animal-list-modal'
import { ScreenHeader } from '@/components/ui/screen-header'
import { HeaderBack } from '@/components/ui/header-back'
import { SectionCard } from '@/components/ui/section-card'
import { Button, buttonClass } from '@/components/ui/button'
import { CheckIcon } from '@/components/ui/icons'
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

const NotePill = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', borderRadius: 999, background: '#EAE2FA', border: '1px solid #C9B8F0', flexShrink: 0, fontSize: 11, fontWeight: 700, color: colors.purple }}>Note</span>
)

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

// A small up-caret for the "Up" control.
function CaretUp({ color }: { color: string }) {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M6 15l6-6 6 6" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The yard-crew "Up" / brought-up control. A purple toggle, kept visually apart
// from the gray/amber chute status so both can sit on the same card. Phone-sized
// tap target. It's its own tap zone inside the card button, so it uses a
// role="button" span (a real button can't nest inside the card's button).
function UpToggle({ up, busy, onToggle }: { up: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={up}
      aria-label={up ? 'Brought up — tap to clear' : 'Mark this pen up'}
      onClick={(e) => { e.stopPropagation(); if (!busy) onToggle() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!busy) onToggle() } }}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        height: 40,
        minWidth: 60,
        padding: '0 14px',
        borderRadius: 999,
        cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.6 : 1,
        background: up ? colors.purple : '#fff',
        border: `1px solid ${up ? colors.purple : '#C9B8F0'}`,
        color: up ? '#fff' : colors.purple,
        fontSize: 14,
        fontWeight: 800,
        letterSpacing: '-0.01em',
      }}
    >
      {up ? <CheckIcon size={12} strokeWidth={3} style={{ color: '#fff' }} /> : <CaretUp color={colors.purple} />}
      Up
    </span>
  )
}

export function WorkListScreen({
  saleDay, barn, penWorks, workedById, productsById, upByPenId,
}: {
  saleDay: SaleDay
  barn: Barn
  penWorks: PenWorkFull[]
  workedById: Record<string, number>
  productsById: Record<string, string[]>
  upByPenId: Record<string, boolean>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<PenWorkFull | null>(null)
  const [animalsFor, setAnimalsFor] = useState<PenWorkFull | null>(null)
  const [going, startGo] = useTransition()
  // The yard-crew "Up" markers, kept locally so a tap flips instantly; seeded
  // from the server and persisted through setPenUp. Keyed by pen, so two jobs in
  // the same pen read (and toggle) the one marker together.
  const [upState, setUpState] = useState<Record<string, boolean>>(upByPenId)
  const [upBusy, setUpBusy] = useState<Record<string, boolean>>({})
  const [, startUp] = useTransition()
  // The "To Grab" view: only pens still needing work that aren't up yet.
  const [toGrab, setToGrab] = useState(false)

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
          <button key={r.pw.id} type="button" className="wl-card" onClick={() => setSelected(r.pw)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>{penLabel(r.pw)}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: colors.teal }}>{r.name}</span>
                {r.isBuyer ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: colors.navy, background: colors.gold, borderRadius: 999, padding: '2px 8px' }}>Buyer #{buyerNo(r.pw) ?? '—'}</span> : null}
                {r.pw.notes ? <NotePill /> : null}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, marginTop: 3 }}>
                {r.pw.workType?.name ?? 'Work'} · {r.worked > 0 ? (
                  <span role="button" tabIndex={0} aria-label="Show the animals worked" onClick={(e) => { e.stopPropagation(); setAnimalsFor(r.pw) }} style={{ color: colors.teal, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>{headText(r)}</span>
                ) : headText(r)}
              </div>
            </div>
            <StatusPill status={r.status} />
            {r.pw.pen?.id ? (
              <UpToggle up={penUp(r.pw.pen.id)} busy={!!upBusy[r.pw.pen.id]} onToggle={() => toggleUp(r.pw.pen!.id)} />
            ) : null}
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
            <span className="wl-chevron" aria-hidden style={{ flexShrink: 0, color: '#A8AEC0', fontSize: 18 }}>›</span>
          </button>
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
      </div>
    </>
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
