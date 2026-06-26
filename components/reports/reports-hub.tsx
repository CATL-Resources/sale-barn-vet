'use client'

// The Reports hub: one office screen that replaces the separate reports,
// customers, and animals screens. Two shared controls at the top — a scope
// selector and a search box — that every view obeys, then a five-view switcher.
// Only the Animals view is built so far (it reuses the existing Animals report);
// the other four are stubs that later prompts fill in. Read and export only.

import { useEffect, useMemo, useState } from 'react'
import { colors } from '@/components/ui/tokens'
import { createClient } from '@/lib/supabase/client'
import { fetchAnimalRows } from '@/lib/animals/report-data'
import type { AnimalRow } from '@/lib/animals/types'
import { AnimalsReport } from '@/components/animals/animals-report'
import { ScopeSelector } from './scope-selector'
import {
  VIEW_ORDER,
  defaultScope,
  scopeDayIds,
  scopeLabel,
  type BarnLite,
  type ReportScope,
  type ReportView,
  type SaleDayLite,
} from '@/lib/reports/types'

type Named = { id: string; name: string }

export function ReportsHub({
  barn,
  saleDays,
  workTypes,
  animalTypes,
}: {
  barn: BarnLite
  saleDays: SaleDayLite[]
  workTypes: Named[]
  animalTypes: Named[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [scope, setScope] = useState<ReportScope>(() => defaultScope(saleDays))
  const [view, setView] = useState<ReportView>('animals')
  const [search, setSearch] = useState('')

  const dayIds = useMemo(() => scopeDayIds(scope, saleDays), [scope, saleDays])
  const label = scopeLabel(scope, saleDays)
  const dayKey = dayIds.join(',')

  const [rows, setRows] = useState<AnimalRow[]>([])
  const [hasSecondaryEid, setHasSecondaryEid] = useState(false)
  const [loading, setLoading] = useState(true)

  // Pull the animals for the current scope. Read-only; re-runs whenever the scope
  // (the set of sale days) changes. An empty scope simply yields no rows.
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchAnimalRows(supabase, dayIds, workTypes, animalTypes)
      .then((res) => {
        if (!alive) return
        setRows(res.rows)
        setHasSecondaryEid(res.hasSecondaryEid)
      })
      .catch(() => {
        if (alive) {
          setRows([])
          setHasSecondaryEid(false)
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Navy context bar — matches the Work Orders screen. */}
      <div style={{ background: colors.navy, minHeight: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Reports</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: colors.teal }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9D5EA' }}>{barn.name} · {label}</span>
        </span>
      </div>

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 'var(--content-max)', width: '100%', margin: '0 auto' }}>
        {/* Heading */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: colors.navy, letterSpacing: '-0.015em' }}>Reports</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPlaceholder }}>{barn.name} · {label}</span>
        </div>

        {/* Shared controls: scope + search. Every view obeys these. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <ScopeSelector scope={scope} saleDays={saleDays} onChange={setScope} />
          <div style={{ flex: 1, minWidth: 12 }} />
          <div style={{ flex: '1 1 240px', maxWidth: 340, display: 'flex', alignItems: 'center', gap: 8, height: 40, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 9, padding: '0 12px' }}>
            <span aria-hidden style={{ color: colors.textPlaceholder, fontSize: 14 }}>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the current view"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: colors.textPrimary }}
            />
          </div>
        </div>

        {/* View switcher */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: `1px solid ${colors.border}` }}>
          {VIEW_ORDER.map((v) => {
            const on = v.key === view
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                aria-pressed={on}
                style={{ height: 38, padding: '0 14px', borderRadius: '9px 9px 0 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: on ? 800 : 600, background: 'transparent', border: 'none', color: on ? colors.navy : colors.textMuted, borderBottom: on ? `3px solid ${colors.gold}` : '3px solid transparent', marginBottom: -1 }}
              >
                {v.label}
              </button>
            )
          })}
        </div>

        {/* Active view */}
        {loading ? (
          <div style={{ padding: '40px 16px', fontSize: 14, color: colors.textMuted }}>Loading…</div>
        ) : view === 'animals' ? (
          <AnimalsReport
            embedded
            saleDayId=""
            saleDate=""
            barnName={barn.name}
            rows={rows}
            hasSecondaryEid={hasSecondaryEid}
            search={search}
            onSearch={setSearch}
            scopeText={label}
          />
        ) : (
          <StubView label={VIEW_ORDER.find((v) => v.key === view)?.label ?? ''} />
        )}
      </div>
    </div>
  )
}

function StubView({ label }: { label: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 13, padding: '56px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: colors.navy }}>{label}</div>
      <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>This view is coming next. The scope and search above will drive it.</div>
    </div>
  )
}
