'use client'

import { colors, navyGradient, ease } from '@/components/ui/tokens'
import { ChevronDownIcon } from '@/components/ui/icons'
import { penWorkCharges, sumRollup, formatUsd } from '@/lib/work-orders/pricing'
import type { Barn, PenWorkFull, SpecialChargeFull } from '@/lib/work-orders/types'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: colors.navySubText }}>{label}</span>
      <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
        {value}
      </span>
    </div>
  )
}

function Column({
  eyebrow,
  eyebrowColor = colors.navySubText,
  total,
  totalSize = 22,
  caption,
  rollup,
  open,
}: {
  eyebrow: string
  eyebrowColor?: string
  total: string
  totalSize?: number
  caption: string
  rollup: { vetTotal: number; adminTotal: number; solTotal: number; headWorked: number }
  open: boolean
}) {
  return (
    <>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.07em',
          color: eyebrowColor,
        }}
      >
        {eyebrow}
      </div>
      <div
        className="tnum"
        style={{
          fontSize: totalSize,
          fontWeight: 800,
          color: colors.gold,
          letterSpacing: totalSize >= 30 ? '-0.015em' : undefined,
          margin: '2px 0 1px',
        }}
      >
        {total}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: colors.navySubText }}>{caption}</div>
      <div style={{ display: 'flex', gap: 18, marginTop: 9 }}>
        {open && (
          <>
            <Stat label="Vet" value={formatUsd(rollup.vetTotal)} />
            <Stat label="Admin" value={formatUsd(rollup.adminTotal)} />
            <Stat label="SOL" value={formatUsd(rollup.solTotal)} />
          </>
        )}
        <Stat label="Head" value={String(rollup.headWorked)} />
      </div>
    </>
  )
}

const divider = (
  <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.12)', margin: '0 18px' }} />
)

export function ReconciliationBar({
  penWorks,
  specialCharges,
  barn,
  open,
  onToggle,
}: {
  penWorks: PenWorkFull[]
  specialCharges: SpecialChargeFull[]
  barn: Barn
  open: boolean
  onToggle: () => void
}) {
  const sellerRollup = sumRollup(
    penWorks.filter((p) => p.buyer_party_id == null).map((p) => penWorkCharges(p, barn)),
  )
  const buyerRollup = sumRollup(
    penWorks.filter((p) => p.buyer_party_id != null).map((p) => penWorkCharges(p, barn)),
  )
  const specialTotal = specialCharges.reduce((a, s) => a + (s.customer_charge ?? 0), 0)
  const linesTotal = sellerRollup.lineCharge + buyerRollup.lineCharge
  const dayTotal = linesTotal + specialTotal

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'relative',
        width: '100%',
        textAlign: 'left',
        background: navyGradient,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        borderRadius: 13,
        padding: '14px 18px',
        cursor: 'pointer',
        color: '#FFFFFF',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Column
            eyebrow="SELLERS"
            total={formatUsd(sellerRollup.lineCharge)}
            caption="Total customer charge"
            rollup={sellerRollup}
            open={open}
          />
        </div>
        {divider}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Column
            eyebrow="BUYERS"
            total={formatUsd(buyerRollup.lineCharge)}
            caption="Total customer charge"
            rollup={buyerRollup}
            open={open}
          />
        </div>
        {divider}
        <div style={{ width: 268, flexShrink: 0 }}>
          <Column
            eyebrow="DAY TOTAL"
            eyebrowColor={colors.gold}
            total={formatUsd(dayTotal)}
            totalSize={30}
            caption={`Lines ${formatUsd(linesTotal)} · special +${formatUsd(specialTotal)}`}
            rollup={{
              vetTotal: sellerRollup.vetTotal + buyerRollup.vetTotal,
              adminTotal: sellerRollup.adminTotal + buyerRollup.adminTotal,
              solTotal: sellerRollup.solTotal + buyerRollup.solTotal,
              headWorked: sellerRollup.headWorked + buyerRollup.headWorked,
            }}
            open={open}
          />
        </div>
      </div>

      <span
        style={{
          position: 'absolute',
          top: 13,
          right: 16,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: colors.navySubText }}>
          Breakdown
        </span>
        <ChevronDownIcon
          size={13}
          strokeWidth={2.2}
          style={{
            color: colors.navySubText,
            transition: `transform 180ms ${ease}`,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </span>
    </button>
  )
}
