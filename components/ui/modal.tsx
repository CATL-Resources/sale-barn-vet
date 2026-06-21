'use client'

import type { CSSProperties, ReactNode } from 'react'

/**
 * The one modal: a dim overlay with a centered panel. Three widths:
 *  - sm = 460  (short forms / confirmations)
 *  - md = 480  (a single record's detail)
 *  - lg = 760  (a wide table, e.g. the animal list)
 *
 * Tapping the dim background closes it. Pass `align="top"` for a sheet that
 * hugs the top of the screen, and `overlayStyle` / `panelStyle` to fine-tune
 * the background dim or the panel (e.g. a different fill or no rounded corners).
 */
const WIDTHS = { sm: 460, md: 480, lg: 760 } as const

export function Modal({
  size = 'md',
  align = 'center',
  zIndex = 50,
  onClose,
  overlayStyle,
  panelStyle,
  children,
}: {
  size?: keyof typeof WIDTHS
  align?: 'center' | 'top'
  zIndex?: number
  onClose: () => void
  overlayStyle?: CSSProperties
  panelStyle?: CSSProperties
  children: ReactNode
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        background: 'rgba(14,38,70,0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: align === 'top' ? 'flex-start' : 'center',
        overflowY: 'auto',
        padding: 16,
        ...overlayStyle,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: WIDTHS[size],
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(8,20,42,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...panelStyle,
        }}
      >
        {children}
      </div>
    </div>
  )
}
