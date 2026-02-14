# AGENTS.md

Guidelines for AI coding assistants (Claude Code, Copilot, Cursor, etc.) working on this project.

## Architecture

This is a **zero-build static site**. No npm, no bundler, no framework. Do not add a build step.

```
index.html              — Line guide tool
compare.html            — Commute comparison tool
coverage.html           — News coverage feed
map.html                — Interactive cutover map
embed.html              — Embed & share configurator
blog.html               — Blog index (lists posts)
blog/                   — Blog posts (2 articles)
card.html               — Info card renderer (URL params → card)
widget.html             — Mini-widget renderer (URL params → tool)
js/i18n.js              — Runtime translation loader with t() function
js/shared.js            — Shared globals: esc(), countdown, date constants, a11y
js/line-data.js         — LINE_DATA and LINE_ORDER globals (shared data model)
js/app.js               — Line guide logic (~1081 lines, IIFE)
js/compare.js           — Comparison tool logic (~722 lines, IIFE)
js/coverage.js          — Coverage feed logic (~240 lines, IIFE)
js/map.js               — Leaflet map logic (~418 lines, IIFE)
js/cards.js             — Card rendering + Canvas PNG export (~593 lines, IIFE)
js/embed.js             — Embed configurator logic (~786 lines, IIFE)
js/widget.js            — Standalone script-tag embed library (~163 lines, IIFE)
css/styles.css          — All styles, CSS custom properties
img/                    — Favicon, OG image, screenshot
data/coverage.json      — Curated article data (37 articles)
data/sources.json       — Citation database (28 verified claims with source links)
data/source-registry.json — Source freshness tracking and verification windows
translations/en.json    — English source strings (~457 keys)
translations/{lang}.json — 10 language files (es, zh, tl, ko, pt, gu, hi, it, ar, pl)
tools/generate-pages.py — Generates translated HTML from templates + JSON (~1556 lines)
tools/validate-data.py  — Data integrity and source verification checks
tools/validate-research-pipeline.py — Source registry schema and freshness validator
tests/                  — 14 test files with 698+ checks (run with node tests/test-*.js)
{lang}/                 — Generated translated pages (80 total, 8 pages × 10 languages)
```

## Rules

1. **No build tools.** Do not add package.json, webpack, vite, or any bundler. The zero-build approach is intentional.
2. **No external dependencies.** No CDN libraries, no npm packages. Everything is vanilla JS/CSS/HTML. Exception: `map.html` loads Leaflet via CDN.
3. **Use `var` declarations.** The codebase uses ES5-style `var` for browser compatibility. Do not convert to `let`/`const`.
4. **IIFE pattern.** All JavaScript is wrapped in `(function() { "use strict"; ... })()`. Keep it that way. Exception: `line-data.js` intentionally exposes globals without IIFE.
5. **Use `esc()` for HTML insertion.** Always sanitize text with the `esc()` helper before inserting into the DOM. Never use `innerHTML` with unsanitized data.
6. **CSS custom properties for theming.** Colors and spacing use `--var-name` tokens defined in `:root`. Use existing tokens; add new ones to `:root` if needed.
7. **Mobile-first responsive.** Breakpoints at 768px and 480px. Test all changes at both sizes.
8. **Data accuracy matters.** All transit information in `LINE_DATA` must be traceable to official NJ Transit sources.
9. **Accessibility trumps design preference always.** WCAG 2.1 AA is the minimum bar. All color contrast must meet AA ratios (4.5:1 for normal text, 3:1 for large text). Every page must include a print stylesheet. Never sacrifice a11y for aesthetics.

## Script load order

Pages load JS in this order — dependencies must be satisfied:

1. `i18n.js` — defines `window.t()` and `window._T`
2. `shared.js` — depends on `t()`; defines `esc()`, `updateCountdown()`, date constants
3. `line-data.js` — standalone; defines `LINE_DATA`, `LINE_ORDER`
4. Page-specific script (`app.js`, `compare.js`, `coverage.js`, `map.js`, `embed.js`, `cards.js`)

