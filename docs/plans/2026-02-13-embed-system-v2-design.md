# Embed system v2 design

**Date:** 2026-02-13
**Goal:** Replace the current iframe-only embed page with a full embed system: info cards, interactive widgets, a visual configurator, and four output formats (iframe, script tag, PNG download, HTML download). Built for non-technical newsroom editors on WordPress/Newspack/Ghost.

## Current state

The embed page (`embed.html`) has a basic dropdown that generates an `<iframe>` code pointing at the full tool pages. Problems:

- Embeds load the entire page (header, nav, footer, all JS) inside the iframe
- No compact or card-style options
- No customization (theme, line pre-selection, accent color)
- No downloadable assets for newsletters, social, or print
- `BASE_URL` in `embed.js` still points to `jamditis.github.io` instead of `reroutenj.org`
- Target audience (local NJ newsrooms) often can't add script tags — they need copy-paste iframe codes or downloadable files

## Design

### Four delivery formats

| Format | Audience | Works in |
|--------|----------|----------|
| Iframe (copy/paste) | Any CMS editor | WordPress, Ghost, Squarespace, any HTML block |
| Script tag (`<script>` + `<div>`) | Developers, advanced publishers | Custom sites, advanced CMS setups |
| Download PNG | Anyone — newsletters, social, print | Email, Twitter, Facebook, Slack, PDF |
| Download HTML | Publishers who want to host it themselves | Any web server, S3, local file |

All formats include attribution: small "Powered by RerouteNJ" with SVG logo + link back to reroutenj.org.

### Three embed types

#### 1. Info cards (`card.html`)

Static, lightweight cards rendered from URL params. Self-contained CSS inlined in the page.

**Line card** — `card.html?type=line&line=montclair-boonton`
- Line name with color bar (matching line brand color from LINE_DATA)
- Impact badge: "Diverted to Hoboken" / "Reduced service" / "Terminates at Newark"
- Before/after train count (e.g., "64 trains → 60 trains")
- Top 3 alternative routes with travel times
- Key dates (Feb 15 – Mar 15, 2026)
- "Plan your commute" link to full line guide

**Station card** — `card.html?type=station&line=montclair-boonton&station=bloomfield`
- Station name + line name with color bar
- Station-specific impact details
- Nearest transfer point and directions
- Ticket recommendation
- "See full details" link

**Summary card** — `card.html?type=summary`
- All 5 lines with color-coded impact indicators
- Train count before/after for each
- "50% service reduction" headline stat
- Dates + link to reroutenj.org

**Card styling:**
- Light theme default, `&theme=dark` available
- `&accent=CA3553` for custom accent color (hex)
- Responsive: 300px to 800px wide
- Self-contained: no external stylesheet dependency
- Attribution footer: "Powered by RerouteNJ" with inline SVG logo

#### 2. Mini-widgets (`widget.html`)

Stripped-down interactive versions of the main tools. URL-param driven.

**Line checker** — `widget.html?tool=line-guide`
- Compact line buttons → impact summary → station dropdown → station details
- Optional: `&line=montclair-boonton` to pre-select
- ~400px height, scrollable

**Route finder** — `widget.html?tool=compare`
- Station + destination dropdowns → route results ranked by time
- Compact layout

**Coverage feed** — `widget.html?tool=coverage`
- Scrollable article list with source badges
- Optional: `&line=montclair-boonton` to filter
- Links open in `_blank` (escape iframe)

**Mini map** — `widget.html?tool=map`
- Leaflet map with markers and polylines, no sidebar
- Optional: `&line=nec` to center on a line

**JS reuse strategy:**
- Line guide + comparison widgets: reuse existing `app.js` / `compare.js` with stripped HTML layout (scripts query by element ID, so matching IDs is sufficient)
- Coverage + map widgets: new lightweight scripts (simpler to re-render compactly than to strip down the originals)

