#!/usr/bin/env python3
"""
Automated coverage scraper for Reroute NJ.

Discovers new articles about the Portal Bridge cutover via GDELT and RSS,
extracts metadata using stdlib HTML parsing, deduplicates against existing
coverage.json, validates entries, and commits changes.

No external dependencies — uses only Python stdlib.

Usage:
    python3 scrape-coverage.py              # Discover new articles
    python3 scrape-coverage.py --verify     # Verify existing article metadata
    python3 scrape-coverage.py --dry-run    # Show changes without writing
"""

import json
import os
import re
import subprocess
import sys
import logging
import argparse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
COVERAGE_FILE = DATA_DIR / "coverage.json"
REGISTRY_FILE = DATA_DIR / "source-registry.json"
CONFIG_FILE = SCRIPT_DIR / "scrape-config.json"
LOG_FILE = Path(os.path.expanduser("~/.claude/workstation/logs/reroute-scrape.log"))

TELEGRAM_CHAT_ID = "743339387"

VALID_CATEGORIES = {"official", "news", "analysis", "community", "opinion"}
VALID_DIRECTIONS = {"both", "nj-to-nyc", "nyc-to-nj"}
VALID_LINES = {
    "all", "montclair-boonton", "morris-essex",
    "northeast-corridor", "north-jersey-coast", "raritan-valley"
}

EXCLUDED_DOMAINS = {
    "wikipedia.org", "youtube.com", "youtu.be",
    "reddit.com", "facebook.com", "instagram.com", "x.com", "twitter.com",
    "trainorders.com", "railfan.com",
    "linkedin.com", "tiktok.com",
}

EXCLUDED_URL_PATTERNS = [
    r"^https?://[^/]+/?$",  # bare homepage
]

USER_AGENT = "Mozilla/5.0 (compatible; RerouteNJ/2.0; +https://reroutenj.org)"


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(LOG_FILE),
        ],
    )


# ---------------------------------------------------------------------------
# Config & data helpers
# ---------------------------------------------------------------------------

def load_config():
    with open(CONFIG_FILE) as f:
        return json.load(f)


def load_coverage():
    with open(COVERAGE_FILE) as f:
        return json.load(f)


