# sale-barn-vet

Sale Barn Vet ([salebarnvet.com](https://salebarnvet.com)) — the regulatory + health work a
beef-cattle vet does at a sale barn. Standalone product (own repo, own Supabase database, own
site), separate from HerdWork and Work Cows.

- **Spec:** [`spec.md`](./spec.md) · changelog: [`spec-changelog.md`](./spec-changelog.md) · context: [`project-memory.md`](./project-memory.md)
- **Settings screen spec:** [`docs/settings-screen-spec.md`](./docs/settings-screen-spec.md)
- **Stack:** Next.js (App Router) + Supabase. Online-primary with per-device local fallback.

## Status

Auth + RLS layer is in. The repo is wired to the **live** Supabase database with email/password
auth (invite-only), session cookies, route protection, and row-level security on every table.
**Styled feature UI** (Office work orders, chuteside Capture, Office filter-to-build, Settings)
is intentionally not built yet — it lands with the Claude Design phase. The only screen is a
throwaway `/login` + a minimal protected home that doubles as an auth/RLS check.

## Auth & access model (v1)

- **Invite-only.** No public sign-up. An admin creates accounts; a `barn_member` row ties a
  login to the barn with a role (`admin` / `office` / `vet`).
- **RLS:** every logged-in barn member can read/write everything for their barn; role only
  gates which screens show later (not a database wall). Not logged in → nothing.
- **First admin** is bootstrapped outside the app (insert a `barn_member` row directly), then
  sign in at `/login`.
- Server code authenticates with `supabase.auth.getUser()` (verified) — never `getSession()`.

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

> **Expected:** `npm run test:db` reads **0 rows** when logged out — RLS grants access only to
> authenticated barn members, so the anon request sees nothing (wiring correct + secure-by-default).
> After the first admin/member is bootstrapped, set `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` in
> `.env.local` and re-run: the script signs in and you should see the 11 seeded `work_type` rows.
> In the app, sign in at `/login` — the home page shows the same count for your account.
