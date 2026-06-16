'use client'

import { useState, type ReactNode } from 'react'
import { ChevronRightIcon } from './icons'

/** Collapsible list section with a rotating chevron (Sellers / Buyers on the home screen). */
export function CollapsibleSection({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string
  summary: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        className="sbv-collapse-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="sbv-chevron" data-open={open}>
          <ChevronRightIcon size={16} />
        </span>
        <span style={{ flex: '1 1 0%', textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
          {title}
        </span>
        <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: '#717182' }}>
          {summary}
        </span>
      </button>
      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>{children}</div>
      ) : null}
    </div>
  )
}
