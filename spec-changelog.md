# Sale Barn Vet — Spec Changelog

## 2026-06-14 — Product created (initial spec, sale-barn training session)
- Established Sale Barn Vet as a standalone product (own repo/DB/site). Rationale in project-memory.md.
- Defined the spine that replaces the predefined-group model: Sale Day (billing container) + Seller/Buyer (cross-day handles) + Animal+Identifier(s) (the thread across the split).
- Defined Batch as consignor-lot (pre-sale) / buyer-split (post-sale), carrying shared descriptors; animal inherits batch defaults, overrides on exception.
- Defined CAPTURE mode (chuteside pen-flow: sticky header [pen/seller/buyer/animal type], fresh fields [tag/quick notes], expected count + tally, explicit "Next Pen" button, soft count flag).
- Defined OFFICE filter-to-build mode (filter captured animals by sale description → designate buyer [saves set + shrinks pool] → hand-tune via quick notes → generate paper; supports ID-only animals).
- Defined outputs: CVI + change-of-ownership, generated from touches.
- Identifiers as a typed list: official EID (15-digit, 840), official metal (2/3/4, A·B·C regular / V·S·T brucellosis), secondary 900 EID (non-official), back tag.
- Attributes: cattle type enum incl. pairs; color/breed at batch when uniform; age as value + designation (designation method = barn-config); preg status gated by cattle type with optional bred-timing (months preferred over seasons); quick notes never sticky.
- Pen demoted to transient point-in-time location.
- DECISION: no hard stops in v1; all checks are soft flags. Flag set defined.
- Established the barn-config pattern (store truth, configure local encoding) as a system-wide principle.
- Architecture: online-primary, concurrent multi-device on one DB, with per-device local fallback (push-on-reconnect). Foundational constraint.

## 2026-06-14 (part 2) — Office layer, pricing, schema applied, stack
- Added the OFFICE work-order layer (consignment_lot + buyer_load as the office work orders the chute fills; three roles; office UX = spreadsheet-fast).
- Locked the pricing model from the live vet sheet (work_type -> vet+SOL per head; Vet Total = charge x head x 1.042; Admin = Vet Total x 5%; SOL Total = charge x head; Total = sum). Admin/tax are uniform barn rates (removed the Drug Free Bull exception as a sheet error).
- FROZEN PRICE snapshots per line; reconciliation totals derived (split buyer/seller + special charges).
- buyer_number = sub-identity of a buyer; typical destination is pre-fill only, actual destination lives on the buyer_load and is what the CVI uses.
- Added exportable XLSX outputs (per-animal change-of-ownership + per-lot billing; tag columns text-typed).
- Added GVL eCVI integration direction (Chrome stopgap -> token integration).
- Set stack: Next.js + Supabase.
- SCHEMA APPLIED to live Supabase project odrcpdnzhnyiofokokum (13 tables, RLS on, seeded). See supabase/migrations.

## 2026-06-16 — Schema fix: pen + pen_work as the work/billing unit
- Replaced the one-pen-per-lot model: PEN is now just a physical location; PEN_WORK (one pen + one work type + one owner + counts + status) is the real workable/billable unit.
- Billing FROZEN on pen_work (frozen rate snapshot + generated totals on head_worked); re-sorting an animal to another pen never alters what was already billed.
- Counts split into head_started / head_expected / head_returned / head_worked (office bills on head_worked).
- Animals now carry pen_work_id (work they were done under) + current_pen_id (where they physically are now).
- Dropped consignment_lot + buyer_load (were empty). Consignor/buyer totals are now rollup VIEWS (seller_rollup / buyer_rollup, security_invoker) over pen_work.
- Added origin on pen_work (office | chute | received_phone) to support a future receiving-by-phone module.
- pen + pen_work: updated_at triggers, barn_id auto-fill, RLS member policies, created_by default; security advisor clean.
- Home + Capture temporarily stubbed (they referenced the dropped tables); Buyers PR closed/superseded. Real screens to be re-issued against the new model.

## 2026-06-20 — Capture freezes the started count for office orders
- When the chute opens Capture on an office work order, the order's started count now freezes on the FIRST animal saved, if it wasn't set yet. The job reads "in progress" from that point, no matter how Capture was reached (not only through the "Work Cows" tap).
- The freeze only fills an empty started count — it never overwrites a count that's already there, so a resumed job is left alone.
- No bill changes: the bill is figured from the worked count, not the started count, and the frozen charge columns are never touched. Chute walk-in batches are unaffected (they set their started count when the batch begins).

