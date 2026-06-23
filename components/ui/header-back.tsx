import Link from 'next/link'
import { ArrowLeftIcon } from './icons'

/**
 * The single back chevron for a screen sub-header. Lives in the ScreenHeader's
 * `back` slot — the app header no longer carries its own, so there's only one
 * back chevron on any screen. 44px touch target, white on navy.
 */
export function HeaderBack({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}
    >
      <ArrowLeftIcon size={22} />
    </Link>
  )
}
