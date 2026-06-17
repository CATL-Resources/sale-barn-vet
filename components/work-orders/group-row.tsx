'use client'

import { colors, ease } from '@/components/ui/tokens'
import { ChevronRightIcon, FlagIcon, PlusIcon } from '@/components/ui/icons'
import { formatUsd } from '@/lib/work-orders/pricing'
import type { AnimalType, Barn, PartyGroup, View, WorkType } from '@/lib/work-orders/types'
import type { PenWorksApi } from '@/lib/work-orders/use-pen-works'
import { PenWorkRow, ROW_GRID, ROW_HEADERS } from './pen-work-row'

export function GroupRow({
  group,
  view,
  isOpen,
  onToggle,
  pwOpen,
  onTogglePw,
  barn,
  workTypes,
  animalTypes,
  api,
  showAddPenWork,
}: {
  group: PartyGroup
  view: View
  isOpen: boolean
  onToggle: () => void
  pwOpen: Set<string>
  onTogglePw: (id: string) => void
  barn: Barn
  workTypes: WorkType[]
  animalTypes: AnimalType[]
  api: PenWorksApi
  showAddPenWork: boolean
}) {
  const under = group.headBrought > 0 && group.headWorked < group.headBrought
  const canAddPenWork = showAddPenWork && !!group.partyId

  return (
    <div style={{ borderTop: `1px solid ${colors.rowDivider}` }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          height: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <ChevronRightIcon
          size={14}
          strokeWidth={2.2}
          style={{
            color: colors.textMuted,
            transition: `transform 180ms ${ease}`,
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>{group.name}</span>

        {group.role === 'buyer' && group.buyerNumber && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                background: colors.gold,
                color: colors.navy,
                fontSize: 11,
                fontWeight: 800,
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              #{group.buyerNumber}
            </span>
            {group.destination && (
              <span style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>
                {group.destination}
                {group.destinationState ? `, ${group.destinationState}` : ''}
              </span>
            )}
          </span>
        )}

        <span style={{ flex: 1 }} />

        {under ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 600,
              color: colors.bronze,
            }}
          >
            <FlagIcon size={14} style={{ color: colors.bronze }} />
            {group.headWorked} of {group.headBrought} head
          </span>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.textMuted }}>
            {group.headWorked} head
          </span>
        )}

        <span
          className="tnum"
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: colors.navy,
            minWidth: 96,
            textAlign: 'right',
          }}
        >
          {formatUsd(group.totalCharge)}
        </span>
      </button>

      {isOpen && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: ROW_GRID[view],
              gap: 8,
              alignItems: 'center',
              height: 30,
              padding: '0 14px',
              background: colors.columnSubheaderBg,
              borderBottom: `1px solid ${colors.rowDivider}`,
            }}
          >
            {ROW_HEADERS[view].map((h, i) => (
              <div
                key={i}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: colors.textPlaceholder,
                  textAlign: h.align,
                }}
              >
                {h.label}
              </div>
            ))}
          </div>

          {group.penWorks.map((pw) => (
            <PenWorkRow
              key={pw.id}
              pw={pw}
              view={view}
              barn={barn}
              isOpen={pwOpen.has(pw.id)}
              onToggleOpen={() => onTogglePw(pw.id)}
              workTypes={workTypes}
              animalTypes={animalTypes}
              api={api}
            />
          ))}

          {canAddPenWork && (
            <button
              type="button"
              onClick={() => api.addPenWork(group.role, group.partyId as string)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                height: 40,
                padding: '0 12px 0 36px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: colors.textMuted,
              }}
            >
              <PlusIcon size={14} style={{ color: colors.textMuted }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Add pen-work</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
