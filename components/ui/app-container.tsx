import type { CSSProperties, ReactNode } from 'react'

/**
 * The one content container for every screen. Full width on phone and tablet,
 * capped at --content-max (1200) on desktop, centered, with comfortable
 * horizontal padding that respects the notch safe area. Vertical spacing stays
 * with each screen — pass it through `style` (e.g. paddingTop/Bottom, gap).
 */
export function AppContainer({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="sbv-container" style={style}>
      {children}
    </div>
  )
}
