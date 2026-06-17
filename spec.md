# Sale Barn Vet — Spec (v1)

Product: Sale Barn Vet (salebarnvet.com). Regulatory + health work a beef-cattle vet does AT a sale barn. Standalone product (own repo, own Supabase database, own site), separate from HerdWork and Work Cows.

## 1. Premise
- No predefined animal list: animals arrive as strangers, seen once, gone.
- The OUTPUT DOCUMENT is the product (CVI + change-of-ownership), not an animal life history.
- The sale barn is the one moment identity transfers between operations; the tag is the only thread.

## 2. The spine that replaces the predefined list
- SALE DAY — top container; you create and BILL by day.
- SELLER / BUYER — durable handles that cut across days; how history is searched.
- BATCH, two forms: CONSIGNMENT LOT (pre-sale, by seller) and BUYER LOAD (post-sale, by buyer). The same animal moves from one to the other; that move is the nature of a sale barn.
- ANIMAL + IDENTIFIER(S) — the thread across the split.

## 3. Three roles / two locations
- OFFICE STAFF (desk, laptop) — set up the work orders (lots) + pricing/reconciliation, BEFORE the work. UX = spreadsheet-fast (keyboard, tab, paste); NOT the chuteside UI.
- VET CREW AT THE CHUTE (tablet) — open the lot the office created and record animals into it. "Seconds per head." No re-entry of pen/seller/type/head.
- VET CREW IN THE OFFICE (~300 yds, laptop) — filter-to-build buyer loads + generate papers, AFTER the sale, animals not present.

## 4. The office layer (replaces today's Google Sheet + Zoho double-entry)
Today: an office Google Sheet (work order + auto-pricing + reconciliation) AND animal records in Zoho, kept in sync by hand. This product collapses both into one pipeline: the office creates the lot; the chute fills it; "marked off" is DERIVED from work done, not a manual check.

### Pricing model (from the live vet sheet — authoritative)
Each work-order line has a WORK TYPE that sets two per-head rates: Vet Charge and SOL (St. Onge Livestock) Charge. For head count H:
- Vet Total = Vet Charge x H x 1.042  (4.2% sales tax folded in)
- Admin = Vet Total x 0.05
- SOL Total = SOL Charge x H
- Total Customer Charge = Vet Total + Admin + SOL Total
FROZEN PRICES: each line copies its rates at work time, so changing the rate card later never alters past bills. This eliminates the "adjust prices -> archive the sheet" cycle; history lives in the records.
RECONCILIATION: the sale day sums all lines split by Buyer vs Seller (Total / Vet / Admin / SOL / Head) plus a grand total; SPECIAL CHARGES (ad-hoc one-offs) fold in. All derived, never typed.
Rate card (vet / SOL per head): Drug Free Bull 13/1.25; Preg and Mouth Cows 11/1.25; Cow ID-Chute 7.5/0.5; Preg Heifers 9/0.5; Bull ID-Chute 10/0.5; Canada Export 16/1.25; ID Only 5/0; Bangs Vaccination 13/0.5; Band 35/1; Pairs 12/1.25; Test Bull 75/1.
Admin (5%) and sales tax (4.2%) are barn settings, uniform across all work types (the Drug Free Bull exception in the old sheet was an error; standardized).

### Buyer numbers
A buyer (party) has MANY buyer numbers; a number is allocated that day and can be non-numeric ("CAM", "418-x"). Regular numbers carry a TYPICAL destination/state/needs (reference list, pre-fill only). The ACTUAL destination lives on that day's buyer load, pre-filled but editable — and the CVI uses the actual, not the typical.

## 5. Identity + attributes
- Required: at least one OFFICIAL ID per animal (official metal tag OR official EID; which counts is barn-config; St. Onge = EID). Mixed metal/EID groups normal; multiple tags per animal normal.
- Identifier types: official EID (15 digits, starts 840); official metal (2-digit state + 3 letters + 4 numbers; A/B/C regular, V/S/T brucellosis); secondary/management EID (e.g. 900-series, non-official); back tag (barcode). Stored as a typed list; value is TEXT (protects the 15-digit string).
- Animal inherits its lot's animal type/color; stores its own value only when different.
- Age: a VALUE and/or a DESIGNATION (encoding) — method (color/placement/mark) is barn-config; St. Onge uses color. Both optional; use one, the other, or both.
- Preg status gated by type: expected for bred cows, available for pairs (bred/open both valid), absent for bulls. Optional bred-timing (months preferred over season).
- Quick notes (horns, lame, lump jaw, colors): re-identification + the filter criteria for filter-to-build; never sticky across animals.

## 6. Office filter-to-build (assemble a buyer load)
Pre-sale you may ID a whole consignment as ID-ONLY (tag only). The sale tells you a buyer took N head, described by criteria ("50 purple tags"). You often DON'T re-run them — filter the captured animals by the description; the matches ARE the load. DESIGNATE BUYER saves the set and shrinks the unassigned pool. The filter lands CLOSE not exact (52 back when the paper says 50); hand-tune via the quick notes. The CVI + change-of-ownership generate from the resulting set.

