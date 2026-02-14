# Coverage scraper redesign — implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Firecrawl search with Google News RSS for article discovery, add HTTP and content validation gates, remove broken articles.

**Architecture:** Keep the existing scraper structure (Python, Firecrawl for content scraping, RSS polling, auto-commit). Replace the search-based discovery function with Google News RSS polling. Add two validation gates (HTTP status + content relevance) that run before any article enters coverage.json.

**Tech Stack:** Python 3 stdlib (urllib, xml.etree), Firecrawl (content scraping only), Node.js (existing test suite)

---

### Task 1: Remove broken articles from coverage.json

**Files:**
- Modify: `data/coverage.json`

**Step 1: Remove the 5 broken articles**

Delete these article objects from the `articles` array in `data/coverage.json`:

1. `tapinto-morristown-2026-02-11` (lines 166-178) — fabricated URL
2. `tapinto-montclair-2026-02-10` (lines 255-267) — fabricated URL
3. `tapinto-red-bank-2026-02-10` (lines 269-281) — fabricated URL
4. `njtransit-transit-2026-02-12` (lines 152-164) — Presidents' Day schedule
5. `njtransit-transit-2025-12-17` (lines 384-396) — parking lot rates

Update `lastUpdated` to current timestamp.

**Step 2: Run existing tests to verify coverage.json is still valid**

Run: `node tests/test-coverage-json.js`
Expected: All 20 tests PASS with 19 articles (down from 24)

**Step 3: Commit**

```bash
git add data/coverage.json
git commit -m "Remove 5 broken/irrelevant articles from coverage feed

3 TAPinto articles had fabricated URLs (wrong URL path structure).
2 NJ Transit articles were unrelated to Portal Bridge cutover."
```

---

### Task 2: Add HTTP URL validation function

**Files:**
- Modify: `tools/scrape-coverage.py` (add after `is_excluded_url` around line 171)

**Step 1: Write the `check_url_status` function**

Add this function after `is_excluded_url()`:

```python
def check_url_status(url, timeout=10):
    """HEAD request to verify URL returns 200. Returns (status_code, final_url) or (None, None) on error."""
    import urllib.request
    try:
        req = urllib.request.Request(url, method="HEAD", headers={
            "User-Agent": "RerouteNJ/1.0 (news aggregator)"
        })
        resp = urllib.request.urlopen(req, timeout=timeout)
        return resp.status, resp.url
    except urllib.error.HTTPError as e:
        return e.code, url
    except Exception as e:
        logging.warning("URL check failed for %s: %s", url, e)
        return None, None
```

**Step 2: Verify manually**

Run in Python REPL:
```bash
~/.claude/workstation/venv/bin/python3 -c "
import urllib.request
req = urllib.request.Request('https://www.njtransit.com/portalcutover', method='HEAD', headers={'User-Agent': 'RerouteNJ/1.0'})
resp = urllib.request.urlopen(req, timeout=10)
print(resp.status, resp.url)
"
```
Expected: `200 https://www.njtransit.com/portalcutover`

**Step 3: Commit**

```bash
git add tools/scrape-coverage.py
git commit -m "Add HTTP URL validation function to scraper"
```

---

### Task 3: Add content relevance check

**Files:**
- Modify: `tools/scrape-coverage.py` (add after `check_url_status`)

**Step 1: Write the `is_relevant_content` function**

```python
RELEVANCE_KEYWORDS = ["portal bridge", "portal north", "cutover", "portal north bridge"]

def is_relevant_content(markdown):
    """Check that scraped content mentions the Portal Bridge cutover."""
    if not markdown:
        return False
    text = markdown.lower()
    return any(kw in text for kw in RELEVANCE_KEYWORDS)
```

**Step 2: Commit**

```bash
git add tools/scrape-coverage.py
git commit -m "Add content relevance check to scraper"
```

---

### Task 4: Add Google News RSS polling

**Files:**
- Modify: `tools/scrape-coverage.py` (add new function, replace `discover_new_articles` call in `run_discover`)
- Modify: `tools/scrape-config.json` (replace `search_queries` with `google_news_query`)

**Step 1: Update scrape-config.json**

Replace the `search_queries` key with:

```json
"google_news_query": "\"portal bridge\" OR \"portal north bridge\" NJ Transit"
```

Remove the `known_outlets` key (no longer needed for search — Google News handles outlet discovery).

**Step 2: Write `poll_google_news` function**

Add after `poll_rss_feeds()`:

