import Link from 'next/link'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

/** Primary gold CTA. Renders a link when `href` is set, otherwise a button. */
export function GoldButton({
  href,
  children,
  style,
  ...rest
}: {
  href?: string
  children: ReactNode
  style?: CSSProperties
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  if (href) {
    return (
      <Link href={href} className="sbv-gold-btn" style={style}>
        {children}
      </Link>
    )
  }
  return (
    <button className="sbv-gold-btn" style={style} {...rest}>
      {children}
    </button>
  )
}
