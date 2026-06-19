// The printable pen card. Rendered at TRUE physical size for a DYMO 30256 label
// (2-5/16" x 4", landscape = 4in x 2.3125in). Reusable: hand it the fields and
// it picks the seller or buyer layout automatically.
//
// Black fills (work-type pill, buyer-number pill, divider) carry
// print-color-adjust: exact so a DYMO prints them solid.

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

// Big PEN value: shrink as the pen label gets longer so it never clips.
function penFontSize(pen: string): number {
  const n = pen.trim().length
  if (n <= 2) return 116
  if (n <= 4) return 78
  if (n <= 6) return 52
  return 38
}

const solidBlack: React.CSSProperties = {
  background: BLACK,
  color: '#fff',
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
}

export function PenCardLabel({ data }: { data: PenCardData }) {
  return (
    <div
      className="pen-card"
      style={{
        width: '4in',
        height: '2.3125in',
        background: '#fff',
        color: BLACK,
        border: `2px solid ${BLACK}`,
        borderRadius: 6,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* TOP ROW — PEN + HEAD */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>PEN</div>
          <div style={{ fontSize: penFontSize(data.pen), fontWeight: 800, lineHeight: 0.84, letterSpacing: '-0.02em', marginTop: 1, whiteSpace: 'nowrap' }}>
            {data.pen}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>HEAD</div>
          <div className="tnum" style={{ fontSize: 41, fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.02em', marginTop: 3, whiteSpace: 'nowrap' }}>
            {data.head}
            <span style={{ fontSize: 22, fontWeight: 700 }}> hd</span>
          </div>
        </div>
      </div>

      {/* NOTES */}
      {data.notes ? (
        <div style={{ marginTop: 7, fontSize: 13, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.notes}
        </div>
      ) : null}

      {/* BOTTOM — party + work type */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ height: 4, background: BLACK, borderRadius: 2, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 9 }}>
          {data.isBuyer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ ...solidBlack, flexShrink: 0, fontSize: 16, fontWeight: 800, padding: '2px 7px', borderRadius: 4, letterSpacing: '-0.01em' }}>
                #{data.buyerNumber ?? '—'}
              </span>
              <span style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {data.partyName}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
              {data.partyName}
            </div>
          )}
          <div style={{ ...solidBlack, flexShrink: 0, fontSize: 15, fontWeight: 700, padding: '5px 9px', borderRadius: 5, whiteSpace: 'nowrap' }}>
            {data.workType || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
