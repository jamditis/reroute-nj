# Phase 2 preview transition implementation plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition reroute-nj from active cutover tool to Phase 2 preview + Phase 1 archive.

**Architecture:** Update translation keys, meta tags, JSON-LD, and page content across 11 languages. Add a phase banner to tool pages. Pause scraper cron. Remove dead GitHub Actions workflow. Regenerate all translated pages and deploy.

**Tech Stack:** Python (generate-pages.py), static HTML/CSS/JS, Cloudflare Pages

**Spec:** `docs/superpowers/specs/2026-03-13-phase2-preview-transition-design.md`

---

## Chunk 1: Translation key updates

### Task 1: Update English translation keys

**Files:**
- Modify: `translations/en.json`

- [ ] **Step 1: Update index title and taglines**

In `translations/en.json`, change these values:

```
Line 59: "title": "Reroute NJ — Navigate the Portal Bridge cutover"
→ "title": "Reroute NJ — Portal North Bridge cutover resources"

Line 60: "tagline": "Navigate the Portal Bridge cutover"
→ "tagline": "Portal North Bridge · Phase 2 coming fall 2026"

Line 184: "tagline": "Portal Bridge in the news"
→ "tagline": "Portal Bridge coverage archive"

Line 224: "tagline": "Interactive cutover map"
→ "tagline": "Interactive map"
```

- [ ] **Step 2: Update meta description keys**

In `translations/en.json`, update these meta keys (lines 7-14):

```
"index_description": "Portal North Bridge cutover resources for NJ Transit riders. Phase 1 archive and Phase 2 preparation tools."
"index_og_description": "Portal North Bridge cutover resources for NJ Transit riders. Phase 2 coming fall 2026."
"compare_description": "Compare commute options from the Portal North Bridge Phase 1 cutover. Side-by-side breakdowns of every route to Manhattan."
"compare_og_description": "Commute comparison from the Portal Bridge Phase 1 cutover. Pick your station and destination, see all options ranked."
"coverage_description": "News archive of the NJ Transit Portal North Bridge cutover. Articles from NJ.com, NorthJersey.com, and more."
"coverage_og_description": "News archive of the Portal Bridge cutover. Reporting from local and regional news sources."
"map_description": "Interactive map of the Portal North Bridge cutover showing affected stations, transfer points, and alternative routes."
"map_og_description": "Interactive map of the Portal Bridge cutover showing affected stations, transfer points, and alternative routes."
```

Leave `embed_*`, `blog_*`, `about_*`, and all `blog_post_*` meta keys unchanged.

- [ ] **Step 3: Update schema keys**

In `translations/en.json`, update the `schema` section:

```
Line 555: "site_description": "Portal North Bridge cutover resources for NJ Transit riders. Phase 1 archive and Phase 2 preparation."

Line 566: "faq_a1": "During Phase 1 (Feb 15 – Mar 15, 2026), Montclair-Boonton weekday trains were diverted to Hoboken Terminal instead of New York Penn Station. Riders transferred to PATH (33rd Street, ~15 min), NY Waterway ferry (W. 39th St, ~10 min), or Bus 126 (Port Authority, ~30-45 min) to reach Manhattan. Phase 2 is expected fall 2026."

Line 568: "faq_a2": "During Phase 1 (Feb 15 – Mar 15, 2026), Morris & Essex (Morristown and Gladstone) weekday trains were diverted to Hoboken Terminal instead of New York Penn Station. Riders transferred to PATH, NY Waterway ferry, or Bus 126 to reach Manhattan. Phase 2 is expected fall 2026."

Line 570: "faq_a3": "During Phase 1 (Feb 15 – Mar 15, 2026), Northeast Corridor trains continued to New York Penn Station but with reduced frequency due to single-track operations between Newark and Secaucus. Phase 2 is expected fall 2026."

Line 572: "faq_a4": "During Phase 1 (Feb 15 – Mar 15, 2026), North Jersey Coast Line trains continued on their normal route but with reduced frequency due to single-track operations between Newark and Secaucus. Phase 2 is expected fall 2026."

Line 574: "faq_a5": "During Phase 1 (Feb 15 – Mar 15, 2026), all Raritan Valley Line one-seat rides to Penn Station New York were suspended. All trains terminated at Newark Penn Station. Riders transferred to Northeast Corridor trains at Newark Penn to reach Penn Station NY. Phase 2 is expected fall 2026."

Line 576: "faq_a6": "The Portal North Bridge cutover was a four-week period (Feb 15 – Mar 15, 2026) when Amtrak transferred the first track from the 115-year-old Portal Bridge to the new Portal North Bridge over the Hackensack River in Kearny, NJ. This required single-track operations, reducing NJ Transit service by approximately 50%. Phase 2 (second track) is expected fall 2026."

Line 578: "faq_a7": "From Hoboken Terminal, riders had three options to reach Manhattan: (1) PATH train to 33rd Street (~15 minutes, every 3-5 min during rush hour), (2) NY Waterway ferry to W. 39th Street (~10 minutes), or (3) Bus 126 to Port Authority Bus Terminal (~30-45 minutes via Lincoln Tunnel). These same options will be available during Phase 2."
```

