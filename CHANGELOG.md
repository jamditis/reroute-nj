# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.2] - 2026-02-14

### Added
- **About/methodology page** (`about.html`) — Project methodology, data sourcing, and verification process. Translated into all 10 languages.
- **Google News RSS discovery** — Scraper now uses Google News RSS as primary article discovery source, replacing Firecrawl search which hallucinated URLs
- **HTTP validation gate** — `check_url_status()` verifies every candidate URL returns HTTP 200 before adding to coverage
- **Content relevance gate** — `is_relevant_content()` checks that scraped article text mentions Portal Bridge keywords before adding
- **Link health checker** — `--check-links` mode audits all existing article URLs and reports broken links
- About page added to site navigation across all 11 languages

### Fixed
- Removed 9 articles with fabricated or irrelevant URLs from coverage.json (3 TAPinto with nonexistent URL paths, 4 NYTimes returning 404, 2 off-topic NJ Transit pages)
- Coverage feed reduced from 27 to 18 verified articles

### Changed
- Scraper discovery switched from Firecrawl search to Google News RSS + existing RSS feeds
- Firecrawl now used only for content scraping (excerpts, metadata), not article discovery
- `scrape-config.json` uses `google_news_query` instead of `search_queries` and `known_outlets`

### Removed
- `discover_new_articles()` function (replaced by `poll_google_news()`)
- Firecrawl search queries from scraper config

## [2.1.1] - 2026-02-13

### Added
- **Automated coverage scraper** (`tools/scrape-coverage.py`) — Three-layer discovery pipeline using RSS feeds and Firecrawl search/scrape, running 4x daily via cron. Includes 404 page detection, URL deduplication, article validation, git auto-commit, and Telegram notifications.
- **Scraper config** (`tools/scrape-config.json`) — RSS feed URLs, official source monitoring targets, search queries, and classification keywords
- 6 new coverage articles discovered and verified via the scraper pipeline

### Fixed
- 4 article datelines corrected using verified `article:published_time` metadata (PIX11: Feb 13→Feb 10, Hoboken Girl: Feb 13→Feb 10, NJBIZ: Feb 13→Feb 12, Montclair Girl: Feb 13→Feb 12)
- 2 article datelines corrected manually (Amtrak PDF and NJ Transit press release: Feb 14→Jan 15)
- Removed 19 articles with dead/404 URLs from coverage.json
- Removed "Curated" language from coverage descriptions in English and all 10 translated pages
- Fixed dangling source reference (`njtransit-service-advisory`) in sources.json
- Deleted 2 stale remote branches

## [2.1.0] - 2026-02-13

### Added
- **Test suite** — 14 test files with 698+ checks covering line data structure, transit facts, JS integrity, HTML structure, CSS accessibility, translations, SEO/sitemap, coverage JSON, cross-references, and linguistic validation for 5 languages
- **Source attribution on comparison tool** — `makeCompareSourceFooter()` in `compare.js` shows NJ Transit, PATH, and NY Waterway source links below commute comparison results
- **Source attribution on line guide** — `makeSourceFooter()` in `app.js` shows verifiable source links on every impact card
- **Citation system** — `data/sources.json` with 28 verified claims linked to official sources, and `data/source-registry.json` with freshness tracking
- **Research validation pipeline** — `tools/validate-data.py` and `tools/validate-research-pipeline.py` for automated data integrity checking
- **Source references in line data** — Each line in `LINE_DATA` now has a `sources` object linking claims to official NJ Transit URLs

### Fixed
- Coverage article date corrected from Feb 14 to Feb 13 (UTC timezone error in automated pipeline)
- Replaced broken link to NJ Transit service advisory (404) with permanent travel alerts page
- Replaced broken link to Gateway Program portal-north-bridge page (302 to 404) with working root URL
- Twitter/X naming standardized to just "Twitter" across the codebase
- Card renderer and embed system internationalized for all 11 languages
- Embed preview 404s on translated pages
- Case-sensitive string replacement for embed post title
- Language selector dropping blog/ subdirectory on nested pages
- Blog card title capitalization
- iframe sandbox: added allow-downloads for PNG export

### Changed
- Line description summaries on cards and PNG exports are now translated
- Article suggestion email updated

## [2.0.0] - 2026-02-13

