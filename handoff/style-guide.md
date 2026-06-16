# Sale Barn Vet — Style Guide

Visual spec for the Sale Barn Vet mobile screens. Values are taken directly from the screen markup. Sale Barn Vet is a product surface built on the **HerdWork Design System**; these screens use the focused sub-palette below (deep navy + gold + teal on a warm-neutral page).

Mobile frame size: **390 × 844** (the "Build load" desk screen is **468 × 844**). Corner radius on the device frame: 18px.

---

## 1. Color

### Brand & surfaces
| Token | Hex | Use |
| --- | --- | --- |
| Navy (primary surface) | `#0E2646` | Top bar, drawer header, dark cards, primary text on light, pill "selected" fill |
| Navy gradient | `linear-gradient(150deg, #1D4A7C 0%, #12325C 45%, #0E2646 100%)` | All raised navy data cards (sellers, buyers, stat tiles, sticky batch) |
| Gold (accent / primary CTA) | `#F3D12A` | Primary buttons, "Vet" in wordmark, key figures ($ billed), CVI badge, section accent bar |
| Gold pressed | `#E3C01F` | Gold button :active |
| Teal (secondary accent) | `#55BAAA` | Sub-labels on navy, "Sale day" status, scanning state, success dot |
| Teal deep | `#2E9486` / `#1A6B5E` | Teal text on light, "kept" count, check icon |

### Neutrals
| Token | Hex | Use |
| --- | --- | --- |
| Page (frame body) | `#F5F5F0` | Scroll area background |
| Canvas (outside frame) | `#E9E9E4` | Behind the device |
| White | `#FFFFFF` | Fields, white cards, search pill |
| Card-header fill | `#EEF1F6` | Form-section header rows ("Identity", "Filter"…) |
| Card-header border | `#DEE3EC` | 1px under section headers |
| Border (default) | `#D4D4D0` | Field & card borders |
| Row divider | `#ECECE8` | List/result row separators |
| Text primary | `#1A1A1A` | Body / labels |
| Text muted | `#717182` | Secondary text, captions |
| Text placeholder | `#9A9AA6` | Empty field text |
| Navy sub-text | `#8FA8CC` | Captions on navy cards |
| Drawer selected | `#F3F6FB` | Active nav row |

### Semantic / status
| Token | Hex | Use |
| --- | --- | --- |
| Danger (error) | `#E24B4A` | Error banner, duplicate-tag field, flagged note icon |
| Danger bg | `#FCEBEB` | Error field fill, banner sub-text |
| Warning dot | `#F59E0B` | Incomplete lot indicator |
| Scanning field bg | `#E1F5EE` | Active "scanning" / "kept" field, border `#55BAAA` |

### Tag colors (cattle ear-tag swatches)
White `#FFFFFF` (1.5px border `#C9C9C4`) · Yellow `#F3D12A` · Green `#3FA66A` · Orange `#E8853B` · Red `#E24B4A` · Blue `#3B82C4`. Each swatch: 11px circle, `1px solid rgba(0,0,0,0.12)` border.

---

## 2. Typography

**Inter**, weights 400 / 500 / 600 / 700 / 800. Numerals that stack use `font-variant-numeric: tabular-nums`.

| Role | Size / weight | Notes |
| --- | --- | --- |
| Screen title (top bar) | 16px / 600 | letter-spacing −0.01em |
| Wordmark "Sale Barn Vet" | 14–15px / 800 | white + gold |
| Big stat figure | 18–22px / 800 | tabular-nums, on navy cards |
| Stat caption | 10–11px / 600 | `#8FA8CC` |
| Section header (Identity, Filter) | 14px / 700 | navy `#0E2646`, with 26×3px gold accent bar under it |
| Field label (left column) | 14px / 600 | |
| Field value / input text | 16px / 600 | 16px prevents iOS zoom-on-focus |
| Pill / chip label | 13px / 600 | |
| Eyebrow ("STICKY BATCH") | 11px / 700 | letter-spacing 0.07em, uppercase |
| Primary button | 16–17px / 700 | |
| Error banner headline | 22px / 800 | |

---

## 3. Spacing & radius