- [ ] **Step 4: Add new translation keys**

Add `index.seo_summary` key in the `index` section of `translations/en.json` (after the existing `tagline` key, around line 60):

```json
"seo_summary": "During the Phase 1 cutover (February 15 – March 15, 2026), NJ Transit rail service was reduced by approximately 50% as Amtrak connected the new Portal North Bridge. This tool shows how each line and station was affected. Phase 2 is expected fall 2026."
```

Add `common.phase_banner` in the `common` section:

```json
"phase_banner": "This data reflects the Phase 1 cutover (Feb 15 – Mar 15, 2026). Phase 2 details will be added when announced."
```

- [ ] **Step 5: Commit**

```bash
git add translations/en.json
git commit -m "Update English translations for Phase 2 preview transition"
```

### Task 2: Update non-English translation files

**Files:**
- Modify: `translations/es.json`, `translations/zh.json`, `translations/tl.json`, `translations/ko.json`, `translations/pt.json`, `translations/gu.json`, `translations/hi.json`, `translations/it.json`, `translations/ar.json`, `translations/pl.json`

- [ ] **Step 1: Update all 10 non-English translation files**

For each of the 10 language files, update the same keys as Task 1 with translated values. The keys to update in each file:

1. `index.title` — translate "Reroute NJ — Portal North Bridge cutover resources"
2. `index.tagline` — translate "Portal North Bridge · Phase 2 coming fall 2026"
3. `coverage.tagline` — translate "Portal Bridge coverage archive"
4. `map.tagline` — translate "Interactive map"
5. `meta.index_description` — translate the updated English value
6. `meta.index_og_description` — translate the updated English value
7. `meta.compare_description` — translate the updated English value
8. `meta.compare_og_description` — translate the updated English value
9. `meta.coverage_description` — translate the updated English value
10. `meta.coverage_og_description` — translate the updated English value
11. `meta.map_description` — translate the updated English value (if it changed)
12. `meta.map_og_description` — translate the updated English value (if it changed)
13. `schema.site_description` — translate the updated English value
14. `schema.faq_a1` through `schema.faq_a7` — translate the updated English values
15. Add `index.seo_summary` — translate the English value
16. Add `common.phase_banner` — translate the English value

Use the existing translations in each file as reference for consistent terminology. Keep station names, line names, and "Portal North Bridge" in English (proper nouns on physical signage).

- [ ] **Step 2: Commit**

```bash
git add translations/es.json translations/zh.json translations/tl.json translations/ko.json translations/pt.json translations/gu.json translations/hi.json translations/it.json translations/ar.json translations/pl.json
git commit -m "Update non-English translations for Phase 2 preview transition"
```

---

## Chunk 2: HTML and CSS changes

### Task 3: Update index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update title tag**

```
Line 19: <title>Reroute NJ — Navigate the Portal Bridge cutover</title>
→ <title>Reroute NJ — Portal North Bridge cutover resources</title>
```

- [ ] **Step 2: Update WebSite JSON-LD description**

```
Line 53: "description": "Free tools to help NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026)"
→ "description": "Portal North Bridge cutover resources for NJ Transit riders. Phase 1 archive and Phase 2 preparation."
```

- [ ] **Step 3: Update FAQPage JSON-LD answers**

Update all 7 `acceptedAnswer.text` values in the FAQPage block (lines 61-124) to match the updated `schema.faq_a1` through `schema.faq_a7` English values from Task 1, Step 3.

- [ ] **Step 4: Update SEO summary paragraph**

