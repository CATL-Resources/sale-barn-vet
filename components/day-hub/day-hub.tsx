import Link from 'next/link'
import { colors } from '@/components/ui/tokens'
import { AppContainer } from '@/components/ui/app-container'
import { ScreenHeader } from '@/components/ui/screen-header'
import { StatTile } from '@/components/ui/stat-tile'
import { GoldButton } from '@/components/ui/gold-button'
import { ChevronRightIcon } from '@/components/ui/icons'
import type { Barn, SaleDay } from '@/lib/work-orders/types'
import type { SaleMetrics } from '@/lib/dashboard/metrics'

function fullDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// One of the three working-screen cards (navy).
function NavCard({ href, title, badge, sub }: { href: string; title: string; badge: string; sub: string }) {
  return (
    <Link
      href={href}
      className="sbv-navy-surface press-card"
      style={{ flex: '1 1 280px', minWidth: 240, borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.015em' }}>{title}</div>
        <ChevronRightIcon size={16} strokeWidth={2.4} style={{ color: colors.navySubText }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: colors.teal }}>{badge}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: colors.navySubText, lineHeight: 1.45 }}>{sub}</div>
    </Link>
  )
}

// The Sale Dashboard: metrics + the routes into the working screens.
export function DayHub({ saleDay, barn, metrics }: { saleDay: SaleDay; barn: Barn; metrics: SaleMetrics & { animals: number } }) {
  const open = saleDay.status === 'open'
  const label = saleDay.notes?.trim()
  const statusLine = `${label ? `${label} · ` : ''}${barn.name} · ${open ? 'Open' : 'Closed'}`

  const stats: { value: React.ReactNode; label: string }[] = [
    { value: String(metrics.toWork), label: 'Animals To Work' },
    { value: String(metrics.headWorked), label: 'Head Worked' },
    { value: String(metrics.pensInUse), label: 'Pens In Use' },
    { value: String(metrics.orders), label: `Work Orders · ${metrics.openOrders} Open` },
    { value: <span style={{ fontSize: 12, fontWeight: 700, color: colors.navySubText }}>Placeholder</span>, label: 'Billed · Office' },
  ]

  return (
    <>
      {/* Back to the Hub is the global chevron in the AppHeader (shown on every
          non-home screen), so the sub-header keeps just the title + status. */}
      <ScreenHeader title={fullDate(saleDay.sale_date)} subtitle={statusLine} />
      <AppContainer style={{ paddingTop: 18, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* METRICS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ flex: '1 1 100px', minWidth: 100 }}>
              <StatTile value={s.value} label={s.label} />
            </div>
          ))}
        </div>

        {/* CAPTURE — gold primary */}
        <GoldButton href="/capture">
          Continue Working at the Chute · {metrics.headWorked} of {metrics.headExpected}
        </GoldButton>

        {/* WORKING SCREENS */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <NavCard
            href={`/work-orders/${saleDay.id}`}
            title="Work Orders"
            badge={`${metrics.orders} Orders · ${metrics.openOrders} Open`}
            sub="The office board — set up and bill the day's work: consignors, buyers, pens, and charges."
          />
          <NavCard
            href={`/work-list/${saleDay.id}`}
            title="Pen List"
            badge={`${metrics.pensInUse} Pens · ${metrics.toWork} Head To Work`}
            sub="The working list — go through the day's pens one job at a time, straight into capture."
          />
          <NavCard
            href="/find"
            title="Animals"
            badge={`${metrics.animals} Animals`}
            sub="Search the animals worked this sale by tag or attributes."
          />
        </div>
      </AppContainer>
    </>
  )
}
