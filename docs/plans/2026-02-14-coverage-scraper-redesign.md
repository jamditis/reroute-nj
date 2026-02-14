# Coverage scraper redesign

**Date:** 2026-02-14
**Status:** Approved
**Lifespan:** Page sunsets after March 15, 2026

## Problem

The coverage scraper (`tools/scrape-coverage.py`) uses Firecrawl search as its primary article discovery source. This produces broken and fabricated articles:

- Firecrawl search hallucinates plausible-looking URLs that don't exist (all 3 TAPinto articles use a URL path structure that TAPinto doesn't have)
- No HTTP status validation — 403s and soft 404s pass through
- No content relevance check — irrelevant NJ Transit pages (parking rates, Presidents' Day schedule) get added because they're on an "official" domain
- Some excerpts are AI-generated summaries rather than extracted article text

5 of 24 articles need removal. 3 more are unverifiable (403 from bot blocking).

## Design

### 1. Immediate cleanup

Remove from `coverage.json`:
- `tapinto-morristown-2026-02-11` — fabricated URL
- `tapinto-montclair-2026-02-10` — fabricated URL
- `tapinto-red-bank-2026-02-10` — fabricated URL
- `njtransit-transit-2026-02-12` — Presidents' Day schedule, not Portal Bridge
- `njtransit-transit-2025-12-17` — parking lot rates, not Portal Bridge

Keep Hoboken Girl, Montclair Girl, PIX11 (403 is likely bot blocking, not missing pages).

### 2. Replace Firecrawl search with Google News RSS

Replace `discover_new_articles()` with `poll_google_news()`.

**Google News RSS URL:**
```
https://news.google.com/rss/search?q="portal+bridge"+OR+"portal+north+bridge"+NJ+Transit&hl=en-US&gl=US&ceid=US:en
```

The function:
1. Fetches the RSS feed (standard XML, no API key needed)
2. Parses items: title, link, pubDate, source
3. Follows Google News redirect URLs to get actual article URLs
4. Deduplicates against existing `coverage.json`
5. Returns candidates list

Keep existing RSS feeds (NJ Transit, NJ.com, Gothamist) unchanged. Remove Firecrawl `search_queries` from `scrape-config.json`. Keep Firecrawl for scraping article content (excerpts, metadata) only.

### 3. Add validation gates

Two checks before any article enters `coverage.json`:

**Gate 1 — HTTP validation:** HEAD request via `urllib.request`. Must return 200. Reject 3xx/4xx/5xx. Follow redirects to resolve final URL.

**Gate 2 — Content relevance:** After Firecrawl scrapes the page, check that markdown contains at least one of: "portal bridge", "portal north", "cutover", "portal north bridge". Reject if none found.

Both gates run before the existing `validate_article()` check.

### 4. Link health check mode

Add `--check-links` flag that runs HTTP HEAD on every URL in `coverage.json` and reports broken ones. No auto-removal — just reports.

## What doesn't change

- `coverage.json` schema
- `js/coverage.js` (frontend rendering)
- RSS feed polling for NJ Transit, NJ.com, Gothamist
- Firecrawl for content scraping (excerpts, metadata)
- Auto-add + git push + Telegram notification flow
- `--verify` and `--dry-run` modes

## Files to modify

| File | Change |
|------|--------|
| `data/coverage.json` | Remove 5 broken articles |
| `tools/scrape-coverage.py` | Replace `discover_new_articles` with `poll_google_news`, add validation gates, add `--check-links` |
| `tools/scrape-config.json` | Remove `search_queries`, add `google_news_query` |
