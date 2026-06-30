'use client'

// The day's loads: one row per buyer load, with expected vs assigned head and a
// flag when they don't match. Pick a different sale day with the selector. Each
// row opens the load. Read-only here.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { colors } from '@/components/ui/tokens'

type SaleDayLite = { id: string; sale_date: string; status: string | null }
type LoadLite = {
  id: string
  buyerNumber: string
  buyerName: string
  destination: string
  expectedHead: number | null
  assignedHead: number
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export function LoadsList({ loads, saleDays, dayId }: { loads: LoadLite[]; saleDays: SaleDayLite[]; dayId: string }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.navy }}>Loads</h1>
        <select
          value={dayId}
          onChange={(e) => router.push(`/loads?day=${e.target.value}`)}
          style={{ height: 38, borderRadius: 9, border: `1px solid ${colors.border}`, padding: '0 10px', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: colors.navy, background: '#fff' }}
        >
          {saleDays.map((d) => (
            <option key={d.id} value={d.id}>{longDate(d.sale_date)}</option>
          ))}
        </select>
      </div>

      {loads.length === 0 ? (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 13, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: colors.navy }}>No loads yet</div>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Build loads from the Animals report — select a buyer&apos;s animals and Assign to buyer.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr>
                <Th>Buyer #</Th>
                <Th>Buyer</Th>
                <Th>Destination</Th>
                <Th right>Expected</Th>
                <Th right>Assigned</Th>
              </tr>
            </thead>
            <tbody>
              {loads.map((l, i) => {
                const mismatch = l.expectedHead != null && l.expectedHead !== l.assignedHead
                return (
                  <tr key={l.id} style={{ background: i % 2 ? colors.hoverBg : '#fff', cursor: 'pointer' }} onClick={() => router.push(`/loads/${l.id}`)}>
                    <Td><Link href={`/loads/${l.id}`} style={{ fontWeight: 800, color: colors.navy, textDecoration: 'none' }}>{l.buyerNumber || '—'}</Link></Td>
                    <Td>{l.buyerName || '—'}</Td>
                    <Td>{l.destination || '—'}</Td>
                    <Td right>{l.expectedHead ?? '—'}</Td>
                    <Td right>
                      <span style={{ fontWeight: 800, color: mismatch ? colors.danger : colors.navy }}>{l.assignedHead}</span>
                      {mismatch && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: colors.danger }}>≠</span>}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th style={{ background: colors.cardHeader, borderBottom: `1px solid ${colors.cardHeaderBorder}`, padding: '8px 12px', textAlign: right ? 'right' : 'left', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: colors.textMuted, whiteSpace: 'nowrap' }}>{children}</th>
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td style={{ padding: '9px 12px', borderBottom: `1px solid ${colors.rowDivider}`, textAlign: right ? 'right' : 'left', fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>{children}</td>
}
