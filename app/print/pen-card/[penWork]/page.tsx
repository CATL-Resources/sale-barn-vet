import { createClient } from '@/lib/supabase/server'
import { PenCardLabel, type PenCardData } from '@/components/pen-card/pen-card-label'
import { PrintOnLoad } from '@/components/pen-card/print-on-load'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  head_expected: number | null
  buyer_party_id: string | null
  buyer_number_text: string | null
  notes: string | null
  pen: { pen_number: string } | null
  workType: { name: string } | null
  seller: { name: string } | null
  buyer: { name: string } | null
}

// The label is the landscape 4in x 2.125in design (see PenCardLabel). The Dymo
// won't reliably rotate to landscape, so we feed the 30323 in its NATIVE PORTRAIT
// orientation (2.125in wide x 4in tall) and rotate the label 90° to fill the
// page. The @page MUST be the portrait feed, and the .pen-card-page box plus the
// rotation below must match the label's size, or the print comes out wrong.
const PRINT_CSS = `
  @page { size: 2.125in 4in; margin: 0; }
  html, body { margin: 0; padding: 0; background: #E4E4DF; }
  .pen-card-stage { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .pen-card-page { position: relative; width: 2.125in; height: 4in; overflow: hidden; }
  @media print {
    html, body { background: #fff; }
    .pen-card-stage { min-height: 0; padding: 0; }
  }
`

export default async function PenCardPrintPage({ params }: { params: { penWork: string } }) {
  const supabase = createClient()
  const { data: rows } = await supabase
    .from('pen_work')
    .select(
      `id, head_expected, buyer_party_id, buyer_number_text, notes,
       pen:pen!pen_work_pen_id_fkey(pen_number),
       workType:work_type!pen_work_work_type_id_fkey(name),
       seller:party!pen_work_seller_party_id_fkey(name),
       buyer:party!pen_work_buyer_party_id_fkey(name)`,
    )
    .eq('id', params.penWork)
    .is('deleted_at', null)
    .limit(1)
    .returns<Row[]>()
  const pw = rows?.[0] ?? null

  if (!pw) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
        <div className="pen-card-stage">
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#717182' }}>
            Pen card not found (or you’re not signed in to this barn).
          </p>
        </div>
      </>
    )
  }

  const isBuyer = !!pw.buyer_party_id
  const data: PenCardData = {
    pen: pw.pen?.pen_number ?? '—',
    head: pw.head_expected ?? 0, // the work order's expected head
    workType: pw.workType?.name ?? '',
    isBuyer,
    partyName: (isBuyer ? pw.buyer?.name : pw.seller?.name) ?? '—',
    buyerNumber: pw.buyer_number_text,
    notes: pw.notes,
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <PrintOnLoad />
      <div className="pen-card-stage">
        {/* Portrait page (the label's native feed). The label keeps its own 4in x
            2.125in size; the wrapper pins it to the top-left and rotates it 90°,
            which lands the landscape label exactly inside the portrait page. The
            rotation lives here, not in PenCardLabel, so that component is unchanged. */}
        <div className="pen-card-page">
          <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: 'translate(2.125in, 0) rotate(90deg)' }}>
            <PenCardLabel data={data} />
          </div>
        </div>
      </div>
    </>
  )
}
