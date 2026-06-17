'use client'

import { useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { GoldButton } from '@/components/ui/gold-button'
import type { NewBuyerInput } from '@/lib/work-orders/use-pen-works'
import type { Role } from '@/lib/work-orders/types'

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: 5,
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: '0 11px',
  fontSize: 15,
  fontFamily: 'inherit',
  color: colors.textPrimary,
  background: colors.white,
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

/**
 * Create a consignor (name) or a buyer (name + buyer # + city + state).
 * Future: search existing parties before creating new ones; a buyer import
 * from an existing file is queued as a future task.
 */
export function AddPartyModal({
  role,
  onClose,
  onConsignor,
  onBuyer,
}: {
  role: Role
  onClose: () => void
  onConsignor: (name: string) => Promise<void>
  onBuyer: (input: NewBuyerInput) => Promise<void>
}) {
  const isBuyer = role === 'buyer'
  const [name, setName] = useState('')
  const [buyerNumber, setBuyerNumber] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = isBuyer ? name.trim() !== '' && buyerNumber.trim() !== '' : name.trim() !== ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    try {
      if (isBuyer) await onBuyer({ name, buyerNumber, city, state })
      else await onConsignor(name)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(14,38,70,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 400,
          background: colors.white,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 18px 48px rgba(14,38,70,0.28)',
        }}
      >
        <div style={{ background: colors.navy, padding: '14px 18px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
            {isBuyer ? 'Add buyer' : 'Add consignor'}
          </div>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <Field label="Name">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
          </Field>

          {isBuyer && (
            <>
              <Field label="Buyer #">
                <input value={buyerNumber} onChange={(e) => setBuyerNumber(e.target.value)} style={fieldStyle} />
              </Field>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <Field label="City">
                    <input value={city} onChange={(e) => setCity(e.target.value)} style={fieldStyle} />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="State">
                    <input
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                      maxLength={2}
                      style={fieldStyle}
                    />
                  </Field>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 48,
                padding: '0 18px',
                borderRadius: 999,
                background: colors.white,
                border: `1px solid ${colors.border}`,
                color: colors.textMuted,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <GoldButton
              type="submit"
              disabled={!canSubmit || busy}
              style={{ flex: 1, height: 48, opacity: !canSubmit || busy ? 0.55 : 1 }}
            >
              {isBuyer ? 'Add Buyer' : 'Add Consignor'}
            </GoldButton>
          </div>
        </div>
      </form>
    </div>
  )
}
