import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { AnimalRow } from './types'

type Client = SupabaseClient<Database>
type Named = { id: string; name: string }

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

// Supabase's auto API caps a single response at ~1000 rows. A busy sale day has
// more identifiers than that (one day already runs past 1000), and a plain fetch
// silently returns only the first 1000 — so the tags on the animals past that cut
// vanish and their EID column shows blank. These two helpers make every fetch
// return ALL its rows no matter the count.

const PAGE = 1000

// Page a whole table through with .range() until a short page comes back. Used
// for the base animal fetch, whose own result set can run past the cap (an
// all-days scope can hold thousands of animals).
async function fetchAllPaged<Row>(
  page: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>,
): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

// Fetch rows for a big list of ids in batches, so neither the id list nor the
// response ever gets near the cap. Batches of 250 keep each response well under
// 1000 even when every animal carries several identifiers.
const ID_BATCH = 250
async function fetchByIds<Row>(
  ids: string[],
  run: (batch: string[]) => PromiseLike<{ data: Row[] | null }>,
): Promise<Row[]> {
  const out: Row[] = []
  for (let i = 0; i < ids.length; i += ID_BATCH) {
    const { data } = await run(ids.slice(i, i + ID_BATCH))
    if (data) out.push(...data)
  }
  return out
}

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
  type AnimalRowRaw = {
    id: string
    sale_day_id: string | null
    pen_work_id: string | null
    animal_type_id: string | null
    breed: string | null
    color: string | null
    age_value: string | null
    age_designation: string | null
    preg_status: string | null
    preg_timing: string | null
    fetal_sex: string | null
    quick_notes: string[] | null
    notes: string | null
    pen: string | null
    current_pen_id: string | null
    created_at: string
  }
  const list = await fetchAllPaged<AnimalRowRaw>((from, to) =>
    supabase
      .from('animal')
      .select(
        'id, sale_day_id, pen_work_id, animal_type_id, breed, color, age_value, age_designation, preg_status, preg_timing, fetal_sex, quick_notes, notes, pen, current_pen_id, created_at',
      )
      .in('sale_day_id', saleDayIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(from, to)
      .returns<AnimalRowRaw[]>(),
  )
  if (list.length === 0) return { rows: [], hasSecondaryEid: false }

  const animalIds = list.map((a) => a.id)

  // Tags, pivoted by type.
  type Tags = { eid: string; backTag: string; visualTag: string; metalTag: string; secondaryEid: string }
  const emptyTags = (): Tags => ({ eid: '', backTag: '', visualTag: '', metalTag: '', secondaryEid: '' })
  const tagsByAnimal = new Map<string, Tags>()
  {
    type IdRow = { animal_id: string | null; type: string; value: string }
    const idents = await fetchByIds<IdRow>(animalIds, (batch) =>
      supabase
        .from('identifier')
        .select('animal_id, type, value')
        .in('animal_id', batch)
        .is('deleted_at', null)
        .returns<IdRow[]>(),
    )
    for (const it of idents) {
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
    type PwRow = {
      id: string
      seller_party_id: string | null
      buyer_party_id: string | null
      buyer_number_text: string | null
      work_type_id: string | null
    }
    const pws = await fetchByIds<PwRow>(penWorkIds, (batch) =>
      supabase
        .from('pen_work')
        .select('id, seller_party_id, buyer_party_id, buyer_number_text, work_type_id')
        .in('id', batch)
        .returns<PwRow[]>(),
    )
    for (const pw of pws) {
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
    type PartyRow = { id: string; name: string }
    const parties = await fetchByIds<PartyRow>(partyIds, (batch) =>
      supabase.from('party').select('id, name').in('id', batch).returns<PartyRow[]>(),
    )
    for (const p of parties) partyName.set(p.id, str(p.name))
  }

  // Sort-pen numbers for every current_pen_id referenced.
  const penNumber = new Map<string, string>()
  const sortPenIds = [...new Set(list.map((a) => a.current_pen_id).filter((x): x is string => !!x))]
  if (sortPenIds.length) {
    type PenRow = { id: string; pen_number: string }
    const pens = await fetchByIds<PenRow>(sortPenIds, (batch) =>
      supabase.from('pen').select('id, pen_number').in('id', batch).returns<PenRow[]>(),
    )
    for (const p of pens) penNumber.set(p.id, str(p.pen_number))
  }

  // Sale date per sale day (the scope is at most a handful of days).
  const saleDateById = new Map<string, string>()
  {
    type DayRow = { id: string; sale_date: string }
    const days = await fetchByIds<DayRow>(saleDayIds, (batch) =>
      supabase.from('sale_day').select('id, sale_date').in('id', batch).returns<DayRow[]>(),
    )
    for (const d of days) saleDateById.set(d.id, str(d.sale_date))
  }

  const workTypeName = new Map(workTypes.map((w) => [w.id, str(w.name)]))
  const animalTypeName = new Map(animalTypes.map((t) => [t.id, str(t.name)]))

  // "Recorded" stamp in the barn's local time (St. Onge is Mountain time), built
  // once and reused. sv-SE formats as "YYYY-MM-DD HH:mm", which reads cleanly and
  // also sorts in true time order as plain text.
  const stampFmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Denver',
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const recordedStamp = (iso: string): string => {
    if (!iso) return ''
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : stampFmt.format(d)
  }

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
      saleDate: (a.sale_day_id && saleDateById.get(a.sale_day_id)) || '',
      recordedAt: recordedStamp(a.created_at),
    }
  })

  return { rows, hasSecondaryEid }
}
