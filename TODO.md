# Sale Barn Vet — to-do and status

Plain-language running list of what's built and what's next. Keep it in everyday
words (see `CLAUDE.md`).

_Last updated: 2026-07-01_

## The short version

The chuteside Capture screen, the office Work Orders screen and Sale Dashboard,
the Reports hub (Animals, Billing, Customer, Sale Summary), Settings, and Login
are all live. The full customer list is loaded, and the office can now search it
and edit a customer's addresses. The office can now group a buyer's animals into
a load and pull the tags for a health paper, and can print a Sale Day Closeout.
The biggest gaps before real customer use: the Buyers and Sellers pages are still
placeholders, the "add a customer / add a consignor" box still free-types a name,
new customers get no number, and there's still no screen that builds the day's
paperwork itself (the CVI / change-of-ownership paper — the closeout and the
per-load tag export are steps toward it, not the paper). A short safety list
(access rules, backups, alerts) still needs doing before the first real sale day.

## Done — built since the last update (cross these off)

- **Build a Load.** A load = one buyer number to one destination (paperwork only,
  no billing). In the Animals report: a "Pool only" view (animals with no buyer
  number yet) and "Assign to buyer" (search a buyer number or free-type one,
  pre-fill the destination, set expected head). A Loads list + load detail with a
  kept-vs-expected head check, edit destination / notes, take animals off, delete
  a load, and copy / export the load's EID + back tag for GVL.
- **Sale Day Closeout report.** A printable one-day billing document (Summary or
  Itemized), split into Sellers and Buyers with a grand total, plus a two-tab
  Excel. Reachable from the Sale Dashboard.
- **Billing report shows the buyer number and pen on every line**, and the buyer
  number is searchable — a new per-line table under the customer rollup.
- **Animals report — batch edit and more selection power.** Edit one shared field
  across many selected animals at once; select a whole group with one tap on its
  header; and text filters now match Exact / Starts with / Contains (buyer number
  defaults to Exact so "804" doesn't pull "804X").

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
- [ ] **Customer picker when adding a consignor or buyer.** The Build-a-Load
  "Assign to buyer" box now searches recorded buyer numbers, but the Work Orders
  "add a consignor / buyer" box still only free-types a name — wire the search in
  there too so you pick an existing customer instead of making a duplicate.
- [ ] **Give a brand-new customer a number automatically** (today an added
  customer has no number). Decide the rule and wire it in.
- [ ] **Document generation.** A screen that makes the day's CVIs and
  change-of-ownership paper from the work. (The Sale Day Closeout prints the day's
  billing and Build-a-Load exports a load's EID / back tag for GVL — those are
  steps toward it, but the CVI / change-of-ownership paper itself isn't built.)
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

- Repo: `CATL-Resources/sale-barn-vet` · App: Next.js + Supabase · Site:
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
