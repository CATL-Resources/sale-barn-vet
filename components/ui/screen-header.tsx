import type { ReactNode } from 'react'

/**
 * The one screen sub-header. A full-width navy bar with SQUARE corners that sits
 * flush under the shared AppHeader, so the two read as one navy zone. Inner
 * content aligns to the shared container width + padding. Title in white/bold,
 * subtitle in the brand teal.
 */
export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="sbv-screenheader">
      <div className="sbv-container sbv-screenheader-inner">
        {back ? <div style={{ flexShrink: 0, display: 'flex' }}>{back}</div> : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sbv-screenheader-title">{title}</div>
          {subtitle ? <div className="sbv-screenheader-sub">{subtitle}</div> : null}
        </div>
        {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
      </div>
    </div>
  )
}
