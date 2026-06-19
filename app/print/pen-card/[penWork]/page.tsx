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

// True size for a DYMO 30256: 4in x 2.3125in (2-5/16"), landscape.
const PRINT_CSS = `
  @page { size: 4in 2.3125in; margin: 0; }
  html, body { margin: 0; padding: 0; background: #E4E4DF; }
  .pen-card-stage { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
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
        <PenCardLabel data={data} />
      </div>
    </>
  )
}
