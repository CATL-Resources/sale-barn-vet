import { login } from './actions'

// Minimal, intentionally unstyled login. Invite-only: no public sign-up form.
// This page is a functional placeholder to be restyled in the design phase.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main style={{ maxWidth: 360, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Sale Barn Vet — Sign in</h1>

      {searchParams.error ? (
        <p role="alert" style={{ color: 'crimson' }}>
          {searchParams.error}
        </p>
      ) : null}

      <form action={login}>
        <p>
          <label>
            Email
            <br />
            <input name="email" type="email" autoComplete="email" required />
          </label>
        </p>
        <p>
          <label>
            Password
            <br />
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
        </p>
        <button type="submit">Sign in</button>
      </form>

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#666' }}>
        Invite-only — accounts are created by an admin. There is no public sign-up.
      </p>
    </main>
  )
}
