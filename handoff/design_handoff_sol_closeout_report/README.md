# Handoff: SOL Sale Day Closeout Report

## Overview
A printable billing report for **St. Onge Livestock (SOL)** that closes out a single sale
day. It rolls up every vet/admin/SOL charge for a sale into one document, split into
**Sellers (consignors)** and **Buyers (loads)**, with a combined grand total.

The report has **two forms off the same numbers**, toggled by the user:
- **Summary** — one line per customer, fits on a single page.
- **Itemized** — a summary page first, then a detail page listing every work line (per pen,
  per work type), with per-customer subtotals.

The user picks a sale day, opens the Billing tab → Sale Day Closeout, chooses Summary or
Itemized, and downloads a PDF (the design calls `window.print()`).

## About the Design Files
The files in this bundle are a **design reference created in HTML** — a prototype showing the
intended look, layout, and behavior. **It is not production code to copy directly.**

The task is to **recreate this report inside the target codebase** (React, Vue, etc.) using
its established patterns, component library, and data layer — generating the numbers from real
sale-day records rather than the hardcoded sample data shown here. If no environment exists yet,
choose an appropriate framework and implement it there.

`SOL - Closeout Report.dc.html` uses a small in-house templating runtime (`support.js`, also
included). You do **not** need to keep that runtime — read the HTML purely as a visual/structural
spec. The only real logic is the Summary/Itemized toggle and a print button.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and table structure are all
specified below and should be reproduced closely. The sample customers and dollar figures are
placeholder data — the layout, totals math, and formatting rules are the real spec.

## Design Tokens

### Colors
- Page background (screen): `#ECEBE5`
- Paper / card surface: `#FFFFFF`
- Brand navy (headers, totals, body emphasis): `#0E2646`
- Secondary text / metadata: `#6B7280`
- Muted label text (uppercase eyebrows): `#9AA1AC`
- Body data text: `#222222`
- Paper border: `#D4D4D0`
- Table header rule: `#E4E4DE`
- Light row divider: `#F0F0EC`
- Detail-table rule (stronger): `#C9CDD6`
- Gold accent (buyer badge, download button, total strip fill): `#F3D12A`; pressed `#E3C01F`
- Gold total-strip background: `#FBF7E0`; its border `#E6DCA8` / `#E0D7AE`; its label text `#8A6D10`
- Teal (seller badge fill): `#55BAAA`; alt teal pill `#2E9486`
- Flow-strip dark bg: `#0E2646`; its muted text `#9FB4D4`; arrows `#5C7398`; segment inactive text `#CDD8EA`
- Detail group-header row bg: `#EEF1F6`
- Zebra stripe on detail rows: `#F6F7F9`

> Note: this report predates the HerdWork jewel-tone palette and uses SOL's own navy/gold/teal
> brand. Keep these exact values — they are the client's letterhead colors, not the design system's.

### Typography
- **Inter** (400/500/600/700/800) — all UI and labels.
- **JetBrains Mono** (400–700) — all numeric table cells, dollar amounts, head counts, card stats.
  Tabular numerals everywhere (`font-variant-numeric: tabular-nums` on `body`).
- **Alfa Slab One** — the "St. Onge Livestock" letterhead wordmark only. 30px on summary/itemized
  page 1, 24px on the detail page.
- Section eyebrows: 10–12px, weight 800, `letter-spacing: 0.04–0.08em`, `text-transform: uppercase`.
- Big card numbers: 26px/800; head count 20px/800; grand total 19px/800.
- Table body: 12px (summary) / 11.5px (detail). Table headers: 10px (summary) / 9.5px (detail), 800.

### Spacing & radius
- Paper max-width: **904px**, centered; page padding `26px 18px 70px`.
- Paper padding: `34px 36px 26px` (detail page same). Cards radius **10px**; paper radius **10px**;
  badges/pills fully rounded (`999px`); buttons/segmented control **8px**.
- Card/section gaps: 14–22px. Table cell padding: `6–7px 8px` (summary), `5–6px 8px` (detail).

### Shadow
- Paper: `0 14px 34px rgba(8,20,42,0.10)` (screen only — removed in print).

## Screens / Views

There is one screen with a screen-only control strip plus the printable document. The document
renders in one of two forms.

### A. Flow strip (screen only, `.no-print`)
A dark navy (`#0E2646`) rounded bar (radius 14px) above the paper, walking the user through the
5-step path to this report:
1. **Sale Day** — pick the day
2. **Reports** — Billing tab
3. **Sale Day Closeout** — buyer & seller
4. **Choose form** — a segmented control with **Summary** / **Itemized** buttons (active segment =
   gold `#F3D12A` bg, navy text; inactive = transparent, `#CDD8EA` text)
5. **Download** — a gold **PDF** button (download icon + "PDF"), calls `window.print()`

Steps are numbered in 22px translucent-white circles, separated by `→` arrows. Below the strip,
a one-line helper explains: Summary = one line per customer; Itemized = summary page then every
work line; same grand total either way. **This whole strip is hidden in print/PDF output.**

### B. Summary form (one page)
The printable paper contains, top to bottom:
1. **Letterhead** — "St. Onge Livestock" wordmark (Alfa Slab One) + address line
   `PO Box 290, St. Onge, SD 57779 · 1-800-249-1995` on the left; on the right, "Sale Day Closeout",
   the sale date (`Friday, June 26, 2026`), and a generated-timestamp line. Bottom border 2px navy.
