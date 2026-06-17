import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SectionCard } from '@/components/ui/section-card'
import { Pill } from '@/components/ui/pill'
import { CaptureFieldRow } from './capture-field-row'

// Reads the signed-in user's barn — always render fresh.
export const dynamic = 'force-dynamic'

// Friendly labels for capture fields whose stored display_label is blank.
const FIELD_LABELS: Record<string, string> = {
  eid: 'EID',
  metal_tag: 'Metal tag',
  back_tag: 'Back tag',
  visual_tag: 'Tag #',
  hide_color: 'Body color',
  age: 'Age',
  breed: 'Breed',
  preg_stage: 'Preg stage',
  preg_timing: 'Month bred',
  fetal_sex: 'Fetal sex',
  quick_notes: 'Quick notes',
  notes: 'Notes',
}

// Swatch colors for the age tag-color list.
const TAG_COLOR_HEX: Record<string, string> = {
  White: '#FFFFFF',
  Yellow: '#F3D12A',
  Green: '#3FA66A',
  Purple: '#6D28D9',
  Blue: '#3B82C4',
  Red: '#E2484A',
  Pink: '#EC4899',
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const ID_TYPE_LABEL: Record<string, string> = {
  EID: 'Official EID',
  METAL: 'Official metal',
  BOTH: 'Either (EID or metal)',
}

function pct(n: number | null | undefined) {
  if (n == null) return '—'
  return `${(n * 100).toFixed(n * 100 % 1 === 0 ? 0 : 1)}%`
}

function money(n: number | null | undefined) {
  if (n == null) return '—'
  return `$${Number(n).toFixed(2)}`
}

function monthLabel(m: string) {
  return /^\d+$/.test(m) ? MONTHS[Number(m) - 1] ?? m : m
}

function ageRange(min: number | null, max: number | null) {
  if (min == null && max == null) return null
  if (min != null && max != null) return min === max ? `${min} yr` : `${min}–${max} yr`
  if (min != null) return `${min}+ yr`
  return `up to ${max} yr`
}

/** Label/value row stack with hairline dividers. */
function Rows({ items }: { items: [string, ReactNode][] }) {
  return (
    <div>
      {items.map(([label, value], i) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            padding: '9px 0',
            borderTop: i === 0 ? 'none' : '1px solid #ECECE8',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#717182' }}>{label}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', textAlign: 'right' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 500, color: '#9A9AA6', lineHeight: 1.4 }}>
      {children}
    </p>
  )
}

function PillWrap({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
}

export default async function SettingsPage() {
  const supabase = createClient()

  const { data: barn } = await supabase.from('barn').select('*').limit(1).maybeSingle()
  if (!barn) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>No barn yet</h2>
        <p style={{ fontSize: 14, color: '#717182', marginTop: 8 }}>
          Your account isn’t tied to a barn, so there are no settings to show.
        </p>
      </div>
    )
  }

  const [fieldsRes, optionsRes, ageRes, stagesRes, workTypesRes, notesRes] = await Promise.all([
    supabase
      .from('barn_field_config')
      .select('id, field_key, display_label, is_displayed, is_required, sort_order')
      .is('work_type_id', null)
      .order('sort_order'),
    supabase
      .from('field_value_option')
      .select('field_key, value, label, is_pinned, sort_order, active')
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('age_designation_option')
      .select('designation_value, age_label, age_code, age_min_years, age_max_years, sort_order')
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('preg_stage_config')
      .select('stage_code, display_label, active, sort_order')
      .order('sort_order'),
    supabase
      .from('work_type')
      .select('name, vet_charge, sol_charge, includes_preg_check, active')
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('quick_note_definition')
      .select('label, scope, active, sort_priority')
      .eq('active', true)
      .order('label'),
  ])

  const fields = fieldsRes.data ?? []
  const options = optionsRes.data ?? []
  const ages = ageRes.data ?? []
  const stages = stagesRes.data ?? []
  const workTypes = workTypesRes.data ?? []
  const notes = notesRes.data ?? []

  const breeds = options.filter((o) => o.field_key === 'breed')
  const bodyColors = options.filter((o) => o.field_key === 'hide_color')

  const shownCount = fields.filter((f) => f.is_displayed).length

  return (
    <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#0E2646' }}>
          Settings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#717182', lineHeight: 1.45 }}>
          Your barn’s setup. The capture screen shows whatever you turn on here, in this order.
        </p>
      </div>

      {/* Barn & identity */}
      <SectionCard title="Barn">
        <Rows
          items={[
            ['Barn name', barn.name],
            ['Official ID that counts', ID_TYPE_LABEL[barn.official_id_type] ?? barn.official_id_type],
            ['Admin fee', pct(barn.admin_fee_rate)],
            ['Sales tax', pct(barn.sales_tax_rate)],
          ]}
        />
      </SectionCard>

      {/* Capture fields — interactive */}
      <SectionCard title={`Capture fields · ${shownCount} on`}>
        <Caption>
          Tap a switch to show or hide that field on the chute screen. Saves right away.
        </Caption>
        <div>
          {fields.map((f, i) => (
            <CaptureFieldRow
              key={f.id}
              id={f.id}
              order={i + 1}
              label={f.display_label || FIELD_LABELS[f.field_key] || f.field_key}
              displayed={f.is_displayed}
            />
          ))}
          {fields.length === 0 ? <Caption>No capture fields set up.</Caption> : null}
        </div>
      </SectionCard>

      {/* Age */}
      <SectionCard title="Age — tag color → age">
        <Caption>
          St. Onge reads age from tag color. Numeric age is{' '}
          <strong>{barn.age_numeric_enabled ? 'on' : 'off'}</strong>.
        </Caption>
        <div>
          {ages.map((a, i) => {
            const range = ageRange(a.age_min_years, a.age_max_years)
            return (
              <div
                key={a.designation_value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #ECECE8',
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: TAG_COLOR_HEX[a.designation_value] ?? '#D4D4D0',
                    boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.12)',
                  }}
                />
                <span style={{ width: 64, fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
                  {a.designation_value}
                </span>
                <span style={{ flex: '1 1 0%', fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                  {a.age_label}
                </span>
                {range ? (
                  <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: '#717182' }}>
                    {range}
                  </span>
                ) : null}
              </div>
            )
          })}
          {ages.length === 0 ? <Caption>No age colors set up.</Caption> : null}
        </div>
      </SectionCard>

      {/* Pregnancy */}
      <SectionCard title="Pregnancy">
        <Rows
          items={[
            ['When-bred format', barn.preg_timing_format === 'calendar_month' ? 'Calendar month' : barn.preg_timing_format],
            [
              'Breeding window',
              (barn.preg_active_months ?? []).length
                ? (barn.preg_active_months as string[]).map(monthLabel).join(', ')
                : '—',
            ],
          ]}
        />
        <div style={{ marginTop: 10 }}>
          <Caption>Pregnancy stages</Caption>
          <PillWrap>
            {stages.map((s) => (
              <Pill key={s.stage_code} selected={s.active}>
                {s.display_label}
              </Pill>
            ))}
            {stages.length === 0 ? <span style={{ fontSize: 13, color: '#9A9AA6' }}>None set up.</span> : null}
          </PillWrap>
        </div>
      </SectionCard>

      {/* Breeds */}
      <SectionCard title="Breed choices">
        <Caption>Pinned show on the main face; the rest sit behind “+ more”.</Caption>
        <PillWrap>
          {breeds.filter((b) => b.is_pinned).map((b) => (
            <Pill key={b.value} selected>{b.label}</Pill>
          ))}
          {breeds.filter((b) => !b.is_pinned).map((b) => (
            <Pill key={b.value}>{b.label}</Pill>
          ))}
          {breeds.length === 0 ? <span style={{ fontSize: 13, color: '#9A9AA6' }}>None set up.</span> : null}
        </PillWrap>
      </SectionCard>

      {/* Body colors */}
      <SectionCard title="Body color choices">
        <Caption>
          Off at St. Onge (Red/Baldy live as quick notes) — but the starter list is here for any
          barn that turns it on.
        </Caption>
        <PillWrap>
          {bodyColors.filter((b) => b.is_pinned).map((b) => (
            <Pill key={b.value} selected>{b.label}</Pill>
          ))}
          {bodyColors.filter((b) => !b.is_pinned).map((b) => (
            <Pill key={b.value}>{b.label}</Pill>
          ))}
          {bodyColors.length === 0 ? <span style={{ fontSize: 13, color: '#9A9AA6' }}>None set up.</span> : null}
        </PillWrap>
      </SectionCard>

      {/* Work types / rate card */}
      <SectionCard title="Work types & rates">
        <Caption>Per-head charges. A preg tag means the preg fields show for that work.</Caption>
        <div>
          {workTypes.map((w, i) => (
            <div
              key={w.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderTop: i === 0 ? 'none' : '1px solid #ECECE8',
                opacity: w.active ? 1 : 0.5,
              }}
            >
              <span style={{ flex: '1 1 0%', fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
                {w.name}
                {w.includes_preg_check ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      color: '#2E9486',
                      background: '#E1F5EE',
                      padding: '2px 6px',
                      borderRadius: 999,
                      verticalAlign: 'middle',
                    }}
                  >
                    PREG
                  </span>
                ) : null}
              </span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
                {money(w.vet_charge)}
              </span>
              <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: '#717182', width: 64, textAlign: 'right' }}>
                SOL {money(w.sol_charge)}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Quick notes */}
      <SectionCard title="Quick notes">
        <Caption>The tap labels at the chute. Most-used float up with use; a few can be pinned.</Caption>
        <PillWrap>
          {notes.map((n) => (
            <Pill key={n.label} selected={(n.sort_priority ?? 0) > 0}>
              {n.label}
            </Pill>
          ))}
          {notes.length === 0 ? <span style={{ fontSize: 13, color: '#9A9AA6' }}>None set up.</span> : null}
        </PillWrap>
      </SectionCard>
    </div>
  )
}
