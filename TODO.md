# Sale Barn Vet — to-do & status

Plain-language running list of what's built and what's next. Keep it in everyday
words (see `CLAUDE.md`).

_Last updated: 2026-06-18_

## ✅ Done

- **Chute capture screen is live** — merged to `main` and deploying to
  salebarnvet.com. It's in the menu under **Capture**.
- **One animal at a time into a batch** — a batch is one pen + one job + one
  consignor. Scan the tag to save and roll to the next animal.
- **The screen builds itself from the barn settings** — St. Onge shows the ID
  fields, age by tag color, quick notes, and a freeform note. Stage + Month bred
  show up on their own for a preg-check job. Breed, body color, fetal sex, and
  metal tag stay hidden.
- **Sort = a shared, all-day pen** — sorted animals go into a pen that keeps
  taking animals from later consignors all day; its count keeps growing. Closing
  a batch does not close the sort pen. Each animal still traces back to its own
  seller.
- **Nothing hard-blocks the vet** — a missing required field only warns;
  "Not checked" saves as a finished record.
- **Saving is wired to the real database** — animals, tags (with the official-ID
  flag set), and the batch all write to the live tables.
- **Two data changes made** — added a small freeform "note" field to the animal
  record; set St. Onge's field switches (body color off, tag-color age on).
- **Checked** — typecheck passed, full build passed, and a dry run against the
  live database confirmed the counts and the sort-pen behavior.

## 📋 Next

- [ ] **Real chuteside test** — open Capture on a phone or tablet and run a few
  pretend animals through it. Note anything slow or wrong at the chute.
- [ ] **Office side for chute batches** — a screen to review and bill the batches
  the chute makes (prices, charges, totals — left out on purpose for now).
- [ ] **Settings screen for the field switches** — so the barn can turn fields
  on/off itself instead of us editing the database.
- [ ] **Look inside a shared sort pen by seller** — a per-consignor breakdown of
  who's in a sort pen.
- [ ] **Resume a batch after a refresh** — right now the running count lives only
  for the current session; reopening starts the count fresh (saved animals are
  safe).
- [ ] **Confirm the "Month bred" list** — it currently offers the barn's preg
  months (Sep–Dec). Decide if that's right or if it should be all 12 months.

## ❓ Open questions for the team

- [ ] Should we have touched the saved settings at all, or bake St. Onge's field
  list into the screen instead? (We flipped two switches to match what was
  described.)
- [ ] What should happen to a sort pen at the very end of the day — does someone
  close it out, and where?
