'use client'

import { useState, useTransition } from 'react'
import { setFieldDisplayed } from './actions'

/**
 * One row of the capture-field roster: the field label + an on/off switch.
 * Flipping the switch saves immediately (optimistic; rolls back on error).
 */
export function CaptureFieldRow({
  id,
  label,
  order,
  displayed,
}: {
  id: string
  label: string
  order: number
  displayed: boolean
}) {
  const [on, setOn] = useState(displayed)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !on
    setOn(next)
    startTransition(async () => {
      try {
        await setFieldDisplayed(id, next)
      } catch {
        setOn(!next) // roll back if the save failed
      }
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 0',
        borderTop: order === 1 ? 'none' : '1px solid #ECECE8',
      }}
    >
      <span
        className="tnum"
        style={{ width: 18, fontSize: 12, fontWeight: 600, color: '#9A9AA6', flexShrink: 0 }}
      >
        {order}
      </span>
      <span style={{ flex: '1 1 0%', fontSize: 14, fontWeight: 600, color: on ? '#1A1A1A' : '#9A9AA6' }}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label} ${on ? 'on' : 'off'}`}
        onClick={toggle}
        disabled={pending}
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          border: 'none',
          padding: 3,
          cursor: 'pointer',
          background: on ? '#0E2646' : '#D4D4D0',
          transition: 'background 150ms',
          display: 'flex',
          justifyContent: on ? 'flex-end' : 'flex-start',
          alignItems: 'center',
          opacity: pending ? 0.6 : 1,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: '#FFFFFF',
            boxShadow: '0 1px 2px rgba(8,18,40,0.25)',
          }}
        />
      </button>
    </div>
  )
}
