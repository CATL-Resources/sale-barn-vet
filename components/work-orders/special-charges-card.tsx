'use client'

import { useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { PlusIcon, TrashIcon } from '@/components/ui/icons'
import { formatUsd } from '@/lib/work-orders/pricing'
import type { Role, SpecialChargeFull } from '@/lib/work-orders/types'
import type { NewSpecialChargeInput } from '@/lib/work-orders/use-pen-works'

type PartyOption = { id: string; name: string }

const fieldStyle: React.CSSProperties = {
  height: 36,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: '0 9px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: colors.textPrimary,
  background: colors.white,
}

function SpecialRow({
  sc,
  onDelete,
}: {
  sc: SpecialChargeFull
  onDelete: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderTop: `1px solid ${colors.rowDivider}`,
        background: hover ? colors.hoverBg : 'transparent',
      }}
    >
      <span style={{ flex: 2, minWidth: 0, fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
        {sc.description || '—'}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: colors.textMuted }}>
        {sc.party?.name ?? '—'}
        {sc.role ? ` · ${sc.role}` : ''}
      </span>
      <span className="tnum" style={{ width: 110, textAlign: 'right', fontSize: 14, fontWeight: 700, color: colors.navy }}>
        {formatUsd(sc.customer_charge ?? 0)}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remove charge"
        style={{
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          opacity: hover ? 1 : 0,
          transition: 'opacity 120ms',
        }}
      >
        <TrashIcon size={14} style={{ color: colors.danger }} />
      </button>
    </div>
  )
}

export function SpecialChargesCard({
  specialCharges,
  partyOptions,
  onAdd,
  onDelete,
}: {
  specialCharges: SpecialChargeFull[]
  partyOptions: PartyOption[]
  onAdd: (input: NewSpecialChargeInput) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [description, setDescription] = useState('')
  const [partyId, setPartyId] = useState('')
  const [role, setRole] = useState<Role>('seller')
  const [amount, setAmount] = useState('')

  function reset() {
    setDescription('')
    setPartyId('')
    setRole('seller')
    setAmount('')
    setAdding(false)
  }

  async function save() {
    const value = parseFloat(amount)
    await onAdd({
      description,
      partyId: partyId || null,
      role,
      amount: Number.isFinite(value) ? value : 0,
    })
    reset()
  }

  return (
    <section style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: colors.cardHeader,
          padding: '9px 14px 10px',
          borderBottom: `1px solid ${colors.cardHeaderBorder}`,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>Special charges</div>
          <div style={{ width: 26, height: 3, borderRadius: 2, background: colors.gold, marginTop: 5 }} />
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              height: 30,
              padding: '0 12px',
              borderRadius: 999,
              background: colors.white,
              border: `1px solid ${colors.border}`,
              color: colors.navy,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <PlusIcon size={13} style={{ color: colors.navy }} /> Add charge
          </button>
        )}
      </div>

      {adding && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '12px 14px',
            borderBottom: `1px solid ${colors.rowDivider}`,
            background: colors.hoverBg,
          }}
        >
          <input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            style={{ ...fieldStyle, flex: '2 1 200px' }}
          />
          <select value={partyId} onChange={(e) => setPartyId(e.target.value)} style={{ ...fieldStyle, flex: '1 1 160px' }}>
            <option value="">(no party)</option>
            {partyOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {(['seller', 'buyer'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  height: 36,
                  padding: '0 12px',
                  border: 'none',
                  background: role === r ? colors.navy : colors.white,
                  color: role === r ? '#FFFFFF' : colors.textMuted,
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="tnum"
            style={{ ...fieldStyle, width: 110, textAlign: 'right' }}
          />
          <button
            type="button"
            onClick={save}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 8,
              background: colors.gold,
              border: 'none',
              color: colors.navy,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {specialCharges.length === 0 && !adding ? (
        <div style={{ padding: '14px', fontSize: 13, color: colors.textMuted }}>No special charges.</div>
      ) : (
        specialCharges.map((sc) => <SpecialRow key={sc.id} sc={sc} onDelete={() => onDelete(sc.id)} />)
      )}
    </section>
  )
}
