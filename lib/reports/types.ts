// Shared types and helpers for the Reports hub. The hub has one scope selector
// and one search box that every view obeys; the scope is a set of sale days the
// report covers.

export type SaleDayLite = { id: string; sale_date: string; status: string }

export type BarnLite = { id: string; name: string }

// The five views in the hub's switcher. Only "animals" is built so far; the rest
// are stubs that later prompts fill in.
export type ReportView = 'billing' | 'sale_summary' | 'customer' | 'animals' | 'customers'

export const VIEW_ORDER: { key: ReportView; label: string }[] = [
  { key: 'billing', label: 'Billing' },
  { key: 'sale_summary', label: 'Animal Sale Summary' },
  { key: 'customer', label: 'Customer Report' },
  { key: 'animals', label: 'Animals' },
  { key: 'customers', label: 'Customers' },
]

// The scope: a single sale day (the default), a date range across sale days, or
// every sale day. Widening from one day to a range or to all is one or two taps
// in the scope selector.
export type ReportScope =
  | { kind: 'day'; dayId: string }
  | { kind: 'range'; fromId: string; toId: string }
  | { kind: 'all' }

export function defaultScope(saleDays: SaleDayLite[]): ReportScope {
  // The current or most recent sale day. saleDays arrive newest-first.
  if (saleDays.length === 0) return { kind: 'all' }
  return { kind: 'day', dayId: saleDays[0].id }
}

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Resolve the scope to the set of sale-day ids it covers, given the full list
// (newest-first). A range is inclusive and order-independent (pick either end
// first). Unknown ids are ignored so a stale selection never throws.
export function scopeDayIds(scope: ReportScope, saleDays: SaleDayLite[]): string[] {
  if (scope.kind === 'all') return saleDays.map((d) => d.id)
  if (scope.kind === 'day') return saleDays.some((d) => d.id === scope.dayId) ? [scope.dayId] : []
  const a = saleDays.find((d) => d.id === scope.fromId)
  const b = saleDays.find((d) => d.id === scope.toId)
  if (!a || !b) return []
  const lo = a.sale_date <= b.sale_date ? a.sale_date : b.sale_date
  const hi = a.sale_date <= b.sale_date ? b.sale_date : a.sale_date
  return saleDays.filter((d) => d.sale_date >= lo && d.sale_date <= hi).map((d) => d.id)
}

// A short human label for the scope, shown in the header and stamped into the
// export's File Info sheet.
export function scopeLabel(scope: ReportScope, saleDays: SaleDayLite[]): string {
  if (scope.kind === 'all') return `All sale days (${saleDays.length})`
  if (scope.kind === 'day') {
    const d = saleDays.find((x) => x.id === scope.dayId)
    return d ? longDate(d.sale_date) : 'No sale day'
  }
  const a = saleDays.find((x) => x.id === scope.fromId)
  const b = saleDays.find((x) => x.id === scope.toId)
  if (!a || !b) return 'Range'
  const lo = a.sale_date <= b.sale_date ? a : b
  const hi = a.sale_date <= b.sale_date ? b : a
  return `${longDate(lo.sale_date)} – ${longDate(hi.sale_date)}`
}
