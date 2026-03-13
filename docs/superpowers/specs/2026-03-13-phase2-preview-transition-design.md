# Reroute NJ: Phase 2 preview transition

**Date:** 2026-03-13
**Status:** Approved
**Context:** Phase 1 of the Portal North Bridge cutover ended March 15, 2026. Phase 2 (second track) is expected fall 2026. The site needs to transition from "active cutover tool" to "Phase 2 preview + Phase 1 archive."

## Design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Site posture | Phase 2 preview mode | Position the site ahead of the next disruption rather than just archiving |
| Tools (line guide, compare, map) | Keep live with context banner | Data is useful as reference; banner prevents confusion about currency |
| Tagline | "Portal North Bridge · Phase 2 coming fall 2026" | Forward-looking, drops "Phase 1 complete" since it'll be old news |
| Coverage scraper | Pause until Phase 2 | No meaningful cutover news to scrape between phases |

## Changes

### 1. Page titles and taglines

**Tagline keys to change** (the main site tagline and tool pages that reference the cutover directly):

| Key | Current | New |
|-----|---------|-----|
| `index.tagline` | "Navigate the Portal Bridge cutover" | "Portal North Bridge · Phase 2 coming fall 2026" |
| `coverage.tagline` | "Portal Bridge in the news" | "Portal Bridge coverage archive" |
| `map.tagline` | "Interactive cutover map" | "Interactive map" |

**Tagline keys to leave as-is** (they describe what the tool does, not the cutover status):

- `compare.tagline` ("Compare your commute options")
- `embed.tagline` ("Embed, share & republish")
- `blog.tagline` ("Updates and stories")
- `about.tagline` ("Our methodology")
- All `blog_post*.tagline` keys (per-post taglines)

**Page title to change:**

| Key | Current | New |
|-----|---------|-----|
| `index.title` | "Reroute NJ — Navigate the Portal Bridge cutover" | "Reroute NJ — Portal North Bridge cutover resources" |

The `<title>` tag in `index.html` (line 19) also needs a direct edit to match. Other page titles stay as-is.

All changed keys need translations in all 10 non-English language files.

**Files:** `translations/*.json` (11 files), `index.html`

### 2. Tool pages — context banner

Add a persistent info banner at the top of the main content area on line guide (`index.html`), compare (`compare.html`), and map (`map.html`):

> "This data reflects the Phase 1 cutover (Feb 15 – Mar 15, 2026). Phase 2 details will be added when announced."

**Relationship to existing alert banner on index.html:** The existing `.alert-banner` (lines 175-179, "Phase 1 complete! Regular NJ Transit schedules resumed...") stays. It's a news announcement. The new `.phase-banner` is different — it's data currency context placed inside `<main>`, above the tool controls. They coexist: alert banner = site-wide news in header area, phase banner = tool-specific data context.

**Translation keys:** Add `common.phase_banner` to all 11 language files.

**CSS for `.phase-banner`:**
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
Plus high-contrast variant under `body[data-contrast="high"]`.

**Generator injection:** In `generate-pages.py`, add the banner HTML in `replace_page_specific_content()` for pages `index.html`, `compare.html`, and `map.html`. Insert after the opening `<main class="container" id="main-content">` tag. The anchor string for replacement is `<main class="container" id="main-content">` → replace with `<main class="container" id="main-content">\n<div class="phase-banner">{translated text}</div>`.

**Files:** `index.html`, `compare.html`, `map.html`, `css/styles.css`, `translations/*.json`, `generate-pages.py`

### 3. Meta descriptions, OG tags, and schema descriptions

Remove "(Feb 15 – Mar 15, 2026)" date ranges. Reframe from active to archival + forward-looking.

**Page-level meta keys to update** (all 11 language files):

| Key | Current pattern | New pattern |
|-----|-----------------|-------------|
| `meta.index_description` | "Free tools to help...navigate the cutover. Find alternative routes..." | "Portal North Bridge cutover resources for NJ Transit riders. Phase 1 archive and Phase 2 tools." |
| `meta.index_og_description` | "...affected by the...cutover (Feb 15 – Mar 15, 2026)." | "Portal North Bridge cutover resources for NJ Transit riders. Phase 2 coming fall 2026." |
| `meta.compare_description` | "Compare your commute options during the...cutover." | "Compare commute options from the Portal North Bridge Phase 1 cutover." |
| `meta.compare_og_description` | "...during the Portal Bridge cutover." | "...from the Portal Bridge Phase 1 cutover." |
| `meta.coverage_description` | "News coverage of the...cutover. Articles..." | "News archive of the Portal North Bridge cutover. Articles..." |
| `meta.coverage_og_description` | "News coverage of the...cutover." | "News archive of the Portal Bridge cutover." |
| `meta.map_description` | Same pattern | Drop date range, shift tense |
| `meta.embed_description` | No date range | Keep as-is |
| `meta.embed_og_description` | No date range | Keep as-is |
| `meta.blog_description` | No date range | Keep as-is |
| `meta.blog_og_description` | No date range | Keep as-is |
| `meta.about_description` | No date range | Keep as-is |
| `meta.about_og_description` | No date range | Keep as-is |

Blog post meta keys (`blog_post_*`, `blog_post_embed_*`, `blog_post_cutover_*`, `blog_post_bridge_*`) stay as-is.

**Schema description to update:**