```python
def poll_google_news(config, existing_urls):
    """Poll Google News RSS for new articles about the Portal Bridge cutover.

    Google News RSS returns real, published article URLs — no hallucination risk.
    Links redirect through Google, so we follow redirects to get actual URLs.
    """
    import urllib.request

    query = config.get("google_news_query", "")
    if not query:
        logging.warning("No google_news_query in config")
        return []

    # Build Google News RSS URL
    encoded_query = query.replace(" ", "+")
    feed_url = (
        f"https://news.google.com/rss/search?"
        f"q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
    )

    candidates = []
    seen_urls = set()

    try:
        req = urllib.request.Request(feed_url, headers={
            "User-Agent": "RerouteNJ/1.0 (news aggregator)"
        })
        resp = urllib.request.urlopen(req, timeout=15)
        xml_data = resp.read().decode("utf-8", errors="replace")
        root = ET.fromstring(xml_data)

        channel = root.find("channel")
        if channel is None:
            channel = root

        items = channel.findall("item")
        logging.info("Google News RSS: %d items returned", len(items))

        for item in items:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub_date = item.findtext("pubDate", "")
            source_el = item.find("source")
            source_name = source_el.text if source_el is not None else ""

            if not link or not title:
                continue

            # Google News links redirect to actual article URL.
            # Resolve the redirect to get the real URL.
            try:
                real_req = urllib.request.Request(link, method="HEAD", headers={
                    "User-Agent": "RerouteNJ/1.0 (news aggregator)"
                })
                real_resp = urllib.request.urlopen(real_req, timeout=10)
                actual_url = real_resp.url
            except Exception:
                # If redirect resolution fails, use the Google News URL
                # (it will fail HTTP validation later)
                actual_url = link

            norm = normalize_url(actual_url)
            if norm in existing_urls or norm in seen_urls:
                continue
            if is_blocked_site(actual_url) or is_excluded_url(actual_url):
                continue

            # Parse date from RSS pubDate
            date = None
            if pub_date:
                try:
                    dt = parsedate_to_datetime(pub_date)
                    date = dt.strftime("%Y-%m-%d")
                except Exception:
                    pass

            seen_urls.add(norm)
            candidates.append({
                "url": actual_url,
                "title": title,
                "description": "",
                "date": date,
                "source": source_name or source_name_from_url(actual_url),
                "from_google_news": True,
            })

        logging.info("Google News: %d new candidates after dedup", len(candidates))

    except Exception as e:
        logging.error("Google News RSS failed: %s", e)

    return candidates
```

**Step 3: Update `run_discover` to use Google News instead of Firecrawl search**

In `run_discover()` (around line 840), replace:

```python
    # Then search via Firecrawl for outlets without RSS
    search_candidates = discover_new_articles(app, config, existing_urls)
```

with:

```python
    # Then poll Google News RSS for broader coverage
    google_candidates = poll_google_news(config, existing_urls)
    logging.info("Google News: %d new candidates.", len(google_candidates))
```

And update the merge block (around line 846) to use `google_candidates` instead of `search_candidates`:

```python
    for c in rss_candidates + google_candidates:
```

**Step 4: Wire in validation gates**

In `run_discover()`, in the candidate scraping loop (around line 870), add the two gates after getting a candidate URL but before building the article object.

Replace the existing loop body starting at `for candidate in candidates:` with:

```python
    for candidate in candidates:
        # Gate 1: HTTP validation
        status, final_url = check_url_status(candidate["url"])
        if status != 200:
            logging.info("Rejected %s: HTTP %s", candidate["url"], status)
            continue
        # Use resolved URL (in case of redirects)
        candidate["url"] = final_url

        scraped = scrape_article_metadata(app, candidate["url"])
        if not scraped:
            continue

        # Gate 2: Content relevance
        if not is_relevant_content(scraped.get("markdown", "")):
            logging.info("Rejected %s: not relevant to Portal Bridge", candidate["url"])
            continue

        source = candidate.get("source") or source_name_from_url(candidate["url"])
        # ... rest of article building unchanged ...
```

**Step 5: Test the Google News RSS feed manually**

```bash
~/.claude/workstation/venv/bin/python3 -c "
import urllib.request
import xml.etree.ElementTree as ET
url = 'https://news.google.com/rss/search?q=%22portal+bridge%22+OR+%22portal+north+bridge%22+NJ+Transit&hl=en-US&gl=US&ceid=US:en'
req = urllib.request.Request(url, headers={'User-Agent': 'RerouteNJ/1.0'})
resp = urllib.request.urlopen(req, timeout=15)
root = ET.fromstring(resp.read())
items = root.findall('.//item')
print(f'{len(items)} items found')
for item in items[:5]:
    print(f'  {item.findtext(\"title\", \"\")[:80]}')
    print(f'  {item.findtext(\"link\", \"\")}')
    print()
"
```
Expected: Multiple items with real article titles and Google News redirect URLs.

