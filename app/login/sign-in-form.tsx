'use client'

import { useFormStatus } from 'react-dom'

// Turn Supabase's raw auth messages into something a person can read. Falls
// back to the original message so nothing is ever swallowed.
function prettyError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'That email or password didn’t match. Try again.'
  if (m.includes('email not confirmed')) return 'This account isn’t confirmed yet — ask your admin.'
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('fetch')) {
    return 'Couldn’t reach the server. Check your connection and try again.'
  }
  return msg
}

// Submit button lives inside the form so it can read the form's pending state
// and show a loading label while the sign-in runs.
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="sbv-gold-btn login-submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}

/**
 * Presentation only. The `action` is the existing server action — same auth
 * call, same redirect, same session handling. This component just styles the
 * fields, shows a loading state, and renders the error inline.
 */
export function SignInForm({
  action,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>
  error?: string
}) {
  return (
    <form action={action} className="login-card sbv-navy-surface">
      {error ? (
        <div className="login-error" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{prettyError(error)}</span>
        </div>
      ) : null}

      <label className="login-field">
        <span className="login-label">Email</span>
        <input
          className="login-input"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@ranch.com"
          required
        />
      </label>

      <label className="login-field">
        <span className="login-label">Password</span>
        <input
          className="login-input"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          required
        />
      </label>

      <SubmitButton />

      <p className="login-note">Invite-only — accounts are created by an admin.</p>
    </form>
  )
}
