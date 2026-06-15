# sale-barn-vet

Sale Barn Vet ([salebarnvet.com](https://salebarnvet.com)) — the regulatory + health work a
beef-cattle vet does at a sale barn. Standalone product (own repo, own Supabase database, own
site), separate from HerdWork and Work Cows.

- **Spec:** [`spec.md`](./spec.md) · changelog: [`spec-changelog.md`](./spec-changelog.md) · context: [`project-memory.md`](./project-memory.md)
- **Settings screen spec:** [`docs/settings-screen-spec.md`](./docs/settings-screen-spec.md)
- **Stack:** Next.js (App Router) + Supabase. Online-primary with per-device local fallback.

## Status

Foundation only — the repo is wired to the **live** Supabase database, but feature UI
(Office work orders, chuteside Capture, Office filter-to-build, Settings) is intentionally not
built yet. It lands with the auth/RLS + Claude Design phase.

## Database

The schema is already applied to the live Supabase project **"Sale Barn Vet"**
(ref `odrcpdnzhnyiofokokum`, region `us-west-1`). The applied migrations are version-controlled
in [`supabase/migrations`](./supabase/migrations) and the generated types in
[`types/supabase.ts`](./types/supabase.ts).

Re-sync the repo to the live DB (and regenerate types) with the Supabase CLI:

```bash
supabase login                                   # one-time; needs a personal access token
supabase link --project-ref odrcpdnzhnyiofokokum
supabase db pull                                 # pulls remote schema into supabase/migrations
supabase gen types typescript --linked > types/supabase.ts
```

## Local setup

```bash
npm install
cp .env.local.example .env.local                 # then paste Project URL + anon key
npm run test:db                                   # verify the DB wiring
npm run dev                                        # http://localhost:3000
```

Get the values for `.env.local` from the Supabase dashboard:
**Project Settings → API → Project URL** and the **anon / public** key. `.env.local` is
gitignored — never commit keys.

> **Expected:** `npm run test:db` reads **0 rows**. RLS is enabled on every table and no
> SELECT policies exist yet, so the anon key sees nothing. That confirms the wiring is correct
> and the database is secure-by-default; data surfaces once policies land in the auth build.