| Key | Current | New |
|-----|---------|-----|
| `schema.site_description` | "Free tools to help NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026)" | "Portal North Bridge cutover resources for NJ Transit riders. Phase 1 archive and Phase 2 preparation." |

This also needs a direct edit in the hardcoded WebSite JSON-LD block in `index.html` (lines 47-59), `compare.html` (line 40), and `map.html` (line 40) — all three have the same hardcoded description string.

**Files:** `translations/*.json` (11 files), `index.html`, `compare.html`, `map.html`

### 4. SEO summary paragraph (index.html)

The `.seo-summary` paragraph on `index.html` (line 199) currently reads:

> "During February 15 – March 15, 2026, NJ Transit rail service is reduced by approximately 50%..."

Rewrite to past tense:

> "During the Phase 1 cutover (February 15 – March 15, 2026), NJ Transit rail service was reduced by approximately 50% as Amtrak connected the new Portal North Bridge. This tool shows how each line and station was affected. Phase 2 is expected fall 2026."

Add translation key `index.seo_summary` and include in `generate-pages.py` replacement logic for all languages (follows existing `embed.seo_summary` pattern).

**Files:** `index.html`, `translations/*.json`, `generate-pages.py`

### 5. JSON-LD FAQPage (index.html)

The 7 FAQ answers on `index.html` currently start with "During Feb 15 – Mar 15, 2026..." — rewrite to past tense with Phase 2 forward reference.

**Example transformation:**
- Current: "During Feb 15 – Mar 15, 2026, the Montclair-Boonton Line will be diverted to Hoboken..."
- New: "During Phase 1 (Feb 15 – Mar 15, 2026), the Montclair-Boonton Line was diverted to Hoboken... Phase 2 is expected fall 2026."

Keep the questions unchanged — they're still valid search queries people will ask about Phase 2.

The FAQ answers also need translation updates in the `schema.*` keys across all language files.

**Files:** `index.html`, `translations/*.json` (11 files)

### 6. llms.txt

Update the overview section to reflect Phase 1 completion and Phase 2 preview status. Change from present tense ("helps NJ Transit riders navigate...") to past tense + forward reference.

**Files:** `llms.txt`

### 7. Coverage scraper cron — pause

Comment out the scraper cron entry on houseofjawn. Leave the script and config files intact for Phase 2 re-enablement.

**Current crontab line:**
```
10 0,6,12,18 * * * /home/jamditis/.claude/workstation/venv/bin/python3 /home/jamditis/projects/reroute-nj/tools/scrape-coverage.py
```

**Action:** Comment it out with a note: `# Paused after Phase 1 (Mar 15, 2026). Re-enable for Phase 2.`

**Machine:** houseofjawn (via SSH)

### 8. Remove GitHub Actions workflow

Delete `.github/workflows/static.yml`. Deploys go through Cloudflare Pages via `deploy.sh`. Actions are disabled on this repo.

**Files:** `.github/workflows/static.yml`

### 9. Sitemap lastmod dates

Update `<lastmod>` values in `sitemap.xml` to `2026-03-13` for all pages that are being modified (index, compare, map, coverage, blog index, and their translated variants).

**Files:** `sitemap.xml`

### 10. JS hardcoded date strings — no changes

Multiple JS files (`app.js`, `compare.js`, `embed.js`, `cards.js`, `i18n.js`) contain hardcoded "Feb 15 – Mar 15" date references in tool data and UI strings. These stay as-is — they're part of the Phase 1 historical data that the tools display, and the `.phase-banner` context banner covers the "this is Phase 1 data" messaging. Changing these strings would require updating the entire tool data model, which is out of scope until Phase 2 data is available.

### 11. Regenerate all pages

After all translation and content changes, run `python3 tools/generate-pages.py` to regenerate all translated pages.

Verify by spot-checking:
- `zh/index.html` — new tagline in Chinese, updated meta descriptions, phase banner present
- `es/compare.html` — phase banner in Spanish
- `index.html` — updated FAQ JSON-LD, updated `.seo-summary`, updated WebSite JSON-LD

### 12. Update test assertions

These test files will likely need assertion updates due to changed strings:

| Test file | Why |
|-----------|-----|
| `test-html-structure.js` | Meta description string matching, title tag, JSON-LD content |
| `test-seo-sitemap.js` | Sitemap lastmod dates, meta description content |
| `test-translations.js` | New keys (`common.phase_banner`, `index.seo_summary`), changed key values |
| `test-i18n-sync.js` | New translation keys must appear in EN object if used by `t()` |
| `test-cross-references.js` | May check tagline/title consistency |

Run all tests after changes: `for t in tests/test-*.js; do node "$t"; done`

### 13. Deploy

Run `bash deploy.sh` to push to Cloudflare Pages.

## What stays the same

- Blog posts (historical content)
- Coverage page and `data/coverage.json` (Phase 1 article archive)
- Countdown/timeline section (already shows correct post-cutover state)
- Alert banner on index (already shows "Phase 1 complete")
- All tool functionality and data (line guide, compare, map)
- JS hardcoded date strings (covered by phase banner context)
- Embed system
- `compare.tagline`, `embed.tagline`, `blog.tagline`, `about.tagline` (tool-specific, not cutover-specific)

## Out of scope

- Phase 2 schedule data (not yet available)
- New tools for Phase 2 (premature until NJ Transit publishes details)
- Site redesign or structural changes
- JS tool data model changes (wait for Phase 2 data)
