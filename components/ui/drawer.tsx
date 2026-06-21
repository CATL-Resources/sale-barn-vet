'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'

// Kept deliberately short — Home and Barn Settings. Room to add more later.
// (No Chute/Office switch here; that placement is a separate decision.)
const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Barn Settings', href: '/settings' },
]

export function Drawer({
  open,
  onClose,
  userLine,
  fixed = false,
}: {
  open: boolean
  onClose: () => void
  userLine: string
  // When the drawer is mounted outside the 390px phone frame (e.g. the wide
  // office screens), overlay the whole viewport instead of the frame.
  fixed?: boolean
}) {
  const pathname = usePathname()

  return (
    <>
      <div className="sbv-scrim" data-open={open} data-fixed={fixed} onClick={onClose} aria-hidden={!open} />
      <aside className="sbv-drawer" data-open={open} data-fixed={fixed} aria-hidden={!open}>
        <div className="sbv-drawer-head">
          {/* The wordmark goes Home — clickable, with a gold halo on hover/focus. */}
          <Link href="/" onClick={onClose} className="sbv-brandhome" style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', textDecoration: 'none', display: 'inline-block' }}>
            <span style={{ color: '#FFFFFF' }}>Sale Barn </span>
            <span style={{ color: '#F3D12A' }}>Vet</span>
          </Link>
          <div
            style={{
              color: '#55BAAA',
              fontSize: 12,
              fontWeight: 600,
              marginTop: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userLine}
          </div>
        </div>

        <nav style={{ flex: '1 1 0%', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const selected = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="sbv-navrow"
                data-selected={selected}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '14px 16px 16px', borderTop: '1px solid #ECECE8', flexShrink: 0 }}>
          <form action={signOut}>
            <button type="submit" className="sbv-signout">
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
