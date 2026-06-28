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

## 2026-06-21 — Foundation 4a: Title Case for the on-screen labels
- Put the short on-screen labels in Title Case so they read the same everywhere: headings, tab names, menu items, buttons, field labels, section titles, status chips, and modal titles. Examples: "Work orders" → "Work Orders", "Back tag" → "Back Tag", "New sale day" → "New Sale Day", "Not started" → "Not Started", "Start working" → "Start Working", "Sign out" → "Sign Out". Small joining words (a, the, of, to, in, on, by, or, and) stay lowercase unless they lead.
- The Settings page heading now says "Barn Settings", matching the menu item.
- Left in normal sentence case (on purpose): full sentences and helper text, empty-state descriptions, input placeholders, and the running count read-outs (e.g. "5 of 8 head", "2 pens to work · 145 head left").
- Left untouched: the office work-order table's all-caps column headers (PEN, CONSIGNOR, WORK TYPE…), and every data value — work type names, animal type names, pen numbers, customer names, and field keys. Only the words shown on screen changed; nothing about the data or behavior.

## 2026-06-21 — Foundation 4b: the office Work Orders table scrolls sideways on small screens
- The office Work Orders table has fixed-width columns, so on a phone or a portrait tablet it was wider than the screen. Now the table scrolls sideways inside its own card: the whole page never scrolls sideways, and the header row stays lined up with the rows as you scroll across. It keeps a sensible minimum width so the columns don't get crushed; on a wide screen it fills the space as before with no scrollbar.
- Office board only — the chuteside Work List (which already uses flexible rows) was not touched.

