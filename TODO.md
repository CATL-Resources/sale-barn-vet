# Sale Barn Vet — to-do and status

Plain-language running list of what's built and what's next. Keep it in everyday
words (see `CLAUDE.md`).

_Last updated: 2026-06-29_

## The short version

The chuteside Capture screen, the office Work Orders screen and Sale Dashboard,
the Reports hub (Animals, Billing, Customer, Sale Summary), Settings, and Login
are all live. The full customer list is loaded, and the office can now search it
and edit a customer's addresses. The biggest gaps before real customer use: the
Buyers and Sellers pages are still placeholders, the "add a customer" box doesn't
use the search yet, new customers get no number, and there's no screen that makes
the day's paperwork (CVIs / change-of-ownership). A short safety list (access
rules, backups, alerts) still needs doing before the first real sale day.

## Done — built since the last update (cross these off)

- **The 840 check on the chute EID now holds for typed entry too.** A real
  official EID is 15 digits and starts with 840. Before, a 15-digit number that
  did NOT start with 840 could be typed and saved into the main slot. Now typing
  is held to the full 840 shape the same way scanning is — on both the Capture
  screen and the animal edit sheet — while a 900-series second tag still goes in
  the second-EID slot.
- **Capture polish and hardening.** One shared status box for every message
  (save / duplicate / required field / unreadable scan), pinned to the top so the
  result is never off-screen; reliable jump back to the scan field after a save;
  a collapsible header; the "+ 2nd EID" trigger on the EID row; required-field
  accents (amber until filled, green once filled); and scan-ingest hardening for
  the wand.
- **Mixed pens at the chute.** The owner is picked per cow (no forced up-front
  choice), with a Hold slot for unknown owners and close-the-whole-pen-at-once.
- **Sort pens.** A per-day view showing each pen's head and owner mix, with close
  / reopen, and move a pen's cattle to a destination (which no longer spawns a
  new open pen to deal with).
- **Office Work Orders.** The board, the condensed per-pen mobile cards, search
  and sort, the "..." actions (edit / animal list / print label / delete), and
  photos.
- **Billing and reconciliation.** Customer rollups by work type at the frozen
  price, plus special charges.
- **Reports hub.** Animals (filter / sort / group, hide columns remembered per
  device, select-and-delete, Excel / copy), Billing, Customer, and Sale Summary.
- **Customer list in use (office).** Search the loaded customers by name or
  number; show and edit a customer's many addresses.
- **"Month bred" is fully configurable** in Settings (all 12 months available).
- **Customer list loaded** — about 19,570 customers (each with a number) and
  17,946 addresses; the loader can be re-run anytime without making duplicates.
- **Chute Capture, Settings, Office Work Orders, Login** — all live.

## Next — to open the doors to real customers

- [ ] **Buyers and Sellers pages.** Turn the "Coming Soon" placeholders into real
  lists backed by the loaded customers.
- [ ] **Customer picker when adding a consignor or buyer.** The search works on
  the server, but the add box still only free-types a name — wire the search in
  so you pick an existing customer instead of making a duplicate.
- [ ] **Give a brand-new customer a number automatically** (today an added
  customer has no number). Decide the rule and wire it in.
- [ ] **Document generation.** A screen that makes the day's CVIs and
  change-of-ownership paper from the work. (Today you can export the Animals
  report to Excel and copy for GVL, but there's no document build.)
- [ ] **Barn Settings editing.** The screen shows the config; confirm edits
  actually save (it's view-only for now — editing is a separate build).

## Before the first real sale day (safety — do these)

- [ ] **Check the per-table access rules are real**, not wide-open test ones
  (most important).
- [ ] **Turn on database backups** (point-in-time) and a **staging copy** to test
  changes before they hit the real one.
- [ ] **Add error alerts** (Sentry) and an **uptime check** (UptimeRobot).
- [ ] **Lock the `main` branch** so changes only land through a reviewed PR.
- [ ] **Rate-limit / protect any server endpoints.**
- [ ] **Keep the GVL token server-side only** when that integration lands.

## Longer horizon (not urgent)

- [ ] **Vendors report** — the fifth report view (a placeholder now).
- [ ] **Named, barn-wide saved column views** for the Animals report.
- [ ] **Per-day buyer numbers** (the allocation logic).
- [ ] **Receiving-by-phone module** (the `origin` field already exists for it).
- [ ] **GVL token integration** (server-side eCVI push) to replace the manual
  Chrome fill.
- [ ] **Live updates** for several office users on the same sale day.
- [ ] **Decide the offline rule** (what wins when an offline device's edits
  collide) before building offline support.
- [ ] **One-way push to a master DB** (HerdWork) for shared CVI history.

## Open questions for the team

- [ ] What's the rule for numbering a brand-new customer?
- [ ] Should "Month bred" stay flexible per barn, or be fixed?
- [ ] At the very end of the day, who closes out a sort pen, and where? (Close /
  reopen / move now exist; confirm the end-of-day owner of that step.)

## Handy facts

- Repo: `chandyolson/sale-barn-vet` · App: Next.js + Supabase · Site:
  salebarnvet.com
- Supabase project id: `odrcpdnzhnyiofokokum` (us-west-1)
- Customer data lives in `party` (~19,570 rows, each with a `customer_number`)
  and `party_location` (~17,946 addresses). Re-run loader:
  `npm run import:customers`.
- The core model is "pen_work" = one pen + one job + one owner + the head worked,
  with the price frozen on that event. Consignor/buyer totals are rollups (views)
  over pen_work.
- Worth reading: `spec.md`, `project-memory.md`, this file,
  `docs/production-hardening-checklist.md`, and the `handoff/` folder.
