// Shared shapes for the Settings editor. Used by the server page (which reads
// the rows), the client form (which edits them), and the save action (which
// writes them back). Column names match the database exactly.

export type BarnSettings = {
  id: string
  name: string
  official_id_type: string // 'EID' | 'METAL' | 'BOTH'
  age_numeric_enabled: boolean
  preg_active_months: string[] // full month names, e.g. 'September'
  preg_timing_format: string // shown read-only (capture depends on it)
  admin_fee_rate: number // stored as a fraction, e.g. 0.05 = 5%
  sales_tax_rate: number
}

export type FieldConfig = {
  id: string
  field_key: string
  display_label: string | null
  is_displayed: boolean
  is_required: boolean
  sort_order: number
  default_value: string | null
}

export type WorkType = {
  id: string
  name: string
  vet_charge: number
  sol_charge: number
  includes_preg_check: boolean
  active: boolean
}

export type FieldOption = {
  id: string // a temporary id starting with 'new:' marks an unsaved row
  field_key: string
  value: string
  label: string
  is_pinned: boolean
  sort_order: number
  active: boolean
}

export type PregStage = {
  id: string
  stage_code: string
  display_label: string
  active: boolean
  sort_order: number
}

export type AgeDesignation = {
  id: string // 'new:' prefix marks an unsaved row
  designation_value: string
  age_label: string
  age_code: string
  age_min_years: number | null
  age_max_years: number | null
  sort_order: number
  active: boolean
}

export type QuickNote = {
  label: string
  scope: string
  active: boolean
  sort_priority: number | null
}

// Everything the page hands to the form.
export type SettingsData = {
  barn: BarnSettings
  fields: FieldConfig[]
  workTypes: WorkType[]
  options: FieldOption[]
  pregStages: PregStage[]
  ageDesignations: AgeDesignation[]
  quickNotes: QuickNote[]
}

// Only the rows that actually changed get sent on Save. Inserts (new options /
// age rows) carry no id; everything else is matched by id.
export type SavePayload = {
  barn?: { id: string } & Partial<Omit<BarnSettings, 'id' | 'preg_timing_format'>>
  fields: Array<Pick<FieldConfig, 'id' | 'is_displayed' | 'is_required' | 'sort_order' | 'default_value'>>
  workTypes: Array<Pick<WorkType, 'id' | 'includes_preg_check' | 'vet_charge' | 'sol_charge' | 'active'>>
  options: Array<Pick<FieldOption, 'id' | 'label' | 'is_pinned' | 'active' | 'sort_order'>>
  newOptions: Array<Pick<FieldOption, 'field_key' | 'value' | 'label' | 'is_pinned' | 'sort_order'>>
  pregStages: Array<Pick<PregStage, 'id' | 'display_label' | 'active' | 'sort_order'>>
  ageDesignations: Array<
    Pick<
      AgeDesignation,
      'id' | 'designation_value' | 'age_label' | 'age_code' | 'age_min_years' | 'age_max_years' | 'sort_order' | 'active'
    >
  >
  newAgeDesignations: Array<
    Pick<
      AgeDesignation,
      'designation_value' | 'age_label' | 'age_code' | 'age_min_years' | 'age_max_years' | 'sort_order'
    >
  >
}
