# Changelog

_Generated from the git history by `npm run changelog`. The hand-written product log lives in `spec-changelog.md`._

## New

- **nav:** one slim shared header, single back chevron _(2026-06-23, `e5be1cf`)_
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

## Fixes

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
