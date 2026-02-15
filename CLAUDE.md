# CLAUDE.md

Project-specific instructions for Claude Code sessions working on Reroute NJ.

## Project overview

Reroute NJ is a zero-build static site helping NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026). Six tools, a blog, an embed system, 11 languages, no framework.

**Live site:** https://reroutenj.org
**Repo:** https://github.com/jamditis/reroute-nj

## Architecture

No npm, no bundler, no framework. Do not add a build step.

```
index.html                — Line guide (main tool)
compare.html              — Commute comparison
coverage.html             — News coverage feed
map.html                  — Interactive Leaflet map
embed.html                — Embed & share configurator
blog.html                 — Blog index (lists posts)
blog/                     — Blog posts (individual articles)
  why-we-built-reroute-nj.html
  new-embed-system.html
card.html                 — Info card renderer (URL params → card)
widget.html               — Mini-widget renderer (URL params → tool)
robots.txt                — Crawler guidance + AI bot allowances
sitemap.xml               — All 90 pages with hreflang cross-refs
llms.txt                  — AI search engine discoverability
js/
  i18n.js                 — Runtime translation loader (128 lines)
  shared.js               — Shared globals: esc(), countdown, dates, a11y (191 lines)
  line-data.js            — LINE_DATA and LINE_ORDER globals (245 lines)
  app.js                  — Line guide logic (IIFE, 1081 lines)
  compare.js              — Comparison tool (IIFE, 722 lines)
  coverage.js             — Coverage feed (IIFE, 380 lines)
  map.js                  — Leaflet map logic (IIFE, 427 lines)
  cards.js                — Card rendering + Canvas PNG export (IIFE, 593 lines)
  embed.js                — Embed configurator logic (IIFE, 786 lines)
  widget.js               — Standalone script-tag embed library (IIFE, 163 lines)
css/
  styles.css              — All styles, CSS custom properties in :root (3449 lines)
img/
  favicon.svg             — SVG favicon
  og-image.png            — OpenGraph social preview image
  screenshot.png          — README screenshot
data/
  coverage.json           — Article metadata (111 articles, auto-updated by scraper)
  sources.json            — Citation database (28 verified claims with source links)
  source-registry.json    — Source freshness tracking and verification windows
translations/
  en.json                 — English source strings (~548 keys)
  {lang}.json             — 10 translated language files
tools/
  generate-pages.py       — Static page generator for translations (1788 lines)
  validate-data.py        — Data integrity and source verification checks
  validate-research-pipeline.py — Source registry schema and freshness validator
  scrape-coverage.py      — Automated article discovery (RSS + Google News, 1154 lines)
  scrape-config.json      — Scraper source URLs, feeds, Google News query, and classification keywords
tests/                    — 14 test suites with 948+ automated checks
docs/plans/               — Implementation design docs (SEO, embed system)
.github/
  workflows/static.yml    — GitHub Pages deployment
  ISSUE_TEMPLATE/         — Bug report, data correction, feature request, content suggestion
  pull_request_template.md
{lang}/                   — Generated translated pages (90 total, 9 pages × 10 languages)
```

### Script load order

Pages load JS in this order — dependencies must be satisfied:

1. `i18n.js` — defines `window.t()` and `window._T`
2. `shared.js` — depends on `t()`; defines `esc()`, `updateCountdown()`, date constants, a11y toggles
3. `line-data.js` — standalone; defines `LINE_DATA`, `LINE_ORDER` globals
4. Page-specific script (`app.js`, `compare.js`, `coverage.js`, `map.js`, `embed.js`, `cards.js`)

`widget.js` is standalone (no dependencies) — loaded via script tag by external sites.

### Key globals

| Global | Defined in | Purpose |
|--------|-----------|---------|
| `window.t(key)` | `i18n.js` | Translation lookup (dot notation) |
| `window._T` | `i18n.js` (overwritten by generator) | Translation object |
| `esc(str)` | `shared.js` | XSS-safe HTML escaping |
| `updateCountdown()` | `shared.js` | Updates #countdown element |
| `CUTOVER_START`, `CUTOVER_END` | `shared.js` | Date constants for the cutover period |
| `LINE_DATA` | `line-data.js` | All transit line/station data |
| `LINE_ORDER` | `line-data.js` | Display order of lines |
| `initEmbedMode()` | `shared.js` | Hides chrome when `?embed=true` |

