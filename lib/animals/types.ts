// The Animals report row + column model. One row per animal worked in the sale
// day. Every value is a plain string ('' when blank) so filtering, sorting,
// copy, and export all share one shape and tags never get coerced to a number.

export type AnimalRow = {
  id: string
  eid: string
  backTag: string
  visualTag: string
  metalTag: string
  secondaryEid: string
  workedPen: string
  sortPen: string
  workType: string
  seller: string
  buyerNo: string
  buyer: string
  animalType: string
  breed: string
  color: string
  age: string
  pregStatus: string
  monthBred: string
  fetalSex: string
  quickNotes: string
  notes: string
  // Which sale day this head belonged to (ISO date) and the exact moment it was
  // recorded, in the barn's local time. These travel with every row so a big
  // export always shows which set each animal came from.
  saleDate: string
  recordedAt: string
  // Not shown as columns: used by the load-building pool. buyerLoadId is the
  // animal's current load (or ''); hasBuyer is true when the animal already has a
  // buyer number (so it's out of the pool).
  buyerLoadId: string
  hasBuyer: boolean
}

// Column keys are the displayed/filterable/sortable fields only — never the
// pool-helper fields above (one of which isn't even a string).
export type ColKey = Exclude<keyof AnimalRow, 'id' | 'buyerLoadId' | 'hasBuyer'>

// 'category' columns get a multi-select filter; 'text' columns a contains box.
export type FilterKind = 'category' | 'text'
// 'natural' columns sort numerically where they can (0003 < 0012 < 0100 < 4AI).
export type SortKind = 'natural' | 'text'

export type ColumnDef = { key: ColKey; label: string; filter: FilterKind; sort: SortKind }

// Column order is the on-screen order and the copy/export order.
export const COLUMNS: ColumnDef[] = [
  // Sale Date leads so a glance (or the first export column) tells you which set
  // a row belongs to; Recorded (date + time) sits at the end with the other
  // reference fields.
  { key: 'saleDate', label: 'Sale Date', filter: 'category', sort: 'text' },
  { key: 'eid', label: 'EID', filter: 'text', sort: 'natural' },
  { key: 'backTag', label: 'Back Tag', filter: 'text', sort: 'natural' },
  { key: 'visualTag', label: 'Visual Tag', filter: 'text', sort: 'natural' },
  { key: 'metalTag', label: 'Metal Tag', filter: 'text', sort: 'natural' },
  { key: 'secondaryEid', label: 'Secondary EID', filter: 'text', sort: 'natural' },
  { key: 'workedPen', label: 'Worked Pen', filter: 'category', sort: 'natural' },
  { key: 'sortPen', label: 'Sort Pen', filter: 'category', sort: 'natural' },
  { key: 'workType', label: 'Work Type', filter: 'category', sort: 'text' },
  { key: 'seller', label: 'Seller', filter: 'category', sort: 'text' },
  { key: 'buyerNo', label: 'Buyer #', filter: 'text', sort: 'natural' },
  { key: 'buyer', label: 'Buyer', filter: 'category', sort: 'text' },
  { key: 'animalType', label: 'Animal Type', filter: 'category', sort: 'text' },
  { key: 'breed', label: 'Breed', filter: 'category', sort: 'text' },
  { key: 'color', label: 'Color', filter: 'category', sort: 'text' },
  { key: 'age', label: 'Age', filter: 'text', sort: 'natural' },
  { key: 'pregStatus', label: 'Preg Status', filter: 'category', sort: 'text' },
  { key: 'monthBred', label: 'Month Bred', filter: 'text', sort: 'text' },
  { key: 'fetalSex', label: 'Fetal Sex', filter: 'category', sort: 'text' },
  { key: 'quickNotes', label: 'Quick Notes', filter: 'text', sort: 'text' },
  { key: 'notes', label: 'Notes', filter: 'text', sort: 'text' },
  { key: 'recordedAt', label: 'Recorded', filter: 'text', sort: 'text' },
]

// Columns the XLSX export must write as TEXT so Excel keeps the exact string: a
// 15-digit EID never turns into scientific notation, and the dates never get
// silently re-serialized into Excel's own date format.
export const TEXT_FORMAT_COLS: ColKey[] = ['saleDate', 'eid', 'backTag', 'visualTag', 'metalTag', 'secondaryEid', 'buyerNo', 'recordedAt']

// The fields the "Group by" control offers (one or two of these). Sale Day is
// here so you can group a multi-day pull back into its sets.
export const GROUP_FIELDS: { key: ColKey; label: string }[] = [
  { key: 'saleDate', label: 'Sale Date' },
  { key: 'sortPen', label: 'Sort Pen' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'seller', label: 'Seller' },
  { key: 'workType', label: 'Work Type' },
]
