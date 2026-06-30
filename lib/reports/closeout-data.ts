// Builds the Sale Day Closeout numbers from a day's pen_work rows.
//
// Every dollar comes through penWorkCharges — the same money path the Billing
// report uses — so the closeout grand total equals the Billing report's total
// for the same day. We never read the stored *_total columns or the
// seller_rollup / buyer_rollup views: those sum head_worked and can go stale
// when the office edits a billed count, and they don't drop holds.
//
// Rules that match the design spec:
//   - A line bills at the office's billed head (head_billed ?? head_worked).
//   - "Vet" includes sales tax (vetTotal = vet/hd × head × (1 + tax)).
//   - Admin = adminTotal, SOL = solTotal, Line Total = Vet + Admin + SOL.
//   - Hold lines (and any line with no owner) are excluded from every total and
//     listed on their own as "not billed".
// Sums are kept unrounded and only rounded when shown, so the grand total lands
// on exactly the same cents as the Billing report.

import { penWorkCharges } from '@/lib/work-orders/pricing'
import type { Barn, PenWorkFull } from '@/lib/work-orders/types'

export type CloseoutBuckets = {
  head: number
  vet: number // includes sales tax
  admin: number
  sol: number
  total: number
}

export type SummaryRow = CloseoutBuckets & {
  customer: string
  buyerNo: string // blank for sellers
}

export type DetailLine = {
  pen: string
  workType: string
  head: number
  vetPerHd: number
  solPerHd: number
  vet: number
  admin: number
  sol: number
  lineTotal: number
}

export type DetailGroup = {
  customer: string
  buyerNo: string // blank for sellers
  workTypeLabel: string // the work type when a customer has just one; '' if mixed
  lines: DetailLine[]
  subtotal: CloseoutBuckets
}

export type HoldLine = {
  pen: string
  workType: string
  head: number
  owner: string
}

export type CloseoutSide = {
  customerCount: number
  summary: SummaryRow[]
  subtotal: CloseoutBuckets
  detail: DetailGroup[]
}

export type CloseoutData = {
  sellers: CloseoutSide
  buyers: CloseoutSide
  holds: HoldLine[]
  grand: CloseoutBuckets
}

const zero = (): CloseoutBuckets => ({ head: 0, vet: 0, admin: 0, sol: 0, total: 0 })

function add(acc: CloseoutBuckets, b: CloseoutBuckets): void {
  acc.head += b.head
  acc.vet += b.vet
  acc.admin += b.admin
  acc.sol += b.sol
  acc.total += b.total
}

// The buyer number for a line: the snapshot text recorded at the time first,
// then the joined buyer_number record. Same rule used across the app.
function buyerNumberOf(pw: PenWorkFull): string {
  return (pw.buyer_number_text ?? pw.buyerNumber?.number ?? '').trim()
}

type Acc = {
  party: string
  buyerNos: Set<string>
  workTypes: Set<string>
  lines: DetailLine[]
  subtotal: CloseoutBuckets
}

function buildSide(groups: Map<string, Acc>): CloseoutSide {
  const accs = [...groups.values()].sort((a, b) => a.party.localeCompare(b.party))
  const subtotal = zero()
  const summary: SummaryRow[] = []
  const detail: DetailGroup[] = []
  for (const g of accs) {
    add(subtotal, g.subtotal)
    const buyerNo = [...g.buyerNos].filter(Boolean).join(', ')
    summary.push({ customer: g.party, buyerNo, ...g.subtotal })
    detail.push({
      customer: g.party,
      buyerNo,
      workTypeLabel: g.workTypes.size === 1 ? [...g.workTypes][0] : '',
      lines: g.lines,
      subtotal: g.subtotal,
    })
  }
  return { customerCount: accs.length, summary, subtotal, detail }
}

export function buildCloseout(penWorks: PenWorkFull[], barn: Barn): CloseoutData {
  const sellerGroups = new Map<string, Acc>()
  const buyerGroups = new Map<string, Acc>()
  const holds: HoldLine[] = []

  for (const pw of penWorks) {
    const isBuyer = !!pw.buyer_party_id
    const ownerName = (isBuyer ? pw.buyer?.name : pw.seller?.name) || 'Unassigned'
    const workType = pw.workType?.name || '—'
    const pen = pw.pen?.pen_number || '—'
    const c = penWorkCharges(pw, barn)

    // Holds and ownerless lines never bill — list them on their own.
    if (pw.is_hold || (!pw.buyer_party_id && !pw.seller_party_id)) {
      holds.push({ pen, workType, head: c.headWorked, owner: ownerName })
      continue
    }

    const bucket: CloseoutBuckets = {
      head: c.headWorked,
      vet: c.vetTotal,
      admin: c.adminTotal,
      sol: c.solTotal,
      total: c.lineCharge,
    }
    const line: DetailLine = {
      pen,
      workType,
      head: c.headWorked,
      vetPerHd: pw.frozen_vet_charge ?? pw.workType?.vet_charge ?? 0,
      solPerHd: pw.frozen_sol_charge ?? pw.workType?.sol_charge ?? 0,
      vet: c.vetTotal,
      admin: c.adminTotal,
      sol: c.solTotal,
      lineTotal: c.lineCharge,
    }

    const groups = isBuyer ? buyerGroups : sellerGroups
    const key = (isBuyer ? pw.buyer_party_id : pw.seller_party_id) || `name:${ownerName}`
    const g =
      groups.get(key) ??
      ({ party: ownerName, buyerNos: new Set<string>(), workTypes: new Set<string>(), lines: [], subtotal: zero() } as Acc)
    if (isBuyer) g.buyerNos.add(buyerNumberOf(pw))
    g.workTypes.add(workType)
    g.lines.push(line)
    add(g.subtotal, bucket)
    groups.set(key, g)
  }

  const sellers = buildSide(sellerGroups)
  const buyers = buildSide(buyerGroups)
  const grand = zero()
  add(grand, sellers.subtotal)
  add(grand, buyers.subtotal)

  return { sellers, buyers, holds, grand }
}