`widget.js` is standalone (no dependencies) — loaded via script tag by external sites.

## Data model

The `LINE_DATA` object in `js/line-data.js` drives all content. Each line has an `impactType` that determines which templates render:

- `hoboken-diversion` — Trains rerouted to Hoboken (Montclair-Boonton, Morris & Essex)
- `reduced-service` — Fewer trains, same route (Northeast Corridor, North Jersey Coast)
- `newark-termination` — Trains stop at Newark Penn (Raritan Valley)

To add or modify line data, edit the `LINE_DATA` object directly. The UI generates from this data automatically.

## Translation system

All 8 pages (plus 2 blog posts) are translated into 10 languages using a hybrid approach:

- **Build time:** `tools/generate-pages.py` reads English HTML templates and swaps static text with translated strings from `translations/{lang}.json`. Output goes to `{lang}/` directories (e.g., `es/index.html`).
- **Runtime:** `js/i18n.js` loads `window._T` (injected by the generator) for JS-driven UI strings like station impacts, route cards, and comparison results.

### Translation keys

Keys use dot notation organized by page: `index.*`, `compare.*`, `coverage.*`, `map.*`, `embed.*`, `blog.*` (index), `blog_post.*` (first article), `blog_post_embed.*` (second article), `common.*`, `meta.*`.

### Adding content to translated pages

When adding new visible text to any HTML page:
1. Add a key to `translations/en.json`
2. Add the corresponding replacement logic in `generate-pages.py`
3. Add translated values to all 10 language files
4. Run `python3 tools/generate-pages.py` to regenerate

### What stays in English

Station names, line names (PATH, NJ Transit, Amtrak), and place names are proper nouns and stay in English across all languages. URLs stay unchanged.

## Embed system

Four components work together:

1. **`embed.html` + `embed.js`** — Visual configurator (pick type → configure → preview/copy)
2. **`card.html` + `cards.js`** — Renders info cards as HTML or Canvas PNG
3. **`widget.html`** — Renders mini-widgets (condensed tool views)
4. **`widget.js`** — Script-tag embed library (auto-finds `.reroutenj-embed` elements, injects iframes)

Output formats: iframe, script tag, PNG download, self-contained HTML download.

## Accessibility

**Accessibility is non-negotiable.** A11y compliance (WCAG 2.1 AA minimum) always takes priority over design preferences, brand aesthetics, or convenience. Never ship code that fails accessibility checks.

- Color contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large text) — if brand colors don't meet this, use darkened accessible variants for text
- Print stylesheets are required on all pages
- Skip-to-content links, ARIA labels, roles, and live regions are mandatory
- Minimum 44px touch targets on mobile
- Keyboard navigation must work for all interactive controls

## Testing

14 test files with 698+ automated checks. Run all tests:

```bash
for t in tests/test-*.js; do node "$t"; done
```

Run a specific test:

```bash
node tests/test-line-data-structure.js    # LINE_DATA schema and station counts
node tests/test-transit-facts.js          # Train counts, dates, impact types vs sources
node tests/test-js-integrity.js           # IIFE patterns, esc() usage, XSS checks
node tests/test-html-structure.js         # HTML validity, JSON-LD, meta tags, hreflang
node tests/test-css-a11y.js              # Color contrast, ARIA, touch targets, a11y toggles
node tests/test-translations.js           # Key parity across all 11 languages
node tests/test-coverage-json.js          # Coverage feed data integrity
node tests/test-cross-references.js       # Data consistency across files
node tests/test-seo-sitemap.js            # Sitemap, robots.txt, llms.txt validation
node tests/test-linguistic-*.js           # Per-language linguistic accuracy (5 suites)
```

Also verify manually:
1. Open all HTML pages in a browser (`python3 -m http.server 8000`)
2. Select each line and at least one station per line
3. Test coverage filters and comparison tool
4. Test embed configurator — generate each format, verify preview
5. Resize to mobile (breakpoints at 768px, 480px)
6. Check browser console for errors
