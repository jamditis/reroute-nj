# Copilot review instructions — reroute-nj

Project context, architecture, and the translation system live in [CLAUDE.md](../CLAUDE.md). Both this file and CLAUDE.md are read by Copilot code review (cap ~4,000 chars each). This file lists the rules worth named attention on every PR.

## Global rules to flag

These are Joe's user-level conventions. They live in `~/.claude/CLAUDE.md`, which Copilot's PR review bot does *not* read — so they're restated here so the bot enforces them on this repo's PRs.

- **Sentence case** in headings, UI text, and identifiers. Title Case is a regression.
- **No emojis** in source code, log messages, comments, commits, PR bodies, or any output. Plain text only.
- **No AI attribution.** Never include "Generated with Claude Code", `Co-Authored-By: Claude` trailers, or any AI/model/company attribution in PRs, commits, code, or any committed file.
- **Banned words** (delete or replace): *comprehensive, sophisticated, robust, transformative, leveraging, seamlessly, innovative, cutting-edge, state-of-the-art, holistic, synergy, ecosystem, paradigm, empower*. Suggest alternatives that say what's actually meant.
- **Every HTML page must have an SVG favicon and full OG/Twitter meta tags.** (This repo is a static site with many HTML pages.)

## Project-specific bug classes to flag

1. **XSS via innerHTML.** All user-facing or data-driven strings inserted into the DOM must go through `esc()` from `js/shared.js`. Never use `innerHTML` with unsanitized data. Enforced by `tests/test-js-integrity.js`.

2. **CSS injection via URL params.** `card.html` and `widget.html` accept query params (e.g., `?accent`) that get interpolated into `style="..."` attributes. Validate format (e.g., `safeHexColor()` in `js/cards.js`), not just `esc()` — `esc()` is HTML-escaping, not CSS-escaping. Values like `red;background:url(javascript:...)` slip through `esc()` because nothing in that payload is HTML-special.

3. **IIFE pattern required.** All page-specific JS files must be wrapped in `(function() { "use strict"; ... })()`. Exception: `line-data.js` intentionally exposes globals without IIFE.

4. **Translation dual-source bug.** English translations live in two places: `translations/en.json` (source of truth) and the `EN` object in `js/i18n.js` (runtime fallback). Keys used by `t()` calls in JS must be added to BOTH. Caused three production bugs Feb 14-16, 2026.

5. **Never set `window._T` to `{}`.** `js/i18n.js` checks `if (!window._T)` to decide whether to load the English fallback. An empty object is truthy and blocks the fallback, causing raw key strings (e.g., `js.schedule_changes`) to appear in the UI. NJ101.5 traffic embed bug, Feb 16, 2026.
