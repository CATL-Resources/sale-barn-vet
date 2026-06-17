# Production Hardening Checklist — Sale Barn Vet

## Done ✓
- TypeScript types generated from live schema (drift guard)
- RLS enabled on all tables
- Orphan columns from old lot/load model removed (migration)
- No API keys or secrets in client code (Supabase anon key is public; service role key must never leave server)

## Queued — do before first real sale day
- [ ] Verify RLS policies are real (current policies may be dev placeholder always-true — audit each table)
- [ ] Add Supabase Point-in-Time Recovery (in Supabase dashboard, requires Pro plan)
- [ ] Set up error monitoring (Sentry or equivalent) on the Next.js app
- [ ] Add uptime check (UptimeRobot free tier is sufficient)
- [ ] Supabase branch for staging (test migrations against branch before production)
- [ ] Lock main branch to PR-only in GitHub (no direct push → no Vercel auto-deploy from force-push)
- [ ] Rate limit or auth-protect any server-side API routes
- [ ] GVL token (future): store server-side only in environment variable, never in browser

## Longer horizon
- [ ] Import existing buyer/seller party file into party + buyer_number tables
- [ ] Document → pen_work FK migration (when document screen is built)
- [ ] Real-time subscription for concurrent office users on same sale day
- [ ] Offline fallback planning session (source-of-truth decision needed before building)
