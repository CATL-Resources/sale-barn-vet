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
}

export type ColKey = Exclude<keyof AnimalRow, 'id'>

// 'category' columns get a multi-select filter; 'text' columns a contains box.
export type FilterKind = 'category' | 'text'
// 'natural' columns sort numerically where they can (0003 < 0012 < 0100 < 4AI).
export type SortKind = 'natural' | 'text'

export type ColumnDef = { key: ColKey; label: string; filter: FilterKind; sort: SortKind }

// Column order is the on-screen order and the copy/export order.
export const COLUMNS: ColumnDef[] = [
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
]

// Tag / ID columns must be written as TEXT in the XLSX export so a 15-digit EID
// never turns into scientific notation.
export const TEXT_FORMAT_COLS: ColKey[] = ['eid', 'backTag', 'visualTag', 'metalTag', 'secondaryEid', 'buyerNo']

// The fields the "Group by" control offers (one or two of these).
export const GROUP_FIELDS: { key: ColKey; label: string }[] = [
  { key: 'sortPen', label: 'Sort Pen' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'seller', label: 'Seller' },
  { key: 'workType', label: 'Work Type' },
]
