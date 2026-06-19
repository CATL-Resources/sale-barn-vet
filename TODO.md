# Sale Barn Vet — to-do & status

Plain-language running list of what's built and what's next. Keep it in everyday
words (see `CLAUDE.md`).

_Last updated: 2026-06-19_

## The short version

The chuteside **Capture** screen is live, the **Settings** and office
**Work-Orders** screens exist, and the full **customer list is now loaded** into
the database. No screen reads that customer list yet — that's the most obvious
next step. Before a real sale day, a short safety list (access rules, backups,
alerts) still needs doing.

## ✅ Done

- **Customer list loaded** — 19,570 customers (each with a customer number) and
  17,946 addresses, merged in PR #22. The loader can be re-run anytime
  (`npm run import:customers`) and won't make duplicates.
- **Chute capture screen is live** — one animal at a time into a batch (a batch
  is one pen + one job + one consignor). The screen builds itself from the barn
  settings; sort sends animals to a shared, all-day pen; nothing hard-blocks the
  vet; saving writes to the live tables.
- **Settings screen** — built on St. Onge's real config.
- **Office Work-Orders screen** — built on the "pen_work" model.
- **Login** — built.

## 📋 Next

### 1. Loose ends from the customer load (quick)

- [ ] **Use the customer list in the app.** Nothing reads it today. Build a
  customer lookup/picker and turn the "Coming Soon" **Buyers** and **Sellers**
  pages into real lists backed by the loaded customers.
- [ ] **Show and edit each customer's addresses.** The load stores many
  addresses per customer (in `party_location`) and copies the default one into
  the old single-address field. New screens should read and write
  `party_location` from now on.
- [ ] **Give new customers a number automatically.** Existing customers got
  their numbers from the file, but adding a customer in the app has no numbering
  yet. Decide the rule and wire it into the add-customer path.

### 2. Before the first real sale day (safety — do these)

- [ ] **Check the per-barn access rules are real**, not wide-open test ones —
  review each table's policy. (Most important.)
- [ ] **Turn on database backups** (Supabase point-in-time recovery; Pro plan).
- [ ] **Add error alerts** on the website (Sentry or similar).
- [ ] **Add an uptime check** (UptimeRobot free tier is fine).
- [ ] **Make a staging copy of the database** to test changes before they hit the
  real one (Supabase branch).
- [ ] **Lock the `main` branch** so changes only land through a reviewed PR.
- [ ] **Protect / rate-limit any server endpoints.**

### 3. Capture & office features (next build work)

- [ ] **Real chuteside test** on a phone/tablet — run a few pretend animals
  through and note anything slow or wrong.
- [ ] **Office screen to review and bill the batches** the chute makes (prices,
  charges, totals — left out on purpose so far).
- [ ] **Keep the running count after a page refresh** (today it resets; saved
  animals are safe).
- [ ] **See who's in a shared sort pen, broken down by seller.**
- [ ] **Confirm the "Month bred" choices** — currently Sep–Dec; decide if it
  should be all 12 months.
- [ ] **Settings: confirm the barn can flip field on/off switches itself** (the
  screen exists; check it actually saves changes, not just shows them).

## ❓ Open questions for the team

- [ ] Was it right to flip St. Onge's saved settings, or should the screen just
  bake in their field list?
- [ ] What happens to a sort pen at the end of the day — who closes it out, and
  where?
- [ ] What's the rule for numbering a brand-new customer?

## 🔭 Longer horizon (not urgent)

- [ ] Per-day buyer numbers for customers (the allocation logic).
- [ ] Link generated documents to the work events when the document screen is
  built.
- [ ] Live updates for several office users on the same sale day.
- [ ] Decide the offline rule (what wins when an offline device's edits collide)
  before building offline support.
- [ ] Keep the GVL token server-side only when that integration lands.

## Handy facts

- Repo: `chandyolson/sale-barn-vet` · App: Next.js + Supabase · Site:
  salebarnvet.com
- Supabase project id: `odrcpdnzhnyiofokokum` (us-west-1)
- Customer data lives in `party` (19,570 rows, each with a `customer_number`) and
  `party_location` (17,946 addresses). Re-run loader: `npm run import:customers`.
- The core model is "pen_work" = one pen + one job + one owner + the head worked,
  with the price frozen on that event. Consignor/buyer totals are rollups (views)
  over pen_work.
- Worth reading: `spec.md`, `project-memory.md`, this file,
  `docs/production-hardening-checklist.md`, and the `handoff/` folder.
