// The Build-a-Load view models. A load is one buyer number going to one
// destination — a paperwork grouping of a buyer's animals for one health paper.
// Nothing here carries billing; the bill stays on each animal's capture pen_work.

export type LoadRow = {
  id: string
  buyerNumber: string // recorded number, else the free-typed text
  buyerName: string
  destinationName: string
  destinationState: string
  destinationAddress: string
  destination: string // "name, state" for display, '' when neither is set
  expectedHead: number | null
  assignedHead: number // count of animals currently on this load
  notes: string
  saleDayId: string
}

export type LoadAnimal = {
  id: string
  eid: string
  backTag: string
  visualTag: string
  color: string
  animalType: string
}
