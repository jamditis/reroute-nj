#!/usr/bin/env python3
"""
Automated coverage scraper for Reroute NJ.

Discovers new articles about the Portal Bridge cutover via Firecrawl,
deduplicates against existing coverage.json, validates entries, and
commits changes. Also supports verifying existing article metadata.

Usage:
    python3 scrape-coverage.py              # Normal run: discover new articles
    python3 scrape-coverage.py --verify     # Verify dates/authors of existing articles
    python3 scrape-coverage.py --dry-run    # Show what would change without writing
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
from pathlib import Path
from urllib.parse import urlparse

# Use workstation venv for firecrawl
VENV_PYTHON = os.path.expanduser("~/.claude/workstation/venv/bin/python3")
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "data"
COVERAGE_FILE = DATA_DIR / "coverage.json"
REGISTRY_FILE = DATA_DIR / "source-registry.json"
CONFIG_FILE = SCRIPT_DIR / "scrape-config.json"
LOG_FILE = Path(os.path.expanduser("~/.claude/workstation/logs/reroute-scrape.log"))

TELEGRAM_BOT_TOKEN = None
TELEGRAM_CHAT_ID = "743339387"

VALID_CATEGORIES = {"official", "news", "analysis", "community", "opinion"}
VALID_DIRECTIONS = {"both", "nj-to-nyc", "nyc-to-nj"}
VALID_LINES = {
    "all", "montclair-boonton", "morris-essex",
    "northeast-corridor", "north-jersey-coast", "raritan-valley"
}

# Sites that Firecrawl can't scrape
BLOCKED_SITES = {"nytimes.com", "wsj.com"}

# Sites that aren't news coverage — exclude from discovery
EXCLUDED_DOMAINS = {
    "wikipedia.org", "youtube.com", "youtu.be",
    "reddit.com", "facebook.com", "instagram.com", "x.com", "twitter.com",
    "trainorders.com", "railfan.com",  # forums
    "linkedin.com", "tiktok.com",
}

# Don't add homepage URLs or generic pages
EXCLUDED_URL_PATTERNS = [
    r"^https?://[^/]+/?$",  # bare homepage
]


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


def load_config():
    with open(CONFIG_FILE) as f:
        return json.load(f)


def get_firecrawl_key(config):
    cmd = config.get("firecrawl_api_key_cmd", "")
    if cmd:
        try:
            result = subprocess.run(
                cmd.split(), capture_output=True, text=True, timeout=10
            )
            return result.stdout.strip()
        except Exception as e:
            logging.error("Failed to get API key: %s", e)
    return os.environ.get("FIRECRAWL_API_KEY", "")


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
    token = get_telegram_token()
    if not token:
        logging.warning("No Telegram token, skipping notification")
        return
    import urllib.request
    import html
    safe_msg = html.escape(message)
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({
        "chat_id": TELEGRAM_CHAT_ID,
        "text": safe_msg,
        "parse_mode": "HTML",
    }).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=15)
    except Exception as e:
        logging.error("Telegram send failed: %s", e)


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


def normalize_url(url):
    """Strip query params and trailing slashes for dedup comparison."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}{path}".lower()


def is_blocked_site(url):
    domain = urlparse(url).netloc.lower()
    return any(blocked in domain for blocked in BLOCKED_SITES)


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


RELEVANCE_KEYWORDS = ["portal bridge", "portal north", "cutover", "portal north bridge"]

def is_relevant_content(markdown):
    """Check that scraped content mentions the Portal Bridge cutover."""
    if not markdown:
        return False
    text = markdown.lower()
    return any(kw in text for kw in RELEVANCE_KEYWORDS)


def extract_date_from_metadata(metadata):
    """Extract publication date from Firecrawl metadata."""
    # Try published_time first (most reliable)
    for attr in ["published_time", "dc_terms_created", "dc_date_created", "dc_date"]:
        val = getattr(metadata, attr, None)
        if val:
            try:
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                return dt.strftime("%Y-%m-%d")
            except (ValueError, AttributeError):
                pass

    # Try extra metadata keys
    if hasattr(metadata, "__dict__"):
        for k, v in metadata.__dict__.items():
            if v and ("publish" in k.lower() or "date" in k.lower()):
                if isinstance(v, str) and re.match(r"\d{4}-\d{2}-\d{2}", v):
                    return v[:10]
                try:
                    dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
                    return dt.strftime("%Y-%m-%d")
                except (ValueError, AttributeError):
                    pass

    return None


