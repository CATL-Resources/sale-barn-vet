# Sale Barn Vet — Spec Changelog

## 2026-06-14 — Product created (initial spec, sale-barn training session)
- Established Sale Barn Vet as a standalone product (own repo/DB/site). Rationale in project-memory.md.
- Defined the spine that replaces the predefined-group model: Sale Day (billing container) + Seller/Buyer (cross-day handles) + Animal+Identifier(s) (the thread across the split).
- Defined Batch as consignor-lot (pre-sale) / buyer-split (post-sale), carrying shared descriptors; animal inherits batch defaults, overrides on exception.
- Defined CAPTURE mode (chuteside pen-flow: sticky header [pen/seller/buyer/animal type], fresh fields [tag/quick notes], expected count + tally, explicit "Next Pen" button, soft count flag).
- Defined OFFICE filter-to-build mode (filter captured animals by sale description → designate buyer [saves set + shrinks pool] → hand-tune via quick notes → generate paper; supports ID-only animals).
- Defined outputs: CVI + change-of-ownership, generated from touches.
- Identifiers as a typed list: official EID (15-digit, 840), official metal (2/3/4, A·B·C regular / V·S·T brucellosis), secondary 900 EID (non-official), back tag.
- Attributes: cattle type enum incl. pairs; color/breed at batch when uniform; age as value + designation (designation method = barn-config); preg status gated by cattle type with optional bred-timing (months preferred over seasons); quick notes never sticky.
- Pen demoted to transient point-in-time location.
- DECISION: no hard stops in v1; all checks are soft flags. Flag set defined.
- Established the barn-config pattern (store truth, configure local encoding) as a system-wide principle.
- Architecture: online-primary, concurrent multi-device on one DB, with per-device local fallback (push-on-reconnect). Foundational constraint.

## 2026-06-14 (part 2) — Office layer, pricing, schema applied, stack
- Added the OFFICE work-order layer (consignment_lot + buyer_load as the office work orders the chute fills; three roles; office UX = spreadsheet-fast).
- Locked the pricing model from the live vet sheet (work_type -> vet+SOL per head; Vet Total = charge x head x 1.042; Admin = Vet Total x 5%; SOL Total = charge x head; Total = sum). Admin/tax are uniform barn rates (removed the Drug Free Bull exception as a sheet error).
- FROZEN PRICE snapshots per line; reconciliation totals derived (split buyer/seller + special charges).
- buyer_number = sub-identity of a buyer; typical destination is pre-fill only, actual destination lives on the buyer_load and is what the CVI uses.
- Added exportable XLSX outputs (per-animal change-of-ownership + per-lot billing; tag columns text-typed).
- Added GVL eCVI integration direction (Chrome stopgap -> token integration).
- Set stack: Next.js + Supabase.
- SCHEMA APPLIED to live Supabase project odrcpdnzhnyiofokokum (13 tables, RLS on, seeded). See supabase/migrations.
