'use client'

import { useState } from 'react'
import { MenuIcon } from './icons'
import { Drawer } from './drawer'

/**
 * Hamburger button + the slide-out nav drawer, with its own open/close state.
 * Drop it into any screen's top bar so the menu (Home, Capture, Sellers,
 * Buyers, Barn Settings, Sign out) is always one tap away — including the wide
 * office screens, where the drawer overlays the whole viewport.
 */
export function NavMenu({
  userLine = '',
  iconColor = '#FFFFFF',
}: {
  userLine?: string
  iconColor?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button aria-label="Menu" className="sbv-iconbtn" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
        <MenuIcon size={22} style={{ color: iconColor }} />
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} userLine={userLine} fixed />
    </>
  )
}
