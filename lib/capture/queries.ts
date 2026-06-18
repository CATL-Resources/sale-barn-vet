import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { CaptureBootstrap } from './types'

type Client = SupabaseClient<Database>

/** Load the barn config + every reference list the capture screen renders from. */
export async function fetchCaptureBootstrap(supabase: Client): Promise<CaptureBootstrap | null> {
  const { data: barn } = await supabase.from('barn').select('*').limit(1).maybeSingle()
  if (!barn) return null

  const [fields, fieldOptions, ageOptions, pregStages, quickNotes, workTypes, animalTypes, parties, saleDays, pens] =
    await Promise.all([
      supabase.from('barn_field_config').select('*').eq('barn_id', barn.id).order('sort_order'),
      supabase
        .from('field_value_option')
        .select('*')
        .eq('barn_id', barn.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('age_designation_option')
        .select('*')
        .eq('barn_id', barn.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('preg_stage_config')
        .select('*')
        .eq('barn_id', barn.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('quick_note_definition')
        .select('*')
        .eq('barn_id', barn.id)
        .eq('active', true)
        .order('sort_priority'),
      supabase
        .from('work_type')
        .select('*')
        .eq('barn_id', barn.id)
        .eq('active', true)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('animal_type')
        .select('*')
        .eq('barn_id', barn.id)
        .eq('active', true)
        .is('deleted_at', null)
        .order('name'),
      supabase.from('party').select('*').eq('barn_id', barn.id).is('deleted_at', null).order('name'),
      supabase
        .from('sale_day')
        .select('*')
        .eq('barn_id', barn.id)
        .is('deleted_at', null)
        .order('sale_date', { ascending: false })
        .limit(30),
      supabase.from('pen').select('*').eq('barn_id', barn.id).is('deleted_at', null).order('pen_number'),
    ])

  const today = new Date().toISOString().slice(0, 10)
  const days = saleDays.data ?? []
  const todaySaleDay = days.find((d) => d.sale_date === today) ?? null
  const opts = fieldOptions.data ?? []

  return {
    barn,
    fields: fields.data ?? [],
    breedOptions: opts.filter((o) => o.field_key === 'breed'),
    colorOptions: opts.filter((o) => o.field_key === 'hide_color'),
    ageOptions: ageOptions.data ?? [],
    pregStages: pregStages.data ?? [],
    quickNotes: quickNotes.data ?? [],
    workTypes: workTypes.data ?? [],
    animalTypes: animalTypes.data ?? [],
    parties: parties.data ?? [],
    saleDays: days,
    pens: pens.data ?? [],
    todaySaleDayId: todaySaleDay?.id ?? null,
    today,
  }
}
