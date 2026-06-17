import { createClient } from '@/lib/supabase/server'
import { BuyersScreen } from '@/components/buyers/buyers-screen'
import { createBuyer } from './actions'

export default async function BuyersPage() {
  const supabase = createClient()

  const { data: day } = await supabase
    .from('sale_day')
    .select('id')
    .order('sale_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: parties } = await supabase
    .from('party')
    .select('id, name')
    .order('name')
    .returns<{ id: string; name: string }[]>()
  const { data: numbers } = await supabase
    .from('buyer_number')
    .select('party_id, number')
    .returns<{ party_id: string; number: string }[]>()

  let loads: { id: string; buyer_party_id: string | null; head_billed: number | null }[] = []
  let animals: { buyer_load_id: string | null }[] = []
  if (day) {
    const lr = await supabase
      .from('buyer_load')
      .select('id, buyer_party_id, head_billed')
      .eq('sale_day_id', day.id)
      .returns<{ id: string; buyer_party_id: string | null; head_billed: number | null }[]>()
    loads = lr.data ?? []
    const ar = await supabase
      .from('animal')
      .select('buyer_load_id')
      .eq('sale_day_id', day.id)
      .returns<{ buyer_load_id: string | null }[]>()
    animals = ar.data ?? []
  }

  // head per load = head_billed, else count of captured animals
  const animalCountByLoad = new Map<string, number>()
  for (const a of animals) {
    if (a.buyer_load_id) animalCountByLoad.set(a.buyer_load_id, (animalCountByLoad.get(a.buyer_load_id) ?? 0) + 1)
  }
  const headByLoad = new Map<string, number>()
  for (const l of loads) headByLoad.set(l.id, l.head_billed ?? animalCountByLoad.get(l.id) ?? 0)

  // primary buyer number per party; which parties are buyers
  const numByParty = new Map<string, string>()
  const buyerPartyIds = new Set<string>()
  for (const n of numbers ?? []) {
    if (!numByParty.has(n.party_id)) numByParty.set(n.party_id, n.number)
    buyerPartyIds.add(n.party_id)
  }
  const rollup = new Map<string, { loads: number; head: number }>()
  for (const l of loads) {
    if (!l.buyer_party_id) continue
    buyerPartyIds.add(l.buyer_party_id)
    const cur = rollup.get(l.buyer_party_id) ?? { loads: 0, head: 0 }
    cur.loads += 1
    cur.head += headByLoad.get(l.id) ?? 0
    rollup.set(l.buyer_party_id, cur)
  }

  const buyers = (parties ?? [])
    .filter((p) => buyerPartyIds.has(p.id))
    .map((p) => ({
      partyId: p.id,
      name: p.name,
      number: numByParty.get(p.id) ?? '',
      loads: rollup.get(p.id)?.loads ?? 0,
      head: rollup.get(p.id)?.head ?? 0,
    }))

  return <BuyersScreen buyers={buyers} createBuyer={createBuyer} />
}
