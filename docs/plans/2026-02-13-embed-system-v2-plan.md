# Embed system v2 implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the iframe-only embed page with a full embed system: info cards, interactive widgets, a visual configurator, and four output formats (iframe, script tag, PNG download, HTML download).

**Architecture:** New `card.html` and `widget.html` pages render embeddable content from URL params. A rewritten `embed.html` provides a visual configurator with live preview. Existing tool pages gain `?embed=true` mode to hide chrome. A standalone `widget.js` provides script-tag embeds for advanced publishers. All formats include attribution linking back to reroutenj.org.

**Tech Stack:** Vanilla HTML/CSS/JS (ES5, IIFE pattern, `var` declarations). Canvas API for PNG export. No external dependencies, no build step.

**Key constraints:**
- Zero-build static site. No npm, no frameworks, no CDN libraries.
- All JS uses the IIFE pattern with `var`.
- Use `esc()` for HTML sanitization on any user/data-derived content.
- All content injected via innerHTML uses only safe, pre-defined HTML fragments derived from LINE_DATA (trusted internal data, not user input). URL params are validated against known values before use.

**Design doc:** `docs/plans/2026-02-13-embed-system-v2-design.md`

---

## Task 1: Fix BASE_URL bug and extract line-data.js

**Files:**
- Create: `js/line-data.js`
- Modify: `js/embed.js:7` (BASE_URL fix)
- Modify: `js/app.js:21-227` (remove inline data, reference global from line-data.js)
- Modify: `index.html` (add line-data.js script tag)

**Step 1: Create js/line-data.js**

Extract LINE_DATA (lines 21-218 of app.js) and LINE_ORDER (lines 221-227) into a standalone file. NOT wrapped in IIFE — exposes globals that app.js, cards.js, and widget.html consume.

**Step 2: Update app.js**

Remove the `var LINE_DATA = { ... };` and `var LINE_ORDER = [ ... ];` blocks. The IIFE references globals set by line-data.js.

Add `<script src="js/line-data.js"></script>` BEFORE `<script src="js/app.js"></script>` in index.html.

**Step 3: Fix BASE_URL in embed.js**

Change `"https://jamditis.github.io/reroute-nj/"` to `"https://reroutenj.org/"`.

**Step 4: Verify**

Open index.html in browser. All features work as before. No console errors.

**Step 5: Commit**

```
git add js/line-data.js js/app.js js/embed.js index.html
git commit -m "Extract line-data.js, fix embed BASE_URL"
```

---

## Task 2: Add embed mode to existing pages

**Files:**
- Modify: `js/shared.js` (add initEmbedMode function)
- Modify: `css/styles.css` (embed-mode styles)
- Modify: `index.html`, `compare.html`, `coverage.html`, `map.html` (call initEmbedMode)

**Step 1: Add initEmbedMode to shared.js**

When `?embed=true` is in URL: add body class `embed-mode`, hide header/nav/seo-summary/footer, append attribution bar with SVG logo linking to reroutenj.org.

Attribution bar: safe static HTML only (no data-derived content in the attribution markup).

**Step 2: Add embed-mode CSS**

```css
body.embed-mode { padding-top: 0; }
body.embed-mode .container { padding: 0.5rem; }
.embed-attribution { text-align: center; padding: 6px 0; font-size: 0.75rem; color: #73849a; border-top: 1px solid #e8ecf1; margin-top: 1rem; }
.embed-attribution a { color: #73849a; text-decoration: none; }
.embed-attribution a:hover { color: #e87722; }
```

**Step 3: Call initEmbedMode in all four tool pages**

Add `initEmbedMode();` before existing init calls in the inline script blocks.

**Step 4: Verify**

- `index.html` — normal view unchanged
- `index.html?embed=true` — chrome hidden, attribution shown
- Same for compare, coverage, map

**Step 5: Commit**

```
git add js/shared.js css/styles.css index.html compare.html coverage.html map.html
git commit -m "Add embed mode: hide chrome when ?embed=true"
```

---

## Task 3: Build info cards (card.html + cards.js)

Largest task. Creates card rendering with three card types.

**Files:**
- Create: `card.html`
- Create: `js/cards.js`

**Step 1: Create card.html**

Minimal HTML shell with ALL CSS inlined in a style tag. Loads line-data.js and cards.js. Reads URL params: `?type=line|station|summary`, `&line=`, `&station=`, `&theme=dark`, `&accent=hex`.