2. **Two summary cards** (2-col grid) — **Sellers** (teal badge "4 consignors") and **Buyers**
   (gold badge "5 loads"). Each card: navy header bar; body shows Total billed (big mono $),
   Head count, then a 3-up Vet / Admin / SOL breakdown.
3. **Combined total strip** — gold `#FBF7E0` band: "Sale Day Total · 9 customers · 275 head" on the
   left; Vet / Admin / SOL / **Total** ($3,000.37) on the right.
4. **Sellers table** — columns: Customer, Head, Vet, Admin, SOL, Total. 4 customer rows + a navy
   "Sellers subtotal" row.
5. **Buyers table** — columns: Customer, **Buyer #**, Head, Vet, Admin, SOL, Total. 5 rows + a
   "Buyers subtotal" row. (Buyer # is muted gray, right-aligned; subtotal leaves Buyer # blank.)
6. **Grand total** — single row on a gold fill, 2px navy top border: "Grand total · all customers",
   275, $2,664.40, $133.22, $202.75, $3,000.37.
7. **Footer** — "St. Onge Livestock · Sale Day Closeout · Jun 26, 2026" / "Page 1 of 1".

### C. Itemized form (two pages)
**Page 1** is identical to the Summary form (same letterhead, cards, total strip, summary tables,
grand total) except the title reads "Sale Day Closeout · Itemized" and the footer says
"Page 1 of 4 · Summary".

**Page 2 (detail)** — `page-break-before: always` (class `pb`):
- Smaller letterhead (24px wordmark) + "Itemized detail · every work line" subtitle.
- **Sellers detail table** — columns: Pen, Work Type, Head, Vet/hd, SOL/hd, Vet, Admin, SOL,
  Line Total. Grouped per customer: a `#EEF1F6` group-header row (`Customer · Work Type`) spanning
  all columns, then one row per work line (zebra-striped with `#F6F7F9`), then a "Customer subtotal"
  row. After all customers, an "All sellers · subtotal" row (2px navy top border, `#EEF1F6` fill).
- **Buyers detail table** — same structure; group header adds `· Buyer #NNN`.
- A small italic note for unbilled holds, e.g.
  `Holds (unassigned) — Pen 30 · ID Only · 5 hd · not billed (excluded from totals).`
- **Grand total** row (gold fill) repeated.
- Footer: "Page 2 of 4 · Itemized detail".

## Interactions & Behavior
- **Summary / Itemized toggle**: single state value `form` (`'summary' | 'itemized'`). Switching
  re-renders which document form shows. The active segment button is gold-filled; inactive is
  transparent.
- **PDF / Download**: calls the browser print dialog (`window.print()`). In the target app, wire this
  to the real PDF/print pipeline.
- **Print CSS** (critical to reproduce):
  - `.no-print` (the flow strip + helper text) → `display: none`.
  - `.paper` → drop shadow, border, radius, margins, max-width, and padding; becomes full-bleed.
  - `@page { size: letter portrait; margin: 0.5in; }`; page background switches to white.
  - `.pb` forces a page break before the detail page.
- No hover/loading/error/validation states beyond the segmented control's active state and the
  download button's pressed state (`#E3C01F`). No responsive behavior — this is a fixed-width
  document for letter-size print.

## State Management
- `form`: `'summary' | 'itemized'` — the only UI state. Defaults to `'summary'`.
- Derived: `isSummary`, `isItemized`, and the two segment styles.
- In production, the report data (customers, head counts, per-line and rolled-up Vet/Admin/SOL
  amounts, subtotals, grand total) should be **computed from sale-day records**, not hardcoded.
  Both forms must derive from the same source so the grand total matches exactly.

### Totals math (from the sample data)
- Sellers subtotal: 64 head · Vet $780.46 · Admin $39.03 · SOL $66.50 · Total $885.99
- Buyers subtotal: 211 head · Vet $1,883.94 · Admin $94.19 · SOL $136.25 · Total $2,114.38
- Grand total: 275 head · Vet $2,664.40 · Admin $133.22 · SOL $202.75 · **Total $3,000.37**
- Per detail line: Vet = Head × Vet/hd; SOL = Head × SOL/hd; Admin appears as a separate roll-up
  (≈5% of Vet in the sample). Line Total = Vet + Admin + SOL. Holds/unassigned pens are excluded
  from all totals.

## Assets
- **Fonts**: Inter, JetBrains Mono, Alfa Slab One — loaded from Google Fonts. Swap for the app's
  own font loading. Alfa Slab One is used *only* for the SOL letterhead wordmark; if a real SOL
  logo exists, use it instead.
- **Icons**: one inline SVG (Lucide-style download glyph) on the PDF button. No image files.
- No photography, no other binary assets.

## Screenshots
- `screenshots/summary.png` — the Summary form (single page).
- `screenshots/itemized.png` — the Itemized form (summary page 1 shown; detail page follows below).

## Files
- `SOL - Closeout Report.dc.html` — the design reference (read for structure & styling).
- `support.js` — the templating runtime the prototype needs to render. Not part of the spec; you
  can ignore it when reimplementing. Open the HTML in a browser to view the design live.
