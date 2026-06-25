'use client'

import { colors } from '@/components/ui/tokens'
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { buildSpecialChargeFields, computePenWorkCharges, formatUsd } from '@/lib/work-orders/pricing'
import { PrintPenCardButton } from '@/components/pen-card/print-pen-card-button'
import type { AnimalType, Barn, PenWorkFull, SpecialChargeFull, WorkType } from '@/lib/work-orders/types'
import {
  createParty,
  getPartyDetail,
  getPartyLocations,
  saveWorkOrder,
  searchParties,
  type PartyLocation,
  type PartyMatch,
  type SpecialInput,
} from '@/app/(office)/work-orders/actions'
import { CustomerPopup, LocationEditor } from './customer-editing'
import { AnimalListModal } from './animal-list-modal'

type Picked = { id: string; name: string; customer_number: string | null }
type StagedSpecial = SpecialInput & { key: string }

const fieldLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: colors.navy, letterSpacing: '0.02em', marginBottom: 7 }
const input: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 12px', border: `1px solid ${colors.border}`, borderRadius: 9,
  background: '#fff', fontSize: 15, fontWeight: 600, color: colors.textPrimary, fontFamily: 'inherit', outline: 'none',
}

const pct = (r: number) => `${(r * 100).toFixed(2)}%`

function Section({ label, hint, right, children }: { label: string; hint?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 7 }}>
        <span style={fieldLabel as React.CSSProperties}>{label}</span>
        {hint ? <span style={{ fontSize: 12, fontWeight: 500, color: colors.textPlaceholder }}>{hint}</span> : null}
        {right ? <><div style={{ flex: 1 }} />{right}</> : null}
      </div>
      {children}
    </div>
  )
}

