'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { colors } from '@/components/ui/tokens'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { GoldButton } from '@/components/ui/gold-button'
import { ChevronRightIcon } from '@/components/ui/icons'
import { createSaleDay } from '@/app/(home)/actions'
import type { SaleMetrics } from '@/lib/dashboard/metrics'

type Day = { id: string; sale_date: string; status: string; notes: string | null }

function fullDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// Diagonal-gradient stat cards (starting stops — fine-tuned later). The lead
// "head worked" metric is the highlight; orders gets its own indigo gradient.
const STAT_GRADIENTS = {
  default: 'linear-gradient(135deg, #0E2646 0%, #2B7A70 100%)',
  highlight: 'linear-gradient(135deg, #1B6B63 0%, #55BAAA 55%, #CBD24F 100%)',
  orders: 'linear-gradient(135deg, #0E2646 0%, #2E2F6E 100%)',
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.textMuted }}>
      {children}
    </div>
  )
}

function StatusPill({ open }: { open: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 11px 0 9px', borderRadius: 999, background: open ? '#E1F5EE' : '#EAEAE4', flexShrink: 0 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: open ? colors.teal : '#A6A69E' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: open ? colors.teal : colors.textMuted }}>{open ? 'Open' : 'Closed'}</span>
    </span>
  )
}

export function HomeScreen({
  days,
  today,
  barnName,
  currentSaleId,
  currentAnimals,
  metrics,
}: {
  days: Day[]
  today: string
  barnName: string
  currentSaleId: string | null
  currentAnimals: number
  metrics: Record<string, SaleMetrics>
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  function openModal() {
    setDate(today)
    setNotes('')
    setError(null)
    setModalOpen(true)
  }
  function startSale() {
    setError(null)
    startSaving(async () => {
      const res = await createSaleDay({ saleDate: date, notes: notes.trim() || null })
      if (res.ok) {
        setModalOpen(false)
        router.refresh()
      } else setError(res.error)
    })
  }

  const current = currentSaleId ? days.find((d) => d.id === currentSaleId) ?? null : null
  const currentMetrics = current ? metrics[current.id] : null
  const currentOpen = current?.status === 'open'
  const previous = days.filter((d) => d.id !== currentSaleId)

  const statusLine = current ? (currentOpen ? 'Sale Day In Progress' : 'Most Recent Sale') : 'No Sale Days Yet'

  // Quick-link chip on the navy hero. A real link, but it stops the card's own
  // tap so the chip and the card can go to different places.
  const chip = (href: string, label: string) => (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 13px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
    >
      {label}
      <ChevronRightIcon size={13} strokeWidth={2.4} style={{ color: '#8FA8CC' }} />
    </Link>
  )

  return (
    <div style={{ background: 'var(--page)', minHeight: '100%' }}>
      {/* The barn name + status now live in the shared app header; the Hub goes
          straight into its content. */}
      <div className="sbv-container" style={{ paddingTop: 18, paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* CURRENT SALE */}
        {current && currentMetrics ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Current Sale</SectionLabel>
            <div
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/day/${current.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/day/${current.id}`)
                }
              }}
              className="sbv-navy-surface press-card"
              style={{ borderRadius: 16, padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.015em' }}>{fullDate(current.sale_date)}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.teal, marginTop: 2 }}>{current.notes?.trim() || 'Sale Day'}</div>
                </div>
                <StatusPill open={currentOpen} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { value: `${currentMetrics.headWorked} / ${currentMetrics.headExpected}`, label: 'HD Worked', variant: 'highlight' as StatVariant },
                  { value: String(currentMetrics.pensInUse), label: 'Pens', variant: 'default' as StatVariant },
                  { value: `${currentMetrics.orders}`, label: `Orders · ${currentMetrics.openOrders} Open`, variant: 'orders' as StatVariant },
                ].map((s) => (
                  <div key={s.label} style={{ flex: '1 1 72px', minWidth: 72 }}>
                    <GradientStat value={s.value} label={s.label} variant={s.variant} />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{chip(`/work-orders/${current.id}`, 'Work Orders')}</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{chip(`/work-list/${current.id}`, 'Pen List')}</div>
              </div>
            </div>
          </section>
        ) : null}

        {/* NEW SALE DAY */}
        <GoldButton type="button" onClick={openModal}>
          New Sale Day
        </GoldButton>

        {/* CONSIGNMENTS — COMING SOON (visible, labeled, actions disabled) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SectionLabel>Consignments</SectionLabel>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: colors.textMuted, background: '#EAEAE4', borderRadius: 999, padding: '3px 9px' }}>
              Coming Soon
            </span>
          </div>
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['Add Consignment', 'View Consignment Summary'].map((label) => (
              <button
                key={label}
                type="button"
                disabled
                aria-disabled
                style={{ height: 44, padding: '0 16px', borderRadius: 10, background: '#F3F3F0', border: `1px solid ${colors.border}`, color: colors.textPlaceholder, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'default' }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* PREVIOUS SALES */}
        {previous.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Previous Sales</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {previous.map((d) => {
                const m = metrics[d.id]
                return (
                  <Link
                    key={d.id}
                    href={`/day/${d.id}`}
                    className="press-card"
                    style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', boxShadow: '0 1px 2px rgba(14,38,70,0.04)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.01em' }}>{shortDate(d.sale_date)}</span>
                        <StatusPill open={d.status === 'open'} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted, marginTop: 3 }}>
                        {(d.notes?.trim() ? `${d.notes.trim()} · ` : '') + `${m ? m.headWorked : 0} Head Worked`}
                      </div>
                    </div>
                    <ChevronRightIcon size={16} strokeWidth={2.4} style={{ color: '#A8AEC0' }} />
                  </Link>
                )
              })}
            </div>
          </section>
        ) : null}

        {days.length === 0 ? (
          <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: colors.navy, letterSpacing: '-0.01em' }}>No Sale Days Yet</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.textMuted, marginTop: 6 }}>Start one to begin capturing work.</div>
          </div>
        ) : null}
      </div>

      {/* NEW SALE DAY MODAL */}
      {modalOpen ? (
        <Modal size="sm" zIndex={50} onClose={() => setModalOpen(false)} overlayStyle={{ background: 'rgba(14,38,70,0.55)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 16px', borderBottom: `1px solid ${colors.rowDivider}` }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: colors.navy, letterSpacing: '-0.01em' }}>New Sale Day</span>
            <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" style={{ width: 32, height: 32, background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: 18 }}>
              ✕
            </button>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error ? (
              <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, background: '#FDECEC', border: '1px solid #F2B8B8', color: '#B42318', fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            ) : null}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ height: 42, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: colors.textPrimary, background: '#fff' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>
                Notes <span style={{ fontWeight: 500, color: colors.textPlaceholder }}>· optional</span>
              </span>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Special Bred-Cow Sale" style={{ height: 42, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: colors.textPrimary, background: '#fff' }} />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '4px 20px 20px' }}>
            <button type="button" onClick={() => setModalOpen(false)} style={{ height: 42, padding: '0 18px', borderRadius: 9, background: '#fff', color: colors.textMuted, border: `1px solid ${colors.border}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
            <Button variant="primary" type="button" onClick={startSale} disabled={saving} style={{ height: 42, padding: '0 22px', borderRadius: 9, fontSize: 14 }}>
              {saving ? 'Starting…' : 'Start Sale'}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
