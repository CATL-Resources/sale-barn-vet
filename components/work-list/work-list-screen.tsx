'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABEL, type WorkStatus } from '@/lib/work-orders/status'
import type { Barn, PenWorkFull, SaleDay } from '@/lib/work-orders/types'
import { startCapture } from '@/lib/work-orders/start-capture'

const NAVY = '#0E2646'
const GOLD = '#F3D12A'
const TEXT = '#1A1A1A'
const MUTED = '#717182'
const BORDER = '#D4D4D0'
const LINE = '#ECECE8'
const TEAL = '#0E7C86'
const PURPLE = '#6D28D9'

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
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', borderRadius: 999, background: '#EAE2FA', border: '1px solid #C9B8F0', flexShrink: 0, fontSize: 11, fontWeight: 700, color: PURPLE }}>Note</span>
)

function StatusPill({ status }: { status: ListStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 11px', borderRadius: 999, background: s.bg, border: `1px solid ${s.border}`, fontSize: 12, fontWeight: 700, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot }} />{STATUS_LABEL[status as WorkStatus]}
    </span>
  )
}

export function WorkListScreen({
  saleDay, barn, penWorks, workedById, productsById,
}: {
  saleDay: SaleDay
  barn: Barn
  penWorks: PenWorkFull[]
  workedById: Record<string, number>
  productsById: Record<string, string[]>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<PenWorkFull | null>(null)
  const [going, startGo] = useTransition()

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

  function go(pw: PenWorkFull) {
    startGo(async () => {
      await startCapture(pw.id, (href) => router.push(href))
    })
  }

  const headText = (r: { worked: number; expected: number; status: ListStatus }) =>
    r.status === 'in_progress' ? `${r.worked} of ${r.expected} head` : `${r.expected} head`

  return (
    <div className="wl-wrap">
      {/* HEADER */}
      <div style={{ background: NAVY, borderRadius: 16, padding: '16px 18px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" aria-label="Menu" style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none', fontSize: 22 }}>≡</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>Work list</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#55BAAA', marginTop: 1 }}>{barn.name} · {shortDate(saleDay.sale_date)}</div>
          </div>
          {/* Tablet shows the counts inline up here; the phone gets the stat blocks below. */}
          <span className="wl-counts-tablet" style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>{toWork} to work · {headLeft} head left</span>
        </div>
        <div className="wl-stats-phone">
          <div><div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{toWork}</div><div style={{ fontSize: 11, fontWeight: 600, color: '#8FA8CC', marginTop: 4 }}>To work</div></div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.14)' }} />
          <div><div style={{ fontSize: 22, fontWeight: 800, color: GOLD, lineHeight: 1 }}>{headLeft}</div><div style={{ fontSize: 11, fontWeight: 600, color: '#8FA8CC', marginTop: 4 }}>Head left</div></div>
        </div>
      </div>

      {/* LIST */}
      {rows.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>Nothing left to work</div>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 6 }}>Every job for this sale day is complete.</div>
        </div>
      ) : (
        rows.map((r) => (
          <button key={r.pw.id} type="button" className="wl-card" onClick={() => setSelected(r.pw)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: NAVY, letterSpacing: '-0.01em' }}>{penLabel(r.pw)}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: TEAL }}>{r.name}</span>
                {r.isBuyer ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: NAVY, background: GOLD, borderRadius: 999, padding: '2px 8px' }}>Buyer #{buyerNo(r.pw) ?? '—'}</span> : null}
                {r.pw.notes ? <NotePill /> : null}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: MUTED, marginTop: 3 }}>{r.pw.workType?.name ?? 'Work'} · {headText(r)}</div>
            </div>
            <StatusPill status={r.status} />
            <span
              role="button"
              tabIndex={0}
              aria-label={r.status === 'in_progress' ? 'Resume' : 'Open'}
              onClick={(e) => { e.stopPropagation(); go(r.pw) }}
              className="wl-rowaction"
              style={{ flexShrink: 0, height: 40, alignItems: 'center', gap: 7, padding: '0 18px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: going ? 'default' : 'pointer', opacity: going ? 0.6 : 1, background: r.status === 'in_progress' ? '#fff' : GOLD, color: NAVY, border: r.status === 'in_progress' ? `1px solid ${BORDER}` : 'none' }}
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
    </div>
  )
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${LINE}` }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: MUTED, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, textAlign: 'right' }}>{value}</span>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(14,38,70,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto' }} onClick={onBack}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, minHeight: '100dvh', background: '#F5F5F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: NAVY, flexShrink: 0, padding: '14px 16px 16px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={onBack} aria-label="Back" style={{ width: 34, height: 34, flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22 }}>‹</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em' }}>{penLabel(pw)} · {name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#55BAAA', marginTop: 1 }}>{pw.workType?.name ?? 'Work'} · {expected} head expected</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
          <Card title="Work order">
            <div style={{ padding: '4px 14px' }}>
              <DetailRow label="Consignor" value={`${name} · ${isBuyer ? 'Buyer' : 'Seller'}`} />
              <DetailRow label="Work type" value={pw.workType?.name ?? '—'} />
              <DetailRow label="Animal type" value={pw.animalType?.name ?? '—'} last={!hasProducts} />
              {hasProducts ? <DetailRow label="Products" value={products.join(' · ')} last /> : null}
            </div>
          </Card>

          {pw.notes ? (
            <Card title="Notes">
              <div style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: TEXT, lineHeight: 1.45 }}>{pw.notes}</div>
            </Card>
          ) : null}
        </div>

        <div style={{ flexShrink: 0, background: '#fff', borderTop: `1px solid ${BORDER}`, padding: '12px 16px 18px' }}>
          <button type="button" onClick={onStart} disabled={going} style={{ width: '100%', height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 13, background: status === 'in_progress' ? '#fff' : GOLD, border: status === 'in_progress' ? `1px solid ${BORDER}` : 'none', color: NAVY, fontFamily: 'inherit', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', cursor: going ? 'default' : 'pointer', opacity: going ? 0.6 : 1 }}>
            {going ? 'Opening…' : status === 'in_progress' ? 'Resume' : 'Start working'} ›
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ background: '#EEF1F6', padding: '8px 14px 9px', borderBottom: '1px solid #DEE3EC' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{title}</div>
        <div style={{ width: 26, height: 3, borderRadius: 2, background: GOLD, marginTop: 4 }} />
      </div>
      {children}
    </div>
  )
}
