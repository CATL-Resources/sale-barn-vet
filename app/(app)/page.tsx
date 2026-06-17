import { createClient } from '@/lib/supabase/server'
import { GoldButton } from '@/components/ui/gold-button'
import { createTestSaleDay } from './actions'

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// NOTE: temporarily stubbed. The pen / pen_work schema change replaced
// consignment_lot + buyer_load; the real Sale Day home is being re-issued
// against the new model. This stub avoids the dropped tables so the app builds.
export default async function SaleDayHome() {
  const supabase = createClient()

  const { data: saleDay } = await supabase
    .from('sale_day')
    .select('id, sale_date')
    .order('sale_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!saleDay) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>No sale day yet</h2>
        <p style={{ fontSize: 14, color: '#717182', marginTop: 8, lineHeight: 1.4 }}>
          A sale day is created in the office before the work starts. That screen isn&apos;t built yet
          — use the button below to make a test day.
        </p>
        {/* DEV ONLY — REMOVE WHEN OFFICE WORK-ORDER SCREEN EXISTS */}
        <form action={createTestSaleDay}>
          <GoldButton type="submit" style={{ maxWidth: 260, margin: '20px auto 0' }}>
            Create test sale day
          </GoldButton>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 16px' }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #D4D4D0', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#717182' }}>Sale day · {shortDate(saleDay.sale_date)}</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: '8px 0 0' }}>
          Sale Day home is being rebuilt
        </h2>
        <p style={{ fontSize: 14, color: '#717182', marginTop: 8, lineHeight: 1.4 }}>
          The home, capture, and buyer screens are being re-issued on the new pen / pen-work model.
          They&apos;ll be back shortly.
        </p>
      </div>
    </div>
  )
}