## Code conventions

- **IIFE pattern** — All JS wrapped in `(function() { "use strict"; ... })()`. Exception: `line-data.js` intentionally exposes globals without IIFE.
- **`var` declarations** — ES5-style for browser compatibility. Do not convert to `let`/`const`.
- **`esc()` for HTML** — Always sanitize with `esc()` before DOM insertion. Never use `innerHTML` with unsanitized data.
- **CSS custom properties** — Use existing `--var-name` tokens from `:root`. Add new ones to `:root` if needed.
- **No external dependencies** — No CDN libraries, no npm packages. Exception: `map.html` loads Leaflet via CDN.
- **Mobile-first responsive** — Breakpoints at 768px and 480px. Test changes at both sizes.
- **Data accuracy** — All transit info in `LINE_DATA` must be traceable to official NJ Transit sources.
- **EditorConfig** — 2-space indentation, UTF-8, LF line endings, trim trailing whitespace.
- **Accessibility trumps design preference always** — WCAG 2.1 AA is the minimum bar. All color contrast must meet AA ratios (4.5:1 normal text, 3:1 large text). Every page must include a print stylesheet. Never sacrifice a11y for aesthetics.

## Translation system

Hybrid approach: build-time HTML replacement + runtime JS translations.

### How it works

1. `tools/generate-pages.py` reads each English HTML template
2. For each of 10 languages, it loads `translations/{lang}.json`
3. String replacement swaps English text with translated text
4. `window._T` is injected as an inline script for runtime JS translations
5. Output goes to `{lang}/` directories (e.g., `es/index.html`)

### Supported languages

English (`en`), Spanish (`es`), Chinese Simplified (`zh`), Tagalog (`tl`), Korean (`ko`), Portuguese (`pt`), Gujarati (`gu`), Hindi (`hi`), Italian (`it`), Arabic (`ar`, RTL), Polish (`pl`).

### SEO in the translation pipeline

`generate-pages.py` handles five SEO-related replacements on every translated page:

- **`replace_meta_description()`** — Swaps `<meta name="description">`, `og:description`, and `twitter:description` with translated values from `meta.{page}_description` and `meta.{page}_og_description` keys
- **`fix_og_url()`** — Rewrites `og:url` to point to the translated page (e.g., `https://reroutenj.org/es/index.html`)
- **`add_canonical()`** — Replaces or inserts `<link rel="canonical">` pointing to the translated page's own URL
- **`add_hreflang_tags()`** — Adds `<link rel="alternate" hreflang="...">` tags for all 11 languages + x-default
- **`translate_jsonld()`** — Translates JSON-LD structured data (WebSite, FAQPage, BreadcrumbList, CollectionPage, Article) using `schema.*` keys, with language-prefixed URLs

These run in the `generate_page()` function pipeline. If a translation key is missing, the English value passes through unchanged.

### Key rules for translations

- **Keys use dot notation** organized by page: `index.*`, `compare.*`, `coverage.*`, `map.*`, `embed.*`, `blog.*` (index), `blog_post.*` (first article), `blog_post_embed.*` (second article), `common.*`, `meta.*`, `schema.*` (JSON-LD structured data)
- **Station names, line names, and place names stay in English** — they're proper nouns on physical signage
- **HTML markup in translations** — Translation values can contain `<strong>`, `<a>`, `<code>` tags
- **HTML entities must match exactly** — The generator uses `str.replace()`, so `&hellip;` and `…` are different strings. Match what's in the source HTML.
- **Blog post pages use `PAGE_KEY_MAP`** — Maps page filenames to translation key prefixes:
  - `blog/why-we-built-reroute-nj.html` → `blog_post`
  - `blog/new-embed-system.html` → `blog_post_embed`
  - Add new blog posts to both `PAGES` and `PAGE_KEY_MAP` in generate-pages.py.
- **Nested pages need depth-aware asset paths** — `fix_asset_paths()` handles this automatically based on `/` count in the page name.

