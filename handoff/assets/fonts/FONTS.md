# Fonts

## Inter (the only typeface used)

All Sale Barn Vet screens use **Inter** — weights **400, 500, 600, 700, 800**.

The screens load it from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

CSS stack used in the markup: `font-family: 'Inter', sans-serif;`

### Getting the actual font files

Inter is open-source (SIL Open Font License 1.1) — free to bundle in the app.

- Official source / downloads: https://rsms.me/inter/
- GitHub releases (`.woff2`, `.ttf`, variable font): https://github.com/rsms/inter/releases
- npm: `@fontsource/inter` (gives you the `.woff2` files + `@font-face` CSS per weight)

We could not bundle the binary `.woff2` files into this ZIP from the design tool, so drop them in beside this file (`assets/fonts/inter/*.woff2`) and swap the Google `<link>` for local `@font-face` rules if you need an offline build.

## JetBrains Mono — NOT used here

The parent HerdWork design system calls for JetBrains Mono on tabular data, but these Sale Barn Vet screens render all numerals in **Inter with `font-variant-numeric: tabular-nums`** instead. If you adopt JetBrains Mono later, apply it to weight/dosage/ID columns.
