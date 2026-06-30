import { createClient } from '@/lib/supabase/server'
import { fetchPageData, fetchPenWorks } from '@/lib/work-orders/queries'
import { buildCloseout } from '@/lib/reports/closeout-data'
import { CloseoutReport, type CloseoutMeta } from '@/components/closeout/closeout-report'

export const dynamic = 'force-dynamic'

const APP_VERSION = '0.1.0'

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function shortDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'day'

// Screen shows the page on a warm-neutral background; print drops the shadow,
// border, and radius so the paper fills a clean letter page with the screen
// controls hidden. (Matches the design handoff's print CSS.)
const PRINT_CSS = `
  .closeout-stage { min-height: 100vh; background: #ECEBE5; }
  .pb { page-break-before: always; }
  @media print {
    html, body { background: #fff; }
    .closeout-stage { min-height: 0; background: #fff; }
    .no-print { display: none !important; }
    .closeout-paper { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; max-width: none !important; padding: 0 !important; }
    @page { size: letter portrait; margin: 0.5in; }
  }
`

export default async function CloseoutPrintPage({ params }: { params: { saleDay: string } }) {
  const supabase = createClient()
  const pageData = await fetchPageData(supabase, params.saleDay)

  if (!pageData) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
        <div className="closeout-stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#717182' }}>
            Sale day not found (or you’re not signed in to this barn).
          </p>
        </div>
      </>
    )
  }

  const { saleDay, barn } = pageData
  const penWorks = await fetchPenWorks(supabase, saleDay.id)
  const data = buildCloseout(penWorks, barn)

  const now = new Date()
  const meta: CloseoutMeta = {
    saleDateLong: longDate(saleDay.sale_date),
    saleDateShort: shortDate(saleDay.sale_date),
    generatedAt: `${shortDate(now)} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    appVersion: APP_VERSION,
    fileName: `sol-closeout-${slug(shortDate(saleDay.sale_date))}.xlsx`,
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="closeout-stage">
        <CloseoutReport data={data} meta={meta} />
      </div>
    </>
  )
}
