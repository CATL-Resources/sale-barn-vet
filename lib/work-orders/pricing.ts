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

const round2 = (n: number) => Math.round(n * 100) / 100

/** The barn rate fields a special charge needs to price + freeze. */
export type SpecialChargeRates = {
  sales_tax_rate: number
  admin_fee_rate: number
  special_sol_charge: number | null
}

/**
 * The DB fields for ONE special charge on a work order, priced like a work-type
 * line and frozen. Single source of truth shared by the save action and the
 * form's live preview, so the previewed customer charge always equals exactly
 * what gets saved and frozen.
 *
 * - perHead is the per-head vet/service fee; tax and the admin fee apply to it.
 * - SOL is the barn standard only (special_sol_charge × head) — not editable
 *   per special.
 * - All money is rounded to the cent, and customer_charge is the sum of the
 *   three rounded totals, so the on-screen breakdown always adds up.
 * - frozen_* captures the rates used, so a later barn-rate edit never moves a
 *   special already entered.
 */
export function buildSpecialChargeFields(perHead: number, head: number, barn: SpecialChargeRates) {
  const taxRate = barn.sales_tax_rate
  const adminRate = barn.admin_fee_rate
  // Round the per-head fees to the cent BEFORE computing, and freeze those same
  // rounded fees — so recomputing from the frozen_* values reproduces the totals
  // exactly (no sub-cent drift between the stored fee and the stored total).
  const vetFee = round2(perHead)
  const solCharge = round2(barn.special_sol_charge ?? 0)
  const c = computePenWorkCharges(vetFee, solCharge, head, taxRate, adminRate)
  const vet_total = round2(c.vetTotal)
  const admin_total = round2(c.adminTotal)
  const sol_total = round2(c.solTotal)
  return {
    frozen_vet_charge: vetFee,
    frozen_sol_charge: solCharge,
    frozen_admin_rate: adminRate,
    frozen_tax_rate: taxRate,
    vet_total,
    admin_total,
    sol_total,
    customer_charge: round2(vet_total + admin_total + sol_total),
  }
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
 * Charges for one pen_work.
 * - FINISHED order: bill from the STORED, frozen totals the database computed at
 *   finish time, so editing the rate card later never moves a finished bill.
 *   (Falls back to computing from the frozen snapshot when the stored totals
 *   aren't loaded yet — e.g. right after marking complete, before the refetch.)
 * - OPEN order: show a LIVE PREVIEW from the current rate card + barn rates.
 *   Nothing is frozen until the order is finished.
 */
export function penWorkCharges(pw: PenWorkFull, barn: Barn) {
  // Bill the office's BILLED count when it's set, otherwise the chute's worked
  // count. head_worked itself is never changed by this. `headWorked` in the
  // return is the head this charge is for (the billed head).
  const head = pw.head_billed ?? pw.head_worked ?? 0

  // A Hold line (un-placeable head parked on the pen) is never billed — $0, but
  // its head stays visible. Every total in the app reads lineCharge through here,
  // so this keeps Hold out of the pen and day totals everywhere.
  if (pw.is_hold) {
    return { vetTotal: 0, adminTotal: 0, solTotal: 0, lineCharge: 0, headWorked: head }
  }

  if (pw.work_complete) {
    // Finished: price from the FROZEN rates so a later rate-card edit never moves
    // a finished bill — but at the BILLED head, so the office's billed count is
    // reflected. The stored vet_total / admin_total / sol_total /
    // total_customer_charge columns are GENERATED from head_worked, so they can't
    // track head_billed and are intentionally not used for the bill here. With
    // head_billed == head_worked this yields exactly those stored values.
    const frozen = computePenWorkCharges(
      pw.frozen_vet_charge ?? 0,
      pw.frozen_sol_charge ?? 0,
      head,
      pw.frozen_tax_rate ?? barn.sales_tax_rate,
      pw.frozen_admin_rate ?? barn.admin_fee_rate,
    )
    return { ...frozen, headWorked: head }
  }

  const vet = pw.workType?.vet_charge ?? 0
  const sol = pw.workType?.sol_charge ?? 0
  const charges = computePenWorkCharges(vet, sol, head, barn.sales_tax_rate, barn.admin_fee_rate)
  return { ...charges, headWorked: head }
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** "$1,234.56" */
export function formatUsd(n: number): string {
  return usd.format(n ?? 0)
}
