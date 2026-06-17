import type { Barn } from './types'
import type { PenWorkFull } from './types'

/**
 * Matches the generated-column formulas on pen_work exactly (see the
 * pen_and_pen_work migration). taxRate = barn.sales_tax_rate (e.g. 0.042),
 * adminRate = barn.admin_fee_rate (e.g. 0.05).
 *
 * vet_total            = vet * head * (1 + tax)
 * admin_total          = vet_total * adminRate
 * sol_total            = sol * head
 * total_customer_charge = vet_total + admin_total + sol_total
 */
export function computePenWorkCharges(
  vetCharge: number,
  solCharge: number,
  headWorked: number,
  taxRate: number,
  adminRate: number,
) {
  const vetTotal = vetCharge * headWorked * (1 + taxRate)
  const adminTotal = vetTotal * adminRate
  const solTotal = solCharge * headWorked
  const lineCharge = vetTotal + adminTotal + solTotal
  return { vetTotal, adminTotal, solTotal, lineCharge }
}

export function sumRollup(
  charges: Array<{
    vetTotal: number
    adminTotal: number
    solTotal: number
    lineCharge: number
    headWorked: number
  }>,
) {
  return charges.reduce(
    (acc, c) => ({
      vetTotal: acc.vetTotal + (c.vetTotal ?? 0),
      adminTotal: acc.adminTotal + (c.adminTotal ?? 0),
      solTotal: acc.solTotal + (c.solTotal ?? 0),
      lineCharge: acc.lineCharge + (c.lineCharge ?? 0),
      headWorked: acc.headWorked + (c.headWorked ?? 0),
    }),
    { vetTotal: 0, adminTotal: 0, solTotal: 0, lineCharge: 0, headWorked: 0 },
  )
}

/** True once a pen_work has a work type chosen (and therefore a billable rate). */
export function hasRate(pw: PenWorkFull): boolean {
  return pw.work_type_id != null
}

/**
 * Charges for one pen_work. Uses the FROZEN rate snapshot when present (saved
 * rows); falls back to the live work_type rate + barn rates for a draft row
 * the user is still editing before it persists.
 */
export function penWorkCharges(pw: PenWorkFull, barn: Barn) {
  const head = pw.head_worked ?? 0
  const vet = pw.frozen_vet_charge ?? pw.workType?.vet_charge ?? 0
  const sol = pw.frozen_sol_charge ?? pw.workType?.sol_charge ?? 0
  const tax = pw.frozen_tax_rate ?? barn.sales_tax_rate
  const admin = pw.frozen_admin_rate ?? barn.admin_fee_rate
  const charges = computePenWorkCharges(vet, sol, head, tax, admin)
  return { ...charges, headWorked: head }
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** "$1,234.56" */
export function formatUsd(n: number): string {
  return usd.format(n ?? 0)
}