### Adding new translatable content

1. Add key to `translations/en.json`
2. Add replacement logic in `tools/generate-pages.py` (in `replace_page_specific_content()` under the correct page's `if/elif` block)
3. Add translated values to all 10 language files: es, zh, tl, ko, pt, gu, hi, it, ar, pl
4. Run `python3 tools/generate-pages.py` to regenerate all 80 pages
5. Spot-check at least 2 languages for correct output

### Adding a new blog post

1. Create the English HTML file in `blog/` (e.g., `blog/new-post.html`)
2. Add the filename to the `PAGES` list in `generate-pages.py`
3. Add a `PAGE_KEY_MAP` entry mapping the filename to a translation key prefix
4. Add all translation keys under that prefix to `translations/en.json`
5. Add replacement logic in the `replace_page_specific_content()` function
6. Add translated values to all 10 language files
7. Update `blog.html` to include the new post card
8. Add blog card translations for the new post under `blog.*` keys
9. Run `python3 tools/generate-pages.py` to regenerate

### Regenerating pages

```bash
python3 tools/generate-pages.py           # All languages
python3 tools/generate-pages.py es zh     # Specific languages only
```

## Data model

`LINE_DATA` in `js/line-data.js` drives all content. Each line has:

- `name`, `shortName` — Display names
- `color` — Hex color code
- `cssClass` — CSS class name
- `impactType` — One of three values (see below)
- `impactLevel` — Severity indicator
- `trainsBefore`, `trainsAfter` — Train count comparison
- `hub` — Main hub station
- `summary` — One-line impact description
- `branches` — Named branches (if applicable)
- `stations` — Array of `{ id, name, branch, zone }` objects

### Impact types

- `hoboken-diversion` — Trains rerouted to Hoboken (Montclair-Boonton, Morris & Essex)
- `reduced-service` — Fewer trains, same route (Northeast Corridor, North Jersey Coast)
- `newark-termination` — Trains stop at Newark Penn (Raritan Valley)

To add or modify line data, edit the `LINE_DATA` object directly. The UI generates from this data automatically.

## Embed system

The embed system has three layers:

1. **`embed.html` + `embed.js`** — Visual configurator wizard (pick type → configure → preview/copy code)
2. **`card.html` + `cards.js`** — Renders info cards (line, station, summary) as HTML or Canvas PNG. URL params control type, line, station, theme, accent, language.
3. **`widget.html`** — Renders mini-widgets (condensed tool views). URL params control tool, line, station.
4. **`widget.js`** — Script-tag embed library. Finds `.reroutenj-embed` elements, reads `data-*` attributes, injects iframes.

Four output formats: iframe embed, script tag, PNG download, self-contained HTML download.

## SEO and discoverability

- **`robots.txt`** — Allows all crawlers; explicit AI bot allowances (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
- **`sitemap.xml`** — 90 pages with `xhtml:link` hreflang cross-references for 11 languages
- **`llms.txt`** — Structured overview for AI search tools following the [llms.txt standard](https://llmstxt.org)
- **JSON-LD structured data** — WebSite, FAQPage, Article, BreadcrumbList, and CollectionPage schemas, translated per-language with localized URLs
- **Canonical tags** — Self-referencing on every page (English and translated)
- **Translated meta descriptions** — Each language has its own meta/OG tags

## Accessibility

**Accessibility is non-negotiable.** A11y compliance (WCAG 2.1 AA minimum) always takes priority over design preferences, brand aesthetics, or convenience. Never ship code that fails accessibility checks.

- Skip-to-content link on every page
- High contrast toggle (persisted via localStorage)
- Simplified view toggle for reduced visual complexity
- Keyboard-navigable controls with ARIA labels, roles, and live regions
- Mobile hamburger menu with proper focus management
- Minimum 44px touch targets on mobile
- Color contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large text) — if brand colors don't meet this, use darkened accessible variants for text
- Print stylesheets are required on all pages

## Testing

14 test files with 698+ automated checks. Run all:

```bash
for t in tests/test-*.js; do node "$t"; done
```

Test suites cover: line data structure, transit facts, JS integrity (IIFE patterns, `esc()` usage, XSS), HTML structure (meta tags, JSON-LD, hreflang), CSS accessibility (contrast, ARIA, touch targets), translations (key parity), coverage JSON, cross-references, SEO/sitemap, and linguistic accuracy (Spanish, Chinese, Korean, Hindi/Gujarati, other).

Also verify manually:
1. Open all HTML pages in a browser (`python3 -m http.server 8000`)
2. Select each line and at least one station per line
3. Test coverage filters and comparison tool
4. Test embed configurator — generate each format, verify preview
5. Resize to mobile (breakpoints at 768px, 480px)
6. Check browser console for errors
7. After translation changes, check 2+ translated pages for untranslated English
8. After data changes, verify card.html and widget.html render correctly with URL params

## Coverage scraper

The scraper (`tools/scrape-coverage.py`) runs 4x daily via cron (00:10, 06:10, 12:10, 18:10) during the cutover period (Feb 15 – Mar 15). It uses the workstation venv (`~/.claude/workstation/venv/bin/python3`).

### What it does each run

1. **Checks official sources** — scrapes NJ Transit and Amtrak pages via Firecrawl, hashes content, compares to previous hash. Changes are logged to `~/.claude/workstation/reroute-snapshots/changelog.log` (no Telegram alert).
2. **Discovers new articles** — polls RSS feeds (NJ Transit, NJ.com, Gothamist) and Google News, scrapes candidates, validates relevance, deduplicates by URL.
3. **Commits and pushes** — auto-commits `data/coverage.json` and `data/source-registry.json`, pulls with rebase, then pushes.

### Notification policy

Telegram alerts go to Joe's phone — use them only for errors.

| Event | Action |
|-------|--------|
| Official source content changed | Log to `changelog.log` + scraper log |
| New articles found | Log only |
| Metadata corrections | Log only |
| Git push failure | Telegram alert |
| Scraper crash | Telegram alert |

### Key paths

| Path | Purpose |
|------|---------|
| `~/.claude/workstation/logs/reroute-scrape.log` | Scraper log (all runs) |
| `~/.claude/workstation/reroute-snapshots/` | Official source content snapshots + hashes |
| `~/.claude/workstation/reroute-snapshots/changelog.log` | Append-only log of official source changes |
| `tools/scrape-config.json` | Source URLs, RSS feeds, keywords, classification rules |

### Git push handling

The scraper does `git pull --rebase` before pushing to handle remote divergence from PRs or manual commits. If rebase conflicts occur (rare — only data files change), the push fails and sends a Telegram alert.

## Common tasks

| Task | Command |
|------|---------|
| Serve locally | `python3 -m http.server 8000` |
| Run all tests | `for t in tests/test-*.js; do node "$t"; done` |
| Regenerate all translations | `python3 tools/generate-pages.py` |
| Regenerate one language | `python3 tools/generate-pages.py es` |
| Regenerate specific languages | `python3 tools/generate-pages.py es zh ko` |
| Validate sources | `python3 tools/validate-research-pipeline.py --check-urls` |
| Validate data | `python3 tools/validate-data.py` |
| Run coverage scraper | `~/.claude/workstation/venv/bin/python3 tools/scrape-coverage.py` |
| Scraper dry run | `~/.claude/workstation/venv/bin/python3 tools/scrape-coverage.py --dry-run` |
| Verify existing articles | `~/.claude/workstation/venv/bin/python3 tools/scrape-coverage.py --verify` |
| Check article links | `~/.claude/workstation/venv/bin/python3 tools/scrape-coverage.py --check-links` |
| Deploy | Push to `main` (GitHub Pages auto-deploys via `.github/workflows/static.yml`) |

## File counts

- **HTML pages:** 101 total (9 English base + 2 blog posts + 90 translated)
- **JS files:** 10 in `js/` (~4,716 lines total)
- **CSS:** 1 file (~3,449 lines)
- **Translation files:** 11 JSON (~548 keys each)
- **Data files:** 3 JSON (111 articles + 28 citations + source registry)
- **Test files:** 14 in `tests/` (948+ checks)
- **Python scripts:** 4 in `tools/` (~3,849 lines total) + 1 JSON config
