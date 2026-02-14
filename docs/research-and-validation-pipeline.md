# Research and Validation Pipeline

This project cannot rely on a single source snapshot. Service plans and advisories can change quickly, so verification must run as a repeatable pipeline.

## Multi-agent operating model

Use these roles for every refresh cycle:

1. **Web search agent**
   - Finds current official advisories, schedule changes, and press releases.
   - Prioritizes `njtransit.com` and cross-checks against partner agencies only for context.
2. **Library agent**
   - Validates historical/archival statements using stable references (official PDFs, board docs, archived schedule pages).
   - Flags claims that cannot be tied to a durable document.
3. **Custodial (data hygiene) agent**
   - Verifies IDs, dates, URL formats, duplicate records, stale timestamps, and missing line tags.
   - Runs `tools/validate-research-pipeline.py` on every update.
4. **Historical agent**
   - Reviews timeline and phase claims against prior announcements.
   - Marks superseded guidance so old context is never presented as current.

> Firecrawl or equivalent crawling should be used as an **ingestion layer**, not a source of truth. All final rider-facing claims must map back to official sources in `data/source-registry.json`.

## Source-of-truth policy

- `js/line-data.js` is the rider-facing data model.
- `data/source-registry.json` maps claim areas to verification sources and freshness windows.
- `data/coverage.json` is context-only media coverage; it must never override official advisories.

## Hardened validation gates

### Gate 1 — Schema and freshness
Run:

```bash
python3 tools/validate-research-pipeline.py
```

Checks:
- required fields in `data/source-registry.json`
- stale `lastVerified` timestamps vs `verificationWindowHours`
- coverage article field integrity (IDs, dates, URL format, required fields)

### Gate 2 — Live source availability
Run:

```bash
python3 tools/validate-research-pipeline.py --check-urls
```

Checks:
- HEAD reachability for each registered source URL
- warning output for 4xx/5xx or probe failures

### Gate 3 — Human sign-off
Before publishing:
- confirm any severe-impact claim changes in `js/line-data.js`
- record updates to `data/source-registry.json:lastVerified`
- spot-check affected pages in desktop + mobile widths

## Adaptive cadence

- **12h cadence**: customer alerts and active service advisories
- **24h cadence**: official cutover page + rail schedules
- **72h cadence**: secondary coverage links

If NJ Transit issues emergency changes, bypass cadence and run all gates immediately.

## Information gap protocol

When a claim cannot be validated:
1. Mark as `unverified` in working notes (do not publish to rider-facing copy).
2. Add a source request task and owner.
3. Re-run validation once source evidence is found.
4. Keep conservative fallback guidance ("verify with NJ Transit before travel") until confirmed.
