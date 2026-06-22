'use client'

// The standard flag visual (from the "2b — Capture (flag active)" mockup):
// a red banner across the top, and a red glow + inline label on the offending
// field. Used for flags generally — hard (duplicate tag) and soft (a required
// field left empty).

import { FlagIcon } from './icons'

export const FLAG_RED = '#E24B4A'
export const FLAG_RED_BG = '#FCEBEB'
export const FLAG_RED_TEXT = '#E24B4A'

/**
 * The big red banner. `detail` is the one-liner, e.g.
 * "0142 already worked · 10:42a · Open". Rendered as a rounded card so it sits
 * consistently with the other rounded sections on the screen.
 */
export function FlagBanner({ title, detail }: { title: string; detail?: string }) {
  return (
    <div
      style={{
        background: FLAG_RED,
        padding: '13px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderRadius: 14,
        flexShrink: 0,
      }}
    >
      <FlagIcon size={28} color="#FCEBEB" sw={2.5} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.05, letterSpacing: '0.01em' }}>
          {title}
        </div>
        {detail ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: '#FCEBEB', marginTop: 1 }}>{detail}</div>
        ) : null}
      </div>
    </div>
  )
}

/** Small inline label shown inside a flagged field, e.g. "DUPLICATE" or "REQUIRED". */
export function FieldFlagLabel({ text }: { text: string }) {
  return (
    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: FLAG_RED_TEXT }}>
      {text}
    </span>
  )
}
