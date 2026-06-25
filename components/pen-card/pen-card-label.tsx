// The printable pen card, sized as a 4in x 6in shipping label (portrait: 4in
// wide, 6in tall). Rendered at TRUE physical size; the @page size in the print
// route MUST match this, or the print comes out scaled wrong. Reusable: hand it
// the fields and it picks the seller or buyer layout automatically.
//
// The card uses border-box sizing and a ~0.18in inner margin so content never
// runs to the very edge (printers can't print edge-to-edge). The consignor name
// and the notes WRAP to as many lines as needed and are never truncated — they
// are required content. Black fills (work-type pill, buyer-number pill, divider)
// carry print-color-adjust: exact so the printer prints them solid.

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

// Big PEN value: shrink as the pen label gets longer so it never clips the 4in
// width. The label is 4in wide either way, so this step-down is about width; the
// taller card just lets the short, common pens print huge.
function penFontSize(pen: string): number {
  const n = pen.trim().length
  if (n <= 2) return 150
  if (n <= 3) return 118
  if (n <= 4) return 96
  if (n <= 6) return 64
  if (n <= 9) return 46
  if (n <= 12) return 34
  return 26
}

const solidBlack: React.CSSProperties = {
  background: BLACK,
  color: '#fff',
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
}

const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.12em' }

export function PenCardLabel({ data }: { data: PenCardData }) {
  return (
    <div
      className="pen-card"
      style={{
        boxSizing: 'border-box',
        width: '4in',
        height: '6in',
        background: '#fff',
        color: BLACK,
        border: `2px solid ${BLACK}`,
        borderRadius: 8,
        padding: '0.18in',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* PEN — the hero, top of the card */}
      <div style={{ minWidth: 0 }}>
        <div style={fieldLabel}>PEN</div>
        <div style={{ fontSize: penFontSize(data.pen), fontWeight: 800, lineHeight: 0.86, letterSpacing: '-0.02em', marginTop: 2, whiteSpace: 'nowrap' }}>
          {data.pen}
        </div>
      </div>

      <div style={{ height: 4, background: BLACK, borderRadius: 2, ...solidBlack }} />

      {/* NAME — consignor, or buyer number + name. Wraps fully, never truncated. */}
      <div style={{ minWidth: 0 }}>
        <div style={fieldLabel}>{data.isBuyer ? 'BUYER' : 'CONSIGNOR'}</div>
        {data.isBuyer ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
            <span style={{ ...solidBlack, flexShrink: 0, fontSize: 22, fontWeight: 800, padding: '2px 9px', borderRadius: 5, letterSpacing: '-0.01em' }}>
              #{data.buyerNumber ?? '—'}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 30, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.01em', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              {data.partyName}
            </span>
          </div>
        ) : (
          <div style={{ marginTop: 2, fontSize: 32, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.01em', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {data.partyName}
          </div>
        )}
      </div>

      {/* HEAD + WORK TYPE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={fieldLabel}>HEAD</div>
          <div className="tnum" style={{ fontSize: 46, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.02em', marginTop: 2, whiteSpace: 'nowrap' }}>
            {data.head}
            <span style={{ fontSize: 24, fontWeight: 700 }}> hd</span>
          </div>
        </div>
        <span style={{ ...solidBlack, flexShrink: 0, fontSize: 18, fontWeight: 700, padding: '7px 12px', borderRadius: 6, whiteSpace: 'nowrap' }}>
          {data.workType || '—'}
        </span>
      </div>

      {/* NOTES — required content, wraps to as many lines as needed, never cut.
          Takes the remaining vertical room on the tall label. */}
      <div style={{ flex: 1, minHeight: 0, marginTop: 2 }}>
        <div style={fieldLabel}>NOTES</div>
        <div style={{ marginTop: 4, fontSize: 17, fontWeight: 500, lineHeight: 1.3, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {data.notes?.trim() ? data.notes : '—'}
        </div>
      </div>
    </div>
  )
}
