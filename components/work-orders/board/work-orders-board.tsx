'use client'

import { colors } from '@/components/ui/tokens'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScreenHeader } from '@/components/ui/screen-header'
import { HeaderBack } from '@/components/ui/header-back'
import { PlusIcon, SearchIcon, ChevronDownIcon, TrashIcon } from '@/components/ui/icons'
import { deriveStatus, STATUS_LABEL, type WorkStatus } from '@/lib/work-orders/status'
import type { AnimalType, Barn, PenWorkFull, SaleDay, SpecialChargeFull, WorkType } from '@/lib/work-orders/types'
import { startCapture } from '@/lib/work-orders/start-capture'
import { deleteWorkOrder } from '@/app/(office)/work-orders/actions'
import { WorkOrderForm } from './work-order-form'
import { AnimalListModal } from './animal-list-modal'

// Pen first (kept apart from the head count so the two numbers don't blur
// together), then consignor, work type, head, worked, status, actions. The pen
// column is wide enough for a full typed label (not just a 2-digit number) and
// its cell wraps, so a longer pen label like "North 3" shows in full instead of
// being clipped. Work type gets the most room and is allowed to wrap to two
// lines, so a full name like "Preg and Mouth Combo" shows in full; the other
// columns are tightened to make room. Fluid widths so the table fits a tablet
// (>=768px) without sideways scroll; the phone gets stacked cards instead (see
// .wo-cards / .wo-board-table).
const GRID = '88px minmax(110px, 1fr) minmax(150px, 1.1fr) 52px 80px 104px 116px'

const STATUS_STYLE: Record<WorkStatus, { bg: string; border: string; color: string; dot: string }> = {
  not_started: { bg: '#F3F3F0', border: '#E4E4DE', color: '#717182', dot: '#C2C2CA' },
  in_progress: { bg: '#FDF1DC', border: '#F1D9A8', color: '#B45309', dot: '#F59E0B' },
  complete: { bg: '#E1F5EE', border: '#9BD9CC', color: '#55BAAA', dot: '#55BAAA' },
}
const SORT_RANK: Record<WorkStatus, number> = { in_progress: 0, not_started: 1, complete: 2 }

