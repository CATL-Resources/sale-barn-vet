import { createClient } from '@/lib/supabase/server'
import { fetchCaptureBootstrap } from '@/lib/capture/queries'
import { CaptureScreen } from '@/components/capture/capture-screen'

export const dynamic = 'force-dynamic'

// Chuteside capture. The (full) layout already guards auth; here we load the
// barn config + reference lists and hand off to the client capture flow.
export default async function CapturePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const bootstrap = await fetchCaptureBootstrap(supabase)

  if (!bootstrap) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>No barn set up yet</h2>
        <p style={{ fontSize: 14, color: '#717182', marginTop: 8 }}>Add a barn before capturing.</p>
      </div>
    )
  }

  return <CaptureScreen bootstrap={bootstrap} userId={user?.id ?? null} />
}
