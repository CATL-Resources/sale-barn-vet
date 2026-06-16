import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/supabase'
import { signOut } from './login/actions'

type WorkTypeRow = Pick<Tables<'work_type'>, 'name' | 'vet_charge' | 'sol_charge'>

// Auth-gated and per-user — always render at request time (never prerender at build).
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createClient()

  // Authenticate against the auth server (not getSession). Middleware also guards this,
  // but we re-check here per the task's "protect app routes with getUser()" requirement.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Runs as the logged-in user, so RLS applies. Empty until the account is a barn member.
  const { data: workTypes, error } = await supabase
    .from('work_type')
    .select('name, vet_charge, sol_charge')
    .order('name')
    .returns<WorkTypeRow[]>()

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1>Sale Barn Vet</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>
          Signed in as <strong>{user.email}</strong>
        </span>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </div>

      <p>
        Foundation only — feature screens (Office work orders, chuteside Capture, Office
        filter-to-build, Settings) come with the design phase. This page is a throwaway
        auth/RLS check.
      </p>

      <p>
        <code>work_type</code> rows visible to you:{' '}
        <strong>{error ? `error: ${error.message}` : (workTypes?.length ?? 0)}</strong>
      </p>

      {workTypes && workTypes.length > 0 ? (
        <ul>
          {workTypes.map((w) => (
            <li key={w.name}>
              {w.name} — vet {String(w.vet_charge)} / SOL {String(w.sol_charge)}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: '#666' }}>
          No rows visible yet — expected until your account is added to a barn
          (<code>barn_member</code>). That confirms RLS is working.
        </p>
      )}
    </main>
  )
}
