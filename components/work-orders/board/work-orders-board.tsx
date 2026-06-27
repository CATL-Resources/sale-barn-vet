'use client'

import { colors } from '@/components/ui/tokens'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScreenHeader } from '@/components/ui/screen-header'
import { HeaderBack } from '@/components/ui/header-back'
import { PlusIcon, SearchIcon, TrashIcon } from '@/components/ui/icons'
import { deriveStatus, STATUS_LABEL, type WorkStatus } from '@/lib/work-orders/status'
import { naturalCompare, textCompare } from '@/lib/animals/natural-sort'
import type { AnimalType, Barn, PenWorkFull, SaleDay, SpecialChargeFull, WorkType } from '@/lib/work-orders/types'
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
// Sort options for the work-order list (default Pen). Front-end ordering only —
// no schema change. Pen is also the tiebreak under every other sort.
type SortKey = 'pen' | 'workType' | 'head' | 'status'
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'pen', label: 'Pen' },
  { key: 'workType', label: 'Work Type' },
  { key: 'head', label: 'Head' },
  { key: 'status', label: 'Status' },
]
// The Status sort follows the visible status pill (the derived work status), in
// the same order the summary strip lists it: Not Started, In Progress, Complete.
const STATUS_RANK: Record<WorkStatus, number> = { not_started: 0, in_progress: 1, complete: 2 }
const headOf = (pw: PenWorkFull) => pw.head_billed ?? pw.head_worked ?? 0


