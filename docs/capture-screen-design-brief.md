# Capture screen — design brief (pregnancy fields + quick notes)

A handoff for design. Plain language on purpose. This covers the chuteside
**Capture** screen, with two pieces in focus: the **pregnancy fields** and the
**quick-note buttons**. The data behind both is already built and live; what's
needed now is the look and the feel of how a vet uses them.

---

## Who uses it and where

The vet crew, **at the chute, on a tablet**, animals coming through one at a
time. The whole game is **seconds per head**. They are wet, cold, in a hurry,
and not looking at the screen much. So: big tap targets, almost no typing,
nothing that makes them stop and think.

The screen runs in the app's **phone-width frame** (about 390px wide), even on a
tablet. Design for that narrow, tall column.

---

## The flow this screen lives in (context, so you know where the two pieces sit)

1. The office has already set up the work for a pen (who owns the cattle, what
   kind of work, what kind of cattle, how many head expected). The vet **opens
   that pen** and starts running animals.
2. A **sticky header** stays on screen the whole time and shows the things that
   don't change animal to animal: the pen, the owner, the cattle type, and the
   **type of work** (for example "Preg and Mouth Cows"). These carry over from
   one animal to the next — the vet does not re-enter them.
3. For **each animal**, the vet records the fast stuff: the tag(s), and a few
   attributes. Then taps to save and the screen is ready for the next animal.
4. **Tags and quick notes never carry over.** Every new animal starts blank for
   those. A "lame" note must never bleed onto the next animal.
5. Moving to the next pen is **always an explicit one tap** ("Next Pen"). The
   screen never jumps ahead on its own.

The two pieces below are part of step 3 — the per-animal entry.

---

## Piece 1 — Pregnancy fields (show them only when they apply)

**The rule:** the pregnancy fields only appear for work that actually involves a
pregnancy check. Each type of work carries a yes/no switch for this. Today it's
**on** for **Preg and Mouth Cows** and **Preg Heifers**, and **off** for
everything else. So when the vet is running one of those two kinds of work, the
pregnancy fields show up; otherwise they're not on the screen at all.

When they show, there are **three fields**:

1. **Stage** — pick one. The choices are set per barn. St. Onge's are:
   **Open, Short, Mid, Long, AI, Not checked.** This is the main one and should
   be the easiest to hit — a row of big tap buttons, pick one.
2. **Month bred** — how far along, in months. Only matters once she's known to
   be bred, so it can stay hidden or greyed until Stage says she's carrying.
   A short number entry or a quick stepper — whatever is fastest with gloves on.
3. **Fetal sex** — **Bull / Heifer / Unknown** (stored as M / F / Unknown).
   Three tap buttons. Usually skipped, so it shouldn't get in the way.

Design notes:
- Stage is tapped on nearly every animal in these jobs; month bred and fetal sex
  are occasional. Give Stage the weight; let the other two be lighter.
- Keep the whole group compact — it sits alongside the tag and the other
  attributes, not on its own page.

**One open question for Chandy / design to settle:** right now the pregnancy
fields are switched on by the **type of work** (Preg and Mouth Cows, Preg
Heifers). An older note in our settings spec says they should instead follow the
**type of cattle** (always for bred cows, optional for pairs, never for bulls).
Both are reasonable. We built the work-type switch. If cattle-type is preferred,
that's a small change. Design can assume **work-type switch** for now.

---

## Piece 2 — Quick notes (the tap buttons)

**What they are:** short catch-all labels the vet taps onto an animal — traits,
defects, temperament — so the form doesn't grow a new box for every little
thing. They do double duty later: in the office, the staff rebuild a buyer's
load by filtering on these (for example, "the red ones with horns"), so they
matter beyond just a note.

St. Onge's starting set: **Red, Baldy, Horns, Lame, Lumpjaw, Bad eye, Wild.**

How they should work:
- **A row/grid of tappable pills.** Tap to turn on, tap again to turn off.
  **Many can be on at once** for one animal. (There's already a `Pill`
  component: white with a border when off, navy fill with white text when on —
  match that.)
- **The most-used ones rise to the top on their own.** Every time a note is
  used it counts up, and the order reflects that, so the buttons a vet reaches
  for most are where the thumb already is. A few can also be **pinned** to stay
  up top no matter what.
- **Add one on the spot.** If the animal needs a label that isn't there, the vet
  can type a new one right here without leaving the screen. Ask one thing when
  they do: **keep this just for today, or keep it for good?** ("Just today" ones
  live only for this sale day unless someone promotes them later.)
- **Never sticky.** Every new animal starts with none selected.
- Retired notes can be hidden without deleting them (so old records still read
  right).

Design notes:
- This is a frequent, fast interaction — the pills should be big and forgiving,
  and the selected state must be obvious at a glance.
- The "add a new note" control should be quiet (a small "+ Add") so it doesn't
  compete with the real notes, but easy to reach when needed.

---

## The look (use the app's real style — don't invent a new one)

The app already has a defined palette and primitives. Match them so this screen
drops in.

Colors (the ones you'll likely touch):
- Navy `#0E2646` — the top header bar, and the "on" state of pills/buttons.
- Gold `#F3D12A` — the main action accent (the save / primary button).
- Teal `#55BAAA` / teal fill `#E1F5EE` — "done / complete" states.
- Page `#F5F5F0`, cards white with a light header `#EEF1F6` and border `#DEE3EC`.
- Text: near-black `#1A1A1A`, muted grey `#717182`.
- Danger red `#E24B4A` for the soft warnings.

Shape/feel: rounded corners (cards ~12px, fields ~10px, pills fully round), a
calm, sturdy, high-contrast look. The header bar is navy, ~56px tall, white
title, a back arrow on the left, rounded top corners.

Existing building blocks to reuse rather than redraw: `Pill` (the quick notes),
`section-card` (grouping), `gold-button` (primary action), `stat-tile`,
`top-bar`, and the hand-drawn `icons` set.

---

## Hard rules (don't design around these — they're fixed)

- **No hard stops anywhere.** Anything that looks wrong (duplicate tag, missing
  official ID, an animal missing a field the rest of its group has, count
  reached) is a **soft flag** the vet can blow past — never a block. The vet
  holds the legal call.
- **Tags and quick notes are always fresh per animal.** Pen, owner, cattle type,
  and work type are the sticky ones.
- **"Next Pen" is always an explicit tap.** Never auto-advance.

---

## What's already real (so design maps to something true)

- Each work type has the pregnancy on/off switch (`work_type.includes_preg_check`);
  it's on for Preg and Mouth Cows and Preg Heifers.
- The pregnancy stage choices are a per-barn list (St. Onge: Open, Short, Mid,
  Long, AI, Not checked). Month bred and fetal sex are stored on the animal.
- The quick notes are a real list per barn with usage-based ordering, pinning,
  permanent-vs-just-today scope, and an active flag. St. Onge's seven are seeded.
- Which fields show on capture, their order, and whether any are required is
  itself configurable per barn — but for St. Onge, design for this on-set:
  **EID, Tag #, Color, Age, Breed, Stage, Month bred, Fetal sex, Quick notes,
  Notes.**

---

## What I'd ask design to deliver

1. The per-animal capture layout for a **preg job** (so both pieces show), in the
   phone-width frame — resting state, and with a few quick notes selected.
2. The **stage / month-bred / fetal-sex** group on its own, close up.
3. The **add-a-new-quick-note** moment (the little "keep for today or for good?"
   choice).
4. A **non-preg job** layout (same screen with the pregnancy group gone) so we
   see how the screen reflows when those fields aren't there.
