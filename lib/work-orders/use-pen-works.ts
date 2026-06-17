'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'
import { fetchPenWorks, fetchSpecialCharges } from './queries'
import { upsertPen } from './pens'
import type {
  PenWorkFull,
  Role,
  SpecialChargeFull,
  WorkOrdersPageData,
} from './types'

export type NewBuyerInput = { name: string; buyerNumber: string; city: string; state: string }
export type NewSpecialChargeInput = {
  description: string
  partyId: string | null
  role: Role
  amount: number
}
export type CountField = 'head_started' | 'head_expected' | 'head_returned'
export type StatusField = 'work_complete' | 'health_complete'

function errMsg(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return fallback
}

/**
 * Holds the live pen_work / special_charge state for one sale day and exposes
 * optimistic mutations. Edits patch local state first, then write to Supabase;
 * on error we surface a brief toast and re-sync from the server. Only modal
 * creates and deletes trigger a full refetch.
 */
export function usePenWorks(pageData: WorkOrdersPageData, saleDayId: string) {
  const supabase = useMemo(() => createClient(), [])
  const barnId = pageData.barn.id

  const [penWorks, setPenWorks] = useState<PenWorkFull[]>([])
  const [specialCharges, setSpecialCharges] = useState<SpecialChargeFull[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flashError = useCallback((message: string) => {
    setError(message)
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 3500)
  }, [])
  const dismissError = useCallback(() => setError(null), [])

  const reload = useCallback(async () => {
    const [pw, sc] = await Promise.all([
      fetchPenWorks(supabase, saleDayId),
      fetchSpecialCharges(supabase, saleDayId),
    ])
    setPenWorks(pw)
    setSpecialCharges(sc)
  }, [supabase, saleDayId])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    reload()
      .catch((e) => {
        if (active) flashError(errMsg(e, 'Could not load work orders'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [reload, flashError])

  const patch = useCallback((id: string, fields: Partial<PenWorkFull>) => {
    setPenWorks((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)))
  }, [])

  // Apply a local patch, write to the DB, re-sync from server on failure.
  const optimistic = useCallback(
    async (
      id: string,
      fields: Partial<PenWorkFull>,
      dbUpdate: TablesUpdate<'pen_work'>,
      label: string,
    ) => {
      patch(id, fields)
      const { error: e } = await supabase.from('pen_work').update(dbUpdate).eq('id', id)
      if (e) {
        flashError(errMsg(e, label))
        reload().catch(() => {})
      }
    },
    [patch, supabase, flashError, reload],
  )

  const savePen = useCallback(
    async (id: string, penNumber: string) => {
      const trimmed = penNumber.trim()
      try {
        const penId = trimmed ? await upsertPen(supabase, barnId, saleDayId, trimmed) : null
        patch(id, { pen_id: penId, pen: penId ? { id: penId, pen_number: trimmed } : null })
        const { error: e } = await supabase.from('pen_work').update({ pen_id: penId }).eq('id', id)
        if (e) throw e
      } catch (e) {
        flashError(errMsg(e, 'Could not save pen'))
        reload().catch(() => {})
      }
    },
    [supabase, barnId, saleDayId, patch, flashError, reload],
  )

  const saveWorkType = useCallback(
    async (id: string, workTypeId: string) => {
      const wt = pageData.workTypes.find((w) => w.id === workTypeId)
      if (!wt) return
      const frozen = {
        work_type_id: workTypeId,
        frozen_vet_charge: wt.vet_charge,
        frozen_sol_charge: wt.sol_charge,
        frozen_admin_rate: pageData.barn.admin_fee_rate,
        frozen_tax_rate: pageData.barn.sales_tax_rate,
      }
      await optimistic(
        id,
        {
          ...frozen,
          workType: { id: wt.id, name: wt.name, vet_charge: wt.vet_charge, sol_charge: wt.sol_charge },
        },
        frozen,
        'Could not save work type',
      )
    },
    [pageData, optimistic],
  )

  const saveAnimalType = useCallback(
    async (id: string, animalTypeId: string) => {
      const at = pageData.animalTypes.find((a) => a.id === animalTypeId)
      await optimistic(
        id,
        { animal_type_id: animalTypeId, animalType: at ? { id: at.id, name: at.name } : null },
        { animal_type_id: animalTypeId },
        'Could not save animal type',
      )
    },
    [pageData, optimistic],
  )

  const saveHeadWorked = useCallback(
    async (id: string, value: number | null) => {
      await optimistic(id, { head_worked: value }, { head_worked: value }, 'Could not save head')
    },
    [optimistic],
  )

  const saveCountDetail = useCallback(
    async (id: string, field: CountField, value: number | null) => {
      await optimistic(
        id,
        { [field]: value } as Partial<PenWorkFull>,
        { [field]: value } as TablesUpdate<'pen_work'>,
        'Could not save count',
      )
    },
    [optimistic],
  )

  const toggleStatus = useCallback(
    async (id: string, field: StatusField) => {
      const current = penWorks.find((p) => p.id === id)?.[field] ?? false
      await optimistic(
        id,
        { [field]: !current } as Partial<PenWorkFull>,
        { [field]: !current } as TablesUpdate<'pen_work'>,
        'Could not update status',
      )
    },
    [penWorks, optimistic],
  )

  const addPenWork = useCallback(
    async (role: Role, partyId: string) => {
      const insert: TablesInsert<'pen_work'> = {
        barn_id: barnId,
        sale_day_id: saleDayId,
        origin: 'office',
      }
      if (role === 'buyer') insert.buyer_party_id = partyId
      else insert.seller_party_id = partyId
      const { error: e } = await supabase.from('pen_work').insert(insert)
      if (e) {
        flashError(errMsg(e, 'Could not add pen-work'))
        return
      }
      await reload()
    },
    [supabase, barnId, saleDayId, flashError, reload],
  )

  const deletePenWork = useCallback(
    async (id: string) => {
      setPenWorks((prev) => prev.filter((p) => p.id !== id))
      const { error: e } = await supabase
        .from('pen_work')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (e) {
        flashError(errMsg(e, 'Could not remove pen-work'))
        reload().catch(() => {})
      }
    },
    [supabase, flashError, reload],
  )

  // Future: search existing parties before creating new ones. A buyer import
  // from an existing file is queued as a future task.
  const createConsignor = useCallback(
    async (name: string) => {
      const { data: party, error: pe } = await supabase
        .from('party')
        .insert({ barn_id: barnId, name: name.trim() })
        .select('id')
        .single()
      if (pe || !party) {
        flashError(errMsg(pe, 'Could not add consignor'))
        return
      }
      const { error: we } = await supabase
        .from('pen_work')
        .insert({ barn_id: barnId, sale_day_id: saleDayId, seller_party_id: party.id, origin: 'office' })
      if (we) {
        flashError(errMsg(we, 'Could not add consignor'))
        return
      }
      await reload()
    },
    [supabase, barnId, saleDayId, flashError, reload],
  )

  const createBuyer = useCallback(
    async ({ name, buyerNumber, city, state }: NewBuyerInput) => {
      const { data: party, error: pe } = await supabase
        .from('party')
        .insert({ barn_id: barnId, name: name.trim() })
        .select('id')
        .single()
      if (pe || !party) {
        flashError(errMsg(pe, 'Could not add buyer'))
        return
      }
      const { data: bn, error: be } = await supabase
        .from('buyer_number')
        .insert({
          barn_id: barnId,
          party_id: party.id,
          number: buyerNumber.trim(),
          typical_destination: city.trim() || null,
          typical_state: state.trim() || null,
        })
        .select('id')
        .single()
      if (be || !bn) {
        flashError(errMsg(be, 'Could not add buyer'))
        return
      }
      const { error: we } = await supabase.from('pen_work').insert({
        barn_id: barnId,
        sale_day_id: saleDayId,
        buyer_party_id: party.id,
        buyer_number_id: bn.id,
        buyer_number_text: buyerNumber.trim(),
        destination: city.trim() || null,
        destination_state: state.trim() || null,
        origin: 'office',
      })
      if (we) {
        flashError(errMsg(we, 'Could not add buyer'))
        return
      }
      await reload()
    },
    [supabase, barnId, saleDayId, flashError, reload],
  )

  const addSpecialCharge = useCallback(
    async ({ description, partyId, role, amount }: NewSpecialChargeInput) => {
      const { error: e } = await supabase.from('special_charge').insert({
        barn_id: barnId,
        sale_day_id: saleDayId,
        party_id: partyId,
        role,
        description: description.trim() || null,
        customer_charge: amount,
      })
      if (e) {
        flashError(errMsg(e, 'Could not add charge'))
        return
      }
      await reload()
    },
    [supabase, barnId, saleDayId, flashError, reload],
  )

  const deleteSpecialCharge = useCallback(
    async (id: string) => {
      setSpecialCharges((prev) => prev.filter((s) => s.id !== id))
      const { error: e } = await supabase
        .from('special_charge')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (e) {
        flashError(errMsg(e, 'Could not remove charge'))
        reload().catch(() => {})
      }
    },
    [supabase, flashError, reload],
  )

  return {
    penWorks,
    specialCharges,
    isLoading,
    error,
    dismissError,
    reload,
    savePen,
    saveWorkType,
    saveAnimalType,
    saveHeadWorked,
    saveCountDetail,
    toggleStatus,
    addPenWork,
    deletePenWork,
    createConsignor,
    createBuyer,
    addSpecialCharge,
    deleteSpecialCharge,
  }
}

export type PenWorksApi = ReturnType<typeof usePenWorks>
