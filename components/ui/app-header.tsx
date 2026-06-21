'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MenuIcon } from './icons'
import { Drawer } from './drawer'

/**
 * The one header every screen renders. Left: a hamburger that opens the menu
 * drawer. Center: the current barn name. Right: the haloed "Sale Barn Vet"
 * wordmark, which taps Home (the Sale Days screen). Navy bar, sticky to the
 * top, padded for the phone notch when installed full-screen.
 */
export function AppHeader({ barnName }: { barnName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="sbv-appheader">
        <button aria-label="Menu" className="sbv-iconbtn" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
          <MenuIcon size={22} style={{ color: '#FFFFFF' }} />
        </button>
        <div className="sbv-appheader-barn">{barnName}</div>
        <Link href="/" aria-label="Home" className="sbv-appheader-brand">
          <span style={{ color: '#FFFFFF' }}>Sale Barn </span>
          <span style={{ color: '#F3D12A' }}>Vet</span>
        </Link>
      </header>
      <Drawer open={open} onClose={() => setOpen(false)} userLine={barnName} fixed />
    </>
  )
}
