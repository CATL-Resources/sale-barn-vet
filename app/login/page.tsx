import { login } from './actions'
import { SignInForm } from './sign-in-form'

// Invite-only sign-in. All auth logic lives in ./actions — this file is
// presentation only (layout, brand, field + error styling).
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="login-canvas">
      <div className="login-stack">
        <div className="login-brand">
          <span className="login-mark" aria-hidden="true" />
          <span className="login-wordmark">Sale Barn Vet</span>
          <span className="login-tagline">Chuteside vet records</span>
        </div>

        <SignInForm action={login} error={searchParams.error} />
      </div>
    </main>
  )
}
