import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPageData, fetchPenWorks, fetchSpecialCharges, fetchSaleDays } from '@/lib/work-orders/queries'
import { fetchSaleMetrics } from '@/lib/dashboard/metrics'
import { penWorkCharges, sumRollup } from '@/lib/work-orders/pricing'
import { deriveStatus } from '@/lib/work-orders/status'
import { OfficeShell } from '@/components/office/office-shell'
import { SaleDashboard, type PartyLine } from '@/components/office/sale-dashboard'

export const dynamic = 'force-dynamic'

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export async function generateMetadata({ params }: { params: { saleDay: string } }): Promise<Metadata> {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  return { title: pageData ? `Sale Dashboard — ${pageData.barn.name}` : 'Sale Dashboard' }
}

export default async function SaleDashboardPage({ params }: { params: { saleDay: string } }) {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)
  if (!pageData) notFound()
  const { saleDay, barn } = pageData

  const [penWorks, specials, metrics, saleDays, { data: auth }] = await Promise.all([
    fetchPenWorks(supabase, params.saleDay),
    fetchSpecialCharges(supabase, params.saleDay),
    fetchSaleMetrics(supabase, params.saleDay),
    fetchSaleDays(supabase),
    supabase.auth.getUser(),
  ])

  // Billed · office so far — computed live through the shared pricing helpers
  // (never a raw *_total column), matching the Work Orders reconciliation bar:
  // every pen_work's line charge plus every special charge's frozen total.
  const rollup = sumRollup(penWorks.map((pw) => penWorkCharges(pw, barn)))
  const specialTotal = specials.reduce((a, s) => a + (s.customer_charge ?? 0), 0)
  const billed = rollup.lineCharge + specialTotal

  // Work-order status counts via the shared deriveStatus (no re-derivation here).
  const status = { complete: 0, in_progress: 0, not_started: 0, total: penWorks.length }
  for (const pw of penWorks) status[deriveStatus(pw)] += 1

  // Buyers & sellers from the day's pen_works: a seller's "lots" / a buyer's
  // "loads" are their pen_works; expected head sums head_expected. (There is no
  // separate lot/load table yet — this reads only real pen_work data.)
  const sellerMap = new Map<string, PartyLine>()
  const buyerMap = new Map<string, PartyLine>()
  for (const pw of penWorks) {
    const head = pw.head_expected ?? 0
    if (pw.buyer_party_id && pw.buyer) {
      const e = buyerMap.get(pw.buyer.id) ?? { id: pw.buyer.id, name: pw.buyer.name, count: 0, head: 0 }
      e.count += 1
      e.head += head
      buyerMap.set(pw.buyer.id, e)
    } else if (!pw.buyer_party_id && pw.seller) {
      const e = sellerMap.get(pw.seller.id) ?? { id: pw.seller.id, name: pw.seller.name, count: 0, head: 0 }
      e.count += 1
      e.head += head
      sellerMap.set(pw.seller.id, e)
    }
  }
  const sellers = [...sellerMap.values()].sort((a, b) => b.head - a.head)
  const buyers = [...buyerMap.values()].sort((a, b) => b.head - a.head)
  const sum = (rows: PartyLine[], k: 'count' | 'head') => rows.reduce((a, r) => a + r[k], 0)
  const bs = {
    sellerCount: sellers.length,
    sellerLots: sum(sellers, 'count'),
    sellerHead: sum(sellers, 'head'),
    sellers: sellers.slice(0, 5),
    buyerCount: buyers.length,
    buyerLoads: sum(buyers, 'count'),
    buyerHead: sum(buyers, 'head'),
    buyers: buyers.slice(0, 5),
  }

  // User footer.
  const user = auth.user
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const userName = (typeof meta.name === 'string' && meta.name.trim()) || user?.email || 'Signed in'
  let role = 'Office'
  if (user) {
    const { data: members } = await supabase.from('barn_member').select('role').eq('user_id', user.id).eq('barn_id', barn.id)
    role = members?.[0]?.role || 'Office'
  }

  const open = saleDay.status === 'open'
  const saleLabel = `${longDate(saleDay.sale_date)} · ${open ? 'Open' : 'Closed'}`

  return (
    <OfficeShell
      barnName={barn.name}
      saleLabel={saleLabel}
      saleDays={saleDays}
      currentSaleId={saleDay.id}
      openOrders={metrics.openOrders}
      user={{ name: userName, role, lastExport: null }}
    >
      <SaleDashboard
        saleDayId={saleDay.id}
        saleName={longDate(saleDay.sale_date)}
        workingState={open ? 'Open' : 'Closed'}
        metrics={{
          orders: metrics.orders,
          openOrders: metrics.openOrders,
          headWorked: metrics.headWorked,
          headExpected: metrics.headExpected,
          toWork: metrics.toWork,
          pensInUse: metrics.pensInUse,
        }}
        billed={billed}
        status={status}
        bs={bs}
      />
    </OfficeShell>
  )
}