**Widget features:**
- `&theme=light|dark` (light default)
- `&accent=CA3553` (custom accent color)
- Attribution bar at bottom
- All external links open `target="_blank"`

#### 3. Full tools (embed mode on existing pages)

Existing pages gain `?embed=true` support. When present:
- Hide: header, tool-nav, seo-summary, footer
- Show: small attribution bar at bottom
- Add: `body.embed-mode` class for CSS adjustments (tighter padding)

Implemented as shared `initEmbedMode()` in `js/shared.js`.

### Embed page configurator (`embed.html` redesign)

Three-step visual builder replacing the current text-heavy page.

**Step 1: Pick embed type**
Three large clickable cards with visual thumbnails:
- Info card — "A compact card with key facts about a line or station."
- Interactive widget — "A mini version of our tools your readers can use inline."
- Full tool — "The complete tool experience, embedded on your page."

**Step 2: Configure**
Dynamic form based on selected type:
- Info card: card type (line/station/summary) → line → station (if applicable) → theme → accent color
- Widget: tool (line guide/compare/coverage/map) → pre-selected line (optional) → theme → accent color
- Full tool: tool → theme

**Step 3: Preview + output**
Split layout (stacks on mobile):
- Left: live iframe preview, updates in real time as config changes
- Right: four output tabs
  - **Iframe** (default) — code block + copy button
  - **Script tag** — `<script>` + `<div>` code + copy button
  - **Download PNG** — button triggers Canvas render → .png export
  - **Download HTML** — button generates self-contained file with inline CSS/JS/data

Below the configurator: condensed versions of existing sections (direct links, newsroom guidance, co-branding, contributing). Remove outdated "Translate" call to action.

### PNG generation

Client-side Canvas rendering. The configurator:
1. Renders the card/widget in a hidden container
2. Uses Canvas API to draw a matching visual (controlled layout = precise drawing with `fillText`, `fillRect`, etc.)
3. Renders attribution text + SVG logo into the bottom of the canvas
4. Exports as PNG via `canvas.toBlob()` → triggers download

No external dependencies (no html2canvas). Works because cards have known, controlled layouts.

### HTML download generation

The configurator builds a self-contained HTML string:
- `<!DOCTYPE html>` wrapper
- All CSS inlined in `<style>`
- LINE_DATA (trimmed to selected line/station) inlined in `<script>`
- Rendering logic inlined
- Attribution footer with link
- Triggers download via `Blob` + `URL.createObjectURL` + click on hidden `<a>`

### Attribution

| Format | How |
|--------|-----|
| Iframe | Footer bar inside iframe: "Powered by RerouteNJ" + SVG logo + link |
| Script tag | Same footer bar rendered by the script |
| PNG | Text + logo rendered into bottom of canvas image |
| HTML download | Footer `<a>` linking to reroutenj.org |

Attribution bar: ~24px tall, subtle gray text, doesn't compete with content. SVG is the existing `img/favicon.svg` inlined.

## Files

### New files

| File | Purpose |
|------|---------|
| `card.html` | Info card renderer (URL params → card) |
| `widget.html` | Mini-widget renderer (URL params → stripped interactive tool) |
| `js/cards.js` | Card rendering, data, Canvas PNG export |
| `js/widget.js` | Standalone script-tag embed library |

### Modified files

| File | Changes |
|------|---------|
| `embed.html` | Full redesign — visual configurator |
| `js/embed.js` | Rewrite — configurator logic, preview, download generation |
| `index.html` | `?embed=true` support |
| `compare.html` | `?embed=true` support |
| `coverage.html` | `?embed=true` support |
| `map.html` | `?embed=true` support |
| `js/shared.js` | Add `initEmbedMode()` |
| `css/styles.css` | Card styles, widget styles, embed-mode styles |

## Out of scope

- Server-side rendering or API
- WordPress plugin (iframe works in WP custom HTML blocks)
- Automated social media card generation (manual PNG download covers this)
- Card translations (cards link to translated pages, but card text is English-only for v1)
