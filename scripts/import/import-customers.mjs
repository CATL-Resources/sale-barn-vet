// One-time (and re-runnable) customer import for the single barn.
//
//   npm run import:customers
//
// Reads scripts/import/data/{customers,locations}.csv and upserts them into
// party + party_location. Idempotent: a second run updates in place and creates
// no duplicates. Signs in as the TEST_USER (an authenticated barn member) so the
// writes go through the same barn-scoped RLS the app uses.
//
// Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// TEST_USER_EMAIL, TEST_USER_PASSWORD.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { parseCsvObjects } from './csv.mjs'

const DATA = join(dirname(fileURLToPath(import.meta.url)), 'data')
const PAGE = 1000
const BATCH = 500

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.env.TEST_USER_EMAIL
const password = process.env.TEST_USER_PASSWORD

if (!url || !anonKey || !email || !password) {
  console.error(
    'Missing env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,\n' +
      'TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local.',
  )
  process.exit(1)
}

const clean = (v) => {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}
const bool = (v) => (v ?? '').trim().toLowerCase() === 'true'
const normAddr = (a) => (a ?? '').trim().toLowerCase()
const chunk = (arr, n) => {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } })

const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
if (signInError) {
  console.error('Sign-in failed:', signInError.message)
  process.exit(1)
}

const { data: barn, error: barnError } = await supabase.from('barn').select('id,name').limit(1).single()
if (barnError || !barn) {
  console.error('Could not find the barn:', barnError?.message)
  process.exit(1)
}
const barnId = barn.id
console.log(`Importing into barn: ${barn.name}`)

// Read every row of a barn-scoped table (PostgREST caps each request at 1000).
async function loadAll(table, columns) {
  const all = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('barn_id', barnId)
      .is('deleted_at', null)
      .range(from, from + PAGE - 1)
    if (error) throw error
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}

// ---- customers + locations from the files ----
const customerRows = parseCsvObjects(readFileSync(join(DATA, 'customers.csv'), 'utf8'))
const locationRows = parseCsvObjects(readFileSync(join(DATA, 'locations.csv'), 'utf8'))

// customer_number -> customer (last row wins on a duplicate number)
const customers = new Map()
for (const c of customerRows) {
  const num = clean(c.customer_number)
  if (!num) continue
  customers.set(num, { name: (c.name ?? '').trim(), phone: clean(c.phone), email: clean(c.email) })
}

// customer_number -> Map(normalized address -> location) (de-duped)
const locationsByCustomer = new Map()
for (const l of locationRows) {
  const num = clean(l.customer_number)
  if (!num) continue
  if (!locationsByCustomer.has(num)) locationsByCustomer.set(num, new Map())
  locationsByCustomer.get(num).set(normAddr(l.address), {
    label: clean(l.label),
    address: clean(l.address),
    city: clean(l.city),
    state: clean(l.state),
    zip: clean(l.zip),
    country: clean(l.country),
    premise_id: clean(l.premise_id),
    is_po_box: bool(l.is_po_box),
    is_physical: bool(l.is_physical),
    is_default: bool(l.is_default),
  })
}

// A customer's default location feeds the legacy party.address / party.state.
function defaultLocation(num) {
  const m = locationsByCustomer.get(num)
  if (!m) return null
  const list = [...m.values()]
  return list.find((x) => x.is_default) ?? list[0] ?? null
}

// ---- parties ----
const existingParties = await loadAll('party', 'id,customer_number,name,phone,email,address,state')
const partyByNumber = new Map()
for (const p of existingParties) if (p.customer_number) partyByNumber.set(p.customer_number, p)

let partiesInserted = 0
let partiesUpdated = 0
const partyInserts = []

for (const [num, c] of customers) {
  const dl = defaultLocation(num)
  const want = {
    name: c.name || '',
    phone: c.phone,
    email: c.email,
    address: dl?.address ?? null,
    state: dl?.state ?? null,
  }
  const existing = partyByNumber.get(num)
  if (!existing) {
    partyInserts.push({ barn_id: barnId, customer_number: num, ...want })
  } else {
    const patch = {}
    if (want.name && want.name !== existing.name) patch.name = want.name
    if (want.phone && want.phone !== existing.phone) patch.phone = want.phone
    if (want.email && want.email !== existing.email) patch.email = want.email
    if (want.address && want.address !== existing.address) patch.address = want.address
    if (want.state && want.state !== existing.state) patch.state = want.state
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('party').update(patch).eq('id', existing.id)
      if (error) throw error
      partiesUpdated++
    }
  }
}

for (const batch of chunk(partyInserts, BATCH)) {
  const { data, error } = await supabase.from('party').insert(batch).select('id,customer_number')
  if (error) throw error
  for (const r of data) partyByNumber.set(r.customer_number, r)
  partiesInserted += data.length
}

// ---- locations ----
const existingLocations = await loadAll(
  'party_location',
  'id,party_id,label,address,city,state,zip,country,premise_id,is_po_box,is_physical,is_default',
)
const locationByKey = new Map()
const keyOf = (partyId, address) => `${partyId}|${normAddr(address)}`
for (const l of existingLocations) locationByKey.set(keyOf(l.party_id, l.address), l)

let locationsInserted = 0
let locationsUpdated = 0
let skipped = 0
const skippedReasons = new Map()
const locationInserts = []
const fields = ['label', 'city', 'state', 'zip', 'country', 'premise_id', 'is_po_box', 'is_physical', 'is_default']

for (const [num, locs] of locationsByCustomer) {
  const party = partyByNumber.get(num)
  if (!party) {
    skipped += locs.size
    skippedReasons.set('no matching customer', (skippedReasons.get('no matching customer') ?? 0) + locs.size)
    continue
  }
  for (const loc of locs.values()) {
    const existing = locationByKey.get(keyOf(party.id, loc.address))
    if (!existing) {
      locationInserts.push({ barn_id: barnId, party_id: party.id, ...loc })
    } else {
      const patch = {}
      for (const f of fields) if (loc[f] !== existing[f]) patch[f] = loc[f]
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from('party_location').update(patch).eq('id', existing.id)
        if (error) throw error
        locationsUpdated++
      }
    }
  }
}

for (const batch of chunk(locationInserts, BATCH)) {
  const { error } = await supabase.from('party_location').insert(batch)
  if (error) throw error
  locationsInserted += batch.length
}

// ---- summary ----
console.log('\nImport summary')
console.log(`  parties inserted:   ${partiesInserted}`)
console.log(`  parties updated:    ${partiesUpdated}`)
console.log(`  locations inserted: ${locationsInserted}`)
console.log(`  locations updated:  ${locationsUpdated}`)
console.log(`  rows skipped:       ${skipped}`)
for (const [reason, count] of skippedReasons) console.log(`    - ${reason}: ${count}`)
