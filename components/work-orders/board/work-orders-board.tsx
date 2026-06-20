'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { deriveStatus, STATUS_LABEL, type WorkStatus } from '@/lib/work-orders/status'
import type { AnimalType, Barn, PenWorkFull, SaleDay, SpecialChargeFull, WorkType } from '@/lib/work-orders/types'
import { startCapture } from '@/lib/work-orders/start-capture'
import { deleteWorkOrder } from '@/app/(office)/work-orders/actions'
import { WorkOrderForm } from './work-order-form'

const NAVY = '#0E2646'
const GOLD = '#F3D12A'
const TEXT = '#1A1A1A'
const MUTED = '#717182'
const FAINT = '#9A9AA6'
const BORDER = '#D4D4D0'
const LINE = '#ECECE8'
const TEAL = '#0E7C86'

// Pen first (kept apart from the EXP head count so the two numbers don't blur
// together), then consignor, work type, expected head, worked, status, actions.
const GRID = '84px 1fr 150px 88px 110px 124px 150px'

const STATUS_STYLE: Record<WorkStatus, { bg: string; border: string; color: string; dot: string }> = {
  not_started: { bg: '#F3F3F0', border: '#E4E4DE', color: '#717182', dot: '#C2C2CA' },
  in_progress: { bg: '#FDF1DC', border: '#F1D9A8', color: '#B45309', dot: '#F59E0B' },
  complete: { bg: '#E1F5EE', border: '#9BD9CC', color: '#2E9486', dot: '#55BAAA' },
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
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '100dvh', background: '#F5F5F0' }}>
      {/* TOP BAR */}
      <div style={{ background: NAVY, minHeight: 60, display: 'flex', alignItems: 'center', gap: 4, padding: '0 18px 0 8px', flexShrink: 0 }}>
        <Link href="/" aria-label="Home" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none', fontSize: 20 }}>≡</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, alignSelf: 'stretch' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', fontSize: 14, fontWeight: 700, color: '#fff', borderBottom: `3px solid ${GOLD}` }}>Work orders</span>
          <Link href="/buyers" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', fontSize: 14, fontWeight: 700, color: '#8FA8CC', textDecoration: 'none' }}>Buyers</Link>
          <Link href="/sellers" style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', fontSize: 14, fontWeight: 700, color: '#8FA8CC', textDecoration: 'none' }}>Sellers</Link>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#55BAAA' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9D5EA' }}>{barn.name} · {longDate(saleDay.sale_date)}</span>
        </div>
      </div>

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1160, width: '100%', margin: '0 auto' }}>
        {/* HEADING */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: NAVY, letterSpacing: '-0.015em' }}>Work orders</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: FAINT }}>{barn.name} · {longDate(saleDay.sale_date)}</span>
        </div>

        {/* TOOLBAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setDayMenu((v) => !v)} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 14px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 9, fontFamily: 'inherit', cursor: 'pointer' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{longDate(saleDay.sale_date)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: FAINT }}>{barn.name}</span>
              <span style={{ color: FAINT, marginLeft: 2 }}>▾</span>
            </button>
            {dayMenu ? (
              <div style={{ position: 'absolute', top: 46, left: 0, zIndex: 30, minWidth: 240, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 12px 28px rgba(14,38,70,0.16)', overflow: 'hidden' }}>
                {saleDays.map((d) => (
                  <button key={d.id} type="button" onClick={() => { setDayMenu(false); if (d.id !== saleDay.id) router.push(`/work-orders/${d.id}`) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: d.id === saleDay.id ? '#F3F6FB' : '#fff', border: 'none', borderBottom: `1px solid ${LINE}`, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{longDate(d.sale_date)}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: FAINT }}>{d.status}</span>
                  </button>
                ))}
                {saleDays.length === 0 ? <div style={{ padding: '10px 12px', fontSize: 13, color: FAINT }}>No sale days.</div> : null}
              </div>
            ) : null}
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, height: 40, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '0 12px' }}>
            <span style={{ color: FAINT }}>⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or buyer #" style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: TEXT, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <button type="button" onClick={openNew} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRadius: 9, background: GOLD, color: NAVY, border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <span style={{ fontSize: 17, fontWeight: 800 }}>+</span>New work order
          </button>
        </div>

        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '72px 24px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 13 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#EEF1F6', border: '1px solid #DEE3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, fontSize: 24 }}>🗒</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: NAVY }}>No work orders for this sale day yet.</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: MUTED, marginBottom: 6 }}>Set up the first one before the crew starts working cattle.</div>
            <button type="button" onClick={openNew} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRadius: 9, background: GOLD, color: NAVY, border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}><span style={{ fontSize: 17, fontWeight: 800 }}>+</span>New work order</button>
          </div>
        ) : (
          <>
            {/* SUMMARY */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#EEF1F6', border: '1px solid #DEE3EC', borderRadius: 11, padding: '11px 16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{penWorks.length} work orders · {counts.pens} pens · {f0(counts.head)} head expected</span>
              <span style={{ flex: 1 }} />
              <SummaryCount dot="#C2C2CA" n={counts.not_started} label="Not started" />
              <SummaryCount dot="#F59E0B" n={counts.in_progress} label="In progress" />
              <SummaryCount dot="#55BAAA" n={counts.complete} label="Complete" />
            </div>

            {/* TABLE */}
            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 13, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, height: 34, padding: '0 18px', background: '#F1F3F8', borderBottom: '1px solid #DEE3EC', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: MUTED }}>
                <HeadCell pad>PEN</HeadCell><HeadCell pad>CONSIGNOR</HeadCell><HeadCell pad>WORK TYPE</HeadCell>
                <HeadCell end>EXP</HeadCell><HeadCell end>WORKED</HeadCell><HeadCell center>STATUS</HeadCell><div />
              </div>
              {rows.map((r, i) => {
                const st = STATUS_STYLE[r.status]
                const worked = r.status === 'not_started' ? '—' : r.status === 'in_progress' ? `${r.pw.head_worked ?? 0} of ${r.pw.head_expected ?? 0}` : String(r.pw.head_worked ?? 0)
                const workedColor = r.status === 'not_started' ? '#C2C2CA' : r.status === 'in_progress' ? '#B45309' : TEXT
                const nOpen = !!notesOpen[r.pw.id]
                return (
                  <div key={r.pw.id} style={{ background: i % 2 === 1 ? '#FAFBFC' : '#fff', borderBottom: i < rows.length - 1 ? `1px solid ${LINE}` : 'none' }}>
                    <div onClick={() => openEdit(r.pw)} style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'stretch', minHeight: 46, padding: '0 18px', cursor: 'pointer' }}>
                      <Cell pad weight={800} size={16} color={NAVY}>{r.pw.pen?.pen_number ?? '—'}</Cell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, padding: '0 10px 0 12px', borderRight: '1px solid #EFF0F4' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap', color: r.isBuyer ? '#946A00' : NAVY, background: r.isBuyer ? '#FBEFC2' : '#E7ECF5', border: `1px solid ${r.isBuyer ? '#EBD489' : '#CBD5E8'}` }}>{r.isBuyer ? `Buyer #${r.pw.buyer_number_text ?? '—'}` : 'Seller'}</span>
                        {r.custNo ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: FAINT, whiteSpace: 'nowrap' }}>#{r.custNo}</span> : null}
                        <div style={{ flex: 1 }} />
                        {r.pw.notes ? (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setNotesOpen((p) => ({ ...p, [r.pw.id]: !p[r.pw.id] })) }} aria-label="Notes"
                            style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, cursor: 'pointer', background: nOpen ? NAVY : '#FDF1DC', border: `1px solid ${nOpen ? NAVY : '#F1D9A8'}`, color: nOpen ? '#fff' : '#B45309', fontSize: 13 }}>✎</button>
                        ) : null}
                      </div>
                      <Cell pad ellipsis color={r.pw.workType ? TEXT : FAINT} weight={600} size={13}>{r.pw.workType?.name ?? '—'}</Cell>
                      <Cell end weight={800} size={15} color={TEAL}>{r.pw.head_expected ?? 0}</Cell>
                      <Cell end weight={700} size={13} color={workedColor}>{worked}</Cell>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', borderRight: '1px solid #EFF0F4' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999, background: st.bg, border: `1px solid ${st.border}`, fontSize: 12, fontWeight: 700, color: st.color, whiteSpace: 'nowrap' }}><span style={{ width: 7, height: 7, borderRadius: 999, background: st.dot }} />{STATUS_LABEL[r.status]}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingLeft: 12 }}>
                        {r.status !== 'complete' ? (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onWorkCows(r.pw) }} title="Mark started and open Capture bound to this order"
                            style={{ height: 32, padding: '0 12px', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: GOLD, color: NAVY, border: 'none', whiteSpace: 'nowrap' }}>Work Cows</button>
                        ) : (
                          <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(r.pw) }}
                            style={{ height: 32, padding: '0 12px', borderRadius: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: MUTED, border: '1px solid #E4E4DE', whiteSpace: 'nowrap' }}>View</button>
                        )}
                        <button type="button" onClick={(e) => openRowMenu(e, r.pw)} aria-label="More actions"
                          style={{ width: 32, height: 32, borderRadius: 7, background: rowMenu?.pw.id === r.pw.id ? '#EEF1F6' : '#fff', border: `1px solid ${BORDER}`, color: NAVY, fontSize: 17, fontWeight: 800, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>⋯</button>
                      </div>
                    </div>
                    {nOpen && r.pw.notes ? (
                      <div style={{ display: 'flex', gap: 10, padding: '2px 18px 13px 18px' }}>
                        <span style={{ color: '#B45309', flexShrink: 0 }}>✎</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: FAINT, marginBottom: 3 }}>Notes</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: TEXT, lineHeight: 1.45 }}>{r.pw.notes}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {rows.length === 0 ? <div style={{ padding: '24px 18px', fontSize: 14, color: MUTED, textAlign: 'center' }}>No work orders match “{query}”.</div> : null}
            </div>
          </>
        )}
      </div>

      {/* ROW MENU (edit / delete) */}
      {rowMenu ? (
        <>
          <div onClick={() => setRowMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{ position: 'fixed', top: rowMenu.y + 4, left: Math.max(12, rowMenu.x - 168), zIndex: 91, width: 168, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 12px 28px rgba(14,38,70,0.18)', overflow: 'hidden' }}>
            <button type="button" onClick={() => { const pw = rowMenu.pw; setRowMenu(null); openEdit(pw) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fff', border: 'none', borderBottom: `1px solid ${LINE}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: NAVY, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 14 }}>✎</span>Edit work order
            </button>
            <button type="button" onClick={() => { const id = rowMenu.pw.id; setRowMenu(null); window.open(`/print/pen-card/${id}`, '_blank', 'noopener,noreferrer,width=720,height=520') }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fff', border: 'none', borderBottom: `1px solid ${LINE}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: NAVY, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 14 }}>🖨</span>Print label
            </button>
            <button type="button" onClick={() => { const pw = rowMenu.pw; setRowMenu(null); void onDelete(pw) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#fff', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#C0392B', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 14 }}>🗑</span>Delete
            </button>
          </div>
        </>
      ) : null}

      {/* TOAST */}
      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: NAVY, borderRadius: 999, padding: '11px 18px', boxShadow: '0 10px 28px rgba(14,38,70,0.32)' }}>
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
    </div>
  )
}

function SummaryCount({ dot, n, label }: { dot: string; n: number; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: MUTED }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: dot }} />{n} {label}
    </span>
  )
}

function HeadCell({ children, pad, end, center }: { children?: React.ReactNode; pad?: boolean; end?: boolean; center?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: end ? 'flex-end' : center ? 'center' : 'flex-start', paddingLeft: pad ? 12 : 0, paddingRight: end ? 12 : 0, borderRight: '1px solid #E2E5EC' }}>{children}</div>
}

function Cell({ children, pad, end, ellipsis, color = TEXT, weight = 600, size = 14 }: { children: React.ReactNode; pad?: boolean; end?: boolean; ellipsis?: boolean; color?: string; weight?: number; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: end ? 'flex-end' : 'flex-start', padding: '0 12px', borderRight: '1px solid #EFF0F4', fontSize: size, fontWeight: weight, color, whiteSpace: ellipsis ? 'nowrap' : undefined, overflow: ellipsis ? 'hidden' : undefined, textOverflow: ellipsis ? 'ellipsis' : undefined }}>{children}</div>
  )
}