export function WorkOrderForm({
  open, editing, saleDayId, barn, workTypes, animalTypes, pens, existingSpecials, onClose, onSaved,
}: {
  open: boolean
  editing: PenWorkFull | null
  saleDayId: string
  barn: Barn
  workTypes: WorkType[]
  animalTypes: AnimalType[]
  pens: { id: string; pen_number: string }[]
  existingSpecials: SpecialChargeFull[]
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [role, setRole] = useState<'seller' | 'buyer'>('seller')
  const [buyerNo, setBuyerNo] = useState('')
  const [party, setParty] = useState<Picked | null>(null)
  const [cQuery, setCQuery] = useState('')
  const [matches, setMatches] = useState<PartyMatch[]>([])
  const [locations, setLocations] = useState<PartyLocation[]>([])
  const [originLocationId, setOriginLocationId] = useState<string | null>(null)
  const [workTypeId, setWorkTypeId] = useState<string | null>(null)
  const [animalTypeId, setAnimalTypeId] = useState<string | null>(null)
  const [headExpected, setHeadExpected] = useState('')
  const [penText, setPenText] = useState('')
  const [notes, setNotes] = useState('')
  const [staged, setStaged] = useState<StagedSpecial[]>([])
  const [menu, setMenu] = useState<'work' | 'animal' | null>(null)
  const [popupPartyId, setPopupPartyId] = useState<string | null>(null)
  const [editingLoc, setEditingLoc] = useState<PartyLocation | 'new' | null>(null)
  const [showAnimals, setShowAnimals] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const [, startSearch] = useTransition()

  // Reset every time the panel opens: a cancelled form reopens clean, and an
  // edit opens prefilled from its order. (The previous keying skipped the reset
  // on a second "new", so it reopened dirty — fixed here.)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      setError(null); setMenu(null); setCQuery(''); setMatches([]); setStaged([])
      setLocations([]); setPopupPartyId(null); setEditingLoc(null); setShowAnimals(false)
      if (editing) {
        const isBuyer = !!editing.buyer_party_id
        const p = isBuyer ? editing.buyer : editing.seller
        setRole(isBuyer ? 'buyer' : 'seller')
        setBuyerNo(editing.buyer_number_text ?? '')
        setParty(p ? { id: p.id, name: p.name, customer_number: p.customer_number } : null)
        setOriginLocationId(editing.origin_location_id)
        setWorkTypeId(editing.work_type_id)
        setAnimalTypeId(editing.animal_type_id)
        setHeadExpected(editing.head_expected != null ? String(editing.head_expected) : '')
        setPenText(editing.pen?.pen_number ?? '')
        setNotes(editing.notes ?? '')
      } else {
        setRole('seller'); setBuyerNo(''); setParty(null); setOriginLocationId(null)
        setWorkTypeId(null); setAnimalTypeId(null); setHeadExpected(''); setPenText(''); setNotes('')
      }
    }
    wasOpen.current = open
  }, [open, editing])

  // Debounced customer search.
  useEffect(() => {
    if (party) return
    const q = cQuery.trim()
    if (!q) { setMatches([]); return }
    const t = setTimeout(() => {
      startSearch(async () => {
        const res = await searchParties(q)
        setMatches(res)
      })
    }, 250)
    return () => clearTimeout(t)
  }, [cQuery, party])

  // Load the chosen customer's locations; preselect a sensible one.
  useEffect(() => {
    if (!party) { setLocations([]); return }
    let alive = true
    getPartyLocations(party.id).then((locs) => {
      if (!alive) return
      setLocations(locs)
      setOriginLocationId((cur) => {
        if (cur && locs.some((l) => l.id === cur)) return cur
        return locs.find((l) => l.is_default)?.id ?? locs[0]?.id ?? null
      })
    })
    return () => { alive = false }
  }, [party])

  const wt = workTypes.find((w) => w.id === workTypeId) ?? null
  const head = parseInt(headExpected, 10) || 0
  const charges = wt ? computePenWorkCharges(wt.vet_charge, wt.sol_charge, head, barn.sales_tax_rate, barn.admin_fee_rate) : null
  // One special's priced fields, from the SAME helper the save uses — so this
  // preview equals exactly what gets saved and frozen.
  const specialFields = (s: StagedSpecial) => buildSpecialChargeFields(s.perHead, s.head, barn)
  const stagedTotal = staged.reduce((a, s) => a + specialFields(s).customer_charge, 0)
  const existingTotal = existingSpecials.reduce((a, s) => a + Number(s.customer_charge || 0), 0)
  const specialsTotal = stagedTotal + existingTotal
  const estimate = (charges?.lineCharge ?? 0) + specialsTotal

  function addSpecial() {
    setStaged((s) => [...s, { key: `s${Date.now()}${Math.random()}`, description: '', head: head || 1, perHead: 0 }])
  }
  function patchSpecial(key: string, p: Partial<StagedSpecial>) {
    setStaged((s) => s.map((x) => (x.key === key ? { ...x, ...p } : x)))
  }
  function removeSpecial(key: string) {
    setStaged((s) => s.filter((x) => x.key !== key))
  }

  async function onAddCustomer() {
    const res = await createParty(cQuery)
    if (res.ok) {
      setParty({ id: res.party.id, name: res.party.name, customer_number: res.party.customer_number })
      setCQuery(''); setMatches([])
    } else {
      setError(res.error)
    }
  }

  async function onLocationSaved(loc: PartyLocation) {
    setEditingLoc(null)
    if (!party) return
    setLocations(await getPartyLocations(party.id))
    setOriginLocationId(loc.id) // a just-added / edited location becomes the order's origin
  }

  async function onCustomerChanged() {
    if (party && popupPartyId === party.id) {
      const d = await getPartyDetail(party.id)
      if (d) setParty({ id: d.id, name: d.name, customer_number: d.customer_number })
      setLocations(await getPartyLocations(party.id))
    }
    if (cQuery.trim()) setMatches(await searchParties(cQuery))
  }

  const locSub = (l: PartyLocation) =>
    [l.city, l.state].filter(Boolean).join(', ') + (l.zip ? ` ${l.zip}` : '')

  function onSave() {
    setError(null)
    startSaving(async () => {
      const res = await saveWorkOrder({
        id: editing?.id ?? null,
        saleDayId,
        role,
        partyId: party?.id ?? null,
        buyerNumberText: role === 'buyer' ? buyerNo : null,
        originLocationId,
        workTypeId,
        animalTypeId,
        headExpected: headExpected === '' ? null : head,
        penText: penText.trim() || null,
        notes,
        newSpecials: staged.map(({ description, head, perHead }) => ({ description, head, perHead })),
      })
      if (res.ok) onSaved(editing ? 'Work order updated' : 'Work order created')
      else setError(res.error)
    })
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(14,38,70,0.4)', transition: 'opacity 220ms ease', opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden', pointerEvents: open ? 'auto' : 'none' }}
      />
      <div
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1060, width: 'min(468px, 92vw)', background: '#fff', borderLeft: `1px solid ${colors.border}`, boxShadow: '-16px 0 40px rgba(14,38,70,0.18)', display: 'flex', flexDirection: 'column', transform: open ? 'translateX(0)' : 'translateX(100%)', visibility: open ? 'visible' : 'hidden', pointerEvents: open ? 'auto' : 'none', transition: 'transform 260ms cubic-bezier(0.2,0.7,0.2,1), visibility 260ms' }}
        aria-hidden={!open}
      >
        <div style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', borderBottom: `1px solid ${colors.rowDivider}` }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>{editing ? 'Edit Work Order' : 'New Work Order'}</span>
          <div style={{ flex: 1 }} />
          {editing ? (
            <button type="button" onClick={() => setShowAnimals(true)} style={{ height: 36, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colors.navy, cursor: 'pointer' }}>
              Animals
            </button>
          ) : null}
          {editing ? <PrintPenCardButton penWorkId={editing.id} label="Print" /> : null}
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F2F4', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 18, color: colors.navy }}>✕</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error ? (
            <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, background: '#FDECEC', border: '1px solid #F2B8B8', color: '#B42318', fontSize: 13, fontWeight: 600 }}>{error}</div>
          ) : null}

          {/* Type */}
          <Section label="Type">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={() => setRole(role === 'buyer' ? 'seller' : 'buyer')}
                style={{ height: 44, padding: '0 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, background: role === 'buyer' ? colors.gold : colors.navy, color: role === 'buyer' ? colors.navy : '#fff' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: role === 'buyer' ? colors.navy : '#fff' }} />{role === 'buyer' ? 'Buyer' : 'Seller'}
              </button>
              {role === 'buyer' ? (
                <input value={buyerNo} onChange={(e) => setBuyerNo(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Buyer #"
                  style={{ ...input, width: 124, fontWeight: 700, color: colors.navy }} />
              ) : null}
              <span style={{ fontSize: 12, fontWeight: 500, color: colors.textPlaceholder }}>Tap to switch seller / buyer</span>
            </div>
          </Section>

          {/* Consignor */}
          <Section label={role === 'buyer' ? 'Buyer' : 'Consignor'}>
            {party ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 50, background: '#EEF1F6', border: '1px solid #DEE3EC', borderRadius: 10, padding: '0 12px 0 14px' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: colors.navy }}>{party.name}</span>
                {party.customer_number ? <span style={{ fontSize: 11, fontWeight: 700, color: colors.navy, background: colors.gold, borderRadius: 999, padding: '2px 9px' }}>#{party.customer_number}</span> : null}
                <div style={{ flex: 1 }} />
                <button type="button" onClick={() => setPopupPartyId(party.id)} style={{ height: 32, padding: '0 12px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colors.navy, cursor: 'pointer' }}>Info</button>
                <button type="button" onClick={() => setParty(null)} style={{ height: 32, padding: '0 12px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colors.navy, cursor: 'pointer' }}>Change</button>
              </div>
            ) : (
              <>
                <input value={cQuery} onChange={(e) => setCQuery(e.target.value)} placeholder="Search name or customer #" style={{ ...input, fontWeight: 500 }} />
                {(matches.length > 0 || cQuery.trim()) ? (
                  <div style={{ marginTop: 7, border: '1px solid #E4E4DE', borderRadius: 10, overflow: 'hidden' }}>
                    {matches.map((m) => {
                      const place = [m.city, m.state].filter(Boolean).join(', ')
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 6px 12px', borderBottom: `1px solid ${colors.rowDivider}`, background: '#fff' }}>
                          <button type="button" onClick={() => { setParty({ id: m.id, name: m.name, customer_number: m.customer_number }); setMatches([]); setCQuery('') }}
                            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0', background: 'transparent', border: 'none', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                            {m.customer_number ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: colors.textMuted, background: '#F1F2F4', border: '1px solid #E4E4DE', borderRadius: 999, padding: '2px 8px' }}>#{m.customer_number}</span> : null}
                            <span style={{ flex: 1 }} />
                            <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: colors.textPlaceholder, whiteSpace: 'nowrap' }}>{place}</span>
                          </button>
                          <button type="button" onClick={() => setPopupPartyId(m.id)} aria-label="Customer info" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 7, border: `1px solid ${colors.border}`, background: '#fff', color: colors.navy, fontSize: 13, fontWeight: 800, fontStyle: 'italic', cursor: 'pointer' }}>i</button>
                        </div>
                      )
                    })}
                    <button type="button" onClick={onAddCustomer} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: '#fff', border: 'none', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: colors.teal }}>+</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: colors.teal }}>{cQuery.trim() ? `Add “${cQuery.trim()}” as new customer` : 'Add new customer'}</span>
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </Section>

          {/* Location */}
          {party ? (
            <Section label="Location" hint="Where the cattle are coming from. PO box allowed.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {locations.map((l) =>
                  editingLoc !== null && editingLoc !== 'new' && editingLoc.id === l.id ? (
                    <LocationEditor key={l.id} partyId={party.id} location={l} onSaved={onLocationSaved} onCancel={() => setEditingLoc(null)} />
                  ) : (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" onClick={() => setOriginLocationId(l.id)}
                        style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', background: originLocationId === l.id ? '#EEF1F6' : '#fff', border: originLocationId === l.id ? `1px solid ${colors.navy}` : `1px solid ${colors.border}`, borderRadius: 10, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, border: originLocationId === l.id ? `5px solid ${colors.navy}` : `1.5px solid #C2C2CA`, background: '#fff' }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{l.address || l.label || 'Location'}</span>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: l.is_po_box ? colors.bronze : colors.textMuted, marginTop: 1 }}>
                            {l.is_po_box ? `${locSub(l)} · not a physical origin for health papers` : locSub(l)}
                          </span>
                        </span>
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: l.is_po_box ? colors.bronze : colors.teal, background: l.is_po_box ? '#FDF1DC' : '#E1F5EE', border: `1px solid ${l.is_po_box ? '#F1D9A8' : '#9BD9CC'}`, borderRadius: 999, padding: '2px 9px' }}>{l.is_po_box ? 'PO box' : 'Physical'}</span>
                      </button>
                      <button type="button" onClick={() => setEditingLoc(l)} aria-label="Edit location" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, border: `1px solid ${colors.border}`, background: '#fff', color: colors.navy, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✎</button>
                    </div>
                  ),
                )}
                {editingLoc === 'new' ? (
                  <LocationEditor partyId={party.id} onSaved={onLocationSaved} onCancel={() => setEditingLoc(null)} />
                ) : null}
                {locations.length === 0 && editingLoc !== 'new' ? <span style={{ fontSize: 13, color: colors.textPlaceholder }}>No locations on file — add the real one.</span> : null}
                {editingLoc === null ? (
                  <button type="button" onClick={() => setEditingLoc('new')} style={{ height: 36, padding: '0 12px', borderRadius: 9, border: `1px dashed ${colors.border}`, background: '#FBFBFA', color: colors.teal, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>+ Add Location</button>
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* Work type + Animal type — stacks on a phone, side by side on a tablet */}
          <div className="wo-form-row">
            <div>
              <Dropdown label="Work Type" value={wt?.name ?? null} open={menu === 'work'} onToggle={() => setMenu(menu === 'work' ? null : 'work')}
                options={workTypes.map((w) => ({ id: w.id, label: w.name }))} onPick={(id) => { setWorkTypeId(id); setMenu(null) }} />
            </div>
            <div>
              <Dropdown label="Animal Type" value={animalTypes.find((a) => a.id === animalTypeId)?.name ?? null} open={menu === 'animal'} onToggle={() => setMenu(menu === 'animal' ? null : 'animal')}
                options={animalTypes.map((a) => ({ id: a.id, label: a.name }))} onPick={(id) => { setAnimalTypeId(id); setMenu(null) }} />
            </div>
          </div>

          {/* Expected head + Pen — stacks on a phone, side by side on a tablet */}
          <div className="wo-form-row">
            <div>
              <div style={fieldLabel as React.CSSProperties}>Expected Head</div>
              <input value={headExpected} onChange={(e) => setHeadExpected(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0" style={{ ...input, fontWeight: 700, color: colors.navy }} />
            </div>
            <div>
              <div style={fieldLabel as React.CSSProperties}>Pen</div>
              <input list="wo-pen-list" value={penText} onChange={(e) => setPenText(e.target.value)} placeholder="e.g. Pen 4" style={{ ...input, fontWeight: 700, color: colors.navy }} />
              <datalist id="wo-pen-list">{pens.map((p) => <option key={p.id} value={p.pen_number} />)}</datalist>
            </div>
          </div>

          {/* Notes */}
          <Section label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything the crew should know…"
              style={{ width: '100%', padding: '11px 12px', border: `1px solid ${colors.border}`, borderRadius: 9, background: '#fff', fontSize: 14, fontWeight: 500, color: colors.textPrimary, fontFamily: 'inherit', resize: 'none' }} />
          </Section>

          {/* Billing */}
          <Section label="Billing" hint="from work type · expected head" right={<span style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>{charges ? formatUsd(charges.lineCharge) : '—'}</span>}>
            <div style={{ border: '1px solid #E4E4DE', borderRadius: 10, overflow: 'hidden' }}>
              <BillRow label="Vet" value={charges ? formatUsd(charges.vetTotal) : '—'} />
              <BillRow label="Admin" value={charges ? formatUsd(charges.adminTotal) : '—'} />
              <BillRow label="SOL" value={charges ? formatUsd(charges.solTotal) : '—'} last />
            </div>
          </Section>

          {/* Special charges */}
          <Section label="Special Charges" hint="one-offs on this work order" right={<span style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>{formatUsd(specialsTotal)}</span>}>
            <div style={{ border: '1px solid #E4E4DE', borderRadius: 10, overflow: 'hidden' }}>
              {existingSpecials.map((sp) => (
                <div key={sp.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderBottom: `1px solid ${colors.rowDivider}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>{sp.description ?? 'Charge'}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: colors.textMuted }}>
                      {sp.head} head{sp.frozen_vet_charge != null ? ` · ${formatUsd(Number(sp.frozen_vet_charge))}/head vet` : ''}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginTop: 2 }}>
                      Vet {formatUsd(Number(sp.vet_total || 0))} · Admin {formatUsd(Number(sp.admin_total || 0))} · SOL {formatUsd(Number(sp.sol_total || 0))}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 700, color: colors.navy }}>{formatUsd(Number(sp.customer_charge || 0))}</span>
                </div>
              ))}
              {staged.map((s) => {
                const f = specialFields(s)
                return (
                  <div key={s.key} style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.rowDivider}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={s.description} onChange={(e) => patchSpecial(s.key, { description: e.target.value })} placeholder="Description (optional, e.g. Retag)" style={{ ...input, height: 38, fontWeight: 600, fontSize: 14 }} />
                      <button type="button" onClick={() => removeSpecial(s.key)} aria-label="Remove charge" style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 8, border: `1px solid ${colors.border}`, background: '#fff', color: colors.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>head</span>
                      <input value={s.head ? String(s.head) : ''} onChange={(e) => patchSpecial(s.key, { head: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })} inputMode="numeric" placeholder="0" style={{ ...input, width: 64, height: 38, textAlign: 'right' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>vet $/head</span>
                      <input value={s.perHead ? String(s.perHead) : ''} onChange={(e) => patchSpecial(s.key, { perHead: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })} inputMode="decimal" placeholder="0.00" style={{ ...input, width: 88, height: 38, textAlign: 'right' }} />
                    </div>
                    {/* Live breakdown — from the same helper the save uses, so this equals what gets saved + frozen. */}
                    <div style={{ border: '1px solid #E4E4DE', borderRadius: 8, overflow: 'hidden' }}>
                      <BillRow label={`Vet (${formatUsd(s.perHead || 0)} × ${s.head || 0} + ${pct(barn.sales_tax_rate)} tax)`} value={formatUsd(f.vet_total)} />
                      <BillRow label={`Admin fee (${pct(barn.admin_fee_rate)})`} value={formatUsd(f.admin_total)} />
                      <BillRow label={`SOL (${formatUsd(barn.special_sol_charge ?? 0)} × ${s.head || 0})`} value={formatUsd(f.sol_total)} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#FAFBFC' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>Customer charge</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: colors.navy }}>{formatUsd(f.customer_charge)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <button type="button" onClick={addSpecial} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: '#fff', border: 'none', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: colors.teal }}>+</span><span style={{ fontSize: 13, fontWeight: 700, color: colors.teal }}>Add charge</span>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, fontWeight: 700, color: colors.textMuted }}>
              <span>Estimate (work + specials)</span>
              <span style={{ color: colors.navy, fontWeight: 800 }}>{formatUsd(estimate)}</span>
            </div>
          </Section>
        </div>

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderTop: `1px solid ${colors.rowDivider}` }}>
          <button type="button" onClick={onClose} style={{ height: 44, padding: '0 18px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.navy, cursor: 'pointer' }}>Cancel</button>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onSave} disabled={saving} style={{ height: 44, padding: '0 22px', background: colors.gold, border: 'none', borderRadius: 9, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.navy, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Work Order'}
          </button>
        </div>
      </div>

      {popupPartyId ? (
        <CustomerPopup partyId={popupPartyId} onClose={() => setPopupPartyId(null)} onChanged={onCustomerChanged} />
      ) : null}

      {showAnimals && editing ? (
        <AnimalListModal
          penWorkId={editing.id}
          title={`${editing.pen?.pen_number ? `Pen ${editing.pen.pen_number}` : 'No pen'} · ${(editing.buyer_party_id ? editing.buyer : editing.seller)?.name ?? '—'}`}
          onClose={() => setShowAnimals(false)}
        />
      ) : null}
    </>
  )
}

function BillRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: last ? 'none' : `1px solid ${colors.rowDivider}` }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{value}</span>
    </div>
  )
}

function Dropdown({ label, value, open, onToggle, options, onPick }: {
  label: string; value: string | null; open: boolean; onToggle: () => void
  options: { id: string; label: string }[]; onPick: (id: string) => void
}) {
  return (
    <div>
      <div style={fieldLabel as React.CSSProperties}>{label}</div>
      <button type="button" onClick={onToggle} style={{ position: 'relative', width: '100%', height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, fontFamily: 'inherit', cursor: 'pointer' }}>
        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 600, color: value ? colors.textPrimary : colors.textPlaceholder }}>{value ?? 'Choose…'}</span>
        <span style={{ color: colors.textPlaceholder }}>▾</span>
      </button>
      {open ? (
        <div style={{ marginTop: 6, border: '1px solid #E4E4DE', borderRadius: 9, overflow: 'hidden' }}>
          {options.map((o) => (
            <button key={o.id} type="button" onClick={() => onPick(o.id)} style={{ width: '100%', padding: '9px 12px', background: '#fff', border: 'none', borderBottom: `1px solid ${colors.rowDivider}`, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: colors.textPrimary, cursor: 'pointer', textAlign: 'left' }}>{o.label}</button>
          ))}
          {options.length === 0 ? <div style={{ padding: '9px 12px', fontSize: 13, color: colors.textPlaceholder }}>None set up.</div> : null}
        </div>
      ) : null}
    </div>
  )
}
