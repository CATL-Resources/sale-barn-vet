# Changelog

_Generated from the git history by `npm run changelog`. The hand-written product log lives in `spec-changelog.md`._

## New

- **work-list:** "pens to work" wording; tap the head count to see the animals _(2026-06-21, `fc6b007`)_
- one shared header on every screen (replaces per-screen headers) _(2026-06-21, `7b83863`)_
- **capture:** 15-digit EID check, star marker, full number with bold tail, on-demand 2nd EID _(2026-06-21, `4a09610`)_
- **capture:** route scans by shape; required EID hard-blocks _(2026-06-21, `e47bede`)_
- run full screen from the home screen (installable PWA) _(2026-06-21, `36c9ac0`)_
- menu reachable on every screen with Barn Settings; clickable brand; cleaner hub; sticky Save & next _(2026-06-20, `dc4c92b`)_
- **find:** global animal search by EID / back tag / tag number _(2026-06-20, `5d57631`)_
- **work-orders:** Work Cows — office + chute share one start path, plus delete _(2026-06-20, `b2e60a2`)_
- **work-orders:** cancel/reset fix, fast customer search, inline location + customer edit _(2026-06-20, `6a8a429`)_
- **work-orders:** migration — trigram indexes for fast customer search _(2026-06-20, `1b554fc`)_
- **pen-card:** printable DYMO pen card label from a work order _(2026-06-19, `3fc5462`)_
- **home:** build the Home / Sale Days landing screen _(2026-06-19, `4b35d20`)_
- **work-list:** chute Barn Work List + bind Capture to a work order _(2026-06-19, `7527d9b`)_
- **work-orders:** build the office Work Orders screen _(2026-06-19, `742e0f0`)_
- **work-orders:** migration — work-order origin + special-charge link _(2026-06-19, `bbd4948`)_
- **login:** rebuild the sign-in screen in the ChuteSide look _(2026-06-19, `fcdd535`)_
- **settings:** make Barn Preferences editable behind one Save _(2026-06-19, `85a236f`)_
- customer import — schema + data + idempotent load script _(2026-06-19, `61c2629`)_
- **capture:** record a cow — per-work-type fields, scan loop, dup guard, scroll _(2026-06-19, `6f72a8b`)_
- **capture:** chute capture screen wired to live schema with shared sort pens _(2026-06-18, `5217e93`)_
- **settings:** build the Settings screen on St. Onge's real config _(2026-06-18, `f61ddd6`)_

## Fixes

- add the app on-screen keyboard to the animal edit sheet _(2026-06-26, `e3baa1c`)_
- a required field that's blank now blocks the save (not just EID) _(2026-06-25, `4afa527`)_
- pen labels clip on the office Work Orders board _(2026-06-24, `d96cb4d`)_
- duplicate-EID check must not fail silently on a query error _(2026-06-24, `2440e84`)_
- **capture:** instant EID fill + 2nd EID works for two 840 tags _(2026-06-21, `a34d6e9`)_
- **capture:** stop the wand EID scan splitting into a couple of digits _(2026-06-21, `41f9a98`)_
- **layout:** app fills the screen on phone and tablet (remove the 390px frame) _(2026-06-21, `4b7054e`)_
- close-out returns to the chute Work list; block duplicate sale days _(2026-06-20, `054da35`)_
- **work-orders:** close the edit panel; pen-first row + three-dots menu _(2026-06-20, `abe7e7b`)_
- **capture:** stop the field cards from clipping their rows _(2026-06-19, `a749dc6`)_

## Refactor

- **layout:** one shared content container (--content-max); layouts own the shell _(2026-06-21, `8c18143`)_
- **tokens:** single source for colors + sizing; reconcile teal to #55BAAA _(2026-06-21, `0ccb5b8`)_

## Docs

- regenerate changelog _(2026-06-26, `126512e`)_
- log the chute flow + sale day fixes and the test-data wipe _(2026-06-20, `6816a18`)_
- update CHANGELOG for the Work Orders panel + row fixes _(2026-06-20, `e2359d9`)_
- update CHANGELOG for the Work Orders fixes _(2026-06-20, `561afdb`)_
- update CHANGELOG for the Work Orders screen _(2026-06-19, `8228b2b`)_
- refresh TODO.md — customer list loaded, plus what's left _(2026-06-19, `c3e8074`)_
- add TODO.md with capture status and next steps _(2026-06-18, `6e9523d`)_
- refresh St. Onge field list in capture brief (body color now off) _(2026-06-18, `3d08d33`)_