def extract_date_from_url(url):
    """Try to extract date from URL path like /2026/02/13/..."""
    match = re.search(r"/(\d{4})/(\d{2})/(\d{2})/", url)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    return None


def extract_author_from_metadata(metadata):
    """Extract author from Firecrawl metadata."""
    if hasattr(metadata, "__dict__"):
        for k, v in metadata.__dict__.items():
            if "author" in k.lower() and v and isinstance(v, str):
                # Skip if it's a URL
                if not v.startswith("http"):
                    return v
    return None


def extract_date_from_markdown(markdown):
    """Fallback: look for date patterns in article text."""
    if not markdown:
        return None
    lines = markdown.split("\n")[:30]
    for line in lines:
        # "Posted: Feb 10, 2026" or "Published: February 10, 2026"
        match = re.search(
            r"(?:posted|published|updated|date)[:\s]*"
            r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{4})",
            line, re.IGNORECASE
        )
        if match:
            try:
                date_str = match.group(1).replace(",", "")
                for fmt in ["%B %d %Y", "%b %d %Y"]:
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        return dt.strftime("%Y-%m-%d")
                    except ValueError:
                        continue
            except Exception:
                pass
    return None


def classify_category(url, title, description):
    """Classify article category based on URL and content signals."""
    url_lower = url.lower()
    text = f"{title} {description}".lower()

    # Official sources
    if any(domain in url_lower for domain in ["njtransit.com", "media.amtrak.com", "panynj.gov"]):
        return "official"

    # Opinion pieces
    if any(kw in text for kw in ["opinion", "editorial", "op-ed", "column", "commentary"]):
        return "opinion"

    # Analysis / explainer
    if any(kw in text for kw in ["analysis", "explainer", "guide", "what to know", "breakdown"]):
        return "analysis"

    # Community / local
    if any(domain in url_lower for domain in ["tapinto.net", "patch.com", "hobokengirl", "montclairgirl"]):
        return "community"

    return "news"


def classify_lines(title, excerpt):
    """Classify which transit lines an article is about."""
    text = f"{title} {excerpt}".lower()

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

    # If 4+ lines detected or article mentions "all lines" / general Portal Bridge,
    # use ["all"]
    if len(lines) >= 4 or not lines:
        return ["all"]

    return lines


def classify_direction(title, excerpt):
    """Classify travel direction focus."""
    text = f"{title} {excerpt}".lower()

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


