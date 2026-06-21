'use client'

import { colors } from '@/components/ui/tokens'
import { useEffect, useState, type ReactNode } from 'react'
import {
  getPartyDetail,
  updateParty,
  upsertLocation,
  type PartyDetail,
  type PartyLocation,
} from '@/app/(office)/work-orders/actions'

const inp: React.CSSProperties = {
  width: '100%', height: 38, padding: '0 10px', border: `1px solid ${colors.border}`, borderRadius: 8,
  background: '#fff', fontSize: 14, fontWeight: 600, color: colors.textPrimary, fontFamily: 'inherit', outline: 'none',
}

function Toggle({ on, onToggle, children }: { on: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onToggle}
      style={{ height: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${on ? colors.navy : colors.border}`, background: on ? colors.navy : '#fff', color: on ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
      {children}
    </button>
  )
}

// ---- Location add / edit (reusable) ----
export function LocationEditor({ partyId, location, onSaved, onCancel }: {
  partyId: string
  location?: PartyLocation
  onSaved: (loc: PartyLocation) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(location?.label ?? '')
  const [address, setAddress] = useState(location?.address ?? '')
  const [city, setCity] = useState(location?.city ?? '')
  const [stateV, setStateV] = useState(location?.state ?? '')
  const [zip, setZip] = useState(location?.zip ?? '')
  const [premiseId, setPremiseId] = useState(location?.premise_id ?? '')
  const [isPoBox, setIsPoBox] = useState(location?.is_po_box ?? false)
  const [isDefault, setIsDefault] = useState(location?.is_default ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true); setError(null)
    const res = await upsertLocation({
      id: location?.id ?? null, partyId,
      label: label || null, address: address || null, city: city || null, state: stateV || null,
      zip: zip || null, premiseId: premiseId || null, isPoBox, isDefault,
    })
    setSaving(false)
    if (res.ok) onSaved(res.location)
    else setError(res.error)
  }

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12, background: '#FBFBFA', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error ? <div style={{ fontSize: 12, fontWeight: 600, color: '#B42318' }}>{error}</div> : null}
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (or PO box)" style={inp} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" style={inp} />
        <input value={stateV} onChange={(e) => setStateV(e.target.value)} placeholder="State" style={{ ...inp, width: 76, flexShrink: 0 }} />
        <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" style={{ ...inp, width: 92, flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" style={inp} />
        <input value={premiseId} onChange={(e) => setPremiseId(e.target.value)} placeholder="Premise ID (optional)" style={inp} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Toggle on={isPoBox} onToggle={() => setIsPoBox((v) => !v)}>PO box</Toggle>
        <Toggle on={isDefault} onToggle={() => setIsDefault((v) => !v)}>Default</Toggle>
        {isPoBox ? <span style={{ fontSize: 11, fontWeight: 600, color: colors.bronze }}>Not a physical origin</span> : null}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onCancel} style={{ height: 34, padding: '0 12px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colors.textMuted, cursor: 'pointer' }}>Cancel</button>
        <button type="button" onClick={save} disabled={saving} style={{ height: 34, padding: '0 14px', background: colors.gold, border: 'none', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colors.navy, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save location'}</button>
      </div>
    </div>
  )
}

function LocRow({ loc, onEdit }: { loc: PartyLocation; onEdit: () => void }) {
  const sub = [loc.city, loc.state].filter(Boolean).join(', ') + (loc.zip ? ` ${loc.zip}` : '')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${colors.border}`, borderRadius: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>{loc.address || loc.label || 'Location'}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: loc.is_po_box ? colors.bronze : colors.textMuted }}>{loc.is_po_box ? `${sub} · PO box` : sub}{loc.is_default ? ' · default' : ''}</div>
      </div>
      <button type="button" onClick={onEdit} style={{ height: 30, padding: '0 12px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: colors.navy, cursor: 'pointer' }}>Edit</button>
    </div>
  )
}

function Field({ label, children, grow }: { label: string; children: ReactNode; grow?: boolean }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: grow ? 1 : undefined, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: colors.navy }}>{label}</span>
      {children}
    </label>
  )
}

// ---- Customer view / edit popup ----
export function CustomerPopup({ partyId, onClose, onChanged }: {
  partyId: string
  onClose: () => void
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<PartyDetail | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [editingLoc, setEditingLoc] = useState<PartyLocation | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getPartyDetail(partyId).then((d) => {
      if (!alive || !d) return
      setDetail(d); setName(d.name); setPhone(d.phone ?? ''); setEmail(d.email ?? '')
    })
    return () => { alive = false }
  }, [partyId])

  async function reload() {
    const d = await getPartyDetail(partyId)
    if (d) setDetail(d)
    onChanged()
  }

  async function save() {
    setSaving(true); setError(null)
    const res = await updateParty({ id: partyId, name, phone: phone || null, email: email || null })
    setSaving(false)
    if (res.ok) { onChanged(); onClose() }
    else setError(res.error)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,38,70,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 14, boxShadow: '0 24px 60px rgba(8,20,42,0.4)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: `1px solid ${colors.rowDivider}`, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: colors.navy }}>Customer</span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, border: 'none', background: 'transparent', cursor: 'pointer', color: colors.textMuted, fontSize: 18 }}>✕</button>
        </div>

        {!detail ? (
          <div style={{ padding: 24, fontSize: 13, color: colors.textMuted }}>Loading…</div>
        ) : (
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            {error ? <div style={{ fontSize: 13, fontWeight: 600, color: '#B42318' }}>{error}</div> : null}
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} style={inp} /></Field>
            <Field label="Customer number">
              <div style={{ ...inp, display: 'flex', alignItems: 'center', color: colors.textMuted, background: '#F4F4F2' }}>{detail.customer_number ?? '— none —'}</div>
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <Field label="Phone" grow><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" style={inp} /></Field>
              <Field label="Email" grow><input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" style={inp} /></Field>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.navy, marginBottom: 7 }}>Locations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.locations.map((l) =>
                  editingLoc !== null && editingLoc !== 'new' && editingLoc.id === l.id ? (
                    <LocationEditor key={l.id} partyId={partyId} location={l} onSaved={() => { setEditingLoc(null); void reload() }} onCancel={() => setEditingLoc(null)} />
                  ) : (
                    <LocRow key={l.id} loc={l} onEdit={() => setEditingLoc(l)} />
                  ),
                )}
                {editingLoc === 'new' ? (
                  <LocationEditor partyId={partyId} onSaved={() => { setEditingLoc(null); void reload() }} onCancel={() => setEditingLoc(null)} />
                ) : null}
                {detail.locations.length === 0 && editingLoc !== 'new' ? <span style={{ fontSize: 13, color: colors.textPlaceholder }}>No locations on file.</span> : null}
                {editingLoc === null ? (
                  <button type="button" onClick={() => setEditingLoc('new')} style={{ height: 36, padding: '0 12px', borderRadius: 9, border: `1px dashed ${colors.border}`, background: '#FBFBFA', color: colors.teal, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>+ Add location</button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, padding: '12px 18px', borderTop: `1px solid ${colors.rowDivider}`, flexShrink: 0 }}>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={{ height: 40, padding: '0 16px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.textMuted, cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={save} disabled={saving || !detail} style={{ height: 40, padding: '0 20px', background: colors.gold, border: 'none', borderRadius: 9, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.navy, cursor: saving ? 'default' : 'pointer', opacity: saving || !detail ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
