// Wiring + RLS check. Reads public.work_type.
//
//   npm run test:db
//
// LOGGED OUT (default): expects 0 rows — RLS grants access only to authenticated barn
//   members, so the anon request sees nothing. That confirms the wiring AND that the
//   database is secure-by-default.
// LOGGED IN: after the first admin/member is bootstrapped, set TEST_USER_EMAIL and
//   TEST_USER_PASSWORD in .env.local; the script signs in and should then see the 11
//   seeded work_type rows.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.env.TEST_USER_EMAIL
const password = process.env.TEST_USER_PASSWORD

if (!url || !anonKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.\n' +
      'Copy .env.local.example to .env.local and fill it in, then re-run `npm run test:db`.',
  )
  process.exit(1)
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } })

if (email && password) {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    console.error('Sign-in FAILED:', signInError.message)
    process.exit(1)
  }
  console.log(`Signed in as ${email} (authenticated request).`)
} else {
  console.log('No TEST_USER_EMAIL / TEST_USER_PASSWORD set — running as anonymous (logged-out).')
}

const { data, error } = await supabase
  .from('work_type')
  .select('name, vet_charge, sol_charge')

if (error) {
  console.error('Query FAILED:', error.message)
  process.exit(1)
}

console.log(`Connected. work_type rows visible: ${data.length}`)
if (data.length > 0) console.table(data)

if (!email && data.length === 0) {
  console.log(
    '\n0 rows is EXPECTED logged-out: RLS allows only authenticated barn members.\n' +
      'After the first admin membership is bootstrapped, set TEST_USER_EMAIL / TEST_USER_PASSWORD\n' +
      'in .env.local to sign in — you should then see the 11 seeded work_type rows.',
  )
}
