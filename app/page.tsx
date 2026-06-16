export default function Home() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1>Sale Barn Vet</h1>
      <p>
        Foundation only. The Next.js app is wired to the live Supabase database; feature
        screens (Office work orders, chuteside Capture, Office filter-to-build, Settings)
        come with the auth/RLS + Claude Design phase.
      </p>
      <p>
        After creating <code>.env.local</code>, verify the database wiring with{' '}
        <code>npm run test:db</code>. Note: rows will read empty under the anon key until
        RLS policies are added — that is expected, not a bug.
      </p>
      <p>
        See <code>spec.md</code> for the product spec and <code>supabase/migrations</code>{' '}
        for the schema.
      </p>
    </main>
  )
}