## 2026-06-20 — Barn Work List (chute view) built on the live worked count
- The chute crew's read-only list of the office's work orders for a sale day, on phone and tablet. Reuses the office Work Orders read (same consignor / buyer / work type / animal type joins).
- A job's "worked" number is now the live count of animals recorded on it (not the stored worked count that only fills in at close-out). That count alone sets the badge: nothing recorded yet = "Not started" / Open; one or more = "In progress" / Resume.
- Header shows "N to work" (open jobs) and "Head left" (sum of expected minus worked, never below zero). Row head text reads "{expected} head" or "{worked} of {expected} head". Expected head falls back to the started count when the office left it blank.
- Sort: in progress first, then not started; within each, by pen number. Buyer number shows the typed text, then the linked buyer-number record.
- Job detail (read-only): Products line is the job's special-charge descriptions joined with " · ", hidden when there are none; Notes box shows only when the work order has notes. "Start working / Open / Resume" opens Capture bound to that one work order.
- Reachable from Home: each sale day now has a "Work list" button (chute) next to "Work orders" (office). Phone shows two header stat blocks and tap-to-detail; tablet shows inline Open / Resume.

## 2026-06-20 — Chute flow fixes + one sale day per date; test data cleared
- Closing out a pen now returns the crew to the chute Work list for the day (the "what's left" view), not the office Work Orders grid.
- A barn can no longer have two sale days on the same date. The New sale day form points you at the existing day, and a database rule backs it up against races. Soft-deleted days don't count, so a date frees up again if its day is removed.
- Cleared all test data from the live database (every sale day and everything under it: work orders, pens, animals, tags). The real customer list and all barn config were left untouched. Fresh start for real sale days.

## 2026-06-20 — Sale-day hub: office vs. chute
- Tapping a sale day on Home now opens a hub page for that day instead of jumping into one screen. The hub has two clear choices: "Work orders" (office — set up and bill the work) and "Work the cattle" (at the chute — work the pens into capture).
- Replaces the two buttons that were crammed on every sale-day card. The office work-order list and the chute work list are now separate places you pick from the hub.

## 2026-06-20 — Menu on every screen, with Barn Settings
- The hamburger menu (top-left of the header) now opens the real slide-out menu on every screen, including the office Work orders, the chute Work list, and the day hub. Before, on those screens the icon just jumped Home and the menu was nowhere to be found.
- The menu now lists Home, Capture, Sellers, Buyers, and Barn Settings, plus Sign out. Tapping Barn Settings opens the settings screen (view only for now — editing is a separate build).
- The "Sale Barn Vet" wordmark is now a button back to Home, with a soft gold halo when you hover or focus it.
- Dropped the emoji icons from the day hub's two cards — cleaner, just the label and a short line.
- On the capture screen, the "Save & next" button stays put at the bottom instead of dropping below the fold and making you scroll. The capture screen no longer grows taller than the screen.

