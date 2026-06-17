import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewSaleDayForm } from '@/components/work-orders/new-sale-day-form'
import { ChevronRightIcon } from '@/components/ui/icons'
import { colors } from '@/components/ui/tokens'

function fullDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const closed = status === 'closed'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        marginTop: 5,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: closed ? colors.textMuted : colors.tealDeep,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: closed ? colors.textPlaceholder : colors.teal,
        }}
      />
      {status}
    </span>
  )
}

// Functional sale-day selector — nav into the office work-orders screen. The
// full home dashboard is a later design; this stays minimal.
export default async function SaleDayHome() {
  const supabase = createClient()
  const { data: days } = await supabase
    .from('sale_day')
    .select('id, sale_date, status')
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(50)

  const list = days ?? []

  return (
    <div style={{ padding: '20px 16px 40px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.navy, margin: '0 0 14px' }}>Sale days</h1>

      <NewSaleDayForm />

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.length === 0 ? (
          <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>
            No sale days yet. Start one above.
          </p>
        ) : (
          list.map((d) => (
            <Link
              key={d.id}
              href={`/work-orders/${d.id}`}
              className="press-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: '12px 14px',
                textDecoration: 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>
                  {fullDate(d.sale_date)}
                </div>
                <StatusBadge status={d.status} />
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  color: colors.navy,
                }}
              >
                Open
                <ChevronRightIcon size={14} style={{ color: colors.navy }} />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