## 7. Outputs
- CVI (health paper) and CHANGE-OF-OWNERSHIP, generated from the touches, not hand-filled. The change-of-ownership is the vet's HALF of a state traceability trail (combined with the barn's own paperwork by the state).
- EXPORTABLE XLSX: a per-ANIMAL change-of-ownership record (tag, sex, age, color, seller, buyer, destination) and a per-LOT billing/reconciliation view. Tag columns MUST be written as TEXT (exact stored string) to protect 15-digit 840 EIDs — same reason XLSX beat CSV in Work Cows; bites hardest here because it's a legal document. Exact column layout TBD (easy to change; exports read from the tables).
- GVL (GlobalVetLink) eCVI: "generate CVI" produces a GVL-ready payload (header fields + a verified animal list with exact tags). Stopgap path: Claude in Chrome fills GVL via its designate-headers + paste-block entry; the vet reviews and SIGNS (auto-fill yes, auto-sign never). Durable path: GVL integration token (server-side) pushes the payload directly. See the production-hardening + integration items.

## 8. Flags — ALL SOFT in v1, NO hard stops
No legal blocks in v1 (too variable by state/species/test; a wrong hard stop is worse than none; legal judgment stays with the licensed vet). All checks are soft flags, computed live (not stored): duplicate tag (excl. the legit 840+900 pairing), missing official ID (kind = barn-config), EID not 15-digit/840, metal tag off-format, animal missing a field its group has, expected-count reached/passed (gentle). A per-state hard-stop layer is possible future, out of v1.

## 9. The barn-config pattern (system-wide)
Store the underlying truth; treat the local encoding as barn-level config. Recurs across: which tag is official, age encoding (color/placement/mark + the color->age map), billing rates. Build once as a pattern.

## 10. Architecture + stack
- Stack: Next.js + Supabase. Next.js's server layer is required for the GVL token and the future master-DB push (secrets stay server-side, never in the browser).
- Supabase project: "Sale Barn Vet", id odrcpdnzhnyiofokokum, region us-west-1, org ubkukhruakwaflabwnzh. SEPARATE from HerdWork (irsztvspkjfyzhhfbdet).
- ONLINE-PRIMARY + concurrent: chute tablet + chute laptop + office computers live on one database at once. The single shared DB is what removes today's tablet->laptop transfer step.
- LOCAL FALLBACK (foundational, designed-in not bolted-on): each device captures locally when the connection drops and pushes on reconnect. NOT the Work Cows offline-first model — this is online-first with offline resilience. Source-of-truth/merge for offline edits resolved at the foundation.
- Future: one-way push into a master DB so HerdWork could inherit sale-barn CVI history. Out of v1.

## 11. Data model (AS BUILT in Supabase — see supabase/migrations)
All tables: uuid id (client-generatable for offline), created_at/updated_at (auto), created_by, version, deleted_at (soft delete), RLS enabled.
- Config: barn (official_id_type, age_encoding_method, admin_fee_rate, sales_tax_rate), work_type (vet_charge, sol_charge), animal_type, age_color_map, party, buyer_number (number text, typical_destination/state/needs).
- Day: sale_day; special_charge (ad-hoc, folds into reconciliation).
- PEN = physical location only (barn, sale_day, pen_number, notes). Lightweight, reused; contents change through the day. NOT a billing/work unit.
- PEN_WORK = the work/billing unit. One pen + one work_type + one owner (exactly one of seller_party_id / buyer_party_id, enforced by a check constraint) + animal_type + the point-in-time counts (head_started / head_expected / head_returned / head_worked) + status (work_complete, health_complete) + origin (office | chute | received_phone). BILLING IS FROZEN HERE: frozen_vet_charge/sol_charge/admin_rate/tax_rate snapshot at work time, with GENERATED columns vet_total/admin_total/sol_total/total_customer_charge computed on head_worked. Re-sorting an animal to another pen later never changes what was already billed. A consignor's head can span several pen_works; one pen can hold several pen_works.
- Animals: animal (attributes + quick_notes array; pen_work_id = the work it was done under; current_pen_id = where it physically is now, changes on re-sort), identifier (type, value TEXT, is_official).
- Outputs: document (type cvi/change_of_ownership, destination, status, gvl_reference).
- Rollups (views, security_invoker): seller_rollup / buyer_rollup — per-person totals (head_worked + charges) derived from pen_work grouped by seller/buyer for a sale_day. Consignor and buyer are ROLLUPS; itemization lives in pen_work.
- (consignment_lot and buyer_load were the old one-pen-per-lot units; replaced by pen_work and dropped. The animal.consignment_lot_id / buyer_load_id columns remain only as inert legacy columns.)
Seeded: barn (St. Onge Livestock), the 11 work types with rates, the 9 animal types.
FUTURE: a receiving module (whoever receives the cattle enters the mail on their phone → office reviews → becomes pen_works with origin='received_phone'). The origin field already supports it.

## 12. Out of v1
Hard stops; auto-combining with the barn's own paperwork; the master-DB push; the GVL token integration (stopgap-via-Chrome first).
