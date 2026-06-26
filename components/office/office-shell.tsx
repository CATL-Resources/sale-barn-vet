'use client'

// The desktop office shell: a fixed left sidebar (navigation) and a slim top bar
// (barn + sale-day label, with a sale-day selector on the right). Reused by all
// office desktop screens. The chute/capture screens keep the mobile layout and
// don't use this. Sale-day switching reuses the app's URL mechanism — the
// selector just navigates to /day/<id>, the same route the rest of the app uses.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { colors } from '@/components/ui/tokens'

export type SaleDayOption = { id: string; sale_date: string; status: string }
export type ShellUser = { name: string; role: string; lastExport: string | null }

// Short day label for the selector options, e.g. "Sat · Jun 21".
function dayOptionLabel(iso: string, status: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const base = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return status === 'open' ? `${base} · Open` : base
}

type IconName = 'dashboard' | 'orders' | 'pens' | 'reports' | 'customers' | 'animals' | 'settings'

function NavIcon({ name }: { name: IconName }) {
  const p: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    orders: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    pens: <><path d="M3 7h18M3 12h18M3 17h18M7 3v18M17 3v18" /></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    customers: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 5.6M17 20a5.2 5.2 0 0 0-2.3-4.3" /></>,
    animals: <><circle cx="12" cy="13" r="6" /><path d="M7 7 5 3M17 7l2-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.2A1.6 1.6 0 0 0 7 19.6a1.6 1.6 0 0 0-1.8.3l-.1.1A2 2 0 1 1 2.3 17.3l.1-.1A1.6 1.6 0 0 0 2.7 14H2.5a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 4.4 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 2.7h.1A2 2 0 0 1 14 2.5v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1A1.6 1.6 0 0 0 21.5 10h.2a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.1 1Z" /></>,
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      {p[name]}
    </svg>
  )
}

function NavItem({
  href, icon, label, active, badge,
}: {
  href: string
  icon: IconName
  label: string
  active: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '9px 14px 9px 16px',
        margin: '1px 10px',
        borderRadius: 9,
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: active ? 800 : 600,
        color: active ? '#fff' : colors.navySubText,
        background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
      }}
    >
      {active ? <span style={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 3, borderRadius: 2, background: colors.gold }} /> : null}
      <span style={{ color: active ? colors.gold : colors.navySubText, display: 'inline-flex' }}><NavIcon name={icon} /></span>
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {badge && badge > 0 ? (
        <span style={{ flexShrink: 0, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: colors.gold, color: colors.navy, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{badge}</span>
      ) : null}
    </Link>
  )
}

export function OfficeShell({
  barnName, saleLabel, saleDays, currentSaleId, openOrders, user, children,
}: {
  barnName: string
  saleLabel: string
  saleDays: SaleDayOption[]
  currentSaleId: string
  openOrders: number
  user: ShellUser
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname() || ''
  const day = `/day/${currentSaleId}`
  const wo = `/work-orders/${currentSaleId}`
  const pl = `/work-list/${currentSaleId}`
  const on = (prefix: string) => pathname.startsWith(prefix)
  // Open vs closed, read from the label the page already built (presentation
  // only — drives the header status dot's color, no data of its own).
  const dayOpen = /open/i.test(saleLabel)

  const groupLabel: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', padding: '0 16px', margin: '14px 0 4px' }

  return (
    <div className="office-shell">
      <aside className="office-sidebar" style={{ background: 'var(--surface-sidebar)', color: '#fff' }}>
        {/* Brand */}
        <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: colors.gold, color: colors.navy, fontWeight: 900, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>SB</span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>Sale Barn <span style={{ color: colors.gold }}>Vet</span></span>
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.navySubText, marginTop: 2 }}>Office</span>
          </span>
        </div>

        <nav style={{ paddingTop: 4 }}>
          <NavItem href={day} icon="dashboard" label="Sale Dashboard" active={on('/day')} />
          <NavItem href={wo} icon="orders" label="Work Orders" active={on('/work-orders')} badge={openOrders} />
          <NavItem href={pl} icon="pens" label="Pen List" active={on('/work-list')} />
          <NavItem href="/reports" icon="reports" label="Reports" active={on('/reports')} />

          <div style={groupLabel}>RECORDS</div>
          <NavItem href="/customers" icon="customers" label="Customers" active={on('/customers')} />
          <NavItem href={`/animals/${currentSaleId}`} icon="animals" label="Animals" active={on('/animals')} />
        </nav>

        {/* push settings + user to the bottom on the tall fixed rail */}
        <div style={{ flex: 1, minHeight: 12 }} />

        <NavItem href="/settings" icon="settings" label="Barn Settings" active={on('/settings')} />

        <div style={{ margin: '10px 12px 14px', padding: '11px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.navySubText, marginTop: 1, textTransform: 'capitalize' }}>{user.role}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.40)', marginTop: 5 }}>Last export · {user.lastExport ?? '—'}</div>
        </div>
      </aside>

      <div className="office-main">
        {/* Slim top bar on the navy header gradient: a teal status dot + the
            operation + sale-day label on the left, the rounded date-selector pill,
            and the wordmark on the far right. */}
        <header className="office-topbar">
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: dayOpen ? colors.teal : 'rgba(255,255,255,0.35)', boxShadow: dayOpen ? '0 0 0 3px rgba(85,186,170,0.22)' : 'none' }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{barnName}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.navySubText }}>{saleLabel}</span>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.navySubText }}>Sale day</span>
            <select
              value={currentSaleId}
              onChange={(e) => router.push(`/day/${e.target.value}`)}
              aria-label="Switch sale day"
              style={{ height: 34, borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '0 14px', cursor: 'pointer', maxWidth: 220 }}
            >
              {saleDays.map((d) => (
                <option key={d.id} value={d.id} style={{ color: colors.textPrimary }}>{dayOptionLabel(d.sale_date, d.status)}</option>
              ))}
            </select>
          </label>
          <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: '#fff' }}>Sale Barn <span style={{ color: colors.gold }}>Vet</span></span>
        </header>

        <main className="office-content">
          <div className="office-content-inner">{children}</div>
        </main>
      </div>
    </div>
  )
}
