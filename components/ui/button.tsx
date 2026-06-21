import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

/**
 * The one button. Three looks:
 *  - primary  → gold fill, navy text (the main call-to-action)
 *  - secondary→ navy fill, white text
 *  - outline  → white fill, navy text, thin border
 *
 * The look (colour + press feedback) comes from the shared `.sbv-btn` classes;
 * pass `style` for the size that fits the spot (height, padding, radius, font).
 * Use `fullWidth` to stretch edge to edge.
 *
 * Note: this renders a real <button>. Where a button has to sit INSIDE another
 * button (so a real <button> would be invalid), put the same classes on a span
 * instead: className="sbv-btn sbv-btn--primary".
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline'

export function buttonClass(variant: ButtonVariant, fullWidth?: boolean, extra?: string) {
  return ['sbv-btn', `sbv-btn--${variant}`, fullWidth ? 'sbv-btn--full' : '', extra ?? '']
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant = 'primary',
  fullWidth,
  className,
  style,
  children,
  ...rest
}: {
  variant?: ButtonVariant
  fullWidth?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass(variant, fullWidth, className)} style={style} {...rest}>
      {children}
    </button>
  )
}
