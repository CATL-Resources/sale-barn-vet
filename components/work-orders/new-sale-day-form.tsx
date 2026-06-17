'use client'

import { useState } from 'react'
import { createSaleDay } from '@/app/(app)/actions'
import { GoldButton } from '@/components/ui/gold-button'
import { colors } from '@/components/ui/tokens'

const today = () => new Date().toISOString().slice(0, 10)

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: colors.textMuted,
  marginBottom: 5,
}

/** Inline "new sale day" toggle + form, posting to the createSaleDay action. */
export function NewSaleDayForm() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 40,
          padding: '0 16px',
          borderRadius: 999,
          background: colors.gold,
          border: 'none',
          color: colors.navy,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        + New sale day
      </button>
    )
  }

  return (
    <form
      action={createSaleDay}
      style={{
        background: colors.white,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <label style={labelStyle} htmlFor="sale_date">
          Sale date
        </label>
        <input id="sale_date" type="date" name="sale_date" defaultValue={today()} required style={fieldStyle} />
      </div>
      <div>
        <label style={labelStyle} htmlFor="notes">
          Notes (optional)
        </label>
        <input id="notes" type="text" name="notes" placeholder="e.g. special sale" style={fieldStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            height: 44,
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
        <GoldButton type="submit" style={{ flex: 1, height: 44 }}>
          Start sale
        </GoldButton>
      </div>
    </form>
  )
}
