'use client'

// Reusable trigger: opens the true-size pen-card print view for a work order in
// a small window, which renders the label and opens the print dialog. Drop it on
// a work-order row, a detail, or anywhere a work order's id is in hand.
export function PrintPenCardButton({
  penWorkId,
  label = 'Print pen card',
  style,
}: {
  penWorkId: string
  label?: string
  style?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => window.open(`/print/pen-card/${penWorkId}`, '_blank', 'noopener,noreferrer,width=720,height=520')}
      style={{
        height: 36,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '0 12px',
        background: '#fff',
        border: '1px solid #D4D4D0',
        borderRadius: 8,
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 700,
        color: '#0E2646',
        cursor: 'pointer',
        ...style,
      }}
    >
      <span aria-hidden>🖨</span>
      {label}
    </button>
  )
}