type DaySummary = { id: string; sale_date: string; status: string; notes: string | null }

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function WorkOrdersBoard({
  saleDay, saleDays, barn, workTypes, animalTypes, pens, penWorks, specialsByPenWork,
}: {
  saleDay: SaleDay
  saleDays: DaySummary[]
  barn: Barn
  workTypes: WorkType[]
  animalTypes: AnimalType[]
  pens: { id: string; pen_number: string }[]
  penWorks: PenWorkFull[]
  specialsByPenWork: Record<string, SpecialChargeFull[]>
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PenWorkFull | null>(null)
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({})
  const [dayMenu, setDayMenu] = useState(false)
  const [rowMenu, setRowMenu] = useState<{ pw: PenWorkFull; x: number; y: number } | null>(null)
  const [animalList, setAnimalList] = useState<{ penWorkId: string; title: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return penWorks
      .map((pw) => {
        const isBuyer = !!pw.buyer_party_id
        const p = isBuyer ? pw.buyer : pw.seller
        return { pw, status: deriveStatus(pw), isBuyer, name: p?.name ?? '—', custNo: p?.customer_number ?? null }
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.custNo ?? '').includes(q) || (r.pw.buyer_number_text ?? '').includes(q))
      .sort((a, b) => SORT_RANK[a.status] - SORT_RANK[b.status])
  }, [penWorks, query])

  const counts = useMemo(() => {
    const c = { not_started: 0, in_progress: 0, complete: 0 }
    for (const pw of penWorks) c[deriveStatus(pw)]++
    const head = penWorks.reduce((a, pw) => a + (pw.head_expected ?? 0), 0)
    const penSet = new Set(penWorks.map((pw) => pw.pen?.pen_number).filter(Boolean))
    return { ...c, head, pens: penSet.size }
  }, [penWorks])

  function openNew() { setEditing(null); setFormOpen(true) }
  function openEdit(pw: PenWorkFull) { setEditing(pw); setFormOpen(true) }
  // Open the little three-dots menu anchored under the button that was tapped.
  function openRowMenu(e: React.MouseEvent, pw: PenWorkFull) {
    e.stopPropagation()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setRowMenu({ pw, x: r.right, y: r.bottom })
  }
  function animalTitle(pw: PenWorkFull) {
    const p = pw.buyer_party_id ? pw.buyer : pw.seller
    return `${pw.pen?.pen_number ? `Pen ${pw.pen.pen_number}` : 'No pen'} · ${p?.name ?? '—'}`
  }
  function onSaved(msg: string) { setFormOpen(false); flash(msg); router.refresh() }
  // "Work Cows" — shared with the chute list: mark started, open Capture bound to it.
  function onWorkCows(pw: PenWorkFull) { void startCapture(pw.id, (href) => router.push(href)) }
  async function onDelete(pw: PenWorkFull) {
    if (!window.confirm('Delete this work order? This can’t be undone from here.')) return
    const res = await deleteWorkOrder(pw.id)
    if (res.ok) { flash('Work order deleted'); router.refresh() } else { flash(res.error ?? 'Could not delete') }
  }

  const isEmpty = penWorks.length === 0
  const f0 = (n: number) => n.toLocaleString('en-US')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Slim screen sub-header with the one back chevron (to the Sale Dashboard);
          the shared app header above carries the barn name + wordmark. */}
      <ScreenHeader title="Work Orders" subtitle={longDate(saleDay.sale_date)} back={<HeaderBack href={`/day/${saleDay.id}`} label="Back to Sale Dashboard" />} />

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 'var(--content-max)', width: '100%', margin: '0 auto' }}>
        {/* TOOLBAR — wraps onto two rows on a phone so nothing is cut off. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setDayMenu((v) => !v)} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 14px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, fontFamily: 'inherit', cursor: 'pointer' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>{longDate(saleDay.sale_date)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPlaceholder }}>{barn.name}</span>
              <ChevronDownIcon size={14} style={{ color: colors.textPlaceholder }} />
            </button>
            {dayMenu ? (
              <div style={{ position: 'absolute', top: 46, left: 0, zIndex: 30, minWidth: 240, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 10, boxShadow: '0 12px 28px rgba(14,38,70,0.16)', overflow: 'hidden' }}>
                {saleDays.map((d) => (
                  <button key={d.id} type="button" onClick={() => { setDayMenu(false); if (d.id !== saleDay.id) router.push(`/work-orders/${d.id}`) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: d.id === saleDay.id ? '#F3F6FB' : '#fff', border: 'none', borderBottom: `1px solid ${colors.rowDivider}`, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{longDate(d.sale_date)}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.textPlaceholder }}>{d.status}</span>
                  </button>
                ))}
                {saleDays.length === 0 ? <div style={{ padding: '10px 12px', fontSize: 13, color: colors.textPlaceholder }}>No sale days.</div> : null}
              </div>
            ) : null}
          </div>
          <div style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 9, height: 44, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, padding: '0 12px' }}>
            <SearchIcon size={16} style={{ color: colors.textPlaceholder }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or buyer #" style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: colors.textPrimary, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <button type="button" onClick={openNew} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 16px', borderRadius: 9, background: colors.gold, color: colors.navy, border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <PlusIcon size={16} style={{ color: colors.navy }} />New Work Order
          </button>
        </div>

        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '64px 24px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 13 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: colors.navy }}>No work orders for this sale day yet.</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.textMuted, marginBottom: 6 }}>Set up the first one before the crew starts working cattle.</div>
            <button type="button" onClick={openNew} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 16px', borderRadius: 9, background: colors.gold, color: colors.navy, border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}><PlusIcon size={16} style={{ color: colors.navy }} />New Work Order</button>
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#EEF1F6', border: '1px solid #DEE3EC', borderRadius: 11, padding: '11px 16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>{penWorks.length} work orders · {counts.pens} pens · {f0(counts.head)} head expected</span>
              <span style={{ flex: 1 }} />
              <SummaryCount dot="#C2C2CA" n={counts.not_started} label="Not Started" />
              <SummaryCount dot="#F59E0B" n={counts.in_progress} label="In Progress" />
              <SummaryCount dot="#55BAAA" n={counts.complete} label="Complete" />
            </div>

            {/* ORDERS — a proper multi-column table from tablet up. Fluid columns
                so it uses the width and doesn't need sideways scroll; the phone
                gets stacked cards instead (the .wo-cards block below). */}
            <div className="wo-board-table" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 13, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <div>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, height: 34, padding: '0 18px', background: '#F1F3F8', borderBottom: '1px solid #DEE3EC', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: colors.textMuted }}>
                <HeadCell pad>PEN</HeadCell><HeadCell pad>CONSIGNOR</HeadCell><HeadCell pad>WORK TYPE</HeadCell>
                <HeadCell end>HEAD</HeadCell><HeadCell end>WORKED</HeadCell><HeadCell center>STATUS</HeadCell><div />
              </div>
              {rows.map((r, i) => {
                const st = STATUS_STYLE[r.status]
                const worked = r.status === 'not_started' ? '—' : r.status === 'in_progress' ? `${r.pw.head_worked ?? 0} of ${r.pw.head_expected ?? 0}` : String(r.pw.head_worked ?? 0)
                const workedColor = r.status === 'not_started' ? '#C2C2CA' : r.status === 'in_progress' ? '#B45309' : colors.textPrimary
                const nOpen = !!notesOpen[r.pw.id]
                return (
                  <div key={r.pw.id} style={{ background: i % 2 === 1 ? '#FAFBFC' : '#fff', borderBottom: i < rows.length - 1 ? `1px solid ${colors.rowDivider}` : 'none' }}>
                    <div onClick={() => openEdit(r.pw)} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'stretch', minHeight: 46, padding: '0 18px', cursor: 'pointer' }}>
                      <Cell pad wrap weight={800} size={16} color={colors.navy}>{r.pw.pen?.pen_number ?? '—'}</Cell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, padding: '0 10px 0 12px', borderRight: '1px solid #EFF0F4' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap', color: r.isBuyer ? '#946A00' : colors.navy, background: r.isBuyer ? '#FBEFC2' : '#E7ECF5', border: `1px solid ${r.isBuyer ? '#EBD489' : '#CBD5E8'}` }}>{r.isBuyer ? `Buyer #${r.pw.buyer_number_text ?? '—'}` : 'Seller'}</span>
                        {r.custNo ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: colors.textPlaceholder, whiteSpace: 'nowrap' }}>#{r.custNo}</span> : null}
                        <div style={{ flex: 1 }} />
                        {r.pw.notes ? (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setNotesOpen((p) => ({ ...p, [r.pw.id]: !p[r.pw.id] })) }} aria-label="Notes"
                            style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, cursor: 'pointer', background: nOpen ? colors.navy : '#FDF1DC', border: `1px solid ${nOpen ? colors.navy : '#F1D9A8'}`, color: nOpen ? '#fff' : '#B45309', fontSize: 13 }}>✎</button>
                        ) : null}
                      </div>
                      <Cell pad wrap color={r.pw.workType ? colors.textPrimary : colors.textPlaceholder} weight={600} size={13}>{r.pw.workType?.name ?? '—'}</Cell>
                      <Cell end weight={800} size={15} color={colors.teal}>{r.pw.head_expected ?? 0}</Cell>
                      <Cell end weight={700} size={13} color={workedColor}>{worked}</Cell>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', borderRight: '1px solid #EFF0F4' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999, background: st.bg, border: `1px solid ${st.border}`, fontSize: 12, fontWeight: 700, color: st.color, whiteSpace: 'nowrap' }}><span style={{ width: 7, height: 7, borderRadius: 999, background: st.dot }} />{STATUS_LABEL[r.status]}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingLeft: 16 }}>
                        {r.status !== 'complete' ? (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onWorkCows(r.pw) }} title="Mark started and open Capture bound to this order"
                            style={{ height: 32, padding: '0 14px', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: colors.gold, color: colors.navy, border: 'none', whiteSpace: 'nowrap' }}>Work</button>
                        ) : (
                          <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(r.pw) }}
                            style={{ height: 32, padding: '0 12px', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: colors.textMuted, border: '1px solid #E4E4DE', whiteSpace: 'nowrap' }}>View</button>
                        )}
                        <button type="button" onClick={(e) => openRowMenu(e, r.pw)} aria-label="More actions"
                          style={{ width: 32, height: 32, borderRadius: 7, background: rowMenu?.pw.id === r.pw.id ? '#EEF1F6' : '#fff', border: `1px solid ${colors.border}`, color: colors.navy, fontSize: 17, fontWeight: 800, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>⋯</button>
                      </div>
                    </div>
                    {nOpen && r.pw.notes ? (
                      <div style={{ display: 'flex', gap: 10, padding: '2px 18px 13px 18px' }}>
                        <span style={{ color: '#B45309', flexShrink: 0 }}>✎</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: colors.textPlaceholder, marginBottom: 3 }}>Notes</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary, lineHeight: 1.45 }}>{r.pw.notes}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {rows.length === 0 ? <div style={{ padding: '24px 18px', fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>No work orders match “{query}”.</div> : null}
                </div>
              </div>
            </div>

            {/* PHONE : one order per stacked card — legible without sideways scroll. */}
            <div className="wo-cards">
              {rows.map((r) => {
                const st = STATUS_STYLE[r.status]
                const worked = r.status === 'not_started' ? '—' : r.status === 'in_progress' ? `${r.pw.head_worked ?? 0} of ${r.pw.head_expected ?? 0}` : String(r.pw.head_worked ?? 0)
                const workedColor = r.status === 'not_started' ? '#C2C2CA' : r.status === 'in_progress' ? '#B45309' : colors.textPrimary
                return (
                  <div key={r.pw.id} onClick={() => openEdit(r.pw)} className="press-card" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>{r.pw.pen?.pen_number ? `Pen ${r.pw.pen.pen_number}` : 'No pen'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999, background: st.bg, border: `1px solid ${st.border}`, fontSize: 12, fontWeight: 700, color: st.color, whiteSpace: 'nowrap', flexShrink: 0 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: st.dot }} />{STATUS_LABEL[r.status]}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>{r.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', color: r.isBuyer ? '#946A00' : colors.navy, background: r.isBuyer ? '#FBEFC2' : '#E7ECF5', border: `1px solid ${r.isBuyer ? '#EBD489' : '#CBD5E8'}` }}>{r.isBuyer ? `Buyer #${r.pw.buyer_number_text ?? '—'}` : 'Seller'}</span>
                      {r.custNo ? <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPlaceholder }}>#{r.custNo}</span> : null}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: r.pw.workType ? colors.textPrimary : colors.textPlaceholder }}>{r.pw.workType?.name ?? 'No work type'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, whiteSpace: 'nowrap' }}><span style={{ color: colors.teal }}>{r.pw.head_expected ?? 0}</span> exp · <span style={{ color: workedColor }}>{worked}</span> worked</span>
                    </div>
                    {r.pw.notes ? <div style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary, background: '#FDF7EA', border: '1px solid #F1D9A8', borderRadius: 9, padding: '8px 10px', lineHeight: 1.45 }}>{r.pw.notes}</div> : null}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.status !== 'complete' ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); onWorkCows(r.pw) }} style={{ flex: 1, height: 44, borderRadius: 9, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: colors.gold, color: colors.navy, border: 'none' }}>Work</button>
                      ) : (
                        <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(r.pw) }} style={{ flex: 1, height: 44, borderRadius: 9, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#fff', color: colors.textMuted, border: '1px solid #E4E4DE' }}>View</button>
                      )}
                      <button type="button" onClick={(e) => openRowMenu(e, r.pw)} aria-label="More actions" style={{ width: 44, height: 44, borderRadius: 9, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy, fontSize: 18, fontWeight: 800, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>⋯</button>
                    </div>
                  </div>
                )
              })}
              {rows.length === 0 ? <div style={{ padding: '24px 8px', fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>No work orders match “{query}”.</div> : null}
            </div>
          </>
        )}
      </div>

      {/* ROW MENU (edit / delete) */}
      {rowMenu ? (
        <>
          <div onClick={() => setRowMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{ position: 'fixed', top: rowMenu.y + 4, left: Math.max(12, rowMenu.x - 168), zIndex: 91, width: 168, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 10, boxShadow: '0 12px 28px rgba(14,38,70,0.18)', overflow: 'hidden' }}>
            <button type="button" onClick={() => { const pw = rowMenu.pw; setRowMenu(null); openEdit(pw) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fff', border: 'none', borderBottom: `1px solid ${colors.rowDivider}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.navy, cursor: 'pointer', textAlign: 'left' }}>
              Edit Work Order
            </button>
            <button type="button" onClick={() => { const pw = rowMenu.pw; setRowMenu(null); setAnimalList({ penWorkId: pw.id, title: animalTitle(pw) }) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fff', border: 'none', borderBottom: `1px solid ${colors.rowDivider}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.navy, cursor: 'pointer', textAlign: 'left' }}>
              Animal List
            </button>
            <button type="button" onClick={() => { const id = rowMenu.pw.id; setRowMenu(null); window.open(`/print/pen-card/${id}`, '_blank', 'noopener,noreferrer,width=720,height=520') }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fff', border: 'none', borderBottom: `1px solid ${colors.rowDivider}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.navy, cursor: 'pointer', textAlign: 'left' }}>
              Print Label
            </button>
            <button type="button" onClick={() => { const pw = rowMenu.pw; setRowMenu(null); void onDelete(pw) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#C0392B', cursor: 'pointer', textAlign: 'left' }}>
              <TrashIcon size={14} style={{ color: '#C0392B' }} />Delete
            </button>
          </div>
        </>
      ) : null}

      {/* TOAST */}
      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: colors.navy, borderRadius: 999, padding: '11px 18px', boxShadow: '0 10px 28px rgba(14,38,70,0.32)' }}>
            <span style={{ color: '#55BAAA' }}>✓</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{toast}</span>
          </div>
        </div>
      ) : null}

      <WorkOrderForm
        open={formOpen}
        editing={editing}
        saleDayId={saleDay.id}
        barn={barn}
        workTypes={workTypes}
        animalTypes={animalTypes}
        pens={pens}
        existingSpecials={editing ? specialsByPenWork[editing.id] ?? [] : []}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
      />

      {animalList ? (
        <AnimalListModal penWorkId={animalList.penWorkId} title={animalList.title} onClose={() => setAnimalList(null)} />
      ) : null}
    </div>
  )
}

function SummaryCount({ dot, n, label }: { dot: string; n: number; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: colors.textMuted }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: dot }} />{n} {label}
    </span>
  )
}

function HeadCell({ children, pad, end, center }: { children?: React.ReactNode; pad?: boolean; end?: boolean; center?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: end ? 'flex-end' : center ? 'center' : 'flex-start', paddingLeft: pad ? 12 : 0, paddingRight: end ? 12 : 0, borderRight: '1px solid #E2E5EC' }}>{children}</div>
}

function Cell({ children, pad, end, ellipsis, wrap, color = colors.textPrimary, weight = 600, size = 14 }: { children: React.ReactNode; pad?: boolean; end?: boolean; ellipsis?: boolean; wrap?: boolean; color?: string; weight?: number; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: end ? 'flex-end' : 'flex-start', padding: wrap ? '7px 12px' : '0 12px', borderRight: '1px solid #EFF0F4', fontSize: size, fontWeight: weight, color, lineHeight: wrap ? 1.25 : undefined, wordBreak: wrap ? 'break-word' : undefined, whiteSpace: ellipsis ? 'nowrap' : undefined, overflow: ellipsis ? 'hidden' : undefined, textOverflow: ellipsis ? 'ellipsis' : undefined }}>{children}</div>
  )
}