- **Base unit 4px.** Common steps: 6, 8, 9, 12, 14, 20px.
- Frame padding: scroll area 12–14px; form rows gap 9–12px.
- **Radii:** device frame 18px · data cards 12–13px · stat tiles 11px · fields 10px · section cards 12px · pills & CTAs `999px` (full) · CVI badge 999px.
- **Borders:** always 1px. Default `#D4D4D0`; on navy cards `rgba(255,255,255,0.08–0.14)` plus a `inset 0 1px 0 rgba(255,255,255,0.08)` top highlight.
- **Shadow (device frame only):** `0 12px 32px rgba(14,38,70,0.1)`. The UI itself is border-led, not shadow-led.

---

## 4. Shared components

### Top bar
Navy `#0E2646`, 56–64px tall, frame radius on top corners. Left: 44×44 icon button (menu or back). Center: title + teal status line. Right: contextual action (gold head-count pill, gold `+` add button, or `⋮` overflow). All tap targets ≥44px.

### Nav drawer
280px, slides from left (`translateX(-110%)` → `0`, 220ms `cubic-bezier(0.2,0.7,0.2,1)`). Navy header with wordmark + user line; white body with 46px rows, selected row `#F3F6FB` / weight 700; scrim `rgba(14,38,70,0.35)`.

### Search pill
White, full-radius, 44–46px tall, 1px `#D4D4D0` border, leading search icon (`#717182`), 16px/600 input.

### Stat tile / data card (navy gradient)
The signature surface. Navy gradient + hairline white border + inset top highlight. Stat tiles in a 4-col grid (11px radius). Full-width data cards (12–13px radius) press to `scale(0.97–0.98)`, 150ms.

### Section card (form block)
White, 12px radius, 1px border. Header row: `#EEF1F6` fill, 14px/700 navy title, 26×3px gold accent bar, 1px `#DEE3EC` bottom border. Body: white, 12px padding.

### Form row
Two-column: label column **85px** (capture) / **92px** (build load), 14px/600; field fills the rest at 44px tall, 10px radius. Active "scanning" field: `#E1F5EE` fill + `#55BAAA` border + teal SCANNING tag.

### Pills / chips (selectable)
38px tall (36px secondary), full radius, 13px/600. Unselected: white + `#D4D4D0` border. Selected: navy fill + white text. "Suggested but unconfirmed": `#E1F5EE` fill, teal text, **dashed** `#55BAAA` border. Tag-color chips carry an 11px color swatch; flag chips carry a 12px flag icon (red when off, white when on).

### Buttons
- **Primary (gold):** full-radius, 52–56px tall, navy text, 16–17px/700, `:active` → `#E3C01F`.
- **Secondary (outline):** white fill, 1px navy border, navy text.
- **Icon button:** 44×44 transparent; `:active` lowers opacity. Square gold `+` add button uses 10px radius.

### Badges
- **CVI:** gold pill, navy text, 10px/800, letter-spacing 0.04em.
- **DUPLICATE / SCANNING:** 10px/700 uppercase inline tags in danger / teal.

### Error banner (soft flag)
Full-width danger `#E24B4A` band under the top bar: 28px flag icon + 22px/800 headline + 13px sub-line. **Warns, never blocks** — the offending field turns red (`#FCEBEB` fill, `#E24B4A` border, DUPLICATE tag) but inputs stay live and Save still works.

### Bottom action bar
Fixed inside the frame; 12px padding, 20px bottom inset so the gold CTA stays thumb-reachable.

---

## 5. Motion

- Default ease `cubic-bezier(0.2, 0.7, 0.2, 1)`; durations 150ms (press/state), 180ms (chevrons), 220ms (drawer).
- Press feedback is a 0.97–0.98 scale or a one-step color darken — no bounce, no springs.
- Chevrons rotate 90° on expand. Toggles fade + small position shifts only.

---

## 6. Iconography

Lucide, 1.5–2px stroke, outline only. Subset used (see `assets/icons/`): menu, arrow-left, chevron-right, chevron-down, search, plus, more-vertical (`⋮` row menu), filter, sort (arrow-up-down), flag (notes/flags), check, file (generate CVI). Icon color `#717182` at rest, `#FFFFFF` on navy, `#E24B4A` for destructive/flag. No emoji, no decorative cattle imagery.