### Added
- **Embed system v2** — Visual configurator with four output formats: iframe embed, script tag, PNG image download, and self-contained HTML download
- **Blog** — Blog index (`blog.html`) and two posts: "Why we built Reroute NJ" and "New embed system"
- **Card renderer** (`card.html` + `cards.js`) — Info cards with Canvas PNG export, driven by URL parameters
- **Widget system** (`widget.html` + `widget.js`) — Standalone script-tag embed library for external sites
- **SEO and AI discoverability:**
  - `robots.txt` with explicit AI bot allowances (GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, ClaudeBot, Applebot-Extended)
  - `sitemap.xml` with all 90 pages and `xhtml:link` hreflang cross-references
  - `llms.txt` for AI search engines following the [llms.txt standard](https://llmstxt.org)
  - JSON-LD structured data on all pages: WebSite, BreadcrumbList, FAQPage (7 questions), Article
  - `<link rel="canonical">` tags on all English and translated pages
  - Citation-ready `.seo-summary` answer blocks on tool pages
  - Translated meta descriptions and OG tags for all 11 languages
- `line-data.js` — Extracted `LINE_DATA` into its own file as a shared global
- `CLAUDE.md` — Project instructions for Claude Code sessions

### Fixed
- Language dropdown contrast: option text now visible (dark on white background)
- `og:url` on translated pages now points to the translated page URL
- `og:description` and `twitter:description` use translated text on translated pages
- Duplicate skip-link removed from blog.html

## [1.1.0] - 2026-02-12

### Added
- Complete translation coverage for all 5 pages across all 10 non-English languages
- ~175 new translation keys: Hoboken Terminal map labels, transfer direction cards (PATH, ferry, Bus 126), Secaucus Junction guidance, timeline events, official resources, coverage page filter options, map bridge info cards, and the entire embed/share page
- Hamburger menu label translation per page
- Screen reader "Direction of travel" label translation

### Fixed
- Language persistence: navigating between pages now stays in the selected language instead of reverting to English
- Active nav link translation: regex now matches links with `aria-current="page"` attribute
- Compare step 2 label: replacement handles both `<div>` and `<label>` wrapper elements
- Coverage search placeholder: entity mismatch (`&hellip;` vs `...`) prevented translation
- Duplicate skip links removed from embed.html and map.html source HTML
- Duplicate hreflang tags: generator now skips when tags already exist in source

## [1.0.2] - 2026-02-12

### Added
- Map link in navigation bar across all pages (was previously unreachable)
- Rail line polylines connecting stations along each route
- 10 new station markers: East Orange, Brick Church, Newark Broad Street, Hamilton, Point Pleasant Beach, Little Silver, Middletown, Hazlet, Stirling, Roselle Park

### Changed
- Switched map tiles from default OpenStreetMap to CartoDB Positron (muted gray basemap) so transit lines stand out
- Fixed rail line routing with accurate station ordering and terminal connections
- Montclair-Boonton and Morris & Essex lines now connect through Newark Broad Street to Hoboken Terminal
- Northeast Corridor and North Jersey Coast lines now connect through Secaucus to Penn Station New York
- North Jersey Coast Line properly joins NEC shared track at Rahway
- Raritan Valley Line connects to Newark Penn Station (its cutover terminal)
- Morris & Essex Gladstone Branch renders as a separate fork converging at Summit
- Separated polyline routes from station markers for accurate branch and shared-track rendering

## [1.0.1] - 2026-02-12

### Added
- **News coverage feed** (`coverage.html`) — Filterable feed of 31 curated articles from 14+ sources covering the Portal Bridge cutover
- **Interactive map** (`map.html`) — Leaflet.js map showing affected lines, stations, and key infrastructure
- **Embed tools** (`embed.html`) — Widget generator for newsrooms and publishers to embed reroute tools on their sites
- **Blog** (`blog.html`) — "Why we built this" post explaining the project's origin and goals
- **Bidirectional travel** — NYC-to-NJ commute support added to the line guide (previously NJ-to-NYC only)
- Shared utility module (`js/shared.js`) with `esc()` XSS helper, countdown timer, and date constants
- News coverage data feed (`data/coverage.json`) with article metadata, source attribution, and line/category tags
- Issue templates for bug reports, data corrections, feature requests, and content suggestions
- Pull request template

### Changed
- Reorganized project into `js/`, `css/`, `img/`, `data/` folders (previously flat structure)
- Expanded line guide with additional route alternatives and station data
- Updated navigation across all pages to link new tools
- Updated AGENTS.md and CONTRIBUTING.md with project conventions

## [1.0.0] - 2026-02-11

### Added
- **Line guide tool** — Select your NJ Transit line and station to see how the Portal Bridge cutover affects your commute, get route alternatives, and figure out what ticket to buy
- **Commute comparison tool** — Pick your station and Manhattan destination, see every route option side by side with visual time breakdowns
- Coverage for all 5 affected lines: Montclair-Boonton, Morris & Essex, Northeast Corridor, North Jersey Coast, Raritan Valley
- Three impact type templates: Hoboken diversion, reduced service, Newark termination
- Station-specific impact cards with before/after route diagrams
- Route planner with PATH, ferry, and bus options for Hoboken-diverted lines
- Ticket guide with scenario-based recommendations
- Hoboken Terminal navigation guide with transfer directions
- Secaucus Junction choke point explainer
- Interactive countdown timer and project timeline
- Fare savings calculator for Hoboken-diverted riders
- Share/copy commute summary feature in comparison tool
- Responsive design for mobile, tablet, and desktop
- OG and Twitter Card meta tags for social sharing
- GitHub Pages deployment workflow
- MIT license

[2.1.2]: https://github.com/jamditis/reroute-nj/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/jamditis/reroute-nj/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/jamditis/reroute-nj/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/jamditis/reroute-nj/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/jamditis/reroute-nj/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/jamditis/reroute-nj/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/jamditis/reroute-nj/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jamditis/reroute-nj/releases/tag/v1.0.0
