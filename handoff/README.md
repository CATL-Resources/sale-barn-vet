# Sale Barn Vet — Developer Handoff

Design handoff for the **Sale Barn Vet** screens (the surface we're expanding on). Built on the HerdWork Design System.

## Contents

```
screens/        High-res PNG of every screen (one per state). 2× resolution.
code/           Standalone HTML/CSS for each screen — inline styles, no build step.
                Open any file directly in a browser.
  interactive-source/   The original working prototype (all screens in one file)
                        for reference — open via a local server.
assets/
  logo/         Sale Barn Vet wordmark (SVG, on-dark + on-light).
  icons/        The Lucide icon subset used, as individual SVGs (stroke=currentColor).
  fonts/        Inter usage + where to download the .woff2 files.
style-guide.md  Exact colors, type, spacing, and shared-component specs.
screens.md      One-line description of every screen and what its buttons do.
```

## Screens
1. `01-sale-day` — day home (head/lots/loads/$, seller + buyer lists)
2. `02-chuteside-capture` — chuteside data entry (filled-in)
3. `02b-chuteside-capture-error` — same, with soft duplicate-tag flag
4. `03-buyers-list` — buyers list
5. `04-build-buyer-load` — desk screen: filter → keep/drop → assign → generate CVI

See `screens.md` for button behavior and `style-guide.md` for the visual spec.

## Notes for the build
- The `code/` HTML is **inline-styled** — colors and sizes live on each element, ready to lift into React/JSX or a CSS system. Match values against `style-guide.md`.
- Icons are inline SVG in the markup; the same set is in `assets/icons/` for reuse.
- Inter is loaded from Google Fonts in each file; for an offline/native build, vendor the `.woff2` (see `assets/fonts/FONTS.md`).
- Mobile frames are 390 × 844; the "Build load" desk screen is 468 × 844. Keep tap targets ≥44px.
- `interactive-source/` is the live prototype (uses a small runtime, `support.js`). It needs to be served over http (e.g. `npx serve`) rather than opened as a file. The standalone `code/*.html` files have no such dependency.
