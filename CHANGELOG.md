# Changelog

_Generated from the git history by `npm run changelog`. The hand-written product log lives in `spec-changelog.md`._

## New

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

- **capture:** freeze head_started on the first animal of a bound order _(2026-06-20, `6eed353`)_
- **work-orders:** close the edit panel; pen-first row + three-dots menu _(2026-06-20, `abe7e7b`)_
- **capture:** stop the field cards from clipping their rows _(2026-06-19, `a749dc6`)_

## Docs

- update CHANGELOG for the Work Orders panel + row fixes _(2026-06-20, `e2359d9`)_
- update CHANGELOG for the Work Orders fixes _(2026-06-20, `561afdb`)_
- update CHANGELOG for the Work Orders screen _(2026-06-19, `8228b2b`)_
- refresh TODO.md — customer list loaded, plus what's left _(2026-06-19, `c3e8074`)_
- add TODO.md with capture status and next steps _(2026-06-18, `6e9523d`)_
- refresh St. Onge field list in capture brief (body color now off) _(2026-06-18, `3d08d33`)_

## Tooling

- add a changelog script so npm run changelog works _(2026-06-19, `db43609`)_

## Other

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
