# CLAUDE.md

Project-specific instructions for Claude Code sessions working on Reroute NJ.

## Project overview

Reroute NJ is a zero-build static site helping NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026). Five tools, 11 languages, no framework.

**Live site:** https://reroutenj.org

## Architecture

No npm, no bundler, no framework. Do not add a build step.

```
index.html              — Line guide (main tool)
compare.html            — Commute comparison
coverage.html           — News coverage feed
map.html                — Interactive Leaflet map
embed.html              — Embed & share for publishers
blog.html               — Blog index (lists posts)
blog/                   — Blog posts (e.g., blog/why-we-built-reroute-nj.html)
robots.txt              — Crawler guidance + AI bot allowances
sitemap.xml             — All 79 pages with hreflang cross-refs
llms.txt                — AI search engine discoverability
card.html               — Info card renderer (URL params → card)
widget.html             — Mini-widget renderer (URL params → tool)
js/app.js               — Line guide logic (IIFE, ~1000 lines)
js/compare.js           — Comparison tool (IIFE, ~700 lines)
js/coverage.js          — Coverage feed (IIFE)
js/i18n.js              — Runtime translation loader
js/shared.js            — Shared globals: esc(), countdown, dates, initEmbedMode()
js/line-data.js         — LINE_DATA and LINE_ORDER globals (shared by app, cards, widgets)
js/cards.js             — Card rendering + Canvas PNG export (IIFE)
js/embed.js             — Embed configurator logic (IIFE)
js/widget.js            — Standalone script-tag embed library (IIFE)
css/styles.css          — All styles, CSS custom properties in :root
data/coverage.json      — Curated article metadata
translations/en.json    — English source strings (~175 keys)
translations/{lang}.json — 10 translated language files
tools/generate-pages.py — Static page generator for translations
{lang}/                 — Generated translated pages (70 total, 7 pages × 10 languages)
```

## Code conventions

- **IIFE pattern** — All JS wrapped in `(function() { "use strict"; ... })()`
- **`var` declarations** — ES5-style for browser compatibility, do not convert to `let`/`const`
- **`esc()` for HTML** — Always sanitize with `esc()` before DOM insertion
- **CSS custom properties** — Use existing `--var-name` tokens from `:root`
- **No external dependencies** — No CDN libraries, no npm packages

## Translation system

Hybrid approach: build-time HTML replacement + runtime JS translations.

### How it works

1. `tools/generate-pages.py` reads each English HTML template
2. For each of 10 languages, it loads `translations/{lang}.json`
3. String replacement swaps English text with translated text
4. `window._T` is injected as an inline script for runtime JS translations
5. Output goes to `{lang}/` directories (e.g., `es/index.html`)

### SEO in the translation pipeline

`generate-pages.py` handles three SEO-related replacements on every translated page:

- **`replace_meta_description()`** — Swaps `<meta name="description">`, `og:description`, and `twitter:description` with translated values from `meta.{page}_description` and `meta.{page}_og_description` keys
- **`fix_og_url()`** — Rewrites `og:url` to point to the translated page (e.g., `https://reroutenj.org/es/index.html`)
- **`add_canonical()`** — Replaces or inserts `<link rel="canonical">` pointing to the translated page's own URL

These run after `replace_meta()` in the `generate_page()` function. If a translation key is missing, the English value passes through unchanged.

### Key rules for translations

- **Keys use dot notation** organized by page: `index.*`, `compare.*`, `coverage.*`, `map.*`, `embed.*`, `blog.*` (index), `blog_post.*` (articles), `common.*`, `meta.*`
- **Station names, line names, and place names stay in English** — they're proper nouns on physical signage
- **HTML markup in translations** — Translation values can contain `<strong>`, `<a>`, `<code>` tags
- **HTML entities must match exactly** — The generator uses `str.replace()`, so `&hellip;` and `…` are different strings. Match what's in the source HTML.
- **Blog post pages use `PAGE_KEY_MAP`** — `blog/why-we-built-reroute-nj.html` maps to key prefix `blog_post` (not derived from filename). Add new blog posts to both `PAGES` and `PAGE_KEY_MAP` in generate-pages.py.
- **Nested pages need depth-aware asset paths** — `fix_asset_paths()` handles this automatically based on `/` count in the page name.

### Adding new translatable content

1. Add key to `translations/en.json`
2. Add replacement logic in `tools/generate-pages.py` (in `replace_page_specific_content()` under the correct page's `if/elif` block)
3. Add translated values to all 10 language files: es, zh, tl, ko, pt, gu, hi, it, ar, pl
4. Run `python3 tools/generate-pages.py` to regenerate all 70 pages
5. Spot-check at least 2 languages for correct output

### Regenerating pages

```bash
python3 tools/generate-pages.py           # All languages
python3 tools/generate-pages.py es zh     # Specific languages only
```

## Data model

`LINE_DATA` in `js/app.js` drives all content. Each line has an `impactType`:

- `hoboken-diversion` — Trains rerouted to Hoboken (Montclair-Boonton, Morris & Essex)
- `reduced-service` — Fewer trains, same route (NEC, North Jersey Coast)
- `newark-termination` — Trains stop at Newark Penn (Raritan Valley)

## Testing

No test suite. Verify by:
1. Open all 5 HTML pages in a browser
2. Select each line and at least one station per line
3. Test coverage filters and comparison tool
4. Resize to mobile (breakpoints at 768px, 480px)
5. Check browser console for errors
6. After translation changes, check 2+ translated pages for untranslated English

## Common tasks

| Task | Command |
|------|---------|
| Serve locally | `python3 -m http.server 8000` |
| Regenerate translations | `python3 tools/generate-pages.py` |
| Regenerate one language | `python3 tools/generate-pages.py es` |
| Deploy | Push to `main` (GitHub Pages auto-deploys) |