**Step 2: Create js/cards.js**

IIFE with:
- Local `esc()` function (since shared.js is not loaded)
- `getParam(name)` URL param parser
- IMPACT_LABELS mapping (impactType to display text)
- ALTERNATIVES data (top 3 routes per impact type)
- `renderLineCard(lineId)` — color bar, line name, impact badge, train count before/after, alternatives list, dates, CTA link
- `renderStationCard(lineId, stationId)` — station name, line context, impact, transfers, ticket recommendation
- `renderSummaryCard()` — compact grid of all 5 lines with indicators
- Init: validate params against LINE_DATA keys before rendering. Unknown line/station IDs fall back to summary card.

All data inserted into the DOM comes from LINE_DATA (trusted internal data). URL params (line, station) are validated against LINE_DATA keys — unknown values are rejected.

**Step 3: Verify**

- `card.html?type=line&line=montclair-boonton` — line card renders
- `card.html?type=station&line=montclair-boonton&station=bloomfield` — station card renders
- `card.html?type=summary` — summary card renders
- `card.html?type=line&line=northeast-corridor&theme=dark` — dark theme
- `card.html?type=line&line=montclair-boonton&accent=CA3553` — custom accent
- `card.html?type=line&line=INVALID` — falls back to summary (no errors)

**Step 4: Commit**

```
git add card.html js/cards.js
git commit -m "Add info cards: line, station, and summary cards"
```

---

## Task 4: Canvas PNG export for cards

**Files:**
- Modify: `js/cards.js` (add export functions)
- Modify: `card.html` (export trigger support)

**Step 1: Add renderCardToCanvas function**

Creates offscreen canvas (600x400 line/station, 600x500 summary). Draws card content with Canvas API: fillRect for color bar, fillText for text, roundRect for badges. Draws attribution at bottom.

**Step 2: Add exportCardAsPng function**

Calls renderCardToCanvas, uses canvas.toBlob to create download. Triggers download as `reroute-nj-{type}-{lineId}.png`. Expose as `window.exportCardAsPng` for cross-frame calls from embed configurator.

**Step 3: Wire export trigger**

When `?export=true` in URL, auto-trigger PNG download after render.

**Step 4: Verify**

- `card.html?type=line&line=montclair-boonton&export=true` — PNG downloads
- Downloaded PNG has correct content, readable text, attribution visible

**Step 5: Commit**

```
git add js/cards.js card.html
git commit -m "Add Canvas PNG export for info cards"
```

---

## Task 5: Build mini-widgets (widget.html)

**Files:**
- Create: `widget.html`

**Step 1: Create widget.html**

Minimal page that dynamically builds HTML elements matching the IDs expected by existing tool scripts, then loads the appropriate JS.

Params: `?tool=line-guide|compare|coverage|map`, `&line=`, `&theme=`, `&accent=`.

For line-guide and compare: include element structure matching index.html/compare.html (same IDs), load shared.js + line-data.js + app.js/compare.js.

For coverage: lightweight inline script that loads and renders coverage.json.

For map: inline Leaflet setup with station markers and polylines.

**Step 2: Handle pre-selection**

If `&line=montclair-boonton` is set, after script init, programmatically trigger the corresponding line button click or set select values.

**Step 3: Verify**

- `widget.html?tool=line-guide` — line buttons work
- `widget.html?tool=line-guide&line=montclair-boonton` — pre-selected
- `widget.html?tool=compare` — comparison tool works
- `widget.html?tool=coverage` — articles scrollable
- `widget.html?tool=map` — map renders
- Attribution bar on all widgets
- External links open in new tab

**Step 4: Commit**

```
git add widget.html
git commit -m "Add mini-widget page with tool loading via URL params"
```

---

## Task 6: Redesign embed.html configurator

Depends on: Tasks 2, 3, 4, 5.

**Files:**
- Rewrite: `embed.html`
- Rewrite: `js/embed.js`

**Step 1: New HTML structure**

Three-step configurator:
1. Pick type — three clickable cards with thumbnails (info card, widget, full tool)
2. Configure — dynamic form fields based on type
3. Preview + output — split layout: live iframe preview (left), four output tabs (right)

Keep condensed versions of existing sections below. Remove outdated "Translate" CTA.

**Step 2: Rewrite embed.js**

