# Copilot review instructions — reroute-nj

## Overview

Reroute NJ helps NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026). Six tools, a blog, an embed system, 11 languages, no framework.

**Live site:** https://reroutenj.org
**Deploy:** Cloudflare Pages (Montclair account) via `bash deploy.sh`

## Architecture

Zero-build static site. No npm, no bundler, no framework. Do not add a build step.

- **JS:** ES5-style (`var` declarations), IIFE pattern for all page scripts, no external dependencies (except Leaflet CDN on `map.html`)
- **CSS:** Single file (`css/styles.css`, ~3449 lines), CSS custom properties in `:root`
- **Translation:** Hybrid — build-time HTML replacement via `tools/generate-pages.py` + runtime JS translations via `window.t()` and `window._T`
- **Languages:** English + 10 translations (es, zh, tl, ko, pt, gu, hi, it, ar/RTL, pl)
- **Data model:** `LINE_DATA` in `js/line-data.js` drives all transit content

### Script load order (dependencies matter)

1. `i18n.js` — defines `window.t()` and `window._T`
2. `shared.js` — depends on `t()`; defines `esc()`, countdown, date constants, a11y
3. `line-data.js` — standalone; defines `LINE_DATA`, `LINE_ORDER` globals
4. Page-specific script (`app.js`, `compare.js`, `coverage.js`, `map.js`, `embed.js`, `cards.js`)

`widget.js` is standalone (no dependencies) — loaded via script tag by external sites.

## Build and test

```bash
# Local dev
python3 -m http.server 8000

# Run all tests (14 suites, 948+ checks)
for t in tests/test-*.js; do node "$t"; done

# Regenerate translations
python3 tools/generate-pages.py              # all languages
python3 tools/generate-pages.py es zh        # specific languages

# Validate data
python3 tools/validate-data.py
python3 tools/validate-research-pipeline.py --check-urls

# Deploy
bash deploy.sh
```

## Project layout

```
index.html              Line guide (main tool)
compare.html            Commute comparison
coverage.html           News coverage feed
map.html                Interactive Leaflet map
embed.html              Embed configurator
blog.html               Blog index
blog/                   Blog post pages
card.html               Info card renderer (URL params)
widget.html             Mini-widget renderer (URL params)
js/
  i18n.js               Runtime translation loader
  shared.js             Shared globals: esc(), countdown, a11y
  line-data.js          LINE_DATA and LINE_ORDER
  app.js                Line guide logic (IIFE)
  compare.js            Comparison tool (IIFE)
  coverage.js           Coverage feed (IIFE)
  map.js                Leaflet map (IIFE)
  cards.js              Card rendering + Canvas PNG (IIFE)
  embed.js              Embed configurator (IIFE)
  widget.js             Script-tag embed library (IIFE, standalone)
css/styles.css          All styles, CSS custom properties
translations/           11 JSON files (~548 keys each)
tools/
  generate-pages.py     Static page generator for translations
  validate-data.py      Data integrity checks
  scrape-coverage.py    Automated article discovery (stdlib only)
data/
  coverage.json         Article metadata (auto-updated by scraper)
  sources.json          Citation database
tests/                  14 test suites (948+ checks)
{lang}/                 Generated translated pages (10 dirs x 10 pages)
deploy.sh               Cloudflare Pages deploy
```

## Style rules

- Sentence case only (never Title Case) in UI text, comments, and translations
- No emojis in code, logs, or notifications
- No direct LLM API calls — use CLI tools (`claude -p`, `gemini -p`) via subprocess
- Use `var` (ES5) for browser compatibility — do not convert to `let`/`const`
- WCAG 2.1 AA minimum — accessibility always trumps design preference

## What to flag in reviews

1. **XSS via innerHTML** — All user-facing or data-driven strings inserted into the DOM must go through `esc()` from `shared.js`. Never use `innerHTML` with unsanitized data. The test suite checks for this (`test-js-integrity.js`).

2. **IIFE pattern required** — All page-specific JS files must be wrapped in `(function() { "use strict"; ... })()`. Exception: `line-data.js` intentionally exposes globals without IIFE.

3. **Translation dual-source bug** — English translations live in two places: `translations/en.json` (source of truth) and the `EN` object in `js/i18n.js` (runtime fallback). When adding keys used by `t()` calls in JS, they must be added to BOTH places. Template-only keys (used by `generate-pages.py`) only need to be in `en.json`.

4. **Never set `window._T` to `{}` or any truthy empty value** — `i18n.js` checks `if (!window._T)` to decide whether to load the English fallback. An empty object is truthy and blocks the fallback, causing raw key strings like `js.schedule_changes` to appear in the UI.

5. **Script load order** — `i18n.js` must load before `shared.js`, which must load before the page script. Reordering breaks `t()` and `esc()` availability.

6. **Transit data accuracy** — All line/station data in `LINE_DATA` must be traceable to official NJ Transit sources. Station names, line names, and place names stay in English in translations (proper nouns on physical signage).

7. **HTML entities in translations** — The generator uses `str.replace()`, so `&hellip;` and `…` are different strings. Translation values must match the exact entity form used in the source HTML.

8. **New blog posts require multiple updates** — Adding a blog post requires: creating the HTML file, adding to `PAGES` list in `generate-pages.py`, adding a `PAGE_KEY_MAP` entry, adding translation keys to all 11 language files, and adding replacement logic in `replace_page_specific_content()`.

9. **Missing print stylesheet** — Every page must include a print stylesheet. This is an accessibility requirement, not optional.

10. **Coverage scraper is stdlib-only** — `tools/scrape-coverage.py` uses only Python standard library (`urllib.request`, `html.parser`). Do not add external dependencies (no requests, no beautifulsoup4, no scrapy).
