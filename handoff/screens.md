# Sale Barn Vet — Screens

Five screens (the chuteside capture screen has two states: filled-in and error). Each screen is a 390 × 844 mobile frame except "Build load", which is a wider 468 × 844 desk screen. PNGs in `screens/`, standalone HTML in `code/`.

---

**01 · Sale day (home)** — `screens/01-sale-day.png` · `code/01-sale-day.html`
The day's home. Reads the room up top (head worked, consignor lots, buyer loads, dollars billed) then lists sellers (pre-sale lots) and buyers (post-sale loads).
- *Menu* (☰) → opens nav drawer (Home / Sellers / Buyers / Settings).
- *Search* → find a seller, buyer, or tag.
- *Sellers / Buyers* section headers → collapse/expand each list.
- *Seller / buyer card* → opens that consignor's lots or buyer's loads.
- *New pen* (gold) → start a new pen/batch to work.

**02 · Chuteside capture** — `screens/02-chuteside-capture.png` · `code/02-chuteside-capture.html`
The hero data-entry screen — seconds per head, buttons only. A sticky batch header (pen, expected, seller, animal type) is set once and rides every animal.
- *Back* → leave capture. *Head count pill* (gold "17 of 30") → working progress / jump.
- *Next pen* → advance the sticky batch to the next pen.
- *Seller / Animal type* (in batch header) → change the batch defaults.
- *Identity fields* (Official ID / Secondary EID / Back tag) → focus a field to scan or type; active field shows SCANNING.
- *Tag color / Preg status / Bred timing / Quick notes* chips → tap to set attributes; `+` adds a custom note.
- *Save & Next* (gold) → save this animal, clear the form, jump focus back to Official ID.

**02b · Chuteside capture — error / duplicate tag** — `screens/02b-chuteside-capture-error.png` · `code/02b-chuteside-capture-error.html`
Same screen with a soft flag. A red banner ("Duplicate tag — 0142 already worked") drops in and the Official ID field turns red with a DUPLICATE tag.
- The flag **warns but never blocks** — fields stay live and *Save & Next* still works.
- *Back / Next pen / chips / Save & Next* behave as on screen 02.

**03 · Buyers (list)** — `screens/03-buyers-list.png` · `code/03-buyers-list.html`
Every buyer on the day as navy data cards — name, buyer number, loads, head count.
- *Back* → home. *Add buyer* (gold `+`) → create a buyer. *More* (⋮) → list-level actions (mass-edit, export, import).
- *Search* → by buyer name or number.
- *All sellers* (filter) / *Most head* (sort) → filter and sort the list.
- *Buyer card* → open that buyer's loads.

**04 · Build a buyer load (desk)** — `screens/04-build-buyer-load.png` · `code/04-build-buyer-load.html`
Office screen (468px wide). Filter captured animals down to one buyer's load, drop the ones that don't belong, then assign and generate the health paper.
- *Back* → buyer. *Seller / Tag color / Animal type* → filter the captured animals; the match count + "kept" count update live.
- *Keep/drop toggle* on each result row → include or exclude that animal (dropped rows strike through and dim).
- *Assign to buyer* (gold) → assign the kept animals as this buyer's load.
- *Generate CVI / Change-of-ownership* (outline) → produce the health/ownership document for the load.
