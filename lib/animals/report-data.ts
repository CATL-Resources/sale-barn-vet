import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { AnimalRow } from './types'

type Client = SupabaseClient<Database>
type Named = { id: string; name: string }

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

// Every animal worked in the sale day, flattened to report rows. Read-only and
// RLS-scoped to the barn. Tags come from the identifier table (pivoted to
// columns); seller / buyer / buyer # / work type come from the animal's
// pen_work; the sort pen is the animal's current_pen_id (or the worked pen text
// when it was never sorted), so every animal has an effective pen.
export async function fetchAnimalRows(
  supabase: Client,
  // One sale day (the standalone Animals page) or several (the Reports hub scope
  // — a single day, a date range, or all days). An empty list yields no rows.
  saleDayId: string | string[],
  workTypes: Named[],
  animalTypes: Named[],
): Promise<{ rows: AnimalRow[]; hasSecondaryEid: boolean }> {
  const saleDayIds = Array.isArray(saleDayId) ? saleDayId : [saleDayId]
  if (saleDayIds.length === 0) return { rows: [], hasSecondaryEid: false }
  const { data: animals } = await supabase
    .from('animal')
    .select(
      'id, pen_work_id, animal_type_id, breed, color, age_value, age_designation, preg_status, preg_timing, fetal_sex, quick_notes, notes, pen, current_pen_id, created_at',
    )
    .in('sale_day_id', saleDayIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const list = animals ?? []
  if (list.length === 0) return { rows: [], hasSecondaryEid: false }

  const animalIds = list.map((a) => a.id)

  // Tags, pivoted by type.
  type Tags = { eid: string; backTag: string; visualTag: string; metalTag: string; secondaryEid: string }
  const emptyTags = (): Tags => ({ eid: '', backTag: '', visualTag: '', metalTag: '', secondaryEid: '' })
  const tagsByAnimal = new Map<string, Tags>()
  {
    const { data: idents } = await supabase
      .from('identifier')
      .select('animal_id, type, value')
      .in('animal_id', animalIds)
      .is('deleted_at', null)
    for (const it of idents ?? []) {
      if (!it.animal_id) continue
      const cur = tagsByAnimal.get(it.animal_id) ?? emptyTags()
      const v = str(it.value)
      if (it.type === 'eid') cur.eid = v
      else if (it.type === 'secondary_eid') cur.secondaryEid = v
      else if (it.type === 'back_tag') cur.backTag = v
      else if (it.type === 'visual_tag') cur.visualTag = v
      else if (it.type === 'metal_tag') cur.metalTag = v
      tagsByAnimal.set(it.animal_id, cur)
    }
  }

  // The animal's pen_work: seller / buyer / buyer # / work type.
  type Pw = { sellerPartyId: string | null; buyerPartyId: string | null; buyerNo: string; workTypeId: string | null }
  const pwById = new Map<string, Pw>()
  const penWorkIds = [...new Set(list.map((a) => a.pen_work_id).filter((x): x is string => !!x))]
  if (penWorkIds.length) {
    const { data: pws } = await supabase
      .from('pen_work')
      .select('id, seller_party_id, buyer_party_id, buyer_number_text, work_type_id')
      .in('id', penWorkIds)
    for (const pw of pws ?? []) {
      pwById.set(pw.id, {
        sellerPartyId: pw.seller_party_id,
        buyerPartyId: pw.buyer_party_id,
        buyerNo: str(pw.buyer_number_text),
        workTypeId: pw.work_type_id,
      })
    }
  }

  // Party names for every seller / buyer referenced.
  const partyName = new Map<string, string>()
  const partyIds = [
    ...new Set(
      [...pwById.values()].flatMap((p) => [p.sellerPartyId, p.buyerPartyId]).filter((x): x is string => !!x),
    ),
  ]
  if (partyIds.length) {
    const { data: parties } = await supabase.from('party').select('id, name').in('id', partyIds)
    for (const p of parties ?? []) partyName.set(p.id, str(p.name))
  }

  // Sort-pen numbers for every current_pen_id referenced.
  const penNumber = new Map<string, string>()
  const sortPenIds = [...new Set(list.map((a) => a.current_pen_id).filter((x): x is string => !!x))]
  if (sortPenIds.length) {
    const { data: pens } = await supabase.from('pen').select('id, pen_number').in('id', sortPenIds)
    for (const p of pens ?? []) penNumber.set(p.id, str(p.pen_number))
  }

  const workTypeName = new Map(workTypes.map((w) => [w.id, str(w.name)]))
  const animalTypeName = new Map(animalTypes.map((t) => [t.id, str(t.name)]))

  let hasSecondaryEid = false
  const rows: AnimalRow[] = list.map((a) => {
    const t = tagsByAnimal.get(a.id) ?? emptyTags()
    if (t.secondaryEid) hasSecondaryEid = true
    const pw = a.pen_work_id ? pwById.get(a.pen_work_id) : undefined
    const workedPen = str(a.pen)
    // Sort pen = where the animal landed; falls back to the worked pen so every
    // animal has an effective pen even when it was never sorted.
    const sortPen = (a.current_pen_id ? penNumber.get(a.current_pen_id) : '') || workedPen
    const quickNotes = Array.isArray(a.quick_notes) ? a.quick_notes.filter(Boolean).join('; ') : ''
    const age = [str(a.age_value), str(a.age_designation)].filter(Boolean).join(' ')
    return {
      id: a.id,
      eid: t.eid,
      backTag: t.backTag,
      visualTag: t.visualTag,
      metalTag: t.metalTag,
      secondaryEid: t.secondaryEid,
      workedPen,
      sortPen,
      workType: (pw?.workTypeId && workTypeName.get(pw.workTypeId)) || '',
      seller: (pw?.sellerPartyId && partyName.get(pw.sellerPartyId)) || '',
      buyerNo: pw?.buyerNo ?? '',
      buyer: (pw?.buyerPartyId && partyName.get(pw.buyerPartyId)) || '',
      animalType: (a.animal_type_id && animalTypeName.get(a.animal_type_id)) || '',
      breed: str(a.breed),
      color: str(a.color),
      age,
      pregStatus: str(a.preg_status),
      monthBred: str(a.preg_timing),
      fetalSex: str(a.fetal_sex),
      quickNotes,
      notes: str(a.notes),
    }
  })

  return { rows, hasSecondaryEid }
}