**Step 6: Run scraper in dry-run mode**

```bash
~/.claude/workstation/venv/bin/python3 tools/scrape-coverage.py --dry-run
```
Expected: Shows discovered articles (if any new ones exist), no files written.

**Step 7: Commit**

```bash
git add tools/scrape-coverage.py tools/scrape-config.json
git commit -m "Replace Firecrawl search with Google News RSS

Google News returns real published URLs, eliminating the
hallucinated URL problem. Firecrawl is still used for
scraping article content (excerpts, metadata).

Added HTTP validation (must return 200) and content relevance
check (must mention Portal Bridge) as gates before any article
enters coverage.json."
```

---

### Task 5: Add --check-links mode

**Files:**
- Modify: `tools/scrape-coverage.py` (add `run_check_links` function and CLI arg)

**Step 1: Add the `run_check_links` function**

Add before `main()`:

```python
def run_check_links():
    """Check HTTP status of all article URLs in coverage.json."""
    coverage_data = load_coverage()
    articles = coverage_data.get("articles", [])
    total = len(articles)
    broken = []
    ok = 0

    for i, article in enumerate(articles):
        url = article["url"]
        logging.info("[%d/%d] Checking %s", i + 1, total, article["id"])

        status, final_url = check_url_status(url)

        if status == 200:
            ok += 1
        elif status is not None:
            broken.append({"id": article["id"], "url": url, "status": status})
            logging.warning("  BROKEN: HTTP %d", status)
        else:
            broken.append({"id": article["id"], "url": url, "status": "error"})
            logging.warning("  ERROR: could not connect")

    logging.info("Link check: %d OK, %d broken out of %d total", ok, len(broken), total)

    if broken:
        print("\nBroken links:")
        for b in broken:
            print(f"  {b['id']}: HTTP {b['status']} — {b['url']}")

    return len(broken)
```

**Step 2: Add CLI argument**

In `main()`, add to the argument parser (after the `--dry-run` line):

```python
    parser.add_argument("--check-links", action="store_true",
                        help="Check HTTP status of all article URLs")
```

And add the dispatch before the Firecrawl setup (since --check-links doesn't need Firecrawl):

```python
    setup_logging()
    logging.info("=== Scraper run started ===")

    if args.check_links:
        count = run_check_links()
        logging.info("=== Link check finished. %d broken. ===", count)
        sys.exit(1 if count > 0 else 0)

    config = load_config()
    # ... rest of main unchanged ...
```

**Step 3: Test it**

```bash
~/.claude/workstation/venv/bin/python3 tools/scrape-coverage.py --check-links
```
Expected: Checks all 19 remaining URLs, reports status for each. Some may show 403 (bot blocking) which is expected for Hoboken Girl, Montclair Girl, PIX11.

**Step 4: Run the full test suite**

```bash
for t in /home/jamditis/projects/reroute-nj/tests/test-*.js; do node "$t"; done
```
Expected: All tests pass.

**Step 5: Commit**

```bash
git add tools/scrape-coverage.py
git commit -m "Add --check-links mode to coverage scraper

Reports HTTP status of all article URLs without modifying
coverage.json. Useful for catching articles that have been
taken down or moved since they were added."
```

---

### Task 6: Clean up dead code

**Files:**
- Modify: `tools/scrape-coverage.py`

**Step 1: Remove `discover_new_articles` function**

Delete the entire `discover_new_articles()` function (lines 602-644). It's no longer called anywhere after being replaced by `poll_google_news()`.

**Step 2: Verify nothing else references it**

Search for `discover_new_articles` in the file — should find zero references.

**Step 3: Commit**

```bash
git add tools/scrape-coverage.py
git commit -m "Remove unused discover_new_articles function"
```

---

### Task 7: Final verification

**Step 1: Run all tests**

```bash
for t in /home/jamditis/projects/reroute-nj/tests/test-*.js; do node "$t"; done
```
Expected: All tests pass.

**Step 2: Run scraper dry-run**

```bash
~/.claude/workstation/venv/bin/python3 tools/scrape-coverage.py --dry-run
```
Expected: Runs without errors. May or may not find new articles.

**Step 3: Run link check**

```bash
~/.claude/workstation/venv/bin/python3 tools/scrape-coverage.py --check-links
```
Expected: All 19 URLs checked, most return 200, a few 403 (bot blocking).

**Step 4: Verify coverage page renders locally**

```bash
cd /home/jamditis/projects/reroute-nj && python3 -m http.server 8000 &
# Visit http://localhost:8000/coverage.html — should show 19 articles, no broken cards
kill %1
```
