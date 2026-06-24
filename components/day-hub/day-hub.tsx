import Link from 'next/link'
import { colors } from '@/components/ui/tokens'
import { AppContainer } from '@/components/ui/app-container'
import { ScreenHeader } from '@/components/ui/screen-header'
import { GoldButton } from '@/components/ui/gold-button'
import { HeaderBack } from '@/components/ui/header-back'
import { ChevronRightIcon } from '@/components/ui/icons'
import type { Barn, SaleDay } from '@/lib/work-orders/types'
import type { SaleMetrics } from '@/lib/dashboard/metrics'

function fullDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// Diagonal-gradient stat cards (starting stops — fine-tuned later). Orange is
// always the Billed · Office card; the lead "to work" metric is the highlight.
const STAT_GRADIENTS = {
  default: 'linear-gradient(135deg, #0E2646 0%, #2B7A70 100%)',
  highlight: 'linear-gradient(135deg, #1B6B63 0%, #55BAAA 55%, #CBD24F 100%)',
  orders: 'linear-gradient(135deg, #0E2646 0%, #2E2F6E 100%)',
  billed: 'linear-gradient(135deg, #6B3410 0%, #E0822E 100%)',
} as const
type StatVariant = keyof typeof STAT_GRADIENTS

function GradientStat({ value, label, variant }: { value: React.ReactNode; label: string; variant: StatVariant }) {
  return (
    <div
      className="sbv-stat-tile"
      style={{ background: STAT_GRADIENTS[variant], border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)' }}
    >
      <div className="tnum" style={{ fontSize: 19, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2, marginTop: 5 }}>{label}</div>
    </div>
  )
}

// One of the three working-screen cards (navy). Title + count/status pill only.
function NavCard({ href, title, badge }: { href: string; title: string; badge: string }) {
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
    </Link>
  )
}

// The Sale Dashboard: metrics + the routes into the working screens.
export function DayHub({ saleDay, barn, metrics }: { saleDay: SaleDay; barn: Barn; metrics: SaleMetrics & { animals: number } }) {
  const open = saleDay.status === 'open'
  const label = saleDay.notes?.trim()
  const statusLine = `${label ? `${label} · ` : ''}${barn.name} · ${open ? 'Open' : 'Closed'}`

  // Capture button: total head for the day, minus what's worked, is what's left.
  const totalHead = metrics.headExpected
  const remaining = Math.max(0, totalHead - metrics.headWorked)

  const stats: { value: React.ReactNode; label: string; variant: StatVariant }[] = [
    { value: String(metrics.toWork), label: 'Animals To Work', variant: 'highlight' },
    { value: String(metrics.headWorked), label: 'Head Worked', variant: 'default' },
    { value: String(metrics.pensInUse), label: 'Pens In Use', variant: 'default' },
    { value: String(metrics.orders), label: `Work Orders · ${metrics.openOrders} Open`, variant: 'orders' },
    { value: <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Placeholder</span>, label: 'Billed · Office', variant: 'billed' },
  ]

  return (
    <>
      <ScreenHeader title={fullDate(saleDay.sale_date)} subtitle={statusLine} back={<HeaderBack href="/" label="Back to Hub" />} />
      <AppContainer style={{ paddingTop: 18, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* METRICS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ flex: '1 1 100px', minWidth: 100 }}>
              <GradientStat value={s.value} label={s.label} variant={s.variant} />
            </div>
          ))}
        </div>

        {/* CAPTURE — gold primary. Lands on the Pen List so the operator picks a
            pen and goes straight into capture bound to that work order. */}
        <GoldButton href={`/work-list/${saleDay.id}`}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, lineHeight: 1.15 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>Continue Working Cows!</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.9 }}>{remaining} Head of {totalHead} Head Remaining</span>
          </span>
        </GoldButton>

        {/* WORKING SCREENS */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <NavCard
            href={`/work-orders/${saleDay.id}`}
            title="Work Orders"
            badge={`${metrics.orders} Orders · ${metrics.openOrders} Open`}
          />
          <NavCard
            href={`/work-list/${saleDay.id}`}
            title="Pen List"
            badge={`${metrics.pensInUse} Pens · ${metrics.toWork} Head To Work`}
          />
          <NavCard href="/find" title="Animals" badge={`${metrics.animals} Animals`} />
        </div>
      </AppContainer>
    </>
  )
}
