'use client'

import { useState } from 'react'
import { colors, ease } from '@/components/ui/tokens'
import { ChevronRightIcon, CheckIcon } from '@/components/ui/icons'
import { penWorkCharges, formatUsd } from '@/lib/work-orders/pricing'
import type { AnimalType, Barn, PenWorkFull, View, WorkType } from '@/lib/work-orders/types'
import type { PenWorksApi, StatusField } from '@/lib/work-orders/use-pen-works'
import { PenWorkDetail } from './pen-work-detail'

export const ROW_GRID: Record<View, string> = {
  owner: '22px 84px 176px 152px 70px 116px 1fr',
  pen: '22px 158px 176px 152px 70px 116px 1fr',
  type: '22px 158px 84px 176px 70px 116px 1fr',
}

type Header = { label: string; align: 'left' | 'right' | 'center' }
export const ROW_HEADERS: Record<View, Header[]> = {
  owner: [
    { label: '', align: 'left' },
    { label: 'PEN', align: 'left' },
    { label: 'WORK TYPE', align: 'left' },
    { label: 'ANIMAL TYPE', align: 'left' },
    { label: 'HEAD', align: 'right' },
    { label: 'CHARGE', align: 'right' },
    { label: 'STATUS', align: 'center' },
  ],
  pen: [
    { label: '', align: 'left' },
    { label: 'OWNER', align: 'left' },
    { label: 'WORK TYPE', align: 'left' },
    { label: 'ANIMAL TYPE', align: 'left' },
    { label: 'HEAD', align: 'right' },
    { label: 'CHARGE', align: 'right' },
    { label: 'STATUS', align: 'center' },
  ],
  type: [
    { label: '', align: 'left' },
    { label: 'OWNER', align: 'left' },
    { label: 'PEN', align: 'left' },
    { label: 'WORK TYPE', align: 'left' },
    { label: 'HEAD', align: 'right' },
    { label: 'CHARGE', align: 'right' },
    { label: 'STATUS', align: 'center' },
  ],
}

function toIntOrNull(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

const fieldBase: React.CSSProperties = {
  height: 32,
  width: '100%',
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: '0 9px',
  fontSize: 13,
  fontFamily: 'inherit',
  background: colors.white,
  color: colors.textPrimary,
}

function StatusDot({ complete, onClick }: { complete: boolean; onClick: () => void }) {
  if (complete) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Complete — click to undo"
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: colors.tealPillBg,
          border: `1px solid ${colors.teal}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <CheckIcon size={10} style={{ color: colors.tealDeep }} />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Incomplete — click to complete"
      style={{
        width: 11,
        height: 11,
        borderRadius: 999,
        background: colors.warning,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    />
  )
}

export function PenWorkRow({
  pw,
  view,
  barn,
  isOpen,
  onToggleOpen,
  workTypes,
  animalTypes,
  api,
}: {
  pw: PenWorkFull
  view: View
  barn: Barn
  isOpen: boolean
  onToggleOpen: () => void
  workTypes: WorkType[]
  animalTypes: AnimalType[]
  api: PenWorksApi
}) {
  const [penText, setPenText] = useState(pw.pen?.pen_number ?? '')
  const [headText, setHeadText] = useState(pw.head_worked == null ? '' : String(pw.head_worked))

  const isBuyer = pw.buyer_party_id != null
  const hasWorkType = pw.work_type_id != null

  const expander = (
    <button
      type="button"
      onClick={onToggleOpen}
      aria-label={isOpen ? 'Collapse' : 'Expand'}
      style={{
        width: 22,
        height: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <ChevronRightIcon
        size={12}
        strokeWidth={2.4}
        style={{
          color: colors.textPlaceholder,
          transition: `transform 180ms ${ease}`,
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
      />
    </button>
  )

  const ownerCell = (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: colors.textPrimary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {pw.buyer?.name ?? pw.seller?.name ?? '—'}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: isBuyer ? colors.buyerRole : colors.navy }}>
        {isBuyer ? `Buyer #${pw.buyer_number_text ?? pw.buyerNumber?.number ?? '—'}` : 'Seller'}
      </div>
    </div>
  )

  const penCell = (
    <input
      value={penText}
      onChange={(e) => setPenText(e.target.value)}
      onBlur={() => {
        if ((pw.pen?.pen_number ?? '') !== penText.trim()) api.savePen(pw.id, penText)
      }}
      placeholder="Pen"
      style={fieldBase}
    />
  )

  const workTypeCell = (
    <select
      value={pw.work_type_id ?? ''}
      onChange={(e) => api.saveWorkType(pw.id, e.target.value)}
      style={{ ...fieldBase, color: hasWorkType ? colors.textPrimary : colors.textPlaceholder }}
    >
      <option value="" disabled>
        Choose…
      </option>
      {workTypes.map((w) => (
        <option key={w.id} value={w.id} style={{ color: colors.textPrimary }}>
          {w.name}
        </option>
      ))}
    </select>
  )

  const animalTypeCell = (
    <select
      value={pw.animal_type_id ?? ''}
      onChange={(e) => api.saveAnimalType(pw.id, e.target.value)}
      style={{ ...fieldBase, color: pw.animal_type_id ? colors.textPrimary : colors.textPlaceholder }}
    >
      <option value="" disabled>
        Type…
      </option>
      {animalTypes.map((a) => (
        <option key={a.id} value={a.id} style={{ color: colors.textPrimary }}>
          {a.name}
        </option>
      ))}
    </select>
  )

  const headCell = (
    <input
      inputMode="numeric"
      value={headText}
      onChange={(e) => setHeadText(e.target.value)}
      onBlur={() => api.saveHeadWorked(pw.id, toIntOrNull(headText))}
      className="tnum"
      style={{ ...fieldBase, textAlign: 'right' }}
    />
  )

  const chargeCell = (
    <div
      className="tnum"
      style={{
        textAlign: 'right',
        fontSize: 14,
        fontWeight: 800,
        color: hasWorkType ? colors.navy : colors.textFaint,
      }}
    >
      {hasWorkType ? formatUsd(penWorkCharges(pw, barn).lineCharge) : '—'}
    </div>
  )

  const statusCell = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <StatusDot complete={pw.work_complete} onClick={() => api.toggleStatus(pw.id, 'work_complete' as StatusField)} />
      <StatusDot
        complete={pw.health_complete}
        onClick={() => api.toggleStatus(pw.id, 'health_complete' as StatusField)}
      />
    </div>
  )

  const cells =
    view === 'owner'
      ? [expander, penCell, workTypeCell, animalTypeCell, headCell, chargeCell, statusCell]
      : view === 'pen'
        ? [expander, ownerCell, workTypeCell, animalTypeCell, headCell, chargeCell, statusCell]
        : [expander, ownerCell, penCell, workTypeCell, headCell, chargeCell, statusCell]

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: ROW_GRID[view],
          gap: 8,
          alignItems: 'center',
          minHeight: 44,
          padding: '0 14px',
          borderBottom: `1px solid ${colors.rowDivider}`,
        }}
      >
        {cells.map((cell, i) => (
          <div key={i} style={{ minWidth: 0 }}>
            {cell}
          </div>
        ))}
      </div>
      {isOpen && (
        <PenWorkDetail
          pw={pw}
          barn={barn}
          onCommitCount={(field, value) => api.saveCountDetail(pw.id, field, value)}
        />
      )}
    </>
  )
}