## 2026-06-22 — Fix: EID scan no longer splits into "a couple of digits"
- The wand scan catcher treated any gap over 45ms between keystrokes as the start of a brand-new entry, so if a single digit from the wand arrived a touch late (normal on a real wand and a busy phone), it cut the scan in two. The leftover few digits then got read as a back tag and the cursor jumped to that field.
- Now, once a scan is underway, every character is kept together until a real, human-length pause (or the wand's Enter) — one slightly-late key can't split the EID anymore. Slow human typing is still left completely alone, and a typed EID + Enter still works.

## 2026-06-22 — Capture scan: faster, and the 2nd EID works for two 840 tags
- The scanned EID now shows up the instant you scan. Before, the app ran a "is this tag already in this batch?" check against the database first and only filled the field once that came back — on barn wifi that was the lag. The check now runs in the background and still flags a repeat; the Save step still flat-out refuses a real duplicate.
- The 2nd EID field now works for a cow wearing two normal (840) tags. Before, the second 840 scan overwrote the first because the app only sent non-840 (900-series) tags to the 2nd slot. Now, once you tap "2nd EID" to open the slot, scans fill in order — first tag to the main EID, next tag to the 2nd EID — so two 840 tags both land. You still don't need to put the cursor anywhere; the scan goes to the right spot on its own.

## 2026-06-22 — Capture scan: clear the stale duplicate warning + stop the stray leading digit
- The "this tag is already in this batch" warning used to stay on screen after you scanned a different, good tag — making the new tag look like a duplicate too. A fresh scan now clears any leftover message first; the background check puts it back only if the new tag really is a repeat.
- Fixed the stray "8" (the first digit of an EID) getting left behind in the back-tag or tag field. The scan catcher can't tell a wand from a person until the second fast key, so the first character slips into the focused field — now, the instant it knows it's a scan, it pulls that one stray character back out. It used to cascade: the leftover digit pushed the cursor to the next field, where the next scan left another one. Human typing is untouched — the pull-back only happens on a real scan.

## 2026-06-22 — Capture scan: the EID reads whole on the tablet again (no more "one digit")
- On the tablet the wand scan had dropped back to landing as a single digit. The cause was the way the old scan catcher worked: it tried to spot the wand by timing and *blocked* the wand's key presses as they came in, rebuilding the number from a copy it kept. On a slower tablet that timing didn't hold — it either never locked onto the burst, or, once it had blocked a few keys, a single slow key made it throw them away. Those blocked digits were gone, so you were left with just the one stray digit that slipped in first. Every past fix only nudged the timing numbers, so it kept coming back on a different device.
- New approach: the catcher never blocks a key. Every digit lands in the box as it arrives, exactly like normal typing, while the catcher quietly keeps a timed copy. When the wand's Enter arrives it checks that copy — if the characters came in as one fast machine burst it wipes them out of the focused box and routes the whole code by its shape (EID to the EID box, back tag to the back tag box); if it looks like a person typing, it leaves it alone.
- Because no key is ever blocked, a digit can't be lost anymore. Even in the worst case on a janky tablet where the burst isn't recognized, the full number simply stays in the box and the normal Save path still has it — you can't be left with one digit. Scanning the back tag with the cursor still on the EID box, the duplicate check, the 15-digit save block, and human typing all work the same as before.

## 2026-06-26 — Sale Dashboard restyle (desktop office shell) — look only, no number moved
- Restyled the desktop Sale Dashboard and its shell to match the approved design file (docs/design/Sale_Barn_Vet_Office_Desktop.html). This was presentation only: the markup and styles changed, the data did not. Every number on the page still comes from the exact same place it did before, so the desktop dashboard and the phone home screen can never disagree, and money still flows only through the shared pricing helpers. No data fetching, metric math, routing, or state was touched, and the phone home screen and the work-status code were left alone.
- The left rail and the top bar now use soft navy gradients. The five day stats sit together in one dark "feature" band with the "To work" stat made the biggest. The three Jump In cards use the same dark feature look with a small status chip at the bottom. The Work Order Status and Buyers & Sellers panels stay white on the cream page. The consignments strip gets the gold "Add Consignment" button, still turned off because there is no consignment record type yet.
- Added eight shared gradient tokens to the global stylesheet, defined once and referenced from the components: three surfaces (sidebar, header, feature) and five stat cards (worked, to-work, pens, orders, billed). The design file is the source of truth for the exact colors.
- Follow-up note: CLAUDE.md's token list should gain these eight gradient tokens so the house list of named colors stays complete.

## 2026-06-27 — Office + capture polish (formatting pass, look only)
- A presentation-only pass across four screens. No logic, data, routing, count math, or stored value changed — only color, spacing, sizing, and link behavior. Every number still reads from the value it already used.
- Work Orders table: the Work Type column was narrowed and that width handed to Consignor, so a long consignor name fits more before it truncates. The Buyer and Seller tags were recolored so they tell apart at a glance and read with real contrast — Buyer is a gold fill with navy text (the buyer number stays inside the tag), Seller is a teal fill with navy text. New rule on the Worked column: when a row's worked count does not match its head (expected) count, the worked number shows in warn orange and bold; when they match it is left as it was. This is only a text color and weight change on the number already shown — neither the worked nor the head number changes value.
- Capture screen: the navy header block's bottom corners are now rounded to match the rounded content cards below it; the top edge stays flush. The header's contents are unchanged.
- Sale Barn Vet logo: the soft gold "halo" treatment and the tap-to-Home behavior the wordmark already had on other screens were applied to the desktop office shell too. The logo on the Sale Dashboard (sidebar mark and top-bar wordmark) now shows the same halo on hover/focus and links Home, so the logo is a consistent Home link with the halo everywhere it appears.
- Current Sale card (phone home): the stat tiles went from three to two. The Head tile is unchanged. Orders and Pens now share one tile on the existing navy/indigo Orders gradient: Orders reads complete-of-total like the head, "32 of 34", with the open count as a small "2 open" sub-line, and Pens keeps its plain count. The two nav pills below were pushed to opposite edges (Work Orders left, Pen List right) and given distinct on-brand colors — Work Orders teal, Pen List warn-orange, with navy text — and they still carry no counts. Card spacing was tightened to close the gap left by dropping a tile. Every value comes from the same metrics the card already used; complete equals orders minus open, both already shown on the card.

## 2026-06-27 — Capture: collapsible banner, inline 2nd-EID, required-field emphasis (look only)
- Layout-only pass on the chute capture screen. No change to scanning, saving, which fields are required, or any stored value.
- Collapsible banner: the navy banner can collapse to one compact row showing only the back control, the "Animals N" count, the Close out button, and an expand chevron. Expanded, it is the same banner as before (pen + consignor title, work type, the head line, and the progress bar) with a collapse chevron. The choice is remembered per device (localStorage) and defaults to collapsed, so the form and the Save button get more height with no scrolling.
- Inline 2nd EID: the "+ 2nd EID" trigger moved off its own line and onto the EID row itself, to the right of the scan box. The "READER ON" indicator stays where it was. Tap-to-reveal of the second EID field is unchanged.
- Required-field emphasis: each required field (EID, Tag number, Age, Stage, and any other required field the config shows) now carries a thin left accent — amber while empty, green once filled or answered — so it is obvious at a glance what is left to fill. The existing gold required star stays.
- New color token: added `success` = `#16A34A` to the design tokens (the same green as the save confirmation). It pairs with the existing `warning` amber (`#F59E0B`) for the filled/empty accent. No one-off hex was hardcoded.

## 2026-06-27 — Capture "Save & next": pinned result banner + reliable jump back to scan
- Display + feedback only on the chute capture screen. No change to which fields are required, the validation rules, the scan-ingest, or the data write.
- Pinned result banner: the existing save-result message (the one status box) is now pinned to the top of the form, so it stays in view no matter how far down the operator has scrolled. Before, a save result rendered up at the top, off-screen when working at the bottom, so the crew could not tell whether the record saved and advanced or stayed put.
- Blocked is red, named: a blocked "Save & next" (a missing or short EID, or a blank required field) now shows the red error banner naming what is missing — the same red the duplicate-tag block already used — instead of the amber warning color. The crew stays on the same record at the same scroll position; the empty required fields keep their amber field accent.
- Reliable success: every good save now clears the form, loads a fresh record, and jumps the form back to the scan field at the top, ready for the next animal — every time, not only when the browser happened to scroll the re-focused field into view.
- Timing: the green "Saved" banner clears itself after about two seconds (up from about one), or as soon as the next EID entry begins. A blocked banner stays until the operator acts. No new color token — the red was the existing `danger`/error color.
