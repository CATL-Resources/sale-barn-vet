# Sale Barn Vet — Spec (v1)

Product: Sale Barn Vet (salebarnvet.com). The regulatory + health work a beef-cattle vet does AT a sale barn. Standalone product, separate from HerdWork and Work Cows.

## 1. The premise that makes this its own product
Every other product (HerdWork, Work Cows) starts from a PREDEFINED group of known animals you track over time. Sale barn work has none of that:
- No predefined list. Animals arrive as strangers, consigned by people you may not know, seen once, gone.
- The animal is not the point — the OUTPUT DOCUMENT is. The real deliverables are a CVI (health certificate) and a change-of-ownership record. The animal record is scaffolding used to generate those papers.
- This is the one moment an animal's identity transfers from the seller's operation to the buyer's. The tag (EID or metal) is the only thread.

## 2. What replaces the predefined group (the spine)
- SALE DAY — the top container. You create and BILL work by day. Holds both halves of the day (sellers before the sale, buyers after).
- SELLER and BUYER — durable handles that cut ACROSS days. This is how history is searched ("pull up everything for Johnson", "every load Buyer 44 took"). Not free-typed strings on a record — first-class entities the work points back to.
- BATCH — the durable grouping inside a day. Means a consignor's lot BEFORE the sale; a buyer's split AFTER the sale. Carries the shared descriptors.
- ANIMAL + IDENTIFIER(S) — the spine that survives the split and the pen-shuffling. One animal, one-or-more identifiers of any kind.
- The same animal can be touched in BOTH halves (seller pass + buyer pass). It is ONE animal record that picks up a second pass, tied by tag — not two unrelated records.

## 3. Two modes, two locations (core architecture insight)
There is no single workflow. There are two, and they happen in different places.

### CAPTURE mode — chuteside, animals present
Tablet at the chute, gate sliding, "seconds per head". Job: get animals into the system fast.
- Pen-flow / sticky mini-batch: set the shared header ONCE at the top of a pen — it carries to every animal until you start a new batch.
  - STICKY fields (carry until "Next Pen"): pen #, seller, buyer, animal type.
  - FRESH fields (blank every animal): tag(s), quick notes. Quick notes must NEVER be sticky (a "lame" note must not bleed onto the next animal).
- Expected count entered up front; running tally shows "17 of 30".
- "Next Pen / New Batch" button — explicit. The app cannot see the gate slide, so switching pens is a deliberate one-tap action that asks for the new pen/seller/buyer/type. Do NOT auto-advance on count (counts are usually right but not reliably right).
- Count is SOFT: never blocks. A gentle flag fires at/over the expected number ("you're at 30 of 30" / "you've passed the expected count") — a heads-up to recount or hit Next Pen, not a wall.

### OFFICE / ASSEMBLE mode — ~300 yards away, NO animals present
Desk tool that operates on already-captured records to produce papers. Job: filter captured data, not capture.
- FILTER-TO-BUILD buyer loads: pre-sale you may ID a whole consignment (e.g. 100 cows) as ID-ONLY touches (tag + age designation, nothing more). The sale tells you a buyer took 50, described by criteria ("50 head, purple tags"). You often do NOT re-run them — you FILTER the captured 100 by the description, and the matching records ARE the load.
- DESIGNATE BUYER saves the set: assigning the buyer to the filtered group is what saves it as "his". This also shrinks the unassigned pool (the other 50 are now known to be "not his"), so assigning buyers is partly elimination.
- HAND-TUNE against the notes: the filter returns CLOSE, not exact (52 come back when the paper says 50). The vet works it down by hand using the quick notes ("two are lame/lump, probably got kicked out → drop them → 50"). Explicitly fuzzy-but-close work done by judgment. The descriptive fields (color, quick notes, animal type) are load-bearing here — they are the filter + reconciliation criteria, not just metadata.
- The CVI and change-of-ownership GENERATE from the resulting set.

## 4. Outputs (generated, never hand-filled)
- CVI / electronic health paper — surfaces on the BUYER side, esp. out-of-state loads.
- Change-of-ownership — the vet's HALF of a state traceability trail (animal → buyer). The state must combine it with the sale barn's own paperwork to trace an animal; today those halves are not combined. It is populated entirely from captured chuteside data.
- Both papers = the day's touches, reorganized and printed. Record each animal once; the papers fall out.

## 5. Identity + identifiers
- Required: at least ONE official ID per animal. An official ID = an official metal tag OR an official EID. WHICH kind counts is BARN-CONFIG (St. Onge = EID; many barns = metal). Mixed groups (some metal, some EID, some both) are normal.
- An animal may carry MULTIPLE identifiers: official EID + official metal + a secondary 900 EID + a back tag. Model identifiers as a LIST attached to the animal, each typed.
- Identifier types:
  - Official EID — exactly 15 digits, must start with 840 (US country code).
  - Official metal tag — 2-digit state code + 3 letters + 4 numbers (e.g. 46ABC4678, 43VRT5001). Leading 2 digits = state of origin. Letters A/B/C = regular official tag; V/S/T = brucellosis (bangs) tag.
  - Secondary / management EID — non-official, may start with 900. Lives in its own slot; the 840 rule does NOT apply to it and it must not trip the duplicate flag against the official EID.
  - Back tag — barn back-number, often a barcode scan; used on the buyer side.

