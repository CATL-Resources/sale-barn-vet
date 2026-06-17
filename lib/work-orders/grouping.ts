import type { Barn, PartyGroup, PenWorkFull, View } from './types'
import { penWorkCharges } from './pricing'

export type Grouped = {
  sellerGroups: PartyGroup[]
  buyerGroups: PartyGroup[]
  typeGroups: PartyGroup[]
}

const NO_PEN = '— no pen —'
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

function penLabel(pw: PenWorkFull): string {
  return pw.pen?.pen_number?.trim() || NO_PEN
}

function buyerNumberText(pw: PenWorkFull): string | undefined {
  return pw.buyer_number_text ?? pw.buyerNumber?.number ?? undefined
}

function buyerDestination(pw: PenWorkFull): string | undefined {
  return pw.destination ?? pw.buyerNumber?.typical_destination ?? undefined
}

function buyerState(pw: PenWorkFull): string | undefined {
  return pw.destination_state ?? pw.buyerNumber?.typical_state ?? undefined
}

function emptyGroup(base: Omit<PartyGroup, 'headBrought' | 'headWorked' | 'totalCharge' | 'penWorks'>): PartyGroup {
  return { ...base, headBrought: 0, headWorked: 0, totalCharge: 0, penWorks: [] }
}

function aggregate(group: PartyGroup, pw: PenWorkFull, barn: Barn) {
  group.headBrought += pw.head_expected ?? 0
  group.headWorked += pw.head_worked ?? 0
  group.totalCharge += penWorkCharges(pw, barn).lineCharge
  group.penWorks.push(pw)
}

function sortGroups(groups: PartyGroup[]): PartyGroup[] {
  return groups.sort((a, b) => collator.compare(a.name, b.name))
}

/**
 * Group pen_works for a view.
 * - 'owner': by party (seller / buyer sections).
 * - 'pen':   by pen number within each role section.
 * - 'type':  by animal type, single section (returned as typeGroups).
 */
export function groupPenWorks(penWorks: PenWorkFull[], view: View, barn: Barn): Grouped {
  if (view === 'type') {
    const types = new Map<string, PartyGroup>()
    for (const pw of penWorks) {
      const name = pw.animalType?.name ?? 'Uncategorized'
      let g = types.get(name)
      if (!g) {
        g = emptyGroup({ key: `type:${name}`, name, role: 'seller' })
        types.set(name, g)
      }
      aggregate(g, pw, barn)
    }
    return { sellerGroups: [], buyerGroups: [], typeGroups: sortGroups([...types.values()]) }
  }

  const sellers = new Map<string, PartyGroup>()
  const buyers = new Map<string, PartyGroup>()

  for (const pw of penWorks) {
    if (pw.buyer_party_id != null) {
      const key = view === 'pen' ? `buyer-pen:${penLabel(pw)}` : `buyer:${pw.buyer_party_id}`
      let g = buyers.get(key)
      if (!g) {
        g =
          view === 'pen'
            ? emptyGroup({ key, name: penLabel(pw), role: 'buyer' })
            : emptyGroup({
                key,
                name: pw.buyer?.name ?? 'Unknown buyer',
                role: 'buyer',
                partyId: pw.buyer_party_id,
                buyerNumber: buyerNumberText(pw),
                destination: buyerDestination(pw),
                destinationState: buyerState(pw),
              })
        buyers.set(key, g)
      }
      aggregate(g, pw, barn)
    } else {
      const sellerId = pw.seller_party_id ?? 'unassigned'
      const key = view === 'pen' ? `seller-pen:${penLabel(pw)}` : `seller:${sellerId}`
      let g = sellers.get(key)
      if (!g) {
        g =
          view === 'pen'
            ? emptyGroup({ key, name: penLabel(pw), role: 'seller' })
            : emptyGroup({
                key,
                name: pw.seller?.name ?? 'Unknown consignor',
                role: 'seller',
                partyId: pw.seller_party_id ?? undefined,
              })
        sellers.set(key, g)
      }
      aggregate(g, pw, barn)
    }
  }

  return {
    sellerGroups: sortGroups([...sellers.values()]),
    buyerGroups: sortGroups([...buyers.values()]),
    typeGroups: [],
  }
}