## 2026-06-20 — Runs full screen from the home screen (installable app)
- Added a web app manifest and the iOS tags so the site can be added to the iPhone home screen and open chromeless — no browser bar. Standalone display, app name "Sale Barn Vet", navy theme (#0E2646) over a cream background (#F5F5F0).
- App icons: a navy "SBV" tile (SVG for the browser/Android, a generated PNG for the iOS home screen).
- The status bar is translucent with white text over the navy header, and the app draws under the notch (viewport-fit=cover); the top bar pads itself so its buttons clear the notch.
- The browser bar only disappears when opened from the home-screen icon. A normal browser tab still shows it — that's the operating system, expected.

## 2026-06-20 — Capture: scans sorted by shape, and a required EID really stops a no-EID record
- The wand now drops each scan in the right box by what the scan looks like, not by which field the cursor is in. Per animal: scan the EID, then scan the back tag, and both land correctly — no tabbing.
  - 15 digits starting 840 → the EID box.
  - 15 digits not starting 840 → a secondary EID box (none set up yet, so that scan is skipped rather than misfiled).
  - anything else (the back tag barcode, like 46MA1234) → the back tag box.
  - After the tags are filled, the cursor drops on the first empty field for typing.
- A scan still fills the box and waits — it never saves the record on its own. The same EID twice in one batch is still refused.
- A required EID is now a hard stop: you can't save or move to the next animal without a real EID — no override. The EID box shows a REQUIRED tag.
- The other "required" fields (preg stage, age, color, …) stay soft: they show the REQUIRED tag but don't block the save, so "Not checked" is still a complete record.
- The EID and back tag never get a filled-in default; they start empty.

## 2026-06-21 — Capture EID field: 15-digit check, star marker, full number, and a second-EID slot
- The EID now has to be a full 15 digits to save. A scanned tag is always 15; this catches a mistyped or short EID and blocks the save with a clear message. While typing, a small "n/15" counter shows the digit count.
- Dropped the "REQUIRED" word in the EID box. A small gold star sits next to the "EID" label instead.
- The whole EID number is shown in the box now (no cutoff), with the last four digits bolded so it's easy to match against a tag.
- Added an on-demand "2nd EID" slot for the rare cow with two EID tags. It stays out of the normal flow — tap "+ 2nd EID" to open it, then a non-840 EID scan (or typing) fills it. It's saved as a non-official secondary EID. Until it's opened, a non-840 EID scan nudges you to open it instead of being misfiled.

## 2026-06-21 — One shared header on every screen
- Built a single header used by every screen, replacing each screen's own top bar. Before, some screens (like Sale Days / Home) had no menu at all; now none can be missing it.
- The header is a navy bar: a hamburger on the left (opens the menu), the current barn name centered (pulled from the barn record, not hardcoded), and the "Sale Barn Vet" wordmark on the right that taps Home — lit with a soft gold glow, no box.
- The menu drawer is short on purpose: Home and Barn Settings (plus Sign out). Barn Settings opens the settings screen, view-only for now. Room to add more later.
- Each screen keeps its own controls (Capture's progress + Close-out, the Work List counts, the Work Orders "Consignor" button) as a slim strip just below the shared header — nothing was lost.
- Removed the old one-off per-screen hamburgers and headers so there's exactly one header style and one menu across the app.

## 2026-06-21 — Capture polish + Barn Settings: identifiers, required, clearer labels
- Capture header now leads with the pen and the consignor/buyer name (big and bold); the work type drops to the quieter second line. The pen and the name are what the crew looks for.
- Barn Settings no longer offers a "Default value" box for the EID or the tags (eid, back tag, tag #, metal tag) — you can't pre-fill a tag.
- The "Required" setting now shows on the capture screen: a required tag (back tag, tag #, metal tag) gets the same gold star the EID has, so Barn Settings and the chute screen agree.
- Clearer placeholders: the back tag says "Scan the back tag barcode"; the tag number says "Type the tag number" (it's typed, not scanned); the metal tag says "Type the metal tag".

## 2026-06-21 — Work List: "pens to work" wording + tap the count to see the animals
- The header count now reads "N pens to work · M head left" (and the phone stat block says "Pens to work"), so it's clear N is a number of pens.
- On a job that's been started, the "x of y head" count is now tappable and opens the animal list for that pen (the same list the office row menu shows — every EID/tag/age/color/breed/preg, with copy and CSV export).

## 2026-06-21 — App fills the screen on phone and tablet (no floating frame)
- The app used to draw inside a fixed 390px box that became an 844px "device frame" (with a border and shadow) on bigger screens, sitting on a slightly darker background — so on a phone it looked framed and on a tablet it sat in a narrow centered column with white space beside it.
- Now the shell fills the screen: full width on phone and tablet, full dynamic-viewport height (no white gap at the bottom). A comfortable max width kicks in only on large desktop monitors (above ~1100px) so rows don't stretch absurdly wide.
- The page background now matches the app surface, so there's no visible frame or border around the content.
- The Capture screen fills the screen at every width. The save bar pads for the phone's home indicator (safe area); the notch is already handled by the shared header.
- Inner content cards are unchanged — only the outer frame and whitespace are gone. No data-entry or saving behavior changed.

## 2026-06-21 — Foundation 1a: one set of color + sizing tokens
- Made components/ui/tokens.ts the single source for colors. The screens that each kept their own copy of the brand colors (Home, Work List, Day Hub, Find, and the office board family) now read them from the tokens file instead.
- Reconciled the teal that had drifted into three shades (#55BAAA, #2E9486, #0E7C86) down to one brand teal (#55BAAA) everywhere. A few screens that were using the darker teals now show the lighter brand teal.
- Added sizing tokens: one content max width (1200px, also a --content-max CSS variable) and phone/tablet/desktop breakpoints. These are defined now; the shared container that uses them comes next.
- Tokens only — no layout, header, button, card, or modal changes.

## 2026-06-21 — Foundation 1b: one shared content container
- Replaced the five different page widths (1280 / 1160 / 1120 / 1100 / 820) with one shared width — every screen now uses --content-max (1200px) and fills phone and tablet, capping only on a large desktop. Built a shared AppContainer (the chute Day Hub and Find use it; the others share the same width token).
- The route-group layouts now own the shell: full height (100dvh) and the cream background live in the layout, so screens stop re-declaring them. The office Work Orders board no longer sets its own height/background/width, and the Work List detail no longer re-declares full height.
- Horizontal padding respects the notch safe area. Layout only — no text, data, or save-path changes.

## 2026-06-21 — Foundation 2: one shared screen header
- Built one shared screen header (a full-width navy bar with square corners) that sits flush right under the app's top bar, so the two read as one navy block — no rounded notch, no gap. It takes a title, an optional second line (in brand teal), an optional back arrow, and an optional control on the right.
- Capture: the pen header used to have rounded top corners, which left a notch under the top bar. It now uses the shared header (pen + consignor on the title line, work type on the second line, the Close out button on the right), with the progress read-out kept as a navy strip directly below. The notch is gone and scanning/saving are unchanged.
- New batch: same fix — the rounded-top header is now the square shared header (Back arrow + "New batch").
- Work List: the standalone navy card became the shared header ("Work list" + barn · date, with the count on the right on a tablet); the phone's stat blocks sit in a navy strip right below, so the whole top is one navy zone.
- Day Hub: the plain text header became the shared header (the date + barn name, with the open/closed status pill on the right).
- Find: the plain heading became the shared header ("Find animal" + its one-line description).
- The office Work Orders board was left as-is: its navy bar is a tab switcher (Work Orders / Buyers / Sellers), not a title bar, and it's already a square navy bar flush under the top bar with no notch. Forcing it into the title header would break the tabs, so it stays a tab bar.
- Header only — no button, card, modal, label, data, or save-path changes.

## 2026-06-21 — Foundation 3a: one button, one card, one modal
- Built one shared button with three looks: primary (gold), secondary (navy), and outline (white with a thin border). The look and the press feel live in one place; each spot still sets its own size.
- Swapped the hand-made gold buttons for the shared one on the screens the crew uses most: Home's "New sale day" (both spots) and its "Start sale", Capture's big "Save & next", and the Work List's row "Open/Resume" and the detail's "Start working". The Work List buttons now use outline (white) when a pen is already in progress and gold when it hasn't started — the same rule as before, just from one place.
- Made the section card (white card with a gray header and a small gold underline) the single way to draw that. Capture's two cards ("Fields" and "Quick notes") and the Work List detail's "Work order" / "Notes" cards now use it instead of their own copies.
- Built one shared modal with three set widths — small (460), medium (480), and large (760). Pointed the New sale day box (small), the Add buyer/consignor box (small), the Work List pen detail (medium, kept as a top sheet), and the animal list (large) at it, replacing four different hand-set widths.
- Left for a later pass (to keep this change focused): the customer edit box, the slide-in work-order form, the office board's smaller buttons, and the login/settings "Save" button still use their own styles. The unused old work-orders-screen file was left alone.
- Look and behavior are the same — this just removes the duplicate copies. The capture save still saves the same way; scanning and the required-EID block are untouched.

## 2026-06-21 — Foundation 3b: one "required" marker (the gold star)
- Required fields were marked two different ways on the capture screen: a small gold star (on the EID and the tags) and an amber "REQUIRED" pill (on the observed fields like age and stage). Now there is one marker — the gold star — used everywhere.
- Barn Settings now shows that same gold star next to a field that's switched to required, so the settings list and the chute screen agree at a glance.
- Nothing about what's required changed: the EID still hard-blocks a save when it's required and empty, and the observed fields still only nudge (the star shows when a required one is still empty). This was a look-only change to the marker.
