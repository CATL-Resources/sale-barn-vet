'use client'

import { colors } from '@/components/ui/tokens'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSaleDay } from '@/app/(home)/actions'

type Day = { id: string; sale_date: string; status: string; notes: string | null }

function fullDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export function HomeScreen({ days, today }: { days: Day[]; today: string }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  function openModal() {
    setDate(today); setNotes(''); setError(null); setModalOpen(true)
  }
  function startSale() {
    setError(null)
    startSaving(async () => {
      const res = await createSaleDay({ saleDate: date, notes: notes.trim() || null })
      if (res.ok) { setModalOpen(false); router.refresh() }
      else setError(res.error)
    })
  }

  const countLabel = days.length === 1 ? '1 day' : `${days.length} days`

  return (
    <div style={{ background: 'var(--page)', minHeight: '100%' }}>
      {/* CONTENT (the shared header sits above this, from the layout) */}
      <div style={{ width: '100%', maxWidth: 'var(--content-max)', margin: '0 auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {days.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '72px 24px', background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 16, marginTop: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#EEF1F6', border: '1px solid #DEE3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, fontSize: 24 }}>🗓</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.navy, letterSpacing: '-0.01em' }}>No sale days yet</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.textMuted }}>Start one to begin capturing work.</div>
            <button type="button" onClick={openModal} style={{ marginTop: 12, height: 44, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 22px', borderRadius: 999, background: colors.gold, color: colors.navy, border: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>+</span>New sale day
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: colors.navy, letterSpacing: '-0.01em' }}>Sale days</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPlaceholder }}>{countLabel}</span>
              </div>
              <button type="button" onClick={openModal} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 18px', borderRadius: 999, background: colors.gold, color: colors.navy, border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                <span style={{ fontSize: 17, fontWeight: 800 }}>+</span>New sale day
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {days.map((d) => {
                const open = d.status === 'open'
                return (
                  // One tap opens the day's hub, which then splits into the
                  // office Work orders and the chute Work list.
                  <Link key={d.id} href={`/day/${d.id}`} className="press-card"
                    style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', textDecoration: 'none', boxShadow: '0 1px 2px rgba(14,38,70,0.04)' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.015em' }}>{fullDate(d.sale_date)}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 11px 0 9px', borderRadius: 999, background: open ? '#E1F5EE' : '#EAEAE4' }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: open ? colors.teal : '#A6A69E' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: open ? colors.teal : colors.textMuted }}>{cap(d.status)}</span>
                        </span>
                      </div>
                      {d.notes ? <div style={{ fontSize: 13, fontWeight: 500, color: colors.textMuted, marginTop: 8 }}>{d.notes}</div> : null}
                    </div>
                    <span style={{ flexShrink: 0, height: 42, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 20px', borderRadius: 9, background: colors.navy, color: '#fff', fontSize: 14, fontWeight: 700 }}>
                      {open ? 'Open' : 'View'}<span style={{ color: '#8FA8CC' }}>›</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* NEW SALE DAY MODAL */}
      {modalOpen ? (
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,38,70,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px rgba(8,20,42,0.4)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 16px', borderBottom: `1px solid ${colors.rowDivider}` }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: colors.navy, letterSpacing: '-0.01em' }}>New sale day</span>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" style={{ width: 32, height: 32, background: 'transparent', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error ? <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, background: '#FDECEC', border: '1px solid #F2B8B8', color: '#B42318', fontSize: 13, fontWeight: 600 }}>{error}</div> : null}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ height: 42, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: colors.textPrimary, background: '#fff' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Notes <span style={{ fontWeight: 500, color: colors.textPlaceholder }}>· optional</span></span>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Special bred-cow sale" style={{ height: 42, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: colors.textPrimary, background: '#fff' }} />
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '4px 20px 20px' }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ height: 42, padding: '0 18px', borderRadius: 9, background: '#fff', color: colors.textMuted, border: `1px solid ${colors.border}`, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={startSale} disabled={saving} style={{ height: 42, padding: '0 22px', borderRadius: 9, background: colors.gold, color: colors.navy, border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Starting…' : 'Start sale'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
