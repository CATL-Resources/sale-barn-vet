# Changelog

_Generated from the git history by `npm run changelog`. The hand-written product log lives in `spec-changelog.md`._

## New

- **animals:** show/hide columns with a Columns panel _(2026-06-28, `ec1588e`)_
- **animals:** show Sale Date and Recorded time on every row _(2026-06-28, `d58376f`)_

## Fixes

- **animals:** show every EID tag; add office delete _(2026-06-28, `7404c3a`)_
- a required field that's blank now blocks the save (not just EID) _(2026-06-25, `4afa527`)_

## Docs

- spec GVL eCVI fill-with-Claude workflow _(2026-06-29, `998317a`)_

## Chores

- regenerate changelog _(2026-06-29, `27f58ff`)_

## Other

- Back buttons read "Vet Barn" to match the menu _(2026-06-28, `005f3fe`)_
- Mobile Work Orders: condensed pen cards + Vet Barn label _(2026-06-28, `8de837b`)_
- Current Sale card: Work Orders / Pen List labels, white pill text, more spacing above pills, larger card _(2026-06-28, `37c1c7d`)_
- pinned Save & next banner + reliable scroll-to-scan on success _(2026-06-28, `0ba2b83`)_
- collapsible banner (pills), inline 2nd-EID, required-field emphasis _(2026-06-27, `bf86f20`)_
- Sort pens: moving a pen's cattle no longer spawns a new open pen _(2026-06-27, `72dc7a5`)_
- Mixed-pen owner assignment at the chute: assign per cow, not up front _(2026-06-27, `a3f0eb6`)_
- Capture screen: one status box, and tighter layout _(2026-06-27, `21b8ba0`)_
- Rebuild the chute Work List to the Option E design _(2026-06-27, `aeb795b`)_
- Work Orders board: pill before name, restore photo delete, note under consignor _(2026-06-27, `5a33654`)_
- Capture identity: tap-only 2nd EID, edit-sheet scanning, scannable field grouping (Part B) _(2026-06-27, `f8fc96b`)_
- Harden chute wand scan ingest (Part A: the assembly engine) _(2026-06-27, `ac95256`)_
- Office + capture formatting polish (visual only) _(2026-06-27, `a21b2a2`)_
- Sort-pen closeout on the chute Pen List _(2026-06-27, `45733a8`)_
- Add the closed-out marker columns to pen (closed_at, closed_by) _(2026-06-27, `9605df2`)_
- Show mixed pens as one grouped card on the chute Pen List _(2026-06-27, `4208bda`)_
- backstop unique index for duplicate EIDs within a work order _(2026-06-26, `b9e9d54`)_
- Work Orders desktop: show notes and photos per work order _(2026-06-26, `43e86c2`)_
- Pen List: print the pen card label from a row and mark it printed _(2026-06-26, `307f8af`)_
- Work Orders: Status sort follows the visible status pill _(2026-06-26, `dd8a26e`)_
- Work Orders: pen band on mobile cards + sortable list _(2026-06-26, `e692241`)_
- Make Save & next (and its confirmation) fire faster at the chute _(2026-06-26, `a5c7b53`)_
- Reports hub: Customer Report + Animal Sale Summary, with per-customer drill-down _(2026-06-26, `e4e4b0f`)_
- Reports hub: Billing view — vet, sales tax, admin, SOL as separate buckets _(2026-06-26, `9a99842`)_
- Reports hub: shell + scope/search/switcher + Animals view _(2026-06-26, `1d824e4`)_
- Stronger save confirmation at the chute — big visual, beep, buzz _(2026-06-26, `0d055e5`)_
- Buyer number field accepts letters and numbers (front-end only) _(2026-06-26, `66dc71a`)_
- Stamp pen cards as printed + show a printed icon _(2026-06-26, `6dabaa1`)_
- Restyle the desktop Sale Dashboard to the approved design _(2026-06-26, `7fe401d`)_
- Animals report: filter, sort, group, export (sort pen + mixed pens) _(2026-06-26, `a923cea`)_
- allow deleting pen-photos (add the missing delete policy) _(2026-06-26, `1d9f94b`)_
- pen_work.label_printed_at (schema only) _(2026-06-26, `f2946b6`)_
- Add the app on-screen keyboard to the animal edit sheet _(2026-06-26, `51493fd`)_
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
