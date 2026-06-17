import type { ReactNode } from 'react'

/**
 * White form-section card: header row (#EEF1F6 fill, navy title, gold accent bar)
 * over a white body. See style-guide.md §4 "Section card". Reused by later screens.
 */
export function SectionCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="sbv-section-card">
      <div className="sbv-section-head">
        <span className="sbv-section-title">{title}</span>
        <span className="sbv-section-accent" />
      </div>
      <div className="sbv-section-body">{children}</div>
    </section>
  )
}