```
Line 199: <p class="seo-summary">During February 15 – March 15, 2026, NJ Transit rail service is reduced by approximately 50% as Amtrak connects the new Portal North Bridge. Select your line and station below to see exactly how your commute changes, what alternative routes are available, and what tickets you need.</p>
→ <p class="seo-summary">During the Phase 1 cutover (February 15 – March 15, 2026), NJ Transit rail service was reduced by approximately 50% as Amtrak connected the new Portal North Bridge. This tool shows how each line and station was affected. Phase 2 is expected fall 2026.</p>
```

- [ ] **Step 5: Add phase banner after main tag**

After line 197 (`<main class="container" id="main-content">`), insert:

```html
    <div class="phase-banner">This data reflects the Phase 1 cutover (Feb 15 – Mar 15, 2026). Phase 2 details will be added when announced.</div>
```

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "Update index.html content for Phase 2 preview"
```

### Task 4: Update compare.html and map.html

**Files:**
- Modify: `compare.html`, `map.html`

- [ ] **Step 1: Update compare.html WebSite JSON-LD**

```
Line 40: "description": "Free tools to help NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026)"
→ "description": "Portal North Bridge cutover resources for NJ Transit riders. Phase 1 archive and Phase 2 preparation."
```

- [ ] **Step 2: Add phase banner to compare.html**

After line 114 (`<main class="container" id="main-content">`), insert:

```html
    <div class="phase-banner">This data reflects the Phase 1 cutover (Feb 15 – Mar 15, 2026). Phase 2 details will be added when announced.</div>
```

- [ ] **Step 3: Update map.html WebSite JSON-LD**

```
Line 41: "description": "Free tools to help NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026)"
→ "description": "Portal North Bridge cutover resources for NJ Transit riders. Phase 1 archive and Phase 2 preparation."
```

- [ ] **Step 4: Add phase banner to map.html**

After line 192 (`<main class="container" id="main-content">`), insert:

```html
    <div class="phase-banner">This data reflects the Phase 1 cutover (Feb 15 – Mar 15, 2026). Phase 2 details will be added when announced.</div>
```

- [ ] **Step 5: Commit**

```bash
git add compare.html map.html
git commit -m "Update compare and map pages for Phase 2 preview"
```

### Task 5: Add phase banner CSS

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Add .phase-banner styles**

Add after the `.alert-banner strong` rule (around line 203):

```css
.phase-banner {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}
```

- [ ] **Step 2: Add high-contrast variant**

Add near the existing `body[data-contrast="high"] .alert-banner` rule (around line 2903):

```css
body[data-contrast="high"] .phase-banner {
  background: #000;
  border: 2px solid #ff0;
  color: #ff0;
}
```

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "Add phase banner CSS"
```

### Task 6: Update generate-pages.py

**Files:**
- Modify: `tools/generate-pages.py`

- [ ] **Step 1: Add phase banner injection for index, compare, and map pages**

In `replace_page_specific_content()`, add phase banner injection at the start of each page's block (index, compare, map). The banner replaces the `<main>` opening tag:

```python
# Add inside the index block (around line 396), compare block (around line 708), and map block (around line 792):
phase_banner = get_translation(translations, "common.phase_banner")
if phase_banner:
    html = html.replace(
        '<main class="container" id="main-content">',
        f'<main class="container" id="main-content">\n    <div class="phase-banner">{phase_banner}</div>'
    )
```

- [ ] **Step 2: Add SEO summary replacement for index page**

In the index block of `replace_page_specific_content()`, add (following the `embed.seo_summary` pattern):

```python
seo_summary = get_translation(translations, "index.seo_summary")
if seo_summary:
    html = html.replace(
        "During the Phase 1 cutover (February 15 – March 15, 2026), NJ Transit rail service was reduced by approximately 50% as Amtrak connected the new Portal North Bridge. This tool shows how each line and station was affected. Phase 2 is expected fall 2026.",
        seo_summary
    )
```

Note: this replaces the already-updated English text from Task 3 Step 4.

- [ ] **Step 3: Commit**

```bash
git add tools/generate-pages.py
git commit -m "Add phase banner injection and SEO summary replacement to generator"
```

---

## Chunk 3: SEO, infrastructure, and deployment

### Task 7: Update llms.txt

**Files:**
- Modify: `llms.txt`

- [ ] **Step 1: Rewrite llms.txt for Phase 2 preview**

Update the file to reflect Phase 1 completion and Phase 2 preview status. Key changes:

Line 3 (intro):
```
> Free tools helping NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026). Five interactive tools in 11 languages.
→ > Portal North Bridge cutover resources for NJ Transit riders. Phase 1 archive (Feb 15 – Mar 15, 2026) and Phase 2 preparation tools in 11 languages.
```

Lines 5-7 (overview paragraph): Rewrite from present to past tense. Add Phase 2 forward reference.

Lines 11-15 (tools section): Shift tool descriptions to past tense ("See how your commute changed during the Phase 1 cutover" instead of "see exactly what changes").

Lines 17-26 (key facts): Change "Dates: February 15 to March 15, 2026 (Phase 1)" to "Phase 1: February 15 to March 15, 2026 (complete)" and similar tense shifts.

Lines 28-34 (line impact): Shift to past tense ("were diverted" not "diverted").

Line 38: Add the bridge-opens blog post to the blog listing.

Line 57: Update "Last verified" date from "February 14, 2026" to "March 13, 2026".

- [ ] **Step 2: Commit**

```bash
git add llms.txt
git commit -m "Update llms.txt for Phase 2 preview"
```

### Task 8: Update sitemap.xml

**Files:**
- Modify: `sitemap.xml`

- [ ] **Step 1: Update lastmod dates**

Replace all `<lastmod>2026-02-13</lastmod>` with `<lastmod>2026-03-13</lastmod>` across the entire sitemap.

```bash
# Verify with a count first
grep -c '2026-02-13' sitemap.xml
# Then do the replacement
```

- [ ] **Step 2: Commit**

```bash
git add sitemap.xml
git commit -m "Update sitemap lastmod dates to 2026-03-13"
```

### Task 9: Remove GitHub Actions workflow

**Files:**
- Delete: `.github/workflows/static.yml`

- [ ] **Step 1: Delete the workflow file**

```bash
git rm .github/workflows/static.yml
```

- [ ] **Step 2: Commit**

```bash
git commit -m "Remove GitHub Actions workflow (deploys via Cloudflare Pages)"
```

### Task 10: Pause coverage scraper cron

**Machine:** houseofjawn (via SSH)

- [ ] **Step 1: Comment out the scraper cron entry**

```bash
ssh houseofjawn "crontab -l" | grep -n scrape
# Then edit crontab to comment out the line, adding a note:
# Paused after Phase 1 (Mar 15, 2026). Re-enable for Phase 2.
ssh houseofjawn "crontab -l | sed '/scrape-coverage/s/^/# Paused Phase 1 (Mar 2026): /' | crontab -"
```

- [ ] **Step 2: Verify**

```bash
ssh houseofjawn "crontab -l" | grep -i scrape
# Should show the line commented out
```

### Task 11: Regenerate, test, and deploy

- [ ] **Step 1: Regenerate all translated pages**

```bash
cd ~/projects/reroute-nj
python3 tools/generate-pages.py
```

- [ ] **Step 2: Verify translated pages**

Spot-check:
```bash
# Chinese index — check tagline, meta, phase banner, FAQ
grep 'phase-banner' zh/index.html
grep 'og:description' zh/index.html
grep 'Phase 2' zh/index.html | head -3

# Spanish compare — check phase banner
grep 'phase-banner' es/compare.html

# Arabic map — check RTL phase banner
grep 'phase-banner' ar/map.html
```

- [ ] **Step 3: Run tests**

```bash
for t in tests/test-*.js; do node "$t"; done
```

Fix any assertion failures caused by changed strings. Likely affected:
- `test-html-structure.js` — meta descriptions, title, JSON-LD
- `test-seo-sitemap.js` — sitemap lastmod, meta content
- `test-translations.js` — new keys (phase_banner, seo_summary)
- `test-i18n-sync.js` — new keys used by `t()` calls
- `test-cross-references.js` — tagline/title consistency

- [ ] **Step 4: Commit regenerated pages and any test fixes**

```bash
git add -A
git commit -m "Regenerate all pages for Phase 2 preview transition"
```

- [ ] **Step 5: Deploy**

```bash
bash deploy.sh
```

- [ ] **Step 6: Verify live site**

Check reroutenj.org (via DoH or `--resolve` flag since officejawn DNS is hijacked):
```bash
curl -s --resolve reroutenj.org:443:$(dig +short reroutenj.org @1.1.1.1 | head -1) https://reroutenj.org/ | grep -o '<title>[^<]*</title>'
```
