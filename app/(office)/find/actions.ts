'use server'

import { createClient } from '@/lib/supabase/server'

// What an animal carries on its work order, plus which tag matched.
export type AnimalMatch = {
  animalId: string
  matchedType: string // eid | back_tag | visual_tag | metal_tag
  matchedValue: string
  saleDate: string | null
  role: 'seller' | 'buyer' | null
  partyName: string | null
  buyerNumber: string | null
  pen: string | null
  workType: string | null
  color: string | null
  breed: string | null
  age: string | null
  pregStatus: string | null
  pregTiming: string | null
  fetalSex: string | null
}

type PwRow = {
  id: string
  buyer_party_id: string | null
  buyer_number_text: string | null
  seller: { name: string } | null
  buyer: { name: string } | null
  pen: { pen_number: string } | null
  workType: { name: string } | null
  saleDay: { sale_date: string } | null
}

/**
 * Find animals across EVERY sale day by EID, back tag, or tag number. All three
 * live in the identifier table (type + value), so we search that: a full scanned
 * EID matches exactly and a typed fragment matches as a contains, case-insensitive
 * across all types. Deleted identifiers and animals are skipped. RLS scopes to the
 * barn. Read-only.
 */
export async function searchAnimals(query: string): Promise<AnimalMatch[]> {
  const supabase = createClient()
  const q = query.trim().replace(/[%_\\]/g, ' ').trim()
  if (q.length < 2) return []

  // 1. Matching tags.
  const { data: ids } = await supabase
    .from('identifier')
    .select('animal_id, type, value')
    .ilike('value', `%${q}%`)
    .is('deleted_at', null)
    .order('type')
    .limit(60)
  const idList = ids ?? []
  if (idList.length === 0) return []

  // 2. Their animals (skip deleted).
  const animalIds = [...new Set(idList.map((i) => i.animal_id))]
  const { data: animals } = await supabase
    .from('animal')
    .select('id, pen_work_id, color, breed, age_designation, preg_status, preg_timing, fetal_sex')
    .in('id', animalIds)
    .is('deleted_at', null)
  const animalMap = new Map((animals ?? []).map((a) => [a.id, a]))

  // 3. The work order each was done under (consignor/buyer, pen, day, work type).
  const penWorkIds = [...new Set((animals ?? []).map((a) => a.pen_work_id).filter((x): x is string => !!x))]
  const pwMap = new Map<string, PwRow>()
  if (penWorkIds.length > 0) {
    const { data: pws } = await supabase
      .from('pen_work')
      .select(
        `id, buyer_party_id, buyer_number_text,
         seller:party!pen_work_seller_party_id_fkey(name),
         buyer:party!pen_work_buyer_party_id_fkey(name),
         pen:pen!pen_work_pen_id_fkey(pen_number),
         workType:work_type!pen_work_work_type_id_fkey(name),
         saleDay:sale_day!pen_work_sale_day_id_fkey(sale_date)`,
      )
      .in('id', penWorkIds)
      .returns<PwRow[]>()
    for (const p of pws ?? []) pwMap.set(p.id, p)
  }

  return idList
    .filter((i) => animalMap.has(i.animal_id))
    .map((i) => {
      const a = animalMap.get(i.animal_id)!
      const pw = a.pen_work_id ? pwMap.get(a.pen_work_id) ?? null : null
      const isBuyer = !!pw?.buyer_party_id
      return {
        animalId: a.id,
        matchedType: i.type,
        matchedValue: i.value,
        saleDate: pw?.saleDay?.sale_date ?? null,
        role: pw ? (isBuyer ? 'buyer' : 'seller') : null,
        partyName: pw ? (isBuyer ? pw.buyer?.name : pw.seller?.name) ?? null : null,
        buyerNumber: pw?.buyer_number_text ?? null,
        pen: pw?.pen?.pen_number ?? null,
        workType: pw?.workType?.name ?? null,
        color: a.color,
        breed: a.breed,
        age: a.age_designation,
        pregStatus: a.preg_status,
        pregTiming: a.preg_timing,
        fetalSex: a.fetal_sex,
      }
    })
}
