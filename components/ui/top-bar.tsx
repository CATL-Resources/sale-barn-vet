'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { MenuIcon } from './icons'

// The wordmark doubles as a Home button — clickable, with a gold halo on hover/focus.
function Wordmark() {
  return (
    <Link
      href="/"
      aria-label="Home"
      className="sbv-brandhome"
      style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block' }}
    >
      <span style={{ color: '#FFFFFF' }}>Sale Barn </span>
      <span style={{ color: '#F3D12A' }}>Vet</span>
    </Link>
  )
}

export function TopBar({
  title,
  status,
  onMenu,
  right,
}: {
  title: string
  status: string
  onMenu: () => void
  right?: ReactNode
}) {
  return (
    <div className="sbv-topbar">
      <button aria-label="Menu" className="sbv-iconbtn" onClick={onMenu}>
        <MenuIcon size={22} style={{ color: '#FFFFFF' }} />
      </button>
      <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#FFFFFF',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="sbv-status-dot" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#55BAAA', whiteSpace: 'nowrap' }}>
            {status}
          </span>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{right ?? <Wordmark />}</div>
    </div>
  )
}
