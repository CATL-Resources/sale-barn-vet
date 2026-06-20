import { createClient } from '@/lib/supabase/server'
import { fetchCaptureBootstrap } from '@/lib/capture/queries'
import { CaptureScreen } from '@/components/capture/capture-screen'
import type { BatchInfo } from '@/lib/capture/types'

export const dynamic = 'force-dynamic'

type PwRow = {
  id: string
  sale_day_id: string
  pen_id: string | null
  work_type_id: string | null
  animal_type_id: string | null
  seller_party_id: string | null
  buyer_party_id: string | null
  head_started: number | null
  head_expected: number | null
  head_worked: number | null
  workType: { id: string; name: string; includes_preg_check: boolean } | null
  seller: { id: string; name: string } | null
  buyer: { id: string; name: string } | null
  pen: { id: string; pen_number: string } | null
}

// Chuteside capture. The (full) layout already guards auth; here we load the
// barn config + reference lists and hand off to the client capture flow. When a
// ?penWork=<id> is given (from the Barn Work List), we open already bound to that
// work order's batch instead of the new-batch start flow.
export default async function CapturePage({
  searchParams,
}: {
  searchParams: { penWork?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const bootstrap = await fetchCaptureBootstrap(supabase)

  if (!bootstrap) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>No barn set up yet</h2>
        <p style={{ fontSize: 14, color: '#717182', marginTop: 8 }}>Add a barn before capturing.</p>
      </div>
    )
  }

  let initialBatch: { batch: BatchInfo; worked: number } | undefined
  const penWorkId = searchParams.penWork
  if (penWorkId) {
    const { data: rows } = await supabase
      .from('pen_work')
      .select(
        `id, sale_day_id, pen_id, work_type_id, animal_type_id, seller_party_id, buyer_party_id, head_started, head_expected, head_worked,
         workType:work_type!pen_work_work_type_id_fkey(id,name,includes_preg_check),
         seller:party!pen_work_seller_party_id_fkey(id,name),
         buyer:party!pen_work_buyer_party_id_fkey(id,name),
         pen:pen!pen_work_pen_id_fkey(id,pen_number)`,
      )
      .eq('id', penWorkId)
      .is('deleted_at', null)
      .limit(1)
      .returns<PwRow[]>()
    const pw = rows?.[0] ?? null
    // A work type is required to drive the capture form; otherwise fall back to
    // the normal start flow.
    if (pw && pw.work_type_id && pw.workType) {
      const owner = pw.buyer_party_id ? pw.buyer : pw.seller
      const { count } = await supabase
        .from('animal')
        .select('id', { count: 'exact', head: true })
        .eq('pen_work_id', pw.id)
        .is('deleted_at', null)
      const batch: BatchInfo = {
        penWorkId: pw.id,
        saleDayId: pw.sale_day_id,
        penId: pw.pen_id,
        penNumber: pw.pen?.pen_number ?? null,
        workTypeId: pw.work_type_id,
        workTypeName: pw.workType.name,
        includesPregCheck: pw.workType.includes_preg_check,
        sellerPartyId: owner?.id ?? '',
        sellerName: owner?.name ?? '',
        animalTypeId: pw.animal_type_id,
        headStarted: pw.head_started,
        headExpected: pw.head_expected,
      }
      initialBatch = { batch, worked: pw.head_worked ?? count ?? 0 }
    }
  }

  return <CaptureScreen bootstrap={bootstrap} userId={user?.id ?? null} initialBatch={initialBatch} />
}