def make_article_id(source, title, date):
    """Generate a slug-style article ID."""
    # Map source names to short prefixes
    source_map = {
        "NJ.com": "njdotcom",
        "NorthJersey.com": "northjersey",
        "The New York Times": "nytimes",
        "New York Times": "nytimes",
        "Gothamist": "gothamist",
        "WNYC": "wnyc",
        "New Jersey 101.5": "nj1015",
        "PIX11 News": "pix11",
        "PIX11": "pix11",
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

    prefix = source_map.get(source, "")
    if not prefix:
        # Auto-generate from domain
        prefix = re.sub(r"[^a-z0-9]+", "-", source.lower()).strip("-")

    # Take first few meaningful words from title
    words = re.sub(r"[^a-z0-9\s]", "", title.lower()).split()
    slug_words = [w for w in words[:4] if len(w) > 2]
    slug = "-".join(slug_words)

    return f"{prefix}-{slug}-{date}"


def make_excerpt(markdown, max_chars=400):
    """Extract a clean excerpt from markdown content."""
    if not markdown:
        return ""

    lines = markdown.split("\n")
    # Skip nav, headers, short lines
    content_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith("#") or line.startswith("[") or line.startswith("!"):
            continue
        if len(line) < 40:
            continue
        # Strip markdown formatting
        clean = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        clean = re.sub(r"[*_`]", "", clean)
        if len(clean) > 40:
            content_lines.append(clean)

    text = " ".join(content_lines[:5])
    if len(text) > max_chars:
        text = text[:max_chars].rsplit(" ", 1)[0] + "..."
    return text


def source_name_from_url(url):
    """Map a URL to a source name."""
    domain_map = {
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
        "njtransit.com": "NJ Transit",
        "media.amtrak.com": "Amtrak Media",
        "cbsnews.com": "CBS News",
        "nbcnewyork.com": "NBC New York",
        "fox5ny.com": "Fox 5 New York",
        "silive.com": "SILive.com",
        "dailyrecord.com": "Daily Record",
        "app.com": "Asbury Park Press",
    }
    domain = urlparse(url).netloc.lower().replace("www.", "")
    for key, name in domain_map.items():
        if key in domain:
            return name
    return domain


def validate_article(article):
    """Check that an article has all required fields with valid values."""
    errors = []

    required = ["id", "title", "url", "source", "date", "category", "excerpt", "lines", "direction"]
    for field in required:
        if field not in article or not article[field]:
            errors.append(f"missing {field}")

    if article.get("date") and not re.match(r"^\d{4}-\d{2}-\d{2}$", article["date"]):
        errors.append(f"invalid date format: {article['date']}")

    if article.get("category") and article["category"] not in VALID_CATEGORIES:
        errors.append(f"invalid category: {article['category']}")

    if article.get("direction") and article["direction"] not in VALID_DIRECTIONS:
        errors.append(f"invalid direction: {article['direction']}")

    if article.get("lines"):
        for line in article["lines"]:
            if line not in VALID_LINES:
                errors.append(f"invalid line: {line}")

    if article.get("url") and not article["url"].startswith("https"):
        errors.append(f"URL not HTTPS: {article['url']}")

    return errors


def is_404_page(metadata, markdown):
    """Detect if the scraped content is a 404 error page."""
    status = getattr(metadata, "status_code", None)
    if status and status == 404:
        return True
    if markdown:
        header = markdown[:500].lower()
        if any(sig in header for sig in [
            "404", "page not found", "doesn't appear to exist",
            "not found", "page you requested", "no longer available",
        ]):
            return True
    return False


def scrape_article_metadata(app, url):
    """Scrape a URL and extract article metadata."""
    try:
        result = app.scrape(url, formats=["markdown"])
        metadata = result.metadata
        markdown = result.markdown or ""

        # Reject 404 pages — their metadata is from the error template
        if is_404_page(metadata, markdown):
            logging.warning("URL returns 404: %s", url)
            return None

        date = extract_date_from_metadata(metadata)
        if not date:
            date = extract_date_from_url(url)
        if not date:
            date = extract_date_from_markdown(markdown)

        author = extract_author_from_metadata(metadata)
        title = getattr(metadata, "og_title", None) or getattr(metadata, "title", None) or ""
        # Clean up title
        title = re.sub(r"\s*[-|]\s*.*$", "", title).strip()

        return {
            "title": title,
            "date": date,
            "author": author,
            "markdown": markdown,
            "url": url,
        }
    except Exception as e:
        logging.warning("Failed to scrape %s: %s", url, e)
        return None


def poll_rss_feeds(config, existing_urls):
    """Poll RSS feeds for new articles. Returns candidates list.

    RSS is free and fast — use it as the primary discovery layer before
    falling back to Firecrawl search.
    """
    import urllib.request

    candidates = []
    seen_urls = set()

    for feed_config in config.get("rss_feeds", []):
        feed_url = feed_config["url"]
        feed_format = feed_config.get("format", "rss")
        filter_keywords = feed_config.get("filter_keywords", [])
        source_name = feed_config["source_name"]

        try:
            req = urllib.request.Request(feed_url, headers={"User-Agent": "RerouteNJ/1.0"})
            resp = urllib.request.urlopen(req, timeout=15)
            xml_data = resp.read().decode("utf-8", errors="replace")
            root = ET.fromstring(xml_data)

            items = []

            if feed_format == "njtransit-custom":
                # NJ Transit custom XML: <SERVICES><LINES><LINE><ALERT><ITEM>
                for line_el in root.findall(".//LINE"):
                    line_name = line_el.findtext("NAME", "")
                    for item in line_el.findall(".//ITEM"):
                        title = item.findtext("TITLE", "") or item.findtext("SUBJECT", "")
                        pub_date = item.findtext("PUB_DATE", "")
                        desc = item.findtext("DESCRIPTION", "") or item.findtext("MESSAGE", "")
                        # NJ Transit alerts don't have article URLs
                        # Skip these for coverage — they're service alerts, not articles
                        # But log them for official source monitoring
                        if title and "portal" in f"{title} {desc}".lower():
                            logging.info("NJ Transit alert: [%s] %s", line_name, title[:80])
                continue  # Don't add NJ Transit alerts as coverage articles

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
                    # Strip HTML from description
                    description = re.sub(r"<[^>]+>", "", description)[:500]

                    if not link or not title:
                        continue

                    items.append({
                        "title": title,
                        "url": link,
                        "date_str": pub_date,
                        "description": description,
                    })

            # Filter items by keywords if specified
            for item in items:
                text = f"{item['title']} {item.get('description', '')}".lower()

                if filter_keywords and not any(kw in text for kw in filter_keywords):
                    continue

                url = item["url"]
                norm = normalize_url(url)
                if norm in existing_urls or norm in seen_urls:
                    continue
                if is_blocked_site(url) or is_excluded_url(url):
                    continue

                # Parse date
                date = None
                if item.get("date_str"):
                    try:
                        dt = parsedate_to_datetime(item["date_str"])
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

            logging.info("RSS '%s': %d items, %d relevant candidates",
                         feed_config["id"], len(items), len(candidates))

        except Exception as e:
            logging.error("RSS feed error for %s: %s", feed_config["id"], e)

    return candidates


def poll_google_news(config, existing_urls):
    """Poll Google News RSS for new articles about the Portal Bridge cutover.

    Google News returns real, published article URLs.
    Links redirect through Google, so we follow redirects to get actual URLs.
    """
    import urllib.request

    query = config.get("google_news_query", "")
    if not query:
        logging.warning("No google_news_query in config")
        return []

    encoded_query = query.replace(" ", "+").replace('"', "%22")
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

            # Google News links redirect to actual article URL
            try:
                real_req = urllib.request.Request(link, method="HEAD", headers={
                    "User-Agent": "RerouteNJ/1.0 (news aggregator)"
                })
                real_resp = urllib.request.urlopen(real_req, timeout=10)
                actual_url = real_resp.url
            except Exception:
                actual_url = link

            norm = normalize_url(actual_url)
            if norm in existing_urls or norm in seen_urls:
                continue
            if is_blocked_site(actual_url) or is_excluded_url(actual_url):
                continue

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




def verify_existing_articles(app, coverage_data):
    """Verify dates and authors of existing articles. Returns list of corrections."""
    corrections = []
    articles = coverage_data.get("articles", [])
    total = len(articles)

    for i, article in enumerate(articles):
        url = article.get("url", "")
        if is_blocked_site(url):
            logging.info("[%d/%d] Skipping blocked site: %s", i + 1, total, article["id"])
            continue

        logging.info("[%d/%d] Verifying %s", i + 1, total, article["id"])

        scraped = scrape_article_metadata(app, url)
        if not scraped:
            continue

        changes = {}

        # Check date
        if scraped["date"] and scraped["date"] != article.get("date"):
            changes["date"] = {"old": article["date"], "new": scraped["date"]}

        # Check author (only fill in if currently null)
        if scraped["author"] and not article.get("author"):
            changes["author"] = {"old": None, "new": scraped["author"]}

        if changes:
            corrections.append({
                "id": article["id"],
                "url": url,
                "changes": changes,
            })
            logging.info("  Correction needed: %s", json.dumps(changes))

    return corrections


def apply_corrections(coverage_data, corrections):
    """Apply verified corrections to coverage data."""
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
            if old_date in article["id"]:
                new_id = article["id"].replace(old_date, new_date)
                article["id"] = new_id

        applied += 1

    # Re-sort by date descending
    coverage_data["articles"].sort(key=lambda a: a["date"], reverse=True)

    return applied


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
        send_telegram(f"Reroute NJ scraper: git push failed.\n{e.stderr}")
        return False


def check_official_sources(app, config):
    """Scrape official sources and alert if content has changed.

    Saves content snapshots and compares against previous runs.
    Returns list of sources that changed.
    """
    import hashlib
    snapshot_dir = Path(os.path.expanduser("~/.claude/workstation/reroute-snapshots"))
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    changed_sources = []

    for source in config.get("official_sources", []):
        url = source["url"]
        source_id = source["id"]

        try:
            result = app.scrape(url, formats=["markdown", "screenshot"])
            markdown = result.markdown or ""

            if is_404_page(result.metadata, markdown):
                logging.warning("Official source 404: %s", url)
                continue

            # Hash the content (strip whitespace for stable comparison)
            content_hash = hashlib.sha256(
                re.sub(r"\s+", " ", markdown).encode()
            ).hexdigest()[:16]

            # Compare to previous snapshot
            hash_file = snapshot_dir / f"{source_id}.hash"
            prev_hash = hash_file.read_text().strip() if hash_file.exists() else None

            if prev_hash and prev_hash != content_hash:
                changed_sources.append({
                    "id": source_id,
                    "url": url,
                    "name": source["source_name"],
                })
                logging.info("Official source changed: %s", source_id)

                # Save the new content for diff review
                content_file = snapshot_dir / f"{source_id}.md"
                content_file.write_text(markdown)

            # Save current hash
            hash_file.write_text(content_hash)

            # Save screenshot if available
            if hasattr(result, "screenshot") and result.screenshot:
                screenshot_file = snapshot_dir / f"{source_id}.png"
                import base64
                img_data = result.screenshot
                if isinstance(img_data, str):
                    # Base64 encoded
                    if img_data.startswith("data:"):
                        img_data = img_data.split(",", 1)[1]
                    screenshot_file.write_bytes(base64.b64decode(img_data))
                elif isinstance(img_data, bytes):
                    screenshot_file.write_bytes(img_data)

        except Exception as e:
            logging.error("Failed to check official source %s: %s", source_id, e)

    if changed_sources:
        names = ", ".join(s["name"] for s in changed_sources)
        logging.info("Official sources changed: %s", names)

        # Append to changelog for review during wake sessions
        changelog = snapshot_dir / "changelog.log"
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        with open(changelog, "a") as f:
            for s in changed_sources:
                f.write(f"{now} | {s['name']} | {s['url']}\n")

    return changed_sources


def update_registry_timestamps(registry_data, checked_ids):
    """Update lastVerified for checked source registry entries."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for entry in registry_data.get("entries", []):
        if entry["id"] in checked_ids:
            entry["lastVerified"] = now
    registry_data["updatedAt"] = now


def run_discover(app, config, dry_run=False):
    """Main discovery pipeline: find new articles, scrape, validate, save."""
    coverage_data = load_coverage()
    existing_urls = {normalize_url(a["url"]) for a in coverage_data["articles"]}
    existing_count = len(coverage_data["articles"])

    logging.info("Starting discovery run. %d existing articles.", existing_count)

    # Check official sources for content changes
    changed = check_official_sources(app, config)
    if changed:
        logging.info("Official sources changed: %s",
                     ", ".join(s["id"] for s in changed))

    # Poll RSS feeds first (free, fast)
    rss_candidates = poll_rss_feeds(config, existing_urls)
    logging.info("RSS feeds: %d new candidates.", len(rss_candidates))

    # Then poll Google News RSS for broader coverage
    google_candidates = poll_google_news(config, existing_urls)
    logging.info("Google News: %d new candidates.", len(google_candidates))

    # Merge, dedup by URL
    seen = set()
    candidates = []
    for c in rss_candidates + google_candidates:
        norm = normalize_url(c["url"])
        if norm not in seen:
            seen.add(norm)
            candidates.append(c)
    logging.info("Total: %d new candidates to scrape.", len(candidates))

    if not candidates:
        logging.info("No new articles found.")
        # Still update registry timestamps
        if not dry_run:
            registry = load_registry()
            update_registry_timestamps(registry, [
                "official-cutover-portal-page",
                "official-alerts",
                "secondary-news-coverage",
            ])
            save_registry(registry)
        return 0

    # Scrape each candidate for full metadata
    new_articles = []
    used_ids = {a["id"] for a in coverage_data["articles"]}
    for candidate in candidates:
        # Gate 1: HTTP validation
        status, final_url = check_url_status(candidate["url"])
        if status != 200:
            logging.info("Rejected %s: HTTP %s", candidate["url"], status)
            continue
        candidate["url"] = final_url

        scraped = scrape_article_metadata(app, candidate["url"])
        if not scraped:
            continue

        # Gate 2: Content relevance
        if not is_relevant_content(scraped.get("markdown", "")):
            logging.info("Rejected %s: not relevant to Portal Bridge", candidate["url"])
            continue

        source = candidate.get("source") or source_name_from_url(candidate["url"])
        title = scraped["title"] or candidate["title"]
        # Prefer RSS date (reliable), then scraped metadata, then today
        date = candidate.get("date") or scraped["date"] or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        excerpt = make_excerpt(scraped["markdown"]) or candidate["description"]

        article = {
            "id": make_article_id(source, title, date),
            "title": title,
            "url": candidate["url"],
            "source": source,
            "author": scraped["author"],
            "date": date,
            "category": classify_category(candidate["url"], title, excerpt),
            "excerpt": excerpt,
            "lines": classify_lines(title, excerpt),
            "direction": classify_direction(title, excerpt),
        }

        errors = validate_article(article)
        if errors:
            logging.warning("Skipping %s: %s", candidate["url"], ", ".join(errors))
            continue

        # Ensure unique ID
        if article["id"] in used_ids:
            # Append a suffix from the URL path to disambiguate
            path_slug = re.sub(r"[^a-z0-9]+", "-", urlparse(candidate["url"]).path.lower()).strip("-")[-20:]
            article["id"] = f"{article['id']}-{path_slug}"
        if article["id"] in used_ids:
            logging.warning("Duplicate ID after dedup: %s", article["id"])
            continue
        used_ids.add(article["id"])

        new_articles.append(article)
        logging.info("New article: %s (%s, %s)", article["id"], article["date"], article["source"])

    if not new_articles:
        logging.info("No valid new articles after scraping.")
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
            logging.warning("Validation had issues:\n%s", result.stdout[-500:])
    except Exception as e:
        logging.warning("Validation script failed: %s", e)

    # Commit and push
    titles = [a["title"][:60] for a in new_articles[:3]]
    commit_msg = f"Add {len(new_articles)} new coverage article(s)\n\n" + "\n".join(
        f"- {t}" for t in titles
    )
    git_commit_and_push(commit_msg)

    logging.info("Added %d article(s) and pushed to remote.", len(new_articles))

    return len(new_articles)


def run_verify(app, dry_run=False):
    """Verify existing articles and fix metadata errors."""
    coverage_data = load_coverage()
    logging.info("Verifying %d existing articles.", len(coverage_data["articles"]))

    corrections = verify_existing_articles(app, coverage_data)

    if not corrections:
        logging.info("All articles verified. No corrections needed.")
        return 0

    logging.info("Found %d articles needing corrections.", len(corrections))

    if dry_run:
        for c in corrections:
            print(json.dumps(c, indent=2))
        return len(corrections)

    applied = apply_corrections(coverage_data, corrections)
    coverage_data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    save_coverage(coverage_data)

    commit_msg = f"Fix metadata for {applied} coverage article(s)\n\nVerified against source pages via Firecrawl."
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
            print(f"  {b['id']}: HTTP {b['status']} -- {b['url']}")

    return len(broken)


def main():
    parser = argparse.ArgumentParser(description="Reroute NJ coverage scraper")
    parser.add_argument("--verify", action="store_true",
                        help="Verify existing articles instead of discovering new ones")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show changes without writing files")
    parser.add_argument("--check-links", action="store_true",
                        help="Check HTTP status of all article URLs")
    args = parser.parse_args()

    setup_logging()
    logging.info("=== Scraper run started ===")

    if args.check_links:
        count = run_check_links()
        logging.info("=== Link check finished. %d broken. ===", count)
        sys.exit(1 if count > 0 else 0)

    config = load_config()
    api_key = get_firecrawl_key(config)
    if not api_key:
        logging.error("No Firecrawl API key found")
        sys.exit(1)

    from firecrawl import FirecrawlApp
    app = FirecrawlApp(api_key=api_key)

    try:
        if args.verify:
            count = run_verify(app, dry_run=args.dry_run)
        else:
            count = run_discover(app, config, dry_run=args.dry_run)

        logging.info("=== Run finished. %d changes. ===", count)

    except Exception as e:
        logging.error("Scraper failed: %s", e, exc_info=True)
        send_telegram(f"Reroute NJ scraper error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
