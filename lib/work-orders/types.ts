import type { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']

export type SaleDay = Tables['sale_day']['Row']
export type PenWork = Tables['pen_work']['Row']
export type Party = Tables['party']['Row']
export type WorkType = Tables['work_type']['Row']
export type AnimalType = Tables['animal_type']['Row']
export type BuyerNumber = Tables['buyer_number']['Row']
export type Pen = Tables['pen']['Row']
export type SpecialCharge = Tables['special_charge']['Row']
export type Barn = Tables['barn']['Row']

/** A pen_work with all related rows joined in. */
export type PenWorkFull = PenWork & {
  seller: Pick<Party, 'id' | 'name'> | null
  buyer: Pick<Party, 'id' | 'name'> | null
  buyerNumber: Pick<BuyerNumber, 'id' | 'number' | 'typical_destination' | 'typical_state'> | null
  workType: Pick<WorkType, 'id' | 'name' | 'vet_charge' | 'sol_charge'> | null
  animalType: Pick<AnimalType, 'id' | 'name'> | null
  pen: Pick<Pen, 'id' | 'pen_number'> | null
}

/** A special_charge with its party joined in. */
export type SpecialChargeFull = SpecialCharge & {
  party: Pick<Party, 'id' | 'name'> | null
}

export type Role = 'seller' | 'buyer'

/**
 * A rendered group in any view. In "by owner" it's one party; in "by pen" it's
 * one pen within a role section; in "by type" it's one animal type. partyId is
 * only set for owner-view groups (where "add pen-work" targets a real party).
 */
export type PartyGroup = {
  key: string
  name: string
  role: Role
  partyId?: string
  buyerNumber?: string
  destination?: string
  destinationState?: string
  headBrought: number // sum of head_expected across pen_works
  headWorked: number // sum of head_worked across pen_works
  totalCharge: number // sum of computed lineCharge
  penWorks: PenWorkFull[]
}

export type View = 'owner' | 'pen' | 'type'

export type WorkOrdersPageData = {
  saleDay: SaleDay
  barn: Barn
  workTypes: WorkType[]
  animalTypes: AnimalType[]
}
