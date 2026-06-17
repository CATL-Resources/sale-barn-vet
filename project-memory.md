# Sale Barn Vet — Project Memory (why / context)

## Origin
Spun out of the work-type training series (2026-06-14 session) that also feeds HerdWork / Work Cows. Sale barn work was found to be a genuinely different domain and was split into its own product.

## Why it's a separate product (not on the shared record layer)
- No predefined group: every other product tracks a known set of owned animals over time; sale-barn animals are strangers seen once.
- The document is the product: the deliverable is the CVI + change-of-ownership, not an animal life history. The animal record is scaffolding to generate papers.
- Identity transfer: the sale barn is the one moment identity hands off between operations; the tag is the only thread.

## The false-worry that nearly drove the decision wrong
The pull to split was partly "we'll lose live shared access unless it pushes to the DB right away." That's a false worry: live/concurrent access comes from the DB being online + shared, NOT from being the SAME DB as HerdWork. A sale-barn-only DB can be just as live and concurrent. "Its own database" and "live shared access" are independent choices. The only real danger is building "separate" as "offline single-device like Work Cows" — which we explicitly are NOT doing. Sale Barn Vet = separate AND online-and-concurrent.

## Architecture decision (2026-06-14)
- Separate repo (github.com/chandyolson/sale-barn-vet), separate database, own site (salebarnvet.com), own spec.
- Online-primary + concurrent (chute tablet + chute laptop + office computers on one DB).
- Per-device local fallback: capture-on-disconnect, push-on-reconnect. Online-first with offline resilience — NOT Work Cows offline-first. Source-of-truth/merge for offline edits is a foundation-level question.
- Future: one-way push into a master DB so HerdWork could inherit sale-barn CVI history. Out of v1.

## Key design insights worth keeping
- Two modes, two places: CAPTURE (chuteside, animals present, seconds-per-head) vs ASSEMBLE (office, no animals, filtering captured data into papers). Treating these as one thing was the original mistake.
- Filter-to-build: buyer loads are often RECONSTRUCTED at the desk by filtering the seller's captured animals against the sale description, then hand-tuning via quick notes — not captured fresh. This is why descriptive fields (color, notes, type) are load-bearing.
- No hard stops in v1: a wrong hard stop is more dangerous than none; legal judgment stays with the licensed vet. Per-state hard rules are a possible future layer.
- Barn-config pattern (store truth, configure local encoding) recurs across fields (official-ID type, age encoding). Build once as a pattern.
- The change-of-ownership is only the vet's HALF of a traceability trail; combining it with the barn's own paperwork is a future opportunity (needs a shared key), not a v1 requirement.

## 2026-06-14 (part 2) — Office layer + live database
- The office Google Sheet was the missing piece: it's the work ORDER (created before the vet works), not a parallel record. consignment_lot/buyer_load ARE that work order; the chute fills it; mark-off becomes derived. Collapses today's Sheet + Zoho double-entry.
- Frozen prices solve the real pain (Chandy adjusts rates and must archive sheets): each line keeps its own rate snapshot, so the rate card edits forward and past bills never change. No more archiving.
- Buyer numbers are allocated per day and not stable buyer-to-buyer; regulars carry a typical destination for pre-fill, but the day's load owns the real destination (it would be a legal error to bake destination into the number — e.g. 811 usually goes to Fall River but not always).
- Stack decision: Next.js + Supabase. Server layer needed for the GVL token + future master push (secrets server-side only).
- DATABASE IS LIVE: Supabase project "Sale Barn Vet" = odrcpdnzhnyiofokokum (us-west-1, org ubkukhruakwaflabwnzh), separate from HerdWork. 13 tables, RLS enabled on all (secure-by-default; policies come with the auth build), billing math in generated columns, seeded with the rate card + animal types. Security advisor run; function search_path hardened.
- Production-hardening checklist + GVL integration are tracked as Notion items.

## 2026-06-16 — pen + pen_work (the model correction)
- The earlier model assumed one pen + one work type per consignor (a "lot"). Reality: a PEN is a physical location whose contents change all day, and the real unit is a PEN-WORK = (one pen + one work type + one owner + the head it was worked on + status), captured as an event.
- Examples that broke the old model: 10 pairs + 2 weigh-ups in one pen = 2 pen_works; 5 head of 3 different buyers in one pen = 3 pen_works; a consignor's 100 head can span several pen_works.
- Billing attaches to the work EVENT and is FROZEN there: an open cow preg-checked this morning keeps her preg charge even after she's re-sorted to the weigh-up pen. So pen_work freezes the rate; animals carry current_pen_id separately from the pen_work they were billed under.
- Consignor and buyer are no longer first-class billing rows — they're ROLLUPS (views) over pen_work for a sale_day.
- Decision: dropped consignment_lot/buyer_load (empty) rather than keep them as rollup tables; rollups are views.
- origin on pen_work anticipates a RECEIVING module: whoever receives cattle enters the mail on their phone (head/seller/type/work), office reviews/accepts, it becomes pen_works with origin='received_phone'. Not built now.
- Consequence for the app: Home/Capture/Buyers were built on the old tables; Home + Capture stubbed and Buyers PR superseded. Screens get re-issued against pen_work (the office work-order screen changes the most — a consignor expands into multiple pen_works).
