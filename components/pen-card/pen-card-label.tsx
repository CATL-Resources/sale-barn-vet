// The printable pen card, sized as a Dymo 30323 shipping label (landscape: 4in
// wide, 2.125in tall). Rendered at TRUE physical size; the @page size in the
// print route MUST match this, or the print comes out scaled wrong. Reusable:
// hand it the fields and it picks the seller or buyer layout automatically.
//
// No border box. The card uses border-box sizing and an inner margin that's a
// little wider on the left and top, so content sits in from those edges and the
// printer's unprintable margin doesn't clip it. The consignor name and the notes
// WRAP to as many lines as needed and are never truncated — they are required
// content. Black fills (work-type pill, buyer-number pill, divider) carry
// print-color-adjust: exact so the printer prints them solid.

export type PenCardData = {
  pen: string
  head: number
  workType: string
  isBuyer: boolean
  partyName: string
  buyerNumber: string | null
  notes: string | null
}

const BLACK = '#000'

// Big PEN value: shrink as the pen label gets longer so it never clips the fixed
// PEN column on the narrow (2.125in tall) landscape label. Short, common pens
// still print large.
function penFontSize(pen: string): number {
  const n = pen.trim().length
  if (n <= 2) return 64
  if (n <= 3) return 52
  if (n <= 4) return 44
  if (n <= 6) return 34
  return 26
}

const solidBlack: React.CSSProperties = {
  background: BLACK,
  color: '#fff',
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
}

const microLabel: React.CSSProperties = { fontSize: 8, fontWeight: 800, letterSpacing: '0.12em' }

export function PenCardLabel({ data }: { data: PenCardData }) {
  return (
    <div
      className="pen-card"
      style={{
        boxSizing: 'border-box',
        width: '4in',
        height: '2.125in',
        background: '#fff',
        color: BLACK,
        // No border box. Extra room on the left and top (and less on the right /
        // bottom) shifts the content in from those edges, so the printer's
        // unprintable margin doesn't clip the left/top of the card.
        padding: '0.2in 0.1in 0.1in 0.26in',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* TOP ZONE — PEN (left) · name + work type (middle) · HEAD (right). */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* PEN — fixed left column, the hero number */}
        <div style={{ width: '1.05in', flexShrink: 0, minWidth: 0 }}>
          <div style={microLabel}>PEN</div>
          <div style={{ fontSize: penFontSize(data.pen), fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.02em', marginTop: 1, whiteSpace: 'nowrap' }}>
            {data.pen}
          </div>
        </div>

        {/* NAME — consignor, or buyer #number + name. Wraps fully, never truncated.
            Work-type pill sits on its own line beneath the name. */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={microLabel}>{data.isBuyer ? 'BUYER' : 'CONSIGNOR'}</div>
          {data.isBuyer ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 3 }}>
              <span style={{ ...solidBlack, flexShrink: 0, fontSize: 13, fontWeight: 800, padding: '1px 6px', borderRadius: 4, letterSpacing: '-0.01em' }}>
                #{data.buyerNumber ?? '—'}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.01em', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                {data.partyName}
              </span>
            </div>
          ) : (
            <div style={{ marginTop: 2, fontSize: 18, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.01em', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {data.partyName}
            </div>
          )}
          <div style={{ marginTop: 5 }}>
            <span style={{ ...solidBlack, display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>
              {data.workType || '—'}
            </span>
          </div>
        </div>

        {/* HEAD — fixed right column, right-aligned, its own (now bigger) number */}
        <div style={{ width: '0.92in', flexShrink: 0, textAlign: 'right' }}>
          <div style={microLabel}>HEAD</div>
          <div className="tnum" style={{ fontSize: 32, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.02em', marginTop: 1, whiteSpace: 'nowrap' }}>
            {data.head}
            <span style={{ fontSize: 14, fontWeight: 700 }}> hd</span>
          </div>
        </div>
      </div>

      {/* Thin divider, dropped down a bit so the name/buyer line has room to breathe. */}
      <div style={{ height: 2, background: BLACK, borderRadius: 1, marginTop: '0.14in', ...solidBlack }} />

      {/* NOTES — required content, wraps to fill the remaining height, never cut. */}
      <div style={{ flex: 1, minHeight: 0, marginTop: 6 }}>
        <div style={microLabel}>NOTES</div>
        <div style={{ marginTop: 3, fontSize: 11, fontWeight: 500, lineHeight: 1.28, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {data.notes?.trim() ? data.notes : '—'}
        </div>
      </div>
    </div>
  )
}
