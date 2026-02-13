# SEO + LLMEO improvement design

**Date:** 2026-02-13
**Goal:** Improve discoverability for reroutenj.org across Google search, newsroom adoption, and AI search tools (ChatGPT, Gemini, Perplexity, Claude).

## Current state

The site has good fundamentals: unique titles/descriptions on all 6 English pages, full OG/Twitter Card tags, hreflang alternate links across 11 languages, semantic HTML, and proper GitHub repo metadata.

### Gaps

| Gap | Impact |
|-----|--------|
| No `robots.txt` | Crawlers lack guidance; no sitemap reference |
| No `sitemap.xml` | 56 pages with no systematic discovery path |
| No `<link rel="canonical">` | Risk of duplicate content signals |
| No structured data (JSON-LD) | No rich results, no machine-readable semantics |
| Translated meta descriptions in English | Non-English search queries won't match |
| `og:url` on translated pages points to English URL | Social shares from translated pages misattributed |
| No `llms.txt` | AI search tools have no structured overview |
| No citation-ready content blocks | LLMs can't extract concise factual answers |
| Blog missing `hreflang` tags | Minor gap |
| Duplicate skip-link in `blog.html` | HTML hygiene |

## Design

### 1. Crawlability foundations

**`robots.txt`** (new file, site root):
- `User-agent: *` Allow all
- Explicitly allow AI bots: GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, ClaudeBot, Applebot-Extended
- Reference `sitemap.xml`
- Disallow nothing (fully public site)

**`sitemap.xml`** (new file, site root):
- All 6 English pages with absolute URLs
- All 50 translated pages (10 languages x 5 pages each, blog excluded)
- `lastmod` dates based on most recent git commit
- `changefreq`: daily for index/coverage, weekly for others
- `priority`: 1.0 for index, 0.8 for tools, 0.6 for translated pages

**`<link rel="canonical">`** on every page:
- English pages: self-referencing canonical
- Translated pages: canonical pointing to themselves (not to English — these are legitimate alternate-language pages, not duplicates)

### 2. Structured data (JSON-LD)

All JSON-LD blocks go in `<script type="application/ld+json">` in `<head>`.

**Every page — Organization + WebSite:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Reroute NJ",
  "url": "https://reroutenj.org",
  "description": "Free tools to help NJ Transit riders navigate the Portal North Bridge cutover",
  "publisher": {
    "@type": "Organization",
    "name": "Reroute NJ",
    "url": "https://reroutenj.org"
  }
}
```

**Homepage — FAQPage (highest-impact addition):**
Each line's "what changes" / "what should I do" maps to FAQ entries. Static JSON-LD with the key facts per line, since this content doesn't change dynamically.

**blog.html — Article:**
```json
{
  "@type": "Article",
  "headline": "Why we built Reroute NJ",
  "author": { "@type": "Person", "name": "Joe Amditis" },
  "datePublished": "2026-02-12",
  "publisher": { "@type": "Organization", "name": "Reroute NJ" }
}
```

**All pages — BreadcrumbList:**
Simple two-level breadcrumbs: Home > [Page Name]

### 3. Translated page fixes

Update `tools/generate-pages.py` to:
- Replace `<meta name="description">` content with translated strings from each language's JSON
- Replace `og:description` content with translated strings
- Fix `og:url` to point to the translated page's own URL (e.g., `https://reroutenj.org/es/index.html`)
- Add `<link rel="canonical">` pointing to the translated page itself

Required new translation keys in each language JSON:
- `meta.index_description` — translated meta description for index.html
- `meta.index_og_description` — translated OG description for index.html
- Same pattern for compare, coverage, map, embed pages

### 4. LLMEO — AI search optimization

**`/llms.txt`** (new file, site root):
```markdown
# Reroute NJ
> Free tools helping NJ Transit riders navigate the Portal North Bridge
> cutover (Feb 15 - Mar 15, 2026). Five interactive tools, 11 languages.

Reroute NJ provides real-time guidance for commuters affected by the
Portal North Bridge construction cutover. During this period, roughly
50% of NJ Transit trains between New Jersey and New York Penn Station
are suspended. All rail lines except Atlantic City are affected.

## Tools
- [Line guide](https://reroutenj.org/index.html): Select your NJ Transit line and station to see exactly what changes and what to do
- [Commute comparison](https://reroutenj.org/compare.html): Side-by-side comparison of alternative routes (PATH, ferry, bus) with travel times and costs
- [News coverage](https://reroutenj.org/coverage.html): Curated feed of Portal Bridge reporting from regional news sources
- [Interactive map](https://reroutenj.org/map.html): Map of affected stations, transfer points, and alternative routes
- [Embed and share](https://reroutenj.org/embed.html): Embed codes for newsrooms and publishers to republish tools

## Key facts
- Dates: February 15 to March 15, 2026
- Cause: Amtrak transferring track from 115-year-old Portal Bridge to new Portal North Bridge
- Impact: ~50% service reduction between Newark Penn and NY Penn Station
- Affected lines: Montclair-Boonton, Morris and Essex, Northeast Corridor, North Jersey Coast, Raritan Valley
- Not affected: Atlantic City Rail Line
- Hoboken diversions: Montclair-Boonton and Morris and Essex lines rerouted to Hoboken Terminal

## Translations
Available in: English, Spanish, Chinese, Tagalog, Korean, Portuguese, Gujarati, Hindi, Italian, Arabic, Polish
```

**Citation-ready answer blocks:**
Add a concise factual paragraph right after each page's `<h1>`, visible to both users and crawlers. Example for the homepage:

> During Feb 15 - Mar 15, 2026, NJ Transit service is reduced by approximately 50% due to the Portal North Bridge cutover. Select your line below to see exactly how your commute changes, what alternative routes are available, and what tickets you need.

**Semantic heading structure audit:**
Ensure each tool page uses question-like H2s that match how people ask AI assistants:
- "How does the [Line] change during the cutover?"
- "What are my alternative routes from [Station]?"
- "What ticket do I need for Hoboken?"

### 5. Google Search Console

- Register reroutenj.org (HTML file verification method — add a `google*.html` file to repo root)
- Submit sitemap.xml
- Monitor for crawl errors and indexing status
- This step happens after deployment of the above changes

## Files to create

| File | Purpose |
|------|---------|
| `robots.txt` | Crawler guidance + sitemap reference |
| `sitemap.xml` | Page discovery for search engines |
| `llms.txt` | AI search tool discovery |

## Files to modify

| File | Changes |
|------|---------|
| `index.html` | Add canonical, JSON-LD (WebSite + FAQPage + Breadcrumb), citation-ready answer block |
| `compare.html` | Add canonical, JSON-LD (WebSite + Breadcrumb), answer block |
| `coverage.html` | Add canonical, JSON-LD (WebSite + Breadcrumb), answer block |
| `map.html` | Add canonical, JSON-LD (WebSite + Breadcrumb), answer block |
| `embed.html` | Add canonical, JSON-LD (WebSite + Breadcrumb), answer block |
| `blog.html` | Add canonical, hreflang self-ref, JSON-LD (Article + Breadcrumb), fix duplicate skip-link |
| `tools/generate-pages.py` | Handle translated meta descriptions, og:url fix, canonical tags |
| `translations/en.json` | Add meta description keys |
| `translations/{lang}.json` (x10) | Add translated meta description keys |

## Out of scope

- Google News sitemap (one blog post, coverage page aggregates other publishers)
- `llms-full.txt` (site is small enough for single file)
- Content strategy / new pages
- Link building
