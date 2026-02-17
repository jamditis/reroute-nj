<div align="center">

# Reroute NJ

**Free tools to help NJ Transit riders navigate the Portal North Bridge cutover**

[![Live site](https://img.shields.io/badge/live_site-reroutenj.org-1a3a5c?style=for-the-badge)](https://reroutenj.org)
[![Phase 1](https://img.shields.io/badge/phase_1-Feb_15_--_Mar_15,_2026-e87722?style=for-the-badge)](#timeline)
[![Lines covered](https://img.shields.io/badge/lines_covered-5-0a8f4f?style=for-the-badge)](#lines-covered)
[![Languages](https://img.shields.io/badge/languages-11-6b4fbb?style=for-the-badge)](#translations)

[![GitHub Pages](https://img.shields.io/github/deployments/jamditis/reroute-nj/github-pages?label=deploy&style=flat-square)](https://github.com/jamditis/reroute-nj/deployments)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No build step](https://img.shields.io/badge/build-none_required-lightgrey?style=flat-square)](#running-locally)

<br>

<img src="img/screenshot.png" alt="Reroute NJ showing Bloomfield station impact during the Portal Bridge cutover" width="720">

</div>

---

## What's here

- **[Line guide](https://reroutenj.org/)** — Select your NJ Transit line and station to see how the cutover affects your commute, get route alternatives, and figure out what ticket to buy
- **[Commute comparison](https://reroutenj.org/compare.html)** — Pick your station and Manhattan destination, see every route option side by side with visual time breakdowns
- **[News coverage](https://reroutenj.org/coverage.html)** — 111 articles from local and regional news sources covering the Portal Bridge cutover, with pagination, relevance sorting, and filters by source, category, line, and direction
- **[About](https://reroutenj.org/about.html)** — Methodology, data sourcing, and verification process
- **[Interactive map](https://reroutenj.org/map.html)** — Visualize the Portal Bridge location, affected stations, transfer hubs, and alternative routes
- **[Embed & share](https://reroutenj.org/embed.html)** — Visual configurator with four embed formats: iframe, script tag, PNG image, and self-contained HTML download. Free for newsrooms and publishers
- **[Blog](https://reroutenj.org/blog.html)** — Project updates and feature announcements

## Lines covered

All NJ Transit rail lines affected by the Portal North Bridge cutover:

| Line | Impact | What changes |
|------|--------|--------------|
| Montclair-Boonton | Diverted to Hoboken | All weekday Midtown Direct trains go to Hoboken instead of Penn Station NY |
| Morris & Essex / Gladstone | Diverted to Hoboken | All weekday Midtown Direct trains go to Hoboken instead of Penn Station NY |
| Northeast Corridor | Reduced service | 50% fewer trains between Newark and Penn Station NY |
| North Jersey Coast | Reduced service | 50% fewer trains between Newark and Penn Station NY |
| Raritan Valley | Newark termination | One-seat rides to Penn Station NY suspended; trains terminate at Newark Penn |

## Architecture

Reroute NJ is a zero-build static site. No npm, no webpack, no framework — just HTML, CSS, and vanilla JavaScript.

```
reroute-nj/
├── index.html              # Line guide tool
├── compare.html            # Commute comparison tool
├── coverage.html           # News coverage feed
├── map.html                # Interactive cutover map
├── embed.html              # Embed & share configurator
├── about.html              # Methodology and data sourcing
├── blog.html               # Blog index (lists posts)
├── blog/                   # Blog posts
│   ├── why-we-built-reroute-nj.html
│   └── new-embed-system.html
├── card.html               # Info card renderer (URL params → card)
├── widget.html             # Mini-widget renderer (URL params → tool)
├── robots.txt              # Crawler guidance + AI bot allowances
├── sitemap.xml             # All 90 pages with hreflang cross-references
├── llms.txt                # AI search engine discoverability
├── js/
│   ├── i18n.js             # Translation loader with t() function
│   ├── shared.js           # Shared globals: esc(), countdown, date constants
│   ├── line-data.js        # LINE_DATA and LINE_ORDER globals
│   ├── app.js              # Line guide logic (IIFE)
│   ├── compare.js          # Comparison tool logic (IIFE)
│   ├── coverage.js         # Coverage feed logic (IIFE)
│   ├── map.js              # Leaflet map logic (IIFE)
│   ├── cards.js            # Card rendering + Canvas PNG export (IIFE)
│   ├── embed.js            # Embed configurator (IIFE)
│   └── widget.js           # Standalone script-tag embed library (IIFE)
├── css/
│   └── styles.css          # All styles, CSS custom properties for theming
├── img/
│   ├── favicon.svg         # SVG favicon
│   ├── og-image.png        # Social preview image
│   └── screenshot.png      # README screenshot
├── data/
│   ├── coverage.json       # Article data for the coverage feed (111 articles)
│   ├── sources.json        # Citation database (28 verified claims)
│   └── source-registry.json # Source freshness tracking
├── translations/           # Translation JSON files
│   ├── en.json             # English (base, ~548 keys)
│   ├── es.json             # Spanish
│   ├── zh.json             # Chinese (Simplified)
│   └── ...                 # + 8 more languages
├── tools/
│   └── generate-pages.py   # Generates translated HTML pages from templates
├── tests/                  # 14 test suites with 948+ automated checks
└── {lang}/                 # Generated translated pages (90 total, 9 pages × 10 languages)
    ├── index.html
    ├── compare.html
    ├── coverage.html
    ├── map.html
    ├── embed.html
    ├── about.html
    ├── blog.html
    └── blog/
        ├── why-we-built-reroute-nj.html
        └── new-embed-system.html
```

**Why no build step?** This site serves transit riders during a stressful infrastructure change. A simple architecture means anyone can contribute — including journalists and civic tech volunteers who may not have Node.js installed. Open `index.html` in a browser and you're running the full app.

**Data model:** All transit data lives in the `LINE_DATA` object in `js/line-data.js`. Each line has an `impactType` (`hoboken-diversion`, `reduced-service`, or `newark-termination`) that drives which content templates render. See [AGENTS.md](AGENTS.md) for details.

## Translations

All nine pages are available in 11 languages, chosen based on [NJ Transit ridership demographics](https://www.njtransit.com/):

| Language | Code | Direction |
|----------|------|-----------|
| English | `en` | LTR |
| Spanish | `es` | LTR |
| Chinese (Simplified) | `zh` | LTR |
| Tagalog | `tl` | LTR |
| Korean | `ko` | LTR |
| Portuguese | `pt` | LTR |
| Gujarati | `gu` | LTR |
| Hindi | `hi` | LTR |
| Italian | `it` | LTR |
| Arabic | `ar` | RTL |
| Polish | `pl` | LTR |

All page content is fully translated — navigation, section headings, body text, form labels, filter options, map labels, transfer directions, and informational cards. Station names and line names remain in English across all languages since they're proper nouns on physical signage.

Translations use a hybrid approach: static HTML text is replaced at build time by `tools/generate-pages.py` (~548 translation keys per language), while interactive JS strings load at runtime through `js/i18n.js`. JSON-LD structured data (WebSite, FAQPage, BreadcrumbList, CollectionPage, Article) is also translated per-language with correct localized URLs.

To add a new language, create `translations/{code}.json` following the structure in `translations/en.json`, then run `python3 tools/generate-pages.py`.

## Timeline

| Phase | Dates | Status |
|-------|-------|--------|
| **Phase 1** | Feb 15 – Mar 15, 2026 | Current |
| **Phase 2** | Fall 2026 (estimated) | Planned |

Phase 1 covers the initial Portal North Bridge cutover with 50% service reduction through the Hudson tunnels. Phase 2 will address the second major service change when construction enters the next stage.

## Running locally

No build step. Clone and serve:

```bash
git clone https://github.com/jamditis/reroute-nj.git
cd reroute-nj
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.

## Contributing

There are two ways to help:

**Riders and journalists** — Report incorrect information, suggest improvements, or help verify data against NJ Transit sources. No code required. See the [issue templates](https://github.com/jamditis/reroute-nj/issues/new/choose).

**Developers** — Fix bugs, add features, or improve the tools. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and code conventions.

## Data sources

All transit information is based on official NJ Transit announcements:

- [NJ Transit Portal cutover page](https://www.njtransit.com/portalcutover)
- [NJ Transit rail schedules](https://www.njtransit.com/rail-schedules)
- NJ Transit customer service announcements and press releases

This is an independent community tool. Not affiliated with or endorsed by NJ Transit, Amtrak, or any government agency. Always verify with official sources before traveling.

## Testing and verification

**Automated test suite:** 14 test files with 948+ checks covering data structure, transit facts, JS integrity, HTML structure, CSS accessibility, translations, SEO, and linguistic accuracy.

```bash
# Run all tests
for t in tests/test-*.js; do node "$t"; done

# Run a specific suite
node tests/test-transit-facts.js
```

**Research validation pipeline:** Verifies source freshness and data integrity against official sources.

- `data/sources.json` — citation database with 28 verified claims linked to official sources
- `data/source-registry.json` — source registry with claim areas, freshness windows, and `lastVerified` timestamps
- `tools/validate-data.py` — data integrity checker
- `tools/validate-research-pipeline.py` — source registry schema and freshness validator

```bash
python3 tools/validate-research-pipeline.py
python3 tools/validate-research-pipeline.py --check-urls
```

## Accessibility

**Accessibility is non-negotiable** — a11y compliance (WCAG 2.1 AA minimum) always takes priority over design preferences, brand aesthetics, or convenience.

- Skip-to-content link on every page
- High contrast toggle (persisted via localStorage)
- Simplified view toggle for reduced visual complexity
- Keyboard-navigable station selector, tabs, and interactive controls
- ARIA labels, roles, and live regions for screen readers
- Mobile hamburger menu with proper focus management
- Minimum 44px touch targets on mobile
- Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Print stylesheets on all pages

## SEO and discoverability

The site is optimized for Google search, newsroom adoption, and AI search tools (ChatGPT, Gemini, Perplexity, Claude):

- **`robots.txt`** — Allows all crawlers with explicit AI bot allowances (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
- **`sitemap.xml`** — All 90 pages with `xhtml:link` hreflang cross-references for all 11 languages
- **`llms.txt`** — Structured overview for AI search tools following the [llms.txt standard](https://llmstxt.org)
- **JSON-LD structured data** — WebSite, FAQPage (7 questions), Article, BreadcrumbList, and CollectionPage schemas on all pages, translated per-language with localized URLs
- **Canonical tags** — Self-referencing canonical on every page (English and translated)
- **Translated meta descriptions** — Each language has its own meta description and OG tags, not English defaults
- **Citation-ready answer blocks** — Factual intro paragraphs on every tool page for search snippets and AI extraction

## Roadmap

- [x] Full translation of all page content into 10 languages
- [x] SEO foundations (robots.txt, sitemap.xml, canonical tags, structured data)
- [x] AI search optimization (llms.txt, citation-ready content)
- [x] Embed system v2: four output formats, visual configurator, info cards, PNG export
- [x] Blog with proper index + slugged post architecture
- [x] Citation system with verifiable source links on all tools
- [x] Automated test suite (948+ checks across 14 suites)
- [x] Translated JSON-LD structured data across all 90 translated pages
- [x] News coverage feed with 111 articles, pagination, and relevance sorting
- [x] WCAG AA color contrast and heading hierarchy audit
- [ ] Phase 2 coverage when NJ Transit announces fall 2026 service changes
- [ ] Bus bridge and shuttle information
- [ ] Expanded ferry and PATH connection details

Ideas and suggestions welcome in [Discussions](https://github.com/jamditis/reroute-nj/discussions).

## License

[MIT](LICENSE)
