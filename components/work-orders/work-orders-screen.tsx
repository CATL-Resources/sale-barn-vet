'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { colors } from '@/components/ui/tokens'
import { PlusIcon } from '@/components/ui/icons'
import { usePenWorks } from '@/lib/work-orders/use-pen-works'
import { groupPenWorks } from '@/lib/work-orders/grouping'
import type { PartyGroup, Role, View, WorkOrdersPageData } from '@/lib/work-orders/types'
import { ReconciliationBar } from './reconciliation-bar'
import { Toolbar } from './toolbar'
import { GroupRow } from './group-row'
import { SpecialChargesCard } from './special-charges-card'
import { AddPartyModal } from './add-party-modal'

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toggleInSet(set: Set<string>, key: string): Set<string> {
  const next = new Set(set)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

function Section({ title, footer, children }: { title: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: colors.cardHeader, padding: '9px 14px 10px', borderBottom: `1px solid ${colors.cardHeaderBorder}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.navy }}>{title}</div>
        <div style={{ width: 26, height: 3, borderRadius: 2, background: colors.gold, marginTop: 5 }} />
      </div>
      {children}
      {footer}
    </section>
  )
}

function FooterAdd({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        height: 46,
        padding: '0 14px',
        borderTop: `1px solid ${colors.rowDivider}`,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: colors.textMuted,
      }}
    >
      <PlusIcon size={16} style={{ color: colors.textMuted }} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
    </button>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <div style={{ padding: '16px 14px', fontSize: 13, color: colors.textMuted }}>{text}</div>
}

export function WorkOrdersScreen({
  pageData,
  saleDayId,
}: {
  pageData: WorkOrdersPageData
  saleDayId: string
}) {
  const api = usePenWorks(pageData, saleDayId)
  const { penWorks, specialCharges, isLoading, error } = api
  const { barn, saleDay } = pageData

  const [view, setView] = useState<View>('owner')
  const [search, setSearch] = useState('')
  const [buyerNumber, setBuyerNumber] = useState('')
  const [reconOpen, setReconOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState<Set<string>>(new Set())
  const [pwOpen, setPwOpen] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<Role | null>(null)

  const grouped = useMemo(() => groupPenWorks(penWorks, view, barn), [penWorks, view, barn])

  const q = search.trim().toLowerCase()
  const bq = buyerNumber.trim().toLowerCase()
  const matches = useMemo(() => {
    return (g: PartyGroup) => {
      const passSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.penWorks.some((pw) => (pw.buyer?.name ?? pw.seller?.name ?? '').toLowerCase().includes(q))
      const passBuyer =
        !bq ||
        g.penWorks.some((pw) => (pw.buyer_number_text ?? pw.buyerNumber?.number ?? '').toLowerCase().includes(bq))
      return passSearch && passBuyer
    }
  }, [q, bq])

  const sellerGroups = grouped.sellerGroups.filter(matches)
  const buyerGroups = grouped.buyerGroups.filter(matches)
  const typeGroups = grouped.typeGroups.filter(matches)

  const toggleGroup = (key: string) => setGroupOpen((prev) => toggleInSet(prev, key))
  const togglePw = (id: string) => setPwOpen((prev) => toggleInSet(prev, id))

  const partyOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const pw of penWorks) {
      if (pw.seller_party_id && pw.seller?.name) map.set(pw.seller_party_id, pw.seller.name)
      if (pw.buyer_party_id && pw.buyer?.name) map.set(pw.buyer_party_id, pw.buyer.name)
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [penWorks])

  const countLabel = useMemo(() => {
    const total = penWorks.length
    if (view === 'owner')
      return `${sellerGroups.length} consignors · ${buyerGroups.length} buyers · ${total} pen-works`
    if (view === 'pen') return `${sellerGroups.length + buyerGroups.length} pens · ${total} pen-works`
    return `${typeGroups.length} types · ${total} pen-works`
  }, [view, sellerGroups.length, buyerGroups.length, typeGroups.length, penWorks.length])

  function renderGroups(groups: PartyGroup[], emptyText: string) {
    if (groups.length === 0) return <EmptyHint text={emptyText} />
    return groups.map((g) => (
      <GroupRow
        key={g.key}
        group={g}
        view={view}
        isOpen={groupOpen.has(g.key)}
        onToggle={() => toggleGroup(g.key)}
        pwOpen={pwOpen}
        onTogglePw={togglePw}
        barn={barn}
        workTypes={pageData.workTypes}
        animalTypes={pageData.animalTypes}
        api={api}
        showAddPenWork={view === 'owner'}
      />
    ))
  }

  return (
    <>
      {/* Screen context strip (below the shared header) */}
      <div
        style={{
          background: colors.navy,
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>Work orders</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: colors.teal, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.teal }}>
              {barn.name} · {longDate(saleDay.sale_date)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModal('seller')}
          style={{
            height: 38,
            padding: '0 16px',
            borderRadius: 999,
            background: colors.gold,
            border: 'none',
            color: colors.navy,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <PlusIcon size={16} style={{ color: colors.navy }} /> Consignor
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ReconciliationBar
          penWorks={penWorks}
          specialCharges={specialCharges}
          barn={barn}
          open={reconOpen}
          onToggle={() => setReconOpen((o) => !o)}
        />

        <Toolbar
          view={view}
          onView={setView}
          search={search}
          onSearch={setSearch}
          buyerNumber={buyerNumber}
          onBuyerNumber={setBuyerNumber}
          countLabel={countLabel}
        />

        {isLoading ? (
          <div style={{ padding: '32px 14px', fontSize: 14, color: colors.textMuted }}>Loading work orders…</div>
        ) : view === 'type' ? (
          <Section
            title="By cattle type"
            footer={
              <>
                <FooterAdd label="+ Consignor" onClick={() => setModal('seller')} />
                <FooterAdd label="+ Buyer" onClick={() => setModal('buyer')} />
              </>
            }
          >
            {renderGroups(typeGroups, 'No pen-works yet.')}
          </Section>
        ) : (
          <>
            <Section
              title={view === 'pen' ? 'Sellers — pens (pre-sale)' : 'Sellers (pre-sale)'}
              footer={<FooterAdd label="+ Consignor" onClick={() => setModal('seller')} />}
            >
              {renderGroups(sellerGroups, 'No consignors yet.')}
            </Section>
            <Section
              title={view === 'pen' ? 'Buyers — pens (post-sale)' : 'Buyers (post-sale)'}
              footer={<FooterAdd label="+ Buyer" onClick={() => setModal('buyer')} />}
            >
              {renderGroups(buyerGroups, 'No buyers yet.')}
            </Section>
          </>
        )}

        <SpecialChargesCard
          specialCharges={specialCharges}
          partyOptions={partyOptions}
          rates={{ taxRate: barn.sales_tax_rate, adminRate: barn.admin_fee_rate, solCharge: barn.special_sol_charge ?? 0 }}
          onAdd={api.addSpecialCharge}
          onDelete={api.deleteSpecialCharge}
        />
      </div>

      {error && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: colors.danger,
            color: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(14,38,70,0.25)',
          }}
        >
          {error}
        </div>
      )}

      {modal && (
        <AddPartyModal
          role={modal}
          onClose={() => setModal(null)}
          onConsignor={api.createConsignor}
          onBuyer={api.createBuyer}
        />
      )}
    </>
  )
}