Track state: selected type, card-type/tool, line, station, theme, accent. On change: update preview iframe src, regenerate output codes.

Output tabs:
- Iframe: generate iframe code with current URL
- Script tag: generate script + div markup
- PNG: call exportCardAsPng on preview iframe contentWindow
- HTML: build self-contained HTML string, Blob download

**Step 3: Verify**

- Full configurator flow for each type
- Copy iframe code works
- PNG downloads correctly
- HTML downloads correctly
- Script tag code is correct
- Light/dark theme switching works
- Mobile responsive layout

**Step 4: Commit**

```
git add embed.html js/embed.js
git commit -m "Redesign embed page: visual configurator with four output formats"
```

---

## Task 7: widget.js script-tag library

**Files:**
- Create: `js/widget.js`

**Step 1: Create standalone embed script**

Finds all `.reroutenj-embed` divs, reads data-* attributes, builds appropriate URL (card.html or widget.html), creates iframe, inserts into div.

```html
<!-- Usage example -->
<div class="reroutenj-embed" data-type="line-card" data-line="montclair-boonton" data-theme="light"></div>
<script src="https://reroutenj.org/js/widget.js" async></script>
```

Type mapping:
- line-card, station-card, summary-card -> card.html with params
- line-guide, compare, coverage, map -> widget.html with params

Default dimensions per type (overridable via data-width/data-height).

**Step 2: Verify with test file**

Create a local test HTML (not committed) with multiple embed divs. All types render correctly.

**Step 3: Commit**

```
git add js/widget.js
git commit -m "Add widget.js standalone embed library for script-tag usage"
```

---

## Task 8: HTML download generation

**Files:**
- Modify: `js/embed.js` (add download function)

**Step 1: Add generateDownloadHtml to embed.js**

Builds self-contained HTML string: DOCTYPE, inline CSS, inline LINE_DATA (trimmed to selected line only), card rendering logic, attribution footer. Creates Blob, triggers download via hidden anchor.

**Step 2: Verify**

- Download HTML for each card type — opens correctly in browser
- No external resource requests in downloaded file (check network tab)

**Step 3: Commit**

```
git add js/embed.js
git commit -m "Add self-contained HTML download for embed cards"
```

---

## Task 9: Polish and update translations

Depends on: Task 6.

**Files:**
- Modify: `embed.html` (content updates)
- Modify: `css/styles.css` (responsive polish)
- Run: `python3 tools/generate-pages.py`

**Step 1: Content updates**

Remove "Translate" bullet. Update contribution lists. Tighten newsroom guidance.

**Step 2: Regenerate translations**

Run generator. card.html and widget.html do NOT need translation (LINE_DATA uses English proper nouns for station/line names).

**Step 3: Responsive verification**

Mobile: type cards stack, form usable, preview full-width above output tabs.

**Step 4: Commit**

```
git add embed.html css/styles.css
python3 tools/generate-pages.py
git add es/ zh/ tl/ ko/ pt/ gu/ hi/ it/ ar/ pl/
git commit -m "Polish embed page, update translations"
```

---

## Task 10: Update sitemap, llms.txt, docs

Last task.

**Files:**
- Modify: `sitemap.xml`, `llms.txt`, `CHANGELOG.md`, `CLAUDE.md`, `README.md`

**Step 1: Sitemap** — add card.html, widget.html (priority 0.5, monthly)

**Step 2: llms.txt** — add Embeds section

**Step 3: CHANGELOG** — document all embed v2 changes under [Unreleased]

**Step 4: CLAUDE.md** — add embed system architecture notes

**Step 5: Commit and push**

```
git add sitemap.xml llms.txt CHANGELOG.md CLAUDE.md README.md
git commit -m "Update docs, sitemap, and llms.txt for embed system v2"
git push
```

---

## Dependency graph

```
Task 1 (line-data.js + BASE_URL fix)
  |
  +-- Task 2 (embed mode) --------+
  +-- Task 3 (info cards) ---+    |
  |     +-- Task 4 (PNG)     |    |
  +-- Task 5 (widgets) ------+    |
                              |    |
                              v    v
                    Task 6 (configurator)
                      |
                      +-- Task 7 (widget.js)
                      +-- Task 8 (HTML download)
                      +-- Task 9 (polish)
                      +-- Task 10 (docs) -- last
```

Tasks 2, 3, and 5 can run in parallel after Task 1.