## Tooling

- add a changelog script so npm run changelog works _(2026-06-19, `db43609`)_

## Other

- Capture defaults must never carry to another pen _(2026-06-26, `d92834e`)_
- Pen card detail: clear the iPhone notch, brighten the staged pill _(2026-06-26, `4de7b50`)_
- Pen list: group by pen or work type, and hide done jobs _(2026-06-26, `a381011`)_
- make the "Saved" confirmation bigger and bolder _(2026-06-26, `1c01155`)_
- Sale Dashboard: reachable only from the menu; keep phones off it _(2026-06-26, `4840b78`)_
- Pen list: sync staged, notes, photos & defaults across devices _(2026-06-26, `a4bfa4c`)_
- Pen photos: shrink before upload (fix iPhone), add delete _(2026-06-26, `c434c7e`)_
- Pen card: drop the border box, shift off the clipped edges, bigger HEAD number _(2026-06-26, `68814dd`)_
- Office desktop shell + Sale Dashboard screen _(2026-06-25, `ca34cb0`)_
- Pen card: print on the 30323 portrait feed, rotate the label to landscape _(2026-06-25, `c0c125d`)_
- Pen card: resize to Dymo 30323 label, landscape (4in x 2.125in) _(2026-06-25, `854af99`)_
- Capture header: Animals (teal) and Close out (gold), edge-aligned _(2026-06-25, `01145bc`)_
- Barn Settings: collapsible sections, per-work-type fields, and one Charges table _(2026-06-25, `b3f7920`)_
- Barn Settings: drag to reorder lists instead of up/down arrows _(2026-06-25, `3927fa9`)_
- Capture keyboard: numbers and letters on one keyboard _(2026-06-25, `1e43be6`)_
- Capture screen: smaller Animals and Close out buttons, spread apart _(2026-06-25, `d2085a5`)_
- Pen List: add photos and notes from the job popup; card shows icons only _(2026-06-25, `5a32f54`)_
- Work Orders board cleanup: drop day switcher, one-line toolbar, no Work action, phone cards _(2026-06-25, `a0643fe`)_
- Pen List: view saved photos — follow-up completing the photo feature _(2026-06-25, `df7f236`)_
- pen_session.field_overrides (per-pen field config) _(2026-06-25, `24cb856`)_
- Pen List: mobile two-row card, teal, note flag, photo upload _(2026-06-25, `60c4c8c`)_
- custom-price work type (is_custom_price + special_label) + seed Special _(2026-06-25, `73e6862`)_
- Tidy stat cards: Home current-sale + Sale Day top _(2026-06-25, `2f719cd`)_
- Pen card: resize to a 4x6 shipping label with wrapping _(2026-06-25, `d6374b9`)_
- Specials in the live work-order form: compute + freeze _(2026-06-25, `edb56ba`)_
- Quick Notes manager (add / on-off / reorder) _(2026-06-24, `b6d205f`)_
- Specials as a flexible work type: per-head entry + compute + freeze _(2026-06-24, `bc599ed`)_
- Capture/animal-edit: layout fixes + Remove-Animal safety _(2026-06-24, `c9a171a`)_
- commit on shape match + EID/back-tag validation _(2026-06-24, `7fbbff0`)_
- barn.special_sol_charge + special_charge freeze columns (migration only) _(2026-06-24, `077061b`)_
- Add frozen_* rate columns to special_charge (migration only) _(2026-06-24, `a2b98a1`)_
- Office layer slice 3: the Hold bucket (un-placeable head) _(2026-06-24, `14d6039`)_
- Office layer slice 2: count-mismatch resolution + move engine _(2026-06-24, `a6daff7`)_
- Hub + Sale Dashboard: gradient stat cards, nav-card cleanup, Capture copy _(2026-06-24, `896e3a8`)_
- Fix rapid double-scan EID clipping (burst-detector handoff) _(2026-06-24, `59f7920`)_
- Office layer slice 1: head_billed lever, billing by billed count, audit _(2026-06-24, `70d4f83`)_
- Pen List: rename Up to Staged + per-pen capture defaults _(2026-06-24, `a0c68af`)_
- Office-layer schema for pen_work (migration only) _(2026-06-23, `b642e5a`)_
- on-screen keyboard for the chute _(2026-06-23, `ae3b8bb`)_
- Claude/peaceful lovelace nud54g _(2026-06-23, `cd97dcd`)_
- show fields from each work type's config _(2026-06-23, `1940605`)_
- Yard-crew Up marker and To Grab filter on the Pen List _(2026-06-23, `6f89d6b`)_
- Add pen_session table (schema only, additive) _(2026-06-23, `75d8a43`)_
- Resume an in-progress chute batch after a page refresh _(2026-06-23, `29d5226`)_
- Layout polish: Work Orders board columns and Pen List mobile header _(2026-06-23, `d2e8ef8`)_
- Continue Working button lands on the Pen List _(2026-06-23, `f13a067`)_
- Duplicate-EID guard: fire on entry and clear the field _(2026-06-23, `5d7dc22`)_
- One slim shared header, single back chevron _(2026-06-23, `f913b98`)_
- Office work-order screen: fit phone and tablet _(2026-06-23, `60fd066`)_
- Two-tier hub navigation: Hub and Sale Dashboard _(2026-06-23, `faade81`)_
- Chute animal list + full-record edit pop-up _(2026-06-22, `985fc46`)_
- Second EID: fill-and-wait (no early save) + show it on the animal list _(2026-06-22, `54135f0`)_
- Make the per-work-order price freeze real, and bill from it _(2026-06-22, `0caf596`)_
- Retrigger production deploy (no code change) _(2026-06-22, `0e02b95`)_
- Capture scan: EID reads whole on the tablet again (no more "one digit") _(2026-06-22, `7692003`)_
- Capture scan: clear stale duplicate warning + stop the stray leading digit _(2026-06-22, `f567e07`)_
- Foundation 4b: office Work Orders table scrolls sideways on small screens _(2026-06-21, `07224b5`)_
- Foundation 4a: Title Case the on-screen labels _(2026-06-21, `177d0d3`)_
- Foundation 3b: one shared RequiredMark (the gold star) _(2026-06-21, `a2e7b17`)_
- Foundation 3a: shared Button, SectionCard, and Modal _(2026-06-21, `0780ccb`)_
- Foundation 2: one shared screen header _(2026-06-21, `6438b95`)_
- Capture polish + Barn Settings: lead with pen/seller, no identifier defaults, required shows through, clearer labels _(2026-06-21, `39813ea`)_
- Sale-day hub: one tap splits into office Work orders vs. chute Work the cattle _(2026-06-20, `6f5d554`)_
- one active sale day per date per barn _(2026-06-20, `64b23f3`)_
- Barn Work List (chute view): live worked count, phone/tablet layouts, reachable from Home _(2026-06-20, `5f0dd0a`)_
- freeze the started count on the first animal of a bound office order _(2026-06-20, `a1f7fdb`)_
- Work Orders: Animal list with copy / CSV export for health papers _(2026-06-20, `af37735`)_
- drop "Scan the next cow", close-out returns to Work Orders, Print label in row menu _(2026-06-20, `cca98c4`)_
- hide the Age field for chute ID jobs _(2026-06-20, `fb4fd74`)_
- Settings prefs: field options store + age/ID flexibility, seed St. Onge defaults _(2026-06-17, `3d38126`)_
- St. Onge capture form: turn off age, breed, fetal sex (settings-driven) _(2026-06-17, `ece0ea1`)_
- Capture screen design brief (preg fields + quick notes) _(2026-06-17, `43adb01`)_
- Add missing back-tag columns to barn (schema + seed) _(2026-06-17, `c3593de`)_
- Quick notes table + work-type preg-check flag (schema + seed) _(2026-06-17, `824523c`)_
- Barn preferences schema — field config, age designation, preg stage _(2026-06-17, `b06482d`)_
- Office work-orders screen (pen_work model) _(2026-06-17, `984aa66`)_
- Schema fix: pen + pen_work _(2026-06-16, `c0e1bd8`)_
- Build 2: chuteside Capture screen _(2026-06-16, `38dbb49`)_
- Build 1: app shell + Sale Day home _(2026-06-16, `a42ab7c`)_
- RLS hardening _(2026-06-16, `5ece64d`)_
- Auth + RLS _(2026-06-16, `07acbdf`)_
- Spec sync + live Supabase wiring + Next.js foundation _(2026-06-16, `5cf5e34`)_
- Scaffold Sale Barn Vet v1 _(2026-06-14, `9d65ec6`)_
- first commit _(2026-06-14, `45e0d6a`)_