function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function WorkOrdersBoard({
  saleDay, barn, workTypes, animalTypes, pens, penWorks, specialsByPenWork,
}: {
  saleDay: SaleDay
  barn: Barn
  workTypes: WorkType[]
  animalTypes: AnimalType[]
  pens: { id: string; pen_number: string }[]
  penWorks: PenWorkFull[]
  specialsByPenWork: Record<string, SpecialChargeFull[]>
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('pen')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PenWorkFull | null>(null)
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({})
  const [rowMenu, setRowMenu] = useState<{ pw: PenWorkFull; x: number; y: number } | null>(null)
  const [animalList, setAnimalList] = useState<{ penWorkId: string; title: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const mapped = penWorks
      .map((pw) => {
        const isBuyer = !!pw.buyer_party_id
        const p = isBuyer ? pw.buyer : pw.seller
        return { pw, status: deriveStatus(pw), isBuyer, name: p?.name ?? '—', custNo: p?.customer_number ?? null }
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.custNo ?? '').includes(q) || (r.pw.buyer_number_text ?? '').includes(q))
    return mapped.sort((a, b) => {
      // Pen (natural order) is the default and the tiebreak under every sort.
      const penCmp = naturalCompare(a.pw.pen?.pen_number ?? '', b.pw.pen?.pen_number ?? '')
      switch (sortBy) {
        case 'workType':
          return textCompare(a.pw.workType?.name ?? '', b.pw.workType?.name ?? '') || penCmp
        case 'head':
          return headOf(b.pw) - headOf(a.pw) || penCmp // most head first
        case 'status':
          return STATUS_RANK[a.status] - STATUS_RANK[b.status] || penCmp
        default:
          return penCmp
      }
    })
  }, [penWorks, query, sortBy])

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
  async function onDelete(pw: PenWorkFull) {
    if (!window.confirm('Delete this work order? This can’t be undone from here.')) return
    const res = await deleteWorkOrder(pw.id)
    if (res.ok) { flash('Work order deleted'); router.refresh() } else { flash(res.error ?? 'Could not delete') }
  }

  const isEmpty = penWorks.length === 0
  const f0 = (n: number) => n.toLocaleString('en-US')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Slim screen sub-header with the one back chevron (to Home); the shared
          app header above carries the barn name + wordmark. */}
      <ScreenHeader title="Work Orders" subtitle={longDate(saleDay.sale_date)} back={<HeaderBack href="/" label="Home" />} />

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 'var(--content-max)', width: '100%', margin: '0 auto' }}>
        {/* TOOLBAR — one line: search + a compact "+" to add a work order. The
            past-sales switcher lived here before; it's gone (it duplicated the
            header and switching days will live elsewhere). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 180, maxWidth: 460, display: 'flex', alignItems: 'center', gap: 9, height: 44, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, padding: '0 12px' }}>
            <SearchIcon size={16} style={{ color: colors.textPlaceholder }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer or buyer #" style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: colors.textPrimary, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          {/* Sort control — default Pen. Reorders the list (no data change). */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 44, flexShrink: 0, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, padding: '0 8px 0 12px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.03em', color: colors.textMuted }}>Sort</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} aria-label="Sort work orders" style={{ height: 40, border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.navy, cursor: 'pointer', outline: 'none' }}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={openNew} aria-label="New work order" style={{ width: 44, height: 44, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: colors.gold, color: colors.navy, border: 'none', cursor: 'pointer' }}>
            <PlusIcon size={20} style={{ color: colors.navy }} />
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: 16 }}>
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

            {/* PHONE : one order per stacked card with labeled rows — legible
                without sideways scroll, no cramped columns. */}
            <div className="wo-cards">
              {rows.map((r) => {
                const st = STATUS_STYLE[r.status]
                const worked = r.status === 'not_started' ? '—' : r.status === 'in_progress' ? `${r.pw.head_worked ?? 0} of ${r.pw.head_expected ?? 0}` : String(r.pw.head_worked ?? 0)
                const workedColor = r.status === 'not_started' ? '#C2C2CA' : r.status === 'in_progress' ? '#B45309' : colors.textPrimary
                return (
                  <div key={r.pw.id} onClick={() => openEdit(r.pw)} className="press-card" style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                    {/* Navy band header with a thin gold line — the pen number is the
                        prominent label so different pens read apart at a glance. */}
                    <div style={{ background: '#0E2646', borderBottom: '3px solid #F3D12A', padding: '11px 14px' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{r.pw.pen?.pen_number ? `Pen ${r.pw.pen.pen_number}` : 'No pen'}</div>
                    </div>
                    {/* body */}
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {/* consignor / buyer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>{r.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', color: r.isBuyer ? '#946A00' : colors.navy, background: r.isBuyer ? '#FBEFC2' : '#E7ECF5', border: `1px solid ${r.isBuyer ? '#EBD489' : '#CBD5E8'}` }}>{r.isBuyer ? `Buyer #${r.pw.buyer_number_text ?? '—'}` : 'Seller'}</span>
                      {r.custNo ? <span style={{ fontSize: 11, fontWeight: 600, color: colors.textPlaceholder }}>#{r.custNo}</span> : null}
                    </div>
                    {/* labeled rows */}
                    <div style={{ borderTop: `1px solid ${colors.rowDivider}` }}>
                      <CardRow label="Work type" value={<span style={{ color: r.pw.workType ? colors.textPrimary : colors.textPlaceholder }}>{r.pw.workType?.name ?? 'No work type'}</span>} />
                      <CardRow label="Head" value={<span style={{ color: colors.teal }}>{r.pw.head_expected ?? 0}</span>} />
                      <CardRow label="Worked" value={<span style={{ color: workedColor }}>{worked}</span>} />
                      <CardRow
                        label="Status"
                        last
                        value={
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 999, background: st.bg, border: `1px solid ${st.border}`, fontSize: 12, fontWeight: 700, color: st.color, whiteSpace: 'nowrap' }}>
                            <span style={{ width: 7, height: 7, borderRadius: 999, background: st.dot }} />{STATUS_LABEL[r.status]}
                          </span>
                        }
                      />
                    </div>
                    {r.pw.notes ? <div style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary, background: '#FDF7EA', border: '1px solid #F1D9A8', borderRadius: 9, padding: '8px 10px', lineHeight: 1.45 }}>{r.pw.notes}</div> : null}
                    {/* per-card actions — the more-actions menu (edit / animal list / print / delete) */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={(e) => openRowMenu(e, r.pw)} aria-label="More actions" style={{ width: 44, height: 44, borderRadius: 9, background: '#fff', border: `1px solid ${colors.border}`, color: colors.navy, fontSize: 18, fontWeight: 800, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>⋯</button>
                    </div>
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

// One labeled line in a phone order card: muted label on the left, value on the right.
function CardRow({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 38, padding: '7px 0', borderBottom: last ? 'none' : `1px solid ${colors.rowDivider}` }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
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
