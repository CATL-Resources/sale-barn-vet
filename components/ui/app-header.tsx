'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MenuIcon, ArrowLeftIcon } from './icons'
import { Drawer } from './drawer'

/**
 * The one header every screen renders. Left: a hamburger that opens the menu
 * drawer, plus a back chevron on every screen except the Hub. Center: the
 * "Sale Barn Vet" wordmark, which taps Home (the Hub). Navy bar, sticky to the
 * top, padded for the phone notch when installed full-screen.
 */
export function AppHeader({ barnName }: { barnName: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isHome = pathname === '/'

  return (
    <>
      <header className="sbv-appheader">
        <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
          <button aria-label="Menu" className="sbv-iconbtn" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
            <MenuIcon size={22} style={{ color: '#FFFFFF' }} />
          </button>
          {!isHome ? (
            <button aria-label="Back" className="sbv-iconbtn" onClick={() => router.back()} style={{ flexShrink: 0 }}>
              <ArrowLeftIcon size={22} style={{ color: '#FFFFFF' }} />
            </button>
          ) : null}
        </div>
        <Link href="/" aria-label="Home" className="sbv-appheader-brand">
          <span style={{ color: '#FFFFFF' }}>Sale Barn </span>
          <span style={{ color: '#F3D12A' }}>Vet</span>
        </Link>
        <div style={{ flex: '1 1 0%', minWidth: 0 }} aria-hidden />
      </header>
      <Drawer open={open} onClose={() => setOpen(false)} userLine={barnName} fixed />
    </>
  )
}
