import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './settings-form'
import type { SettingsData } from './types'

// Reads the signed-in user's barn — always render fresh.
export const dynamic = 'force-dynamic'

const num = (v: unknown): number => (v == null ? 0 : Number(v))
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v))

export default async function SettingsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const [fieldsRes, optionsRes, ageRes, stagesRes, workTypesRes, notesRes, memberRes] = await Promise.all([
    supabase
      .from('barn_field_config')
      .select('id, field_key, display_label, is_displayed, is_required, sort_order, default_value, work_type_id')
      .order('sort_order'),
    supabase
      .from('field_value_option')
      .select('id, field_key, value, label, is_pinned, sort_order, active')
      .order('sort_order'),
    supabase
      .from('age_designation_option')
      .select('id, designation_value, age_label, age_code, age_min_years, age_max_years, sort_order, active')
      .order('sort_order'),
    supabase
      .from('preg_stage_config')
      .select('id, stage_code, display_label, active, sort_order')
      .order('sort_order'),
    supabase
      .from('work_type')
      .select('id, name, vet_charge, sol_charge, includes_preg_check, active')
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('quick_note_definition')
      // Barn-level permanent notes only (day-scoped temporary notes are managed
      // elsewhere). Include inactive ones so the manager can switch them back on.
      // Ordered by sort_priority ascending to match the chute's ordering.
      .select('id, label, scope, active, sort_priority, is_flag')
      .eq('scope', 'permanent')
      .order('sort_priority')
      .order('label'),
    user
      ? supabase.from('barn_member').select('role').eq('user_id', user.id).eq('barn_id', barn.id)
      : Promise.resolve({ data: [] as { role: string }[] }),
  ])

  const isBarnAdmin = (memberRes.data ?? []).some((m) => m.role === 'admin')

  // The field rows come back together: work_type_id null = the barn default
  // list; a set work_type_id = that work type's own list.
  const toField = (f: {
    id: string; field_key: string; display_label: string | null
    is_displayed: boolean; is_required: boolean; sort_order: number; default_value: string | null
  }) => ({
    id: f.id,
    field_key: f.field_key,
    display_label: f.display_label,
    is_displayed: f.is_displayed,
    is_required: f.is_required,
    sort_order: f.sort_order,
    default_value: f.default_value,
  })
  const allFieldRows = fieldsRes.data ?? []
  const workTypeFields: SettingsData['workTypeFields'] = {}
  for (const f of allFieldRows) {
    if (f.work_type_id == null) continue
    ;(workTypeFields[f.work_type_id] ??= []).push(toField(f))
  }

  const data: SettingsData = {
    barn: {
      id: barn.id,
      name: barn.name,
      official_id_type: barn.official_id_type,
      age_numeric_enabled: barn.age_numeric_enabled,
      preg_active_months: barn.preg_active_months ?? [],
      preg_timing_format: barn.preg_timing_format,
      admin_fee_rate: num(barn.admin_fee_rate),
      sales_tax_rate: num(barn.sales_tax_rate),
      special_sol_charge: num(barn.special_sol_charge),
    },
    fields: allFieldRows.filter((f) => f.work_type_id == null).map(toField),
    workTypeFields,
    workTypes: (workTypesRes.data ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      vet_charge: num(w.vet_charge),
      sol_charge: num(w.sol_charge),
      includes_preg_check: w.includes_preg_check,
      active: w.active,
    })),
    options: (optionsRes.data ?? []).map((o) => ({
      id: o.id,
      field_key: o.field_key,
      value: o.value,
      label: o.label,
      is_pinned: o.is_pinned,
      sort_order: o.sort_order,
      active: o.active,
    })),
    pregStages: (stagesRes.data ?? []).map((s) => ({
      id: s.id,
      stage_code: s.stage_code,
      display_label: s.display_label,
      active: s.active,
      sort_order: s.sort_order,
    })),
    ageDesignations: (ageRes.data ?? []).map((a) => ({
      id: a.id,
      designation_value: a.designation_value,
      age_label: a.age_label,
      age_code: a.age_code,
      age_min_years: numOrNull(a.age_min_years),
      age_max_years: numOrNull(a.age_max_years),
      sort_order: a.sort_order,
      active: a.active,
    })),
    quickNotes: (notesRes.data ?? []).map((n) => ({
      id: n.id,
      label: n.label,
      scope: n.scope,
      active: n.active,
      sort_priority: n.sort_priority ?? 0,
      is_flag: n.is_flag,
    })),
  }

  return <SettingsForm data={data} isBarnAdmin={isBarnAdmin} />
}
