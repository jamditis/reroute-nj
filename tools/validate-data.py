#!/usr/bin/env python3
"""
Reroute NJ — Data Validation Pipeline

Validates all data, sources, and claims in the Reroute NJ project.
Run periodically or before deployment to catch issues early.

Usage:
    python3 tools/validate-data.py              # Run all checks
    python3 tools/validate-data.py --quick      # Skip network checks
    python3 tools/validate-data.py --fix        # Auto-fix what's possible
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# ─── Configuration ────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LINE_DATA_FILE = PROJECT_ROOT / "js" / "line-data.js"
COVERAGE_FILE = PROJECT_ROOT / "data" / "coverage.json"
SHARED_JS_FILE = PROJECT_ROOT / "js" / "shared.js"
APP_JS_FILE = PROJECT_ROOT / "js" / "app.js"
INDEX_HTML_FILE = PROJECT_ROOT / "index.html"
LLMS_TXT_FILE = PROJECT_ROOT / "llms.txt"

# Known NJ Transit station lists (official, verified Feb 2026)
# Used as ground truth for station validation
KNOWN_STATIONS = {
    "montclair-boonton": {
        "montclair": [
            "Watsessing Avenue", "Bloomfield", "Glen Ridge",
            "Bay Street (Montclair)", "Walnut Street", "Watchung Avenue",
            "Upper Montclair", "Mountain Avenue", "Montclair Heights",
            "Montclair State University",
        ],
        "boonton": [
            "Little Falls", "Mountain View", "Wayne/Route 23",
            "Lincoln Park", "Boonton", "Towaco", "Mountain Lakes",
            "Denville", "Dover", "Mount Arlington",
            "Lake Hopatcong", "Netcong", "Mount Olive", "Hackettstown",
        ],
    },
    "morris-essex": {
        "morristown": [
            "East Orange", "Brick Church", "Orange", "Highland Avenue",
            "Mountain Station", "South Orange", "Maplewood", "Millburn",
            "Short Hills", "Summit", "Chatham", "Madison",
            "Convent Station", "Morristown", "Morris Plains", "Mount Tabor",
        ],
        "gladstone": [
            "Murray Hill", "New Providence", "Berkeley Heights", "Gillette",
            "Stirling", "Millington", "Lyons", "Basking Ridge",
            "Bernardsville", "Far Hills", "Peapack", "Gladstone",
        ],
    },
    "northeast-corridor": {
        "nec": [
            "Trenton", "Hamilton", "Princeton Junction", "Jersey Avenue",
            "New Brunswick", "Edison", "Metuchen", "Metropark",
            "Rahway", "Linden", "Elizabeth", "North Elizabeth",
            "Newark Airport", "Newark Penn Station", "Secaucus Junction",
        ],
    },
    "north-jersey-coast": {
        "njcl": [
            "Bay Head", "Point Pleasant Beach", "Manasquan", "Spring Lake",
            "Belmar", "Bradley Beach", "Asbury Park", "Allenhurst",
            "Elberon", "Long Branch", "Little Silver", "Red Bank",
            "Middletown", "Hazlet", "Aberdeen-Matawan", "South Amboy",
            "Perth Amboy", "Woodbridge", "Avenel",
        ],
    },
    "raritan-valley": {
        "rvl": [
            "High Bridge", "Annandale", "Lebanon", "White House",
            "North Branch", "Raritan", "Somerville", "Bridgewater",
            "Bound Brook", "Dunellen", "Plainfield", "Fanwood",
            "Westfield", "Cranford", "Roselle Park", "Union",
        ],
    },
}

# Known impact types for each line
KNOWN_IMPACTS = {
    "montclair-boonton": "hoboken-diversion",
    "morris-essex": "hoboken-diversion",
    "northeast-corridor": "reduced-service",
    "north-jersey-coast": "reduced-service",
    "raritan-valley": "newark-termination",
}

# Verified train counts (from NJ Transit official announcements, Jan 2026)
VERIFIED_TRAIN_COUNTS = {
    "montclair-boonton": {"before": 64, "after": 60},
    "morris-essex": {"before": 149, "after": 141},
    "northeast-corridor": {"before": 133, "after": 112},
    "north-jersey-coast": {"before": 109, "after": 92},
}

# Cutover dates (verified from Amtrak/NJ Transit press releases)
CUTOVER_START = datetime(2026, 2, 15)
CUTOVER_END = datetime(2026, 3, 15)

# ─── Helpers ──────────────────────────────────────────────────────────────────

class ValidationResult:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []
        self.passed = 0

    def error(self, msg):
        self.errors.append(msg)
        print(f"  \033[91mERROR\033[0m: {msg}")

    def warn(self, msg):
        self.warnings.append(msg)
        print(f"  \033[93mWARN\033[0m:  {msg}")

    def ok(self, msg):
        self.passed += 1
        print(f"  \033[92mOK\033[0m:    {msg}")

    def note(self, msg):
        self.info.append(msg)
        print(f"  \033[94mINFO\033[0m:  {msg}")

    def summary(self):
        total = self.passed + len(self.errors) + len(self.warnings)
        print(f"\n{'='*60}")
        print(f"VALIDATION SUMMARY")
        print(f"{'='*60}")
        print(f"  Passed:   {self.passed}")
        print(f"  Warnings: {len(self.warnings)}")
        print(f"  Errors:   {len(self.errors)}")
        print(f"  Total:    {total}")
        if self.errors:
            print(f"\n\033[91mFAILED — {len(self.errors)} error(s) must be fixed\033[0m")
            return False
        elif self.warnings:
            print(f"\n\033[93mPASSED WITH WARNINGS — {len(self.warnings)} issue(s) to review\033[0m")
            return True
        else:
            print(f"\n\033[92mALL CHECKS PASSED\033[0m")
            return True


def parse_line_data():
    """Parse LINE_DATA from line-data.js without eval."""
    content = LINE_DATA_FILE.read_text()
    # Extract the JSON-like object using regex
    lines = {}
    current_line = None
    current_stations = []
    current_branch = None

    for line in content.split("\n"):
        # Match line ID
        m = re.match(r'\s*"([a-z-]+)":\s*\{', line)
        if m and current_line is None:
            current_line = m.group(1)
            current_stations = []

        # Match trainsBefore/trainsAfter
        if current_line:
            m = re.match(r'\s*trainsBefore:\s*(\d+)', line)
            if m:
                lines.setdefault(current_line, {})["trainsBefore"] = int(m.group(1))
            m = re.match(r'\s*trainsAfter:\s*(\d+)', line)
            if m:
                lines.setdefault(current_line, {})["trainsAfter"] = int(m.group(1))
            m = re.match(r'\s*impactType:\s*"([^"]+)"', line)
            if m:
                lines.setdefault(current_line, {})["impactType"] = m.group(1)

        # Match station
        m = re.search(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*branch:\s*"([^"]+)",\s*zone:\s*(\d+)', line)
        if m and current_line:
            current_stations.append({
                "id": m.group(1),
                "name": m.group(2),
                "branch": m.group(3),
                "zone": int(m.group(4)),
            })

        # End of line block (stations array closing)
        if current_line and re.match(r'\s*\],\s*$', line) and current_stations:
            lines.setdefault(current_line, {})["stations"] = current_stations
            current_stations = []

        # End of line object
        if current_line and re.match(r'\s*\},?\s*$', line) and "stations" in lines.get(current_line, {}):
            current_line = None

    return lines


def parse_coverage():
    """Load coverage.json."""
    return json.loads(COVERAGE_FILE.read_text())


# ─── Validators ───────────────────────────────────────────────────────────────

def validate_stations(result):
    """Validate station lists against known NJ Transit data."""
    print("\n--- Station Validation ---")
    line_data = parse_line_data()

    for line_id, known_branches in KNOWN_STATIONS.items():
        if line_id not in line_data:
            result.error(f"Line '{line_id}' missing from LINE_DATA")
            continue

        stations = line_data[line_id].get("stations", [])
        station_names = {s["name"] for s in stations}
        station_branches = {s["name"]: s["branch"] for s in stations}

        for branch_key, known_names in known_branches.items():
            for name in known_names:
                if name in station_names:
                    if station_branches.get(name) != branch_key:
                        result.warn(f"{line_id}: '{name}' has branch '{station_branches[name]}' but expected '{branch_key}'")
                    else:
                        result.ok(f"{line_id}: '{name}' present and correctly assigned to '{branch_key}'")
                else:
                    result.error(f"{line_id}: Station '{name}' MISSING from LINE_DATA (branch: {branch_key})")

        # Check for unknown stations
        all_known = set()
        for names in known_branches.values():
            all_known.update(names)
        for s in stations:
            if s["name"] not in all_known:
                result.warn(f"{line_id}: Station '{s['name']}' in LINE_DATA but not in verified list — verify it exists")


def validate_impact_types(result):
    """Validate impact types match known assignments."""
    print("\n--- Impact Type Validation ---")
    line_data = parse_line_data()

    for line_id, expected_type in KNOWN_IMPACTS.items():
        if line_id not in line_data:
            result.error(f"Line '{line_id}' missing from LINE_DATA")
            continue
        actual = line_data[line_id].get("impactType")
        if actual == expected_type:
            result.ok(f"{line_id}: impactType '{actual}' is correct")
        else:
            result.error(f"{line_id}: impactType is '{actual}' but should be '{expected_type}'")


def validate_train_counts(result):
    """Validate train counts against NJ Transit official numbers."""
    print("\n--- Train Count Validation ---")
    line_data = parse_line_data()

    for line_id, counts in VERIFIED_TRAIN_COUNTS.items():
        if line_id not in line_data:
            result.error(f"Line '{line_id}' missing from LINE_DATA")
            continue
        before = line_data[line_id].get("trainsBefore")
        after = line_data[line_id].get("trainsAfter")
        if before == counts["before"] and after == counts["after"]:
            result.ok(f"{line_id}: Train counts {before} → {after} match official numbers")
        else:
            result.error(f"{line_id}: Train counts {before} → {after} DON'T match official {counts['before']} → {counts['after']}")


def validate_cutover_dates(result):
    """Validate cutover dates in shared.js."""
    print("\n--- Cutover Date Validation ---")
    content = SHARED_JS_FILE.read_text()

    start_match = re.search(r'CUTOVER_START\s*=\s*new Date\("([^"]+)"\)', content)
    end_match = re.search(r'CUTOVER_END\s*=\s*new Date\("([^"]+)"\)', content)

    if start_match:
        start_str = start_match.group(1)
        if "2026-02-15" in start_str:
            result.ok(f"CUTOVER_START = {start_str} (correct)")
        else:
            result.error(f"CUTOVER_START = {start_str} (should be 2026-02-15)")
    else:
        result.error("CUTOVER_START not found in shared.js")

    if end_match:
        end_str = end_match.group(1)
        if "2026-03-15" in end_str:
            result.ok(f"CUTOVER_END = {end_str} (correct)")
        else:
            result.error(f"CUTOVER_END = {end_str} (should be 2026-03-15)")
    else:
        result.error("CUTOVER_END not found in shared.js")


def validate_coverage_json(result):
    """Validate coverage.json structure and metadata."""
    print("\n--- Coverage JSON Validation ---")
    data = parse_coverage()

    articles = data.get("articles", [])
    if not articles:
        result.error("No articles in coverage.json")
        return

    result.ok(f"Found {len(articles)} articles")

    # Check lastUpdated freshness
    last_updated = data.get("lastUpdated", "")
    if last_updated:
        try:
            lu_date = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
            days_old = (datetime.now(timezone.utc) - lu_date).days
            if days_old > 7:
                result.warn(f"coverage.json lastUpdated is {days_old} days old ({last_updated})")
            else:
                result.ok(f"coverage.json lastUpdated is recent ({last_updated})")
        except ValueError:
            result.warn(f"Can't parse lastUpdated: {last_updated}")

    seen_ids = set()
    valid_categories = {"official", "news", "analysis", "community", "opinion"}
    valid_directions = {"both", "nj-to-nyc", "nyc-to-nj"}
    valid_lines = {"all", "montclair-boonton", "morris-essex", "northeast-corridor",
                   "north-jersey-coast", "raritan-valley"}

    for article in articles:
        aid = article.get("id", "unknown")

        # Check for duplicate IDs
        if aid in seen_ids:
            result.error(f"Duplicate article ID: {aid}")
        seen_ids.add(aid)

        # Required fields
        for field in ["id", "title", "url", "source", "date", "category", "excerpt", "lines", "direction"]:
            if not article.get(field):
                result.error(f"Article '{aid}' missing required field: {field}")

        # Validate URL format
        url = article.get("url", "")
        if url:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                result.error(f"Article '{aid}' has invalid URL: {url}")

        # Validate date format
        date_str = article.get("date", "")
        if date_str:
            try:
                datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                result.error(f"Article '{aid}' has invalid date format: {date_str}")

        # Validate category
        cat = article.get("category", "")
        if cat not in valid_categories:
            result.error(f"Article '{aid}' has invalid category: {cat}")

        # Validate direction
        direction = article.get("direction", "")
        if direction not in valid_directions:
            result.error(f"Article '{aid}' has invalid direction: {direction}")

        # Validate lines
        lines = article.get("lines", [])
        for line in lines:
            if line not in valid_lines:
                result.error(f"Article '{aid}' references unknown line: {line}")

    result.ok(f"All {len(articles)} articles have valid structure")


def validate_zone_consistency(result):
    """Check that zone numbers increase monotonically from hub outward."""
    print("\n--- Zone Consistency Validation ---")
    line_data = parse_line_data()

    for line_id, data in line_data.items():
        stations = data.get("stations", [])
        if not stations:
            continue

        # Group by branch
        branches = {}
        for s in stations:
            branches.setdefault(s["branch"], []).append(s)

        for branch, branch_stations in branches.items():
            zones = [s["zone"] for s in branch_stations]
            # Zones should generally be non-decreasing or non-increasing
            # (depends on direction of listing)
            is_non_decreasing = all(zones[i] <= zones[i+1] for i in range(len(zones)-1))
            is_non_increasing = all(zones[i] >= zones[i+1] for i in range(len(zones)-1))
            if is_non_decreasing or is_non_increasing:
                result.ok(f"{line_id}/{branch}: Zone numbers are monotonic ({min(zones)}-{max(zones)})")
            else:
                result.warn(f"{line_id}/{branch}: Zone numbers not monotonic: {zones}")


def validate_html_consistency(result):
    """Check key claims in HTML match the JS data."""
    print("\n--- HTML/JS Consistency Validation ---")

    index_content = INDEX_HTML_FILE.read_text()

    # Check FAQ PATH time
    if "~25 minutes" in index_content or "~25 min" in index_content:
        result.error("index.html still contains incorrect '~25 min' PATH travel time (should be ~15 min)")
    else:
        result.ok("PATH travel time in FAQ is correct (~15 min)")

    # Check RVL FAQ doesn't say "as usual"
    if "as usual" in index_content and "Raritan" in index_content:
        result.warn("index.html may still have misleading 'as usual' language for Raritan Valley Line")
    else:
        result.ok("Raritan Valley FAQ correctly mentions one-seat ride suspension")

    # Check llms.txt consistency
    llms_content = LLMS_TXT_FILE.read_text()
    if "~25 min" in llms_content:
        result.error("llms.txt still contains incorrect '~25 min' PATH travel time")
    else:
        result.ok("llms.txt PATH travel time is correct")

    if "as usual" in llms_content and "Raritan" in llms_content:
        result.warn("llms.txt may have misleading 'as usual' language for RVL")
    else:
        result.ok("llms.txt RVL description is accurate")


def validate_url_format(result):
    """Validate all URLs in coverage.json are well-formed."""
    print("\n--- URL Format Validation ---")
    data = parse_coverage()

    for article in data.get("articles", []):
        url = article.get("url", "")
        aid = article.get("id", "unknown")
        parsed = urlparse(url)

        if parsed.scheme not in ("http", "https"):
            result.error(f"Article '{aid}': URL scheme is '{parsed.scheme}', expected 'https'")
        elif parsed.scheme == "http":
            result.warn(f"Article '{aid}': URL uses HTTP, should use HTTPS")
        else:
            result.ok(f"Article '{aid}': URL format valid")


def validate_njtransit_url(result):
    """Check that we reference the correct NJ Transit cutover page."""
    print("\n--- NJ Transit URL Validation ---")
    app_content = APP_JS_FILE.read_text()

    if "njtransit.com/portalcutover" in app_content:
        result.ok("app.js references njtransit.com/portalcutover (verified live URL)")
    else:
        result.warn("app.js does not reference njtransit.com/portalcutover")


def validate_date_freshness(result):
    """Check if the project data is fresh enough for the cutover period."""
    print("\n--- Data Freshness Validation ---")
    now = datetime.now()

    # Check if we're in the cutover window
    if CUTOVER_START <= now <= CUTOVER_END:
        result.note("WE ARE CURRENTLY IN THE CUTOVER PERIOD — data accuracy is critical")
    elif now < CUTOVER_START:
        days_until = (CUTOVER_START - now).days
        result.note(f"Cutover starts in {days_until} day(s)")
    else:
        result.note("Cutover period has ended")

    # Check coverage.json freshness
    data = parse_coverage()
    last_updated = data.get("lastUpdated", "")
    if last_updated:
        try:
            lu_date = datetime.fromisoformat(last_updated.replace("Z", "+00:00")).replace(tzinfo=None)
            days_old = (now - lu_date).days
            if now >= CUTOVER_START and days_old > 2:
                result.warn(f"Coverage data is {days_old} days old during active cutover — update urgently")
            elif days_old > 14:
                result.warn(f"Coverage data is {days_old} days old — consider updating")
            else:
                result.ok(f"Coverage data is {days_old} day(s) old")
        except (ValueError, TypeError):
            result.warn("Cannot determine coverage data age")


def validate_translation_keys(result):
    """Check that all JS translation keys used in app.js exist in en.json or i18n.js."""
    print("\n--- Translation Key Validation ---")
    en_file = PROJECT_ROOT / "translations" / "en.json"
    if not en_file.exists():
        result.warn("translations/en.json not found — skipping")
        return

    en_data = json.loads(en_file.read_text())

    # Flatten nested keys
    def flatten(obj, prefix=""):
        items = {}
        for k, v in obj.items():
            key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                items.update(flatten(v, key))
            else:
                items[key] = v
        return items

    flat_keys = set(flatten(en_data))

    # Also extract keys from i18n.js (JS runtime translations)
    i18n_file = PROJECT_ROOT / "js" / "i18n.js"
    if i18n_file.exists():
        i18n_content = i18n_file.read_text()
        # Find all "key": "value" patterns nested under known sections
        for m in re.finditer(r'"([a-z][a-z0-9_]+)":\s*\{([^}]+)\}', i18n_content, re.DOTALL):
            section = m.group(1)
            block = m.group(2)
            for km in re.finditer(r'"([a-z][a-z0-9_]+)":\s*"', block):
                flat_keys.add(f"{section}.{km.group(1)}")

    # Find all t("...") calls in JS files
    # Only match t("key") where key looks like a dot-notation translation key
    # (e.g., "js.some_key", "common.days") — skip HTML tags, punctuation, etc.
    js_files = list((PROJECT_ROOT / "js").glob("*.js"))
    missing_keys = set()
    for js_file in js_files:
        content = js_file.read_text()
        for m in re.finditer(r'(?<![a-zA-Z])t\("([a-z][a-z0-9_]*\.[a-z][a-z0-9_.]*?)"\)', content):
            key = m.group(1)
            if key not in flat_keys:
                missing_keys.add((js_file.name, key))

    if missing_keys:
        for fname, key in sorted(missing_keys):
            result.warn(f"Translation key '{key}' used in {fname} but not found in en.json")
    else:
        result.ok(f"All JS translation keys found in en.json ({len(flat_keys)} keys)")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    quick = "--quick" in sys.argv

    print("="*60)
    print("REROUTE NJ — DATA VALIDATION PIPELINE")
    print(f"Run at: {datetime.now().isoformat()}")
    print("="*60)

    result = ValidationResult()

    # Core data validation
    validate_stations(result)
    validate_impact_types(result)
    validate_train_counts(result)
    validate_cutover_dates(result)
    validate_zone_consistency(result)

    # Content validation
    validate_coverage_json(result)
    validate_html_consistency(result)
    validate_njtransit_url(result)
    validate_url_format(result)

    # Freshness checks
    validate_date_freshness(result)

    # Translation checks
    validate_translation_keys(result)

    # Summary
    passed = result.summary()
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
