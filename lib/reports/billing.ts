// The per-line billing buckets, derived once from the canonical money function
// so the Billing view and the per-customer drill-down show the same numbers.
// Vet is the pre-tax vet figure; Sales Tax is the remainder baked into vetTotal.
// A hold line bills zero with its head still visible — penWorkCharges handles it.

import { penWorkCharges } from '@/lib/work-orders/pricing'
import type { Barn, PenWorkFull } from '@/lib/work-orders/types'

export type LineBuckets = {
  head: number
  vet: number // pre-tax vet
  tax: number // sales tax
  admin: number
  sol: number
  subtotal: number // pre-tax vet + admin + sol
  total: number // lineCharge
  charge: ReturnType<typeof penWorkCharges> // for sumRollup
}

export function lineBuckets(pw: PenWorkFull, barn: Barn): LineBuckets {
  const c = penWorkCharges(pw, barn) // { vetTotal, adminTotal, solTotal, lineCharge, headWorked }
  const taxRate = pw.frozen_tax_rate ?? barn.sales_tax_rate
  const preTaxVet = taxRate ? c.vetTotal / (1 + taxRate) : c.vetTotal
  const salesTax = c.vetTotal - preTaxVet
  return {
    head: c.headWorked,
    vet: preTaxVet,
    tax: salesTax,
    admin: c.adminTotal,
    sol: c.solTotal,
    subtotal: preTaxVet + c.adminTotal + c.solTotal,
    total: c.lineCharge,
    charge: c,
  }
}

// Whoever a work order bills: the buyer on a post-sale line, else the seller.
export function billedParty(pw: PenWorkFull): { id: string | null; name: string } {
  const isBuyer = !!pw.buyer_party_id
  const id = isBuyer ? pw.buyer_party_id : pw.seller_party_id
  const name = (isBuyer ? pw.buyer?.name : pw.seller?.name) || 'Unassigned'
  return { id, name }
}
