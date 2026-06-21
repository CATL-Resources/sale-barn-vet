import type { Tables } from '@/types/supabase'

export type Barn = Tables<'barn'>
export type FieldConfig = Tables<'barn_field_config'>
export type FieldValueOption = Tables<'field_value_option'>
export type AgeOption = Tables<'age_designation_option'>
export type PregStage = Tables<'preg_stage_config'>
export type QuickNote = Tables<'quick_note_definition'>
export type WorkType = Tables<'work_type'>
export type AnimalType = Tables<'animal_type'>
export type Party = Tables<'party'>
export type Pen = Tables<'pen'>
export type SaleDay = Tables<'sale_day'>

/** Everything the capture screen needs, loaded once on the server. */
export type CaptureBootstrap = {
  barn: Barn
  fields: FieldConfig[]
  breedOptions: FieldValueOption[]
  colorOptions: FieldValueOption[]
  ageOptions: AgeOption[]
  pregStages: PregStage[]
  quickNotes: QuickNote[]
  workTypes: WorkType[]
  animalTypes: AnimalType[]
  parties: Party[]
  saleDays: SaleDay[]
  pens: Pen[]
  todaySaleDayId: string | null
  today: string
}

/** A live batch — one pen_work row the chute is filling. */
export type BatchInfo = {
  penWorkId: string
  saleDayId: string
  penId: string | null
  penNumber: string | null
  workTypeId: string
  workTypeName: string
  includesPregCheck: boolean
  sellerPartyId: string
  sellerName: string
  animalTypeId: string | null
  headStarted: number | null
  // The office's expected head, carried so Capture can freeze head_started from
  // it on the first animal when the office order never set a started count.
  headExpected: number | null
}

/** A shared, all-day sort pen and its running count across every batch. */
export type SortPen = { id: string; pen_number: string; count: number }

/** The form for the one animal currently in the chute. */
export type AnimalDraft = {
  eid: string
  eid2: string
  backTag: string
  visualTag: string
  metalTag: string
  color: string | null
  breed: string | null
  ageDesignation: string | null
  pregStatus: string | null
  pregTiming: string | null
  fetalSex: string | null
  quickNotes: string[]
  notes: string
  sortPenId: string | null
}

export const emptyDraft = (): AnimalDraft => ({
  eid: '',
  eid2: '',
  backTag: '',
  visualTag: '',
  metalTag: '',
  color: null,
  breed: null,
  ageDesignation: null,
  pregStatus: null,
  pregTiming: null,
  fetalSex: null,
  quickNotes: [],
  notes: '',
  sortPenId: null,
})

// Stage codes that mean "bred" — Month bred shows only for these.
const NON_BRED = new Set(['OPEN', 'NOT_CHECKED'])
export function isBredStage(stageCode: string | null): boolean {
  return !!stageCode && !NON_BRED.has(stageCode)
}
