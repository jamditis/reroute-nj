# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Language dropdown contrast: option text now uses dark color on white background instead of white-on-white

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
- Coverage search placeholder: entity mismatch (`&hellip;` vs `…`) prevented translation
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

[Unreleased]: https://github.com/jamditis/reroute-nj/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/jamditis/reroute-nj/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/jamditis/reroute-nj/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/jamditis/reroute-nj/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jamditis/reroute-nj/releases/tag/v1.0.0