def save_coverage(data):
    with open(COVERAGE_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def load_registry():
    with open(REGISTRY_FILE) as f:
        return json.load(f)


def save_registry(data):
    with open(REGISTRY_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


# ---------------------------------------------------------------------------
# Telegram notifications
# ---------------------------------------------------------------------------

def get_telegram_token():
    try:
        result = subprocess.run(
            ["pass", "show", "claude/tokens/telegram-bot"],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip().split("\n")[0]
    except Exception:
        return None


def send_telegram(message):
    import html as html_mod
    token = get_telegram_token()
    if not token:
        logging.warning("No Telegram token, skipping notification")
        return
    safe_msg = html_mod.escape(message)
    url = "https://api.telegram.org/bot%s/sendMessage" % token
    data = json.dumps({
        "chat_id": TELEGRAM_CHAT_ID,
        "text": safe_msg,
        "parse_mode": "HTML",
    }).encode()
    req = Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        urlopen(req, timeout=15)
    except Exception as e:
        logging.error("Telegram send failed: %s", e)


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def normalize_url(url):
    """Strip query params and trailing slashes for dedup comparison."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    return ("%s://%s%s" % (parsed.scheme, parsed.netloc, path)).lower()


def is_excluded_url(url):
    """Check if a URL should be excluded from discovery."""
    domain = urlparse(url).netloc.lower()
    if any(excl in domain for excl in EXCLUDED_DOMAINS):
        return True
    for pattern in EXCLUDED_URL_PATTERNS:
        if re.match(pattern, url):
            return True
    return False


def check_url_status(url, timeout=10):
    """HEAD request to verify URL returns 200. Returns (status_code, final_url) or (None, None) on error."""
    try:
        req = Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
        resp = urlopen(req, timeout=timeout)
        return resp.status, resp.url
    except HTTPError as e:
        return e.code, url
    except Exception as e:
        logging.warning("URL check failed for %s: %s", url, e)
        return None, None



def extract_date_from_url(url):
    """Try to extract date from URL path like /2026/02/13/..."""
    match = re.search(r"/(\d{4})/(\d{2})/(\d{2})/", url)
    if match:
        return "%s-%s-%s" % (match.group(1), match.group(2), match.group(3))
    return None


# ---------------------------------------------------------------------------
# HTML metadata extraction (stdlib only)
# ---------------------------------------------------------------------------

class MetaExtractor(HTMLParser):
    """Extract article metadata from HTML meta tags and first paragraphs."""

    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self.og_description = ""
        self.author = ""
        self.pub_date = ""
        self.paragraphs = []
        self._in_p = False
        self._in_title = False
        self._current_text = ""
        self._p_count = 0

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if tag == "meta":
            name = attrs_dict.get("name", "").lower()
            prop = attrs_dict.get("property", "").lower()
            content = attrs_dict.get("content", "")
            if not content:
                return

            if name == "description":
                self.description = content
            elif prop == "og:description":
                self.og_description = content
            elif name == "author" or prop == "article:author":
                if not content.startswith("http"):
                    self.author = content
            elif prop == "article:published_time" or name in (
                "date", "publishdate", "publish_date", "dc.date.issued"
            ):
                self.pub_date = content

        elif tag == "time":
            dt = attrs_dict.get("datetime", "")
            if dt and not self.pub_date:
                self.pub_date = dt

        elif tag == "p" and self._p_count < 10:
            self._in_p = True
            self._current_text = ""

        elif tag == "title":
            self._in_title = True
            self._current_text = ""

    def handle_endtag(self, tag):
        if tag == "p" and self._in_p:
            self._in_p = False
            text = self._current_text.strip()
            if len(text) > 40:
                self.paragraphs.append(text)
                self._p_count += 1
        elif tag == "title" and self._in_title:
            self._in_title = False
            self.title = self._current_text.strip()

    def handle_data(self, data):
        if self._in_p or self._in_title:
            self._current_text += data


def fetch_html(url, timeout=15):
    """Fetch a URL and return the HTML content."""
    req = Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
    })
    try:
        resp = urlopen(req, timeout=timeout)
        return resp.read().decode("utf-8", errors="replace")
    except (HTTPError, URLError) as e:
        logging.warning("Failed to fetch %s: %s", url, e)
        return None
    except Exception as e:
        logging.warning("Failed to fetch %s: %s", url, e)
        return None


def scrape_article_metadata(url):
    """Scrape article metadata from URL using stdlib HTML parser.

    Returns dict with title, excerpt, author, date or None on failure.
    """
    html = fetch_html(url)
    if not html:
        return None

    parser = MetaExtractor()
    try:
        parser.feed(html)
    except Exception as e:
        logging.warning("HTML parse error for %s: %s", url, e)
        return None

    # Build excerpt: prefer OG description, then meta description, then paragraphs
    excerpt = parser.og_description or parser.description
    if not excerpt and parser.paragraphs:
        excerpt = " ".join(parser.paragraphs[:3])
    if excerpt and len(excerpt) > 400:
        excerpt = excerpt[:400].rsplit(" ", 1)[0] + "..."

    # Parse publication date
    date = None
    if parser.pub_date:
        try:
            dt_str = parser.pub_date.replace("Z", "+00:00")
            dt = datetime.fromisoformat(dt_str)
            date = dt.strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            m = re.match(r"(\d{4}-\d{2}-\d{2})", parser.pub_date)
            if m:
                date = m.group(1)
    if not date:
        date = extract_date_from_url(url)

    # Clean up title (strip " - Source Name" suffix)
    title = parser.title
    title = re.sub(r"\s*[\-|–—]\s*[^\-|–—]{3,40}$", "", title).strip()

    return {
        "title": title,
        "excerpt": excerpt or "",
        "author": parser.author or None,
        "date": date,
    }


# ---------------------------------------------------------------------------
# GDELT DOC 2.0 API discovery
# ---------------------------------------------------------------------------

def query_gdelt(search_query, timespan="7d", max_records=75):
    """Query GDELT DOC 2.0 API for article discovery.

    Free, no API key, returns direct article URLs.
    Returns list of {url, title, date, domain, language, source_country}.
    """
    import time

    params = urlencode({
        "query": search_query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": str(max_records),
        "timespan": timespan,
        "sort": "datedesc",
    })
    api_url = "https://api.gdeltproject.org/api/v2/doc/doc?%s" % params

    # Retry with backoff for rate limiting
    for attempt in range(3):
        req = Request(api_url, headers={"User-Agent": USER_AGENT})
        try:
            resp = urlopen(req, timeout=30)
            raw = resp.read().decode("utf-8")
            if not raw or not raw.strip().startswith("{"):
                logging.warning("GDELT returned non-JSON for '%s' (attempt %d)",
                                search_query, attempt + 1)
                if attempt < 2:
                    time.sleep(2 ** (attempt + 1))
                    continue
                return []
            data = json.loads(raw)
            break
        except HTTPError as e:
            if e.code == 429 and attempt < 2:
                wait = 2 ** (attempt + 1)
                logging.warning("GDELT rate limited, waiting %ds...", wait)
                time.sleep(wait)
                continue
            logging.error("GDELT query failed for '%s': %s", search_query, e)
            return []
        except Exception as e:
            logging.error("GDELT query failed for '%s': %s", search_query, e)
            return []
    else:
        return []

    articles = []
    for item in data.get("articles", []):
        url = item.get("url", "")
        if not url:
            continue

        # Parse GDELT seendate: "20260214T050000Z" -> "2026-02-14"
        seen = item.get("seendate", "")
        date = None
        if seen and len(seen) >= 8:
            try:
                date = "%s-%s-%s" % (seen[:4], seen[4:6], seen[6:8])
            except Exception:
                pass

        articles.append({
            "url": url,
            "title": item.get("title", ""),
            "date": date,
            "domain": item.get("domain", ""),
            "language": item.get("language", ""),
            "source_country": item.get("sourcecountry", ""),
        })

    return articles


def discover_via_gdelt(config, existing_urls):
    """Run all configured GDELT queries and return new candidates."""
    import time

    candidates = []
    seen_urls = set()
    queries = config.get("gdelt_queries", [])
    timespan = config.get("gdelt_timespan", "7d")
    max_records = config.get("gdelt_max_records", 75)

    for qi, query in enumerate(queries):
        if qi > 0:
            time.sleep(2)  # Rate-limit between queries
        results = query_gdelt(query, timespan=timespan, max_records=max_records)

        for item in results:
            url = item["url"]
            norm = normalize_url(url)
            if norm in existing_urls or norm in seen_urls:
                continue
            if is_excluded_url(url):
                continue
            # Filter non-English results (GDELT can return false positives)
            lang = (item.get("language") or "").lower()
            if lang and lang != "english":
                logging.info("Skipping non-English article: %s (%s)", url[:60], lang)
                continue

            seen_urls.add(norm)
            candidates.append({
                "url": url,
                "title": item["title"],
                "date": item["date"],
                "domain": item["domain"],
                "source": source_name_from_url(url),
            })

        logging.info("GDELT '%s': %d results, %d new candidates",
                     query[:50], len(results), len(candidates))

    return candidates


# ---------------------------------------------------------------------------
# RSS feed polling
# ---------------------------------------------------------------------------

def poll_rss_feeds(config, existing_urls):
    """Poll RSS feeds for new articles. Returns candidates list."""
    candidates = []
    seen_urls = set()

    for feed_config in config.get("rss_feeds", []):
        feed_url = feed_config["url"]
        feed_format = feed_config.get("format", "rss")
        filter_keywords = feed_config.get("filter_keywords", [])
        source_name = feed_config["source_name"]

        try:
            req = Request(feed_url, headers={"User-Agent": USER_AGENT})
            resp = urlopen(req, timeout=15)
            xml_data = resp.read().decode("utf-8", errors="replace")
            root = ET.fromstring(xml_data)

            items = []

            if feed_format == "njtransit-custom":
                # NJ Transit custom XML — log portal-related alerts but skip
                for line_el in root.findall(".//LINE"):
                    line_name = line_el.findtext("NAME", "")
                    for item in line_el.findall(".//ITEM"):
                        title = item.findtext("TITLE", "") or item.findtext("SUBJECT", "")
                        desc = item.findtext("DESCRIPTION", "") or item.findtext("MESSAGE", "")
                        if title and "portal" in ("%s %s" % (title, desc)).lower():
                            logging.info("NJ Transit alert: [%s] %s", line_name, title[:80])
                continue

            elif feed_format == "atom":
                # Atom feeds (e.g., some WordPress sites)
                ns = {"atom": "http://www.w3.org/2005/Atom"}
                for entry in root.findall("atom:entry", ns):
                    title = (entry.findtext("atom:title", "", ns) or "").strip()
                    link_el = entry.find("atom:link[@rel='alternate']", ns)
                    if link_el is None:
                        link_el = entry.find("atom:link", ns)
                    link = link_el.get("href", "") if link_el is not None else ""
                    pub_date = entry.findtext("atom:published", "", ns) or entry.findtext("atom:updated", "", ns)
                    summary = (entry.findtext("atom:summary", "", ns) or "").strip()
                    summary = re.sub(r"<[^>]+>", "", summary)[:500]

                    if not link or not title:
                        continue

                    items.append({
                        "title": title,
                        "url": link,
                        "date_str": pub_date,
                        "description": summary,
                    })

            else:
                # Standard RSS 2.0
                channel = root.find("channel")
                if channel is None:
                    channel = root
                for item in channel.findall("item"):
                    title = item.findtext("title", "").strip()
                    link = item.findtext("link", "").strip()
                    pub_date = item.findtext("pubDate", "")
                    description = item.findtext("description", "").strip()
                    description = re.sub(r"<[^>]+>", "", description)[:500]

                    if not link or not title:
                        continue

                    items.append({
                        "title": title,
                        "url": link,
                        "date_str": pub_date,
                        "description": description,
                    })

            # Filter by keywords if specified
            for item in items:
                text = ("%s %s" % (item["title"], item.get("description", ""))).lower()

                if filter_keywords and not any(kw in text for kw in filter_keywords):
                    continue

                url = item["url"]
                norm = normalize_url(url)
                if norm in existing_urls or norm in seen_urls:
                    continue
                if is_excluded_url(url):
                    continue

                # Parse date
                date = None
                if item.get("date_str"):
                    try:
                        dt = parsedate_to_datetime(item["date_str"])
                        date = dt.strftime("%Y-%m-%d")
                    except Exception:
                        # Try ISO 8601 (Atom feeds)
                        try:
                            dt = datetime.fromisoformat(
                                item["date_str"].replace("Z", "+00:00")
                            )
                            date = dt.strftime("%Y-%m-%d")
                        except Exception:
                            pass

                seen_urls.add(norm)
                candidates.append({
                    "url": url,
                    "title": item["title"],
                    "description": item.get("description", ""),
                    "date": date,
                    "source": source_name,
                    "from_rss": True,
                })

            logging.info("RSS '%s': %d items, %d candidates so far",
                         feed_config["id"], len(items), len(candidates))

        except Exception as e:
            logging.error("RSS feed error for %s: %s", feed_config["id"], e)

    return candidates


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def classify_category(url, title, description):
    """Classify article category based on URL and content signals."""
    url_lower = url.lower()
    text = ("%s %s" % (title, description)).lower()

    if any(d in url_lower for d in ["njtransit.com", "media.amtrak.com", "panynj.gov"]):
        return "official"
    if any(kw in text for kw in ["opinion", "editorial", "op-ed", "column", "commentary"]):
        return "opinion"
    if any(kw in text for kw in ["analysis", "explainer", "guide", "what to know", "breakdown"]):
        return "analysis"
    if any(d in url_lower for d in ["tapinto.net", "patch.com", "hobokengirl", "montclairgirl"]):
        return "community"

    return "news"


def classify_lines(title, excerpt):
    """Classify which transit lines an article is about."""
    text = ("%s %s" % (title, excerpt)).lower()

    lines = []
    line_keywords = {
        "montclair-boonton": ["montclair", "boonton", "midtown direct"],
        "morris-essex": ["morris", "essex", "morristown", "gladstone", "summit"],
        "northeast-corridor": ["northeast corridor", "nec "],
        "north-jersey-coast": ["north jersey coast", "njcl", "coast line", "bay head", "long branch"],
        "raritan-valley": ["raritan valley", "raritan", "one-seat ride"],
    }

    for line_id, keywords in line_keywords.items():
        if any(kw in text for kw in keywords):
            lines.append(line_id)

    if len(lines) >= 4 or not lines:
        return ["all"]

    return lines


def classify_direction(title, excerpt):
    """Classify travel direction focus."""
    text = ("%s %s" % (title, excerpt)).lower()

    nj_to_nyc = any(kw in text for kw in [
        "nj-to-nyc", "into manhattan", "to penn station", "morning commute",
        "heading to new york", "into the city"
    ])
    nyc_to_nj = any(kw in text for kw in [
        "nyc-to-nj", "reverse commut", "evening commute", "going home",
        "heading to new jersey", "heading home"
    ])

    if nj_to_nyc and nyc_to_nj:
        return "both"
    if nj_to_nyc:
        return "nj-to-nyc"
    if nyc_to_nj:
        return "nyc-to-nj"
    return "both"


# ---------------------------------------------------------------------------
# Source mapping & article IDs
# ---------------------------------------------------------------------------

SOURCE_DOMAIN_MAP = {
    "nj.com": "NJ.com",
    "northjersey.com": "NorthJersey.com",
    "nytimes.com": "The New York Times",
    "gothamist.com": "Gothamist",
    "wnyc.org": "WNYC",
    "nj1015.com": "New Jersey 101.5",
    "pix11.com": "PIX11 News",
    "abc7ny.com": "ABC7 New York",
    "politico.com": "Politico New Jersey",
    "njspotlightnews.org": "NJ Spotlight News",
    "tapinto.net": "TAPinto",
    "patch.com": "Patch",
    "njbiz.com": "NJBIZ",
    "hobokengirl.com": "Hoboken Girl",
    "themontclairgirl.com": "The Montclair Girl",
    "newjersey.news12.com": "News 12 New Jersey",
    "news12.com": "News 12 New Jersey",
    "njtransit.com": "NJ Transit",
    "media.amtrak.com": "Amtrak Media",
    "cbsnews.com": "CBS News",
    "nbcnewyork.com": "NBC New York",
    "fox5ny.com": "Fox 5 New York",
    "silive.com": "SILive.com",
    "dailyrecord.com": "Daily Record",
    "app.com": "Asbury Park Press",
    "pbs.org": "PBS",
    "6sqft.com": "6sqft",
    "roi-nj.com": "ROI-NJ",
    "dailyvoice.com": "Daily Voice",
    "trains.com": "Trains Magazine",
    "lackawannacoalition.org": "Lackawanna Coalition",
}

SOURCE_ID_MAP = {
    "NJ.com": "njdotcom",
    "NorthJersey.com": "northjersey",
    "The New York Times": "nytimes",
    "Gothamist": "gothamist",
    "WNYC": "wnyc",
    "New Jersey 101.5": "nj1015",
    "PIX11 News": "pix11",
    "ABC7 New York": "abc7",
    "NJ Transit": "njtransit",
    "Amtrak Media": "amtrak",
    "NJ Spotlight News": "nj-spotlight",
    "Politico New Jersey": "politico-nj",
    "Hoboken Girl": "hobokengirl",
    "The Montclair Girl": "montclairgirl",
    "TAPinto": "tapinto",
    "Patch": "patch",
    "NJBIZ": "njbiz",
    "News 12 New Jersey": "news12",
}


def source_name_from_url(url):
    """Map a URL to a human-readable source name."""
    domain = urlparse(url).netloc.lower().replace("www.", "")
    for key, name in SOURCE_DOMAIN_MAP.items():
        if key in domain:
            return name
    return domain


def make_article_id(source, title, date):
    """Generate a slug-style article ID."""
    prefix = SOURCE_ID_MAP.get(source, "")
    if not prefix:
        prefix = re.sub(r"[^a-z0-9]+", "-", source.lower()).strip("-")

    words = re.sub(r"[^a-z0-9\s]", "", title.lower()).split()
    slug_words = [w for w in words[:4] if len(w) > 2]
    slug = "-".join(slug_words)

    return "%s-%s-%s" % (prefix, slug, date)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_article(article):
    """Check that an article has all required fields with valid values."""
    errors = []

    required = ["id", "title", "url", "source", "date", "category", "excerpt", "lines", "direction"]
    for field in required:
        if field not in article or not article[field]:
            errors.append("missing %s" % field)

    if article.get("date") and not re.match(r"^\d{4}-\d{2}-\d{2}$", article["date"]):
        errors.append("invalid date format: %s" % article["date"])

    if article.get("category") and article["category"] not in VALID_CATEGORIES:
        errors.append("invalid category: %s" % article["category"])

    if article.get("direction") and article["direction"] not in VALID_DIRECTIONS:
        errors.append("invalid direction: %s" % article["direction"])

    if article.get("lines"):
        for line in article["lines"]:
            if line not in VALID_LINES:
                errors.append("invalid line: %s" % line)

    if article.get("url") and not article["url"].startswith("https"):
        errors.append("URL not HTTPS: %s" % article["url"])

    return errors


# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------

def git_commit_and_push(message):
    """Commit coverage changes and push to main."""
    try:
        subprocess.run(
            ["git", "add", "data/coverage.json", "data/source-registry.json"],
            cwd=PROJECT_DIR, check=True, capture_output=True, timeout=30,
        )
        subprocess.run(
            ["git", "commit", "-m", message],
            cwd=PROJECT_DIR, check=True, capture_output=True, timeout=30,
        )
        # Pull with rebase before pushing to handle remote divergence
        subprocess.run(
            ["git", "pull", "--rebase", "origin", "main"],
            cwd=PROJECT_DIR, check=True, capture_output=True, text=True, timeout=60,
        )
        result = subprocess.run(
            ["git", "push", "origin", "main"],
            cwd=PROJECT_DIR, check=True, capture_output=True, text=True, timeout=60,
        )
        logging.info("Git push: %s", result.stdout.strip() or "OK")
        return True
    except subprocess.CalledProcessError as e:
        logging.error("Git failed: %s %s", e.stdout, e.stderr)
        send_telegram("Reroute NJ scraper: git push failed.\n%s" % e.stderr)
        return False


# ---------------------------------------------------------------------------
# Registry update
# ---------------------------------------------------------------------------

def update_registry_timestamps(registry_data, checked_ids):
    """Update lastVerified for checked source registry entries."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for entry in registry_data.get("entries", []):
        if entry["id"] in checked_ids:
            entry["lastVerified"] = now
    registry_data["updatedAt"] = now


# ---------------------------------------------------------------------------
# Main pipelines
# ---------------------------------------------------------------------------

def run_discover(config, dry_run=False):
    """Main discovery pipeline: GDELT + RSS -> scrape -> validate -> save."""
    coverage_data = load_coverage()
    existing_urls = {normalize_url(a["url"]) for a in coverage_data["articles"]}
    existing_count = len(coverage_data["articles"])

    logging.info("Starting discovery. %d existing articles.", existing_count)

    # 1. Poll RSS feeds (free, fast, reliable for configured sources)
    rss_candidates = poll_rss_feeds(config, existing_urls)
    logging.info("RSS: %d new candidates.", len(rss_candidates))

    # 2. Query GDELT for broader discovery
    gdelt_candidates = discover_via_gdelt(config, existing_urls)
    logging.info("GDELT: %d new candidates.", len(gdelt_candidates))

    # 3. Merge, dedup by URL (RSS first so its metadata takes priority)
    seen = set()
    candidates = []
    for c in rss_candidates + gdelt_candidates:
        norm = normalize_url(c["url"])
        if norm not in seen:
            seen.add(norm)
            candidates.append(c)
    logging.info("Total: %d unique candidates to process.", len(candidates))

    if not candidates:
        logging.info("No new articles found.")
        if not dry_run:
            registry = load_registry()
            update_registry_timestamps(registry, [
                "official-cutover-portal-page",
                "official-alerts",
                "secondary-news-coverage",
            ])
            save_registry(registry)
        return 0

    # 4. Scrape each candidate for metadata/excerpt
    new_articles = []
    used_ids = {a["id"] for a in coverage_data["articles"]}

    for candidate in candidates:
        url = candidate["url"]
        scraped = scrape_article_metadata(url)

        source = candidate.get("source") or source_name_from_url(url)

        # Title: prefer discovery title (RSS/GDELT headline), fall back to scraped
        title = candidate.get("title", "")
        if not title and scraped and scraped["title"]:
            title = scraped["title"]
        if not title:
            logging.warning("No title for %s, skipping", url)
            continue

        # Date: prefer RSS date, then scraped, then GDELT, then today
        date = None
        if candidate.get("from_rss") and candidate.get("date"):
            date = candidate["date"]
        if not date and scraped:
            date = scraped.get("date")
        if not date:
            date = candidate.get("date")
        if not date:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Excerpt: prefer scraped (meta descriptions), fall back to RSS description
        excerpt = ""
        if scraped and scraped["excerpt"]:
            excerpt = scraped["excerpt"]
        if not excerpt:
            excerpt = candidate.get("description", "")

        # Author
        author = None
        if scraped and scraped.get("author"):
            author = scraped["author"]

        article = {
            "id": make_article_id(source, title, date),
            "title": title,
            "url": url,
            "source": source,
            "author": author,
            "date": date,
            "category": classify_category(url, title, excerpt),
            "excerpt": excerpt,
            "lines": classify_lines(title, excerpt),
            "direction": classify_direction(title, excerpt),
        }

        errors = validate_article(article)
        if errors:
            logging.warning("Skipping %s: %s", url, ", ".join(errors))
            continue

        # Ensure unique ID
        if article["id"] in used_ids:
            path_slug = re.sub(
                r"[^a-z0-9]+", "-", urlparse(url).path.lower()
            ).strip("-")[-20:]
            article["id"] = "%s-%s" % (article["id"], path_slug)
        if article["id"] in used_ids:
            logging.warning("Duplicate ID after dedup: %s", article["id"])
            continue
        used_ids.add(article["id"])

        new_articles.append(article)
        logging.info("New: %s (%s, %s)", article["id"], date, source)

    if not new_articles:
        logging.info("No valid new articles after processing.")
        return 0

    logging.info("Adding %d new articles.", len(new_articles))

    if dry_run:
        for a in new_articles:
            print(json.dumps(a, indent=2))
        return len(new_articles)

    # Merge into coverage
    coverage_data["articles"].extend(new_articles)
    coverage_data["articles"].sort(key=lambda a: a["date"], reverse=True)
    coverage_data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    save_coverage(coverage_data)

    # Update registry
    registry = load_registry()
    update_registry_timestamps(registry, [
        "official-cutover-portal-page",
        "official-alerts",
        "secondary-news-coverage",
    ])
    save_registry(registry)

    # Run validation
    try:
        result = subprocess.run(
            [sys.executable, str(SCRIPT_DIR / "validate-data.py"), "--quick"],
            cwd=PROJECT_DIR, capture_output=True, text=True, timeout=60,
        )
        if result.returncode != 0:
            logging.warning("Validation issues:\n%s", result.stdout[-500:])
    except Exception as e:
        logging.warning("Validation failed: %s", e)

    # Commit
    titles = [a["title"][:60] for a in new_articles[:3]]
    commit_msg = "Add %d new coverage article(s)\n\n%s" % (
        len(new_articles),
        "\n".join("- %s" % t for t in titles),
    )
    git_commit_and_push(commit_msg)

    logging.info("Added %d article(s) and pushed to remote.", len(new_articles))

    return len(new_articles)


def run_verify(dry_run=False):
    """Verify existing articles and fix metadata using stdlib scraping."""
    coverage_data = load_coverage()
    articles = coverage_data.get("articles", [])
    total = len(articles)
    corrections = []

    logging.info("Verifying %d existing articles.", total)

    for i, article in enumerate(articles):
        url = article.get("url", "")
        logging.info("[%d/%d] Verifying %s", i + 1, total, article["id"])

        scraped = scrape_article_metadata(url)
        if not scraped:
            continue

        changes = {}

        # Check date
        if scraped["date"] and scraped["date"] != article.get("date"):
            changes["date"] = {"old": article["date"], "new": scraped["date"]}

        # Fill in missing author
        if scraped.get("author") and not article.get("author"):
            changes["author"] = {"old": None, "new": scraped["author"]}

        # Improve short/missing excerpts
        if scraped.get("excerpt") and len(scraped["excerpt"]) > len(article.get("excerpt", "")):
            if len(article.get("excerpt", "")) < 100:
                changes["excerpt"] = {
                    "old": article.get("excerpt", "")[:50] + "...",
                    "new": scraped["excerpt"][:50] + "...",
                }

        if changes:
            corrections.append({
                "id": article["id"],
                "url": url,
                "changes": changes,
            })
            logging.info("  Correction: %s", json.dumps(changes))

    if not corrections:
        logging.info("All articles verified. No corrections needed.")
        return 0

    logging.info("Found %d articles needing corrections.", len(corrections))

    if dry_run:
        for c in corrections:
            print(json.dumps(c, indent=2))
        return len(corrections)

    # Apply corrections
    id_to_article = {a["id"]: a for a in coverage_data["articles"]}
    applied = 0

    for correction in corrections:
        article = id_to_article.get(correction["id"])
        if not article:
            continue

        for field, change in correction["changes"].items():
            article[field] = change["new"]
            logging.info("Fixed %s.%s: %s -> %s",
                         correction["id"], field, change["old"], change["new"])

        # Update ID if date changed (IDs contain dates)
        if "date" in correction["changes"]:
            old_date = correction["changes"]["date"]["old"]
            new_date = correction["changes"]["date"]["new"]
            if old_date and old_date in article["id"]:
                article["id"] = article["id"].replace(old_date, new_date)

        applied += 1

    coverage_data["articles"].sort(key=lambda a: a["date"], reverse=True)
    coverage_data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    save_coverage(coverage_data)

    commit_msg = "Fix metadata for %d coverage article(s)\n\nVerified against source pages." % applied
    git_commit_and_push(commit_msg)

    logging.info("Corrected metadata for %d article(s).", applied)
    return applied


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
            print("  %s: HTTP %s -- %s" % (b["id"], b["status"], b["url"]))

    return len(broken)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Reroute NJ coverage scraper (GDELT + RSS, no external deps)"
    )
    parser.add_argument("--verify", action="store_true",
                        help="Verify existing articles instead of discovering new ones")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show changes without writing files")
    parser.add_argument("--check-links", action="store_true",
                        help="Check HTTP status of all article URLs")
    args = parser.parse_args()

    setup_logging()
    logging.info("=== Scraper run started (GDELT + RSS) ===")

    if args.check_links:
        count = run_check_links()
        logging.info("=== Link check finished. %d broken. ===", count)
        sys.exit(1 if count > 0 else 0)

    config = load_config()

    try:
        if args.verify:
            count = run_verify(dry_run=args.dry_run)
        else:
            count = run_discover(config, dry_run=args.dry_run)

        logging.info("=== Run finished. %d changes. ===", count)

    except Exception as e:
        logging.error("Scraper failed: %s", e, exc_info=True)
        send_telegram("Reroute NJ scraper error: %s" % e)
        sys.exit(1)


if __name__ == "__main__":
    main()
