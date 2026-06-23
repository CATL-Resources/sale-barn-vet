'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MenuIcon } from './icons'
import { Drawer } from './drawer'

/**
 * The one slim header every screen renders. Left: a hamburger that opens the
 * menu drawer. Middle: the barn name with a short status subtitle. Right: the
 * "Sale Barn Vet" wordmark, which taps Home. One compact row — the per-screen
 * title and its single back chevron live in the screen's own sub-header.
 */
export function AppHeader({ barnName, subtitle }: { barnName: string; subtitle?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="sbv-appheader">
        <button aria-label="Menu" className="sbv-iconbtn" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
          <MenuIcon size={22} style={{ color: '#FFFFFF' }} />
        </button>
        <div className="sbv-appheader-info">
          <span className="sbv-appheader-name">{barnName}</span>
          {subtitle ? <span className="sbv-appheader-sub">{subtitle}</span> : null}
        </div>
        <Link href="/" aria-label="Home" className="sbv-appheader-brand">
          <span style={{ color: '#FFFFFF' }}>Sale Barn </span>
          <span style={{ color: '#F3D12A' }}>Vet</span>
        </Link>
      </header>
      <Drawer open={open} onClose={() => setOpen(false)} userLine={barnName} fixed />
    </>
  )
}
