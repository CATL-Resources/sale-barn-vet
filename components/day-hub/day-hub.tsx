import { colors } from '@/components/ui/tokens'
import { AppContainer } from '@/components/ui/app-container'
import Link from 'next/link'
import type { Barn, SaleDay } from '@/lib/work-orders/types'

function fullDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// One big, tappable choice on the hub.
function HubCard({ href, badge, badgeBg, badgeColor, title, sub }: {
  href: string
  badge: string
  badgeBg: string
  badgeColor: string
  title: string
  sub: string
}) {
  return (
    <Link href={href} className="press-card" style={{ flex: '1 1 300px', minWidth: 260, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, textDecoration: 'none', boxShadow: '0 1px 2px rgba(14,38,70,0.05)' }}>
      <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: badgeColor, background: badgeBg, borderRadius: 999, padding: '5px 12px' }}>{badge}</span>
      <div>
        <div style={{ fontSize: 23, fontWeight: 800, color: colors.navy, letterSpacing: '-0.015em' }}>{title}</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: colors.textMuted, marginTop: 5, lineHeight: 1.5 }}>{sub}</div>
      </div>
      <div style={{ flex: 1 }} />
      <span style={{ alignSelf: 'flex-start', height: 44, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 20px', borderRadius: 10, background: colors.navy, color: '#fff', fontSize: 15, fontWeight: 700 }}>
        Open<span style={{ color: '#8FA8CC' }}>›</span>
      </span>
    </Link>
  )
}

// The per-sale-day hub: pick the office Work orders or the chute Work list.
export function DayHub({ saleDay, barn }: { saleDay: SaleDay; barn: Barn }) {
  const open = saleDay.status === 'open'
  return (
    <AppContainer style={{ paddingTop: 18, paddingBottom: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: colors.navy, letterSpacing: '-0.015em' }}>{fullDate(saleDay.sale_date)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPlaceholder }}>{barn.name}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 10px 0 8px', borderRadius: 999, background: open ? '#E1F5EE' : '#EAEAE4' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: open ? colors.teal : '#A6A69E' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: open ? colors.teal : colors.textMuted }}>{cap(saleDay.status)}</span>
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>Where are you working?</div>

      {/* TWO PATHS */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <HubCard
          href={`/work-orders/${saleDay.id}`}
          badge="Office"
          badgeBg="#E7ECF5"
          badgeColor={colors.navy}
          title="Work orders"
          sub="Set up and bill the day's work — consignors, buyers, pens, and charges."
        />
        <HubCard
          href={`/work-list/${saleDay.id}`}
          badge="At the chute"
          badgeBg="#FBEFC2"
          badgeColor="#946A00"
          title="Work the cattle"
          sub="Work through the day's pens one job at a time, straight into capture."
        />
      </div>
    </AppContainer>
  )
}
