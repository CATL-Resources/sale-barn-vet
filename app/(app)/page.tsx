import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatTile } from '@/components/ui/stat-tile'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { GoldButton } from '@/components/ui/gold-button'
import { SearchIcon, PlusIcon } from '@/components/ui/icons'
import { createTestSaleDay } from './actions'

type LotRow = {
  id: string
  expected_head: number | null
  head_billed: number | null
  total_customer_charge: number | null
  party: { name: string } | null
  animal_type: { name: string } | null
}
type LoadRow = {
  id: string
  head_billed: number | null
  total_customer_charge: number | null
  buyer_number_text: string | null
  party: { name: string } | null
}
type AnimalRow = {
  id: string
  consignment_lot_id: string | null
  buyer_load_id: string | null
}

const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0)

export default async function SaleDayHome() {
  const supabase = createClient()

  const { data: saleDay } = await supabase
    .from('sale_day')
    .select('id, sale_date')
    .order('sale_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ---- Empty state: no sale day yet ----
  if (!saleDay) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>No sale day yet</h2>
        <p style={{ fontSize: 14, color: '#717182', marginTop: 8, lineHeight: 1.4 }}>
          A sale day is created in the office before the work starts. That screen isn&apos;t built yet
          — use the button below to make a test day so you can see the home screen.
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

  // ---- Day exists: read its rows (RLS scopes everything to the barn) ----
  const [lotsRes, loadsRes, animalsRes, specialRes] = await Promise.all([
    supabase
      .from('consignment_lot')
      .select('id, expected_head, head_billed, total_customer_charge, party(name), animal_type(name)')
      .eq('sale_day_id', saleDay.id)
      .returns<LotRow[]>(),
    supabase
      .from('buyer_load')
      .select('id, head_billed, total_customer_charge, buyer_number_text, party(name)')
      .eq('sale_day_id', saleDay.id)
      .returns<LoadRow[]>(),
    supabase
      .from('animal')
      .select('id, consignment_lot_id, buyer_load_id')
      .eq('sale_day_id', saleDay.id)
      .returns<AnimalRow[]>(),
    supabase.from('special_charge').select('customer_charge').eq('sale_day_id', saleDay.id),
  ])

  const lots = lotsRes.data ?? []
  const loads = loadsRes.data ?? []
  const animals = animalsRes.data ?? []
  const special = specialRes.data ?? []

  // Which buyer loads already have a generated document (gold CVI badge)?
  let cviLoads = new Set<string>()
  if (loads.length > 0) {
    const { data: docs } = await supabase
      .from('document')
      .select('buyer_load_id')
      .in(
        'buyer_load_id',
        loads.map((l) => l.id),
      )
    cviLoads = new Set((docs ?? []).map((d) => d.buyer_load_id).filter((x): x is string => !!x))
  }

  // Per-lot / per-load captured counts.
  const lotCount = new Map<string, number>()
  const loadCount = new Map<string, number>()
  for (const a of animals) {
    if (a.consignment_lot_id) lotCount.set(a.consignment_lot_id, (lotCount.get(a.consignment_lot_id) ?? 0) + 1)
    if (a.buyer_load_id) loadCount.set(a.buyer_load_id, (loadCount.get(a.buyer_load_id) ?? 0) + 1)
  }

  const headWorked = animals.length
  const billed =
    sum(lots.map((l) => l.total_customer_charge)) +
    sum(loads.map((l) => l.total_customer_charge)) +
    sum(special.map((s) => s.customer_charge))

  const sellersHead = lots.reduce((a, l) => a + (lotCount.get(l.id) ?? 0), 0)
  const buyersHead = loads.reduce((a, l) => a + (loadCount.get(l.id) ?? l.head_billed ?? 0), 0)

  const muted = { fontSize: 13, color: '#717182', padding: '4px 2px' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 12px 12px' }}>
        {/* Search (placeholder — wired later) */}
        <div className="sbv-search">
          <SearchIcon size={17} style={{ color: '#717182' }} />
          <input placeholder="Search seller, buyer, or tag" />
        </div>

        {/* Stat tiles — all derived from the day's rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <StatTile value={headWorked} label="Head worked" />
          <StatTile value={lots.length} label="Consignor lots" />
          <StatTile value={loads.length} label="Buyer loads" />
          <StatTile value={`$${Math.round(billed).toLocaleString('en-US')}`} label="Billed" gold />
        </div>

        {/* Sellers (pre-sale) */}
        <CollapsibleSection
          title="Sellers — pre-sale"
          summary={`${lots.length} ${lots.length === 1 ? 'lot' : 'lots'} · ${sellersHead} head`}
        >
          {lots.length === 0 ? (
            <div style={muted}>No consignor lots yet.</div>
          ) : (
            lots.map((lot) => {
              const worked = lotCount.get(lot.id) ?? 0
              const expected = lot.expected_head
              const complete = expected != null && worked >= expected
              return (
                <Link key={lot.id} href={`/lots/${lot.id}`} className="sbv-navy-surface sbv-data-card press-card">
                  <span style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="sbv-card-title">{lot.party?.name ?? 'Unknown seller'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#55BAAA' }}>
                      {lot.animal_type?.name ?? '—'}
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                      <span className="tnum" style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                        {worked}
                      </span>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: complete ? '#55BAAA' : '#F59E0B',
                        }}
                      />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#8FA8CC' }}>
                      of {expected ?? '—'} head
                    </span>
                  </span>
                </Link>
              )
            })
          )}
        </CollapsibleSection>

        {/* Buyers (post-sale) */}
        <CollapsibleSection
          title="Buyers — post-sale"
          summary={`${loads.length} ${loads.length === 1 ? 'load' : 'loads'} · ${buyersHead} head`}
        >
          {loads.length === 0 ? (
            <div style={muted}>No buyer loads yet.</div>
          ) : (
            loads.map((load) => {
              const head = loadCount.get(load.id) ?? load.head_billed ?? 0
              return (
                <Link key={load.id} href={`/loads/${load.id}`} className="sbv-navy-surface sbv-data-card press-card">
                  <span style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="sbv-card-title">{load.party?.name ?? 'Unknown buyer'}</span>
                    {load.buyer_number_text ? (
                      <span className="tnum" style={{ fontSize: 13, fontWeight: 600, color: '#55BAAA' }}>
                        Buyer #{load.buyer_number_text}
                      </span>
                    ) : null}
                  </span>
                  <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                      {head} head
                    </span>
                    {cviLoads.has(load.id) ? <span className="sbv-cvi-badge">CVI</span> : null}
                  </span>
                </Link>
              )
            })
          )}
        </CollapsibleSection>
      </div>

      {/* New pen — thumb-zone CTA */}
      <div style={{ position: 'sticky', bottom: 0, padding: '12px 12px 20px', background: 'var(--page)' }}>
        <GoldButton href="/capture">
          <PlusIcon size={22} style={{ color: '#0E2646' }} />
          New pen
        </GoldButton>
      </div>
    </div>
  )
}