## 6. Animal attributes (batch sets defaults, animal overrides on exception)
The animal INHERITS the batch's attributes and only stores its own value when different ("only if it's different within the group"). Keeps "seconds per head" honest.
- Cattle type (enum): yearlings, feeder cattle, replacement heifers, weaned cows, bred cows, bulls, drug-free bulls, yearling sale bulls, PAIRS. Type partly predicts the work (pairs → age; bred cows → age + preg; bulls → soundness).
- Color; breed/type (beef vs dairy) — recorded at batch level when the group is uniform, at animal level when it varies.
- Age — captured in two INDEPENDENT optional layers, use one/the other/both:
  - Age VALUE — the real age.
  - Age DESIGNATION — the local encoding of age: St. Onge = TAG COLOR; elsewhere = placement or a mark. The METHOD (color/placement/mark) is BARN-CONFIG; the VALUE (which color, which spot) is entered chuteside. At St. Onge, recording the color IS the age entry (don't force both).
- Preg status — GATED BY CATTLE TYPE: expected for bred cows; AVAILABLE for pairs (a pair can be checked bred or open — valid, not a contradiction); ABSENT for bulls (field not shown). Values: bred / open, plus an optional bred-TIMING designation — season (spring/summer/fall) OR months-along. Prefer months over seasons (seasons confuse people). Sale-barn-specific.
- Quick notes (re-identification / sort handles): colors, horns, lame, lump jaw, etc. Never sticky.
- Also seen: "non-brucellosis vaccinate" status (movement-relevant). Note: a V/S/T metal tag implies bangs-vaccinate by the tag alone — possible future inference, not a v1 requirement.

## 7. Pen = transient location only
Pens are fluid; animals move constantly (feed, water, load-out). A pen is a point-in-time "where are they now / where did they go back to" stamp, recorded on the touch, largely disposable after. NOT a structural grouping.

## 8. Flags — ALL SOFT in v1, NO hard stops
DECISION: no hard legal stops in v1. The hard rules (out-of-state CVI requirements, who-can-sell, bangs gating) vary by destination/species/test and are too complex to encode reliably; a hard stop you get WRONG is worse than none (a tool fighting the vet at the chute, or refusing a paper it should print). The app records and flags; the vet decides. The legal judgment stays with the licensed vet. (Per-state hard-stop layer = possible future, explicitly out of v1.)

Soft flags (v1):
- Duplicate tag (EID, metal, or back tag) within the day — EXCLUDING the legitimate 840-official + 900-secondary pairing on one animal.
- Missing official ID — at least one required; which kind counts is barn-config.
- Official EID not 15 digits / not starting with 840 (field validation).
- Metal tag not matching 2-digit / 3-letter / 4-number format (field validation).
- Animal missing a field the rest of its group has (odd-one-out vs. the batch).
- Expected count reached/passed (gentle).

## 9. The recurring barn-config pattern (system-wide principle)
Every barn encodes the same fact differently (age by color here, placement there, a mark elsewhere; official ID = EID here, metal there). The app stores the UNDERLYING TRUTH (age, official-id-present) and treats the LOCAL ENCODING as barn-level config. Data model stores truth; input screen stores how this barn talks about it. Keeps records portable, chute screen local. This pattern recurs — build it as a pattern once.

## 10. Equipment + architecture
- Chuteside TABLET — capture at the chute.
- Chuteside LAPTOP (a few feet away) — sees upcoming pens / workload ahead; runs filtering + batch editing.
- OFFICE computers (~300 yds, in a building) — same database; write health papers.
- ALL devices live on ONE sale-barn database, concurrently — chute still capturing late animals while the office papers early buyers. This is the fix for today's bottleneck (capture on tablet, then re-batch on laptop): there is no transfer step because the data is in the shared store the moment a tag is scanned.
- ONLINE-PRIMARY with per-device LOCAL FALLBACK: normally live/shared/concurrent. On a dropped connection, the device keeps capturing locally and PUSHES ON RECONNECT. This is a foundational design constraint (resolve source-of-truth/merge for offline edits at the foundation), not a bolt-on. NOTE: this is NOT the Work Cows offline-first model — it is online-first with offline resilience.

## 11. Explicitly OUT of v1
- Any hard stop / legal block.
- Auto-combining the vet's paperwork with the sale barn's own paperwork (a future opportunity if a shared key — EID/back tag/lot — exists).
- One-way push into a master DB (so an animal later in HerdWork could inherit its sale-barn CVI history). Future bridge.
