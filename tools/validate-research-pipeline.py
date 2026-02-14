#!/usr/bin/env python3
"""Validate source freshness and coverage dataset integrity for Reroute NJ."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request


def load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def parse_iso8601(value, label):
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("Invalid ISO-8601 datetime for " + label + ": " + str(value))


def validate_registry(registry, check_urls, timeout_s):
    errors = []
    warnings = []

    if not isinstance(registry, dict) or "entries" not in registry:
        return ["data/source-registry.json must be an object with an entries array"], warnings

    entries = registry.get("entries")
    if not isinstance(entries, list) or not entries:
        errors.append("source-registry entries must be a non-empty array")
        return errors, warnings

    now = dt.datetime.now(dt.timezone.utc)
    seen_ids = {}
    context = ssl.create_default_context()

    for entry in entries:
        required = [
            "id",
            "claimArea",
            "claim",
            "sourceType",
            "verificationMethod",
            "verificationWindowHours",
            "lastVerified",
            "urls",
        ]
        for key in required:
            if key not in entry:
                errors.append("source-registry entry missing required key: " + key)

        entry_id = entry.get("id")
        if isinstance(entry_id, str):
            if entry_id in seen_ids:
                errors.append("duplicate source-registry id: " + entry_id)
            seen_ids[entry_id] = True

        window_hours = entry.get("verificationWindowHours")
        if not isinstance(window_hours, int) or window_hours <= 0:
            errors.append("verificationWindowHours must be a positive integer for " + str(entry_id))

        try:
            last_verified = parse_iso8601(entry.get("lastVerified", ""), "source-registry." + str(entry_id) + ".lastVerified")
            if isinstance(window_hours, int) and window_hours > 0:
                age = now - last_verified
                if age.total_seconds() > window_hours * 3600:
                    warnings.append(
                        "stale verification window for "
                        + str(entry_id)
                        + " ("
                        + str(int(age.total_seconds() // 3600))
                        + "h old, window "
                        + str(window_hours)
                        + "h)"
                    )
        except ValueError as err:
            errors.append(str(err))

        urls = entry.get("urls", [])
        if not isinstance(urls, list) or not urls:
            errors.append("urls must be a non-empty array for " + str(entry_id))
            continue

        for url in urls:
            parsed = urllib.parse.urlparse(url)
            if parsed.scheme not in ("http", "https"):
                errors.append("invalid URL scheme for " + str(entry_id) + ": " + str(url))
                continue

            if check_urls:
                request = urllib.request.Request(url, method="HEAD")
                try:
                    with urllib.request.urlopen(request, timeout=timeout_s, context=context) as response:
                        status = getattr(response, "status", 200)
                        if status >= 400:
                            warnings.append("URL returned status " + str(status) + ": " + url)
                except urllib.error.HTTPError as err:
                    if err.code in (403, 405):
                        warnings.append("HEAD not allowed (" + str(err.code) + "), URL kept: " + url)
                    else:
                        warnings.append("URL probe failed with HTTP " + str(err.code) + ": " + url)
                except Exception as err:
                    warnings.append("URL probe failed for " + url + ": " + str(err))

    return errors, warnings


def validate_coverage(coverage):
    errors = []
    warnings = []

    if not isinstance(coverage, dict) or "articles" not in coverage:
        return ["data/coverage.json must be an object with an articles array"], warnings

    articles = coverage.get("articles")
    if not isinstance(articles, list):
        return ["coverage articles must be an array"], warnings

    seen_ids = {}
    for article in articles:
        article_id = article.get("id")
        if not isinstance(article_id, str) or not article_id.strip():
            errors.append("coverage article has missing/invalid id")
            continue

        if article_id in seen_ids:
            errors.append("duplicate coverage article id: " + article_id)
        seen_ids[article_id] = True

        for key in ["title", "url", "source", "date", "category", "direction"]:
            if key not in article or not isinstance(article.get(key), str) or not article.get(key).strip():
                errors.append("coverage article " + article_id + " missing/invalid field: " + key)

        url = article.get("url", "")
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https":
            warnings.append("coverage article should use https URL: " + article_id)

        date_value = article.get("date", "")
        try:
            dt.date.fromisoformat(date_value)
        except ValueError:
            errors.append("coverage article " + article_id + " has invalid date: " + str(date_value))

        lines = article.get("lines", [])
        if not isinstance(lines, list) or not lines:
            warnings.append("coverage article has no line tags: " + article_id)

    return errors, warnings


def main():
    parser = argparse.ArgumentParser(description="Validate source and coverage research pipeline data")
    parser.add_argument("--check-urls", action="store_true", help="Probe source registry URLs with HEAD requests")
    parser.add_argument("--timeout", type=float, default=8.0, help="Network timeout for URL checks")
    args = parser.parse_args()

    registry = load_json("data/source-registry.json")
    coverage = load_json("data/coverage.json")

    errors = []
    warnings = []

    reg_errors, reg_warnings = validate_registry(registry, args.check_urls, args.timeout)
    cov_errors, cov_warnings = validate_coverage(coverage)

    errors.extend(reg_errors)
    errors.extend(cov_errors)
    warnings.extend(reg_warnings)
    warnings.extend(cov_warnings)

    for warning in warnings:
        print("WARN: " + warning)

    for error in errors:
        print("ERROR: " + error)

    if errors:
        print("\nResult: FAILED")
        return 1

    print("\nResult: PASS")
    if warnings:
        print("Warnings: " + str(len(warnings)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
