// Quick wiring check: reads public.work_type through the anon key.
//
// Run after creating .env.local:
//   npm run test:db
//
// EXPECTED on a fresh DB: 0 rows. RLS is enabled and no SELECT policies exist yet,
// so the anon key sees nothing. That confirms the wiring is correct AND that the
// database is secure-by-default. Rows appear once auth/RLS policies are added.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Copy .env.local.example to .env.local and fill it in, then re-run `npm run test:db`.',
  )
  process.exit(1)
}

const supabase = createClient(url, anonKey)
const { data, error } = await supabase
  .from('work_type')
  .select('name, vet_charge, sol_charge')

if (error) {
  console.error('Connection FAILED:', error.message)
  process.exit(1)
}

console.log(`Connected to Supabase. work_type rows visible to anon: ${data.length}`)
if (data.length > 0) console.table(data)
else
  console.log(
    '\n0 rows is EXPECTED here: RLS is on and no SELECT policies exist yet.\n' +
      'The wiring is correct — data will surface once policies land in the auth build.',
  )
