# rancher-vet-101 — Addition: Sale Barn Vet (work-type training session, 2026-06-14)

> Source: sale-barn vet training session with Chandy (St. Onge Livestock practice).
> This product is standalone (Sale Barn Vet); this file is its self-contained readable mirror.
> Merge the norms into a "Standard Practices & Norms (watchdog reference)" section; merge the Q&A into Category #8 (Question Phrasing Patterns). CATL/Chandy + St. Onge defaults — other barns vary; encode as soft defaults, never hard locks.

## Universal tag-format reference (NOT sale-barn-specific — general tag literacy)
This block applies anywhere an official tag appears and also belongs in the shared rancher-vet-101.
- Official US EID: exactly 15 digits, starts with 840 (US country code). Not 840 → not a valid US official EID (foreign tag, misread, or a non-official management EID in the wrong slot).
- Secondary / management EID: may start with 900. Non-official. A 900 tag is legitimate alongside an 840 tag on the same animal; it is not a duplicate and not a violation of the 840 rule.
- Official metal tag: 2-digit state code + 3 letters + 4 numbers (e.g. 46ABC4678, 43VRT5001). Leading 2 digits = state of origin. Letters: A/B/C = regular official tag; V/S/T = brucellosis (bangs) tag. A V/S/T tag therefore implies a bangs vaccinate by the tag alone.

## Norms to add — Sale Barn
- Sale barn has NO predefined animal list. The denominator is replaced by: Sale Day (billing) + Seller/Buyer (cross-day lookup) + Animal+tag (spine).
- Work splits at the sale: SELLER work before (preg check / age / ID), BUYER work after (often because the load is going out of state).
- Every touched animal gets at least one OFFICIAL ID. Official ID = official metal OR official EID; which counts is barn-config (St. Onge = EID). Mixed metal/EID groups are normal; an animal may carry several tags.
- Pen = transient point-in-time location, not structure.
- Tag color can encode age (St. Onge); elsewhere age is encoded by placement or a mark, or recorded as a plain value. Store the age; treat the encoding as barn-config.
- Preg status: bred/open; optional bred-timing as months (preferred) or season. Gated by type — expected for bred cows, optional for pairs, absent for bulls.
- Pairs are normally aged, not preg-checked, but CAN be checked (bred or open both valid).
- Office "filter-to-build": buyer loads are often rebuilt by filtering captured animals by the sale description, then hand-tuned via quick notes. Filters land close, not exact.
- Outputs (CVI, change-of-ownership) are generated from the touches, not authored by hand. Change-of-ownership is the vet's half of a state traceability trail.
- NO hard stops (vet keeps legal judgment); watchdog uses soft flags only: duplicate tag (excl. 840+900), missing official ID, EID not 15-digit/840, metal tag off-format, odd-one-out vs. group, expected-count reached/passed.

## Category #8 Q&A to add — Sale Barn
- "How many are still in that pen?" → expected count minus running tally; pen is a point-in-time location, count is soft (a heads-up, never a block).
- "Which ones did Buyer 44 get?" → office filter-to-build: filter captured animals by the sale description, designate the buyer to save the set; the rest become "not his".
- "Pull up everything for Johnson." / "...for that buyer." → Seller/Buyer are cross-day handles; gather all their work across every day.
- "These are ID-only — just need a health paper." → animals already ID'd pre-sale; don't re-run; isolate the buyer's head by filtering criteria (e.g. "50 purple tags").
- "Re-send / re-print the health paper for that load." → CVI regenerates from the saved buyer set.
- "That tag won't take / it's not an 840." → official EID must be 15 digits and start with 840; a 900 tag is a valid secondary, not the official one.
- "How many head did we do for so-and-so today?" → billing-by-day question; Sale Day is the billing container, scoped by seller/buyer.
