# AGENTS.md

Guidelines for AI coding assistants (Claude Code, Copilot, Cursor, etc.) working on this project.

## Architecture

This is a **zero-build static site**. No npm, no bundler, no framework. Do not add a build step.

```
index.html              — Line guide tool
compare.html            — Commute comparison tool
coverage.html           — News coverage feed
map.html                — Interactive cutover map
embed.html              — Embed & share page
js/shared.js            — Shared globals: esc(), countdown, date constants
js/app.js               — Line guide logic (~1000 lines, IIFE)
js/compare.js           — Comparison tool logic (~700 lines, IIFE)
js/coverage.js          — Coverage feed logic (IIFE)
js/i18n.js              — Runtime translation loader with t() function
css/styles.css          — All styles, CSS custom properties
img/                    — Favicon, OG image, screenshot
data/coverage.json      — Curated article data
translations/en.json    — English source strings (~175 keys)
translations/{lang}.json — 10 language files (es, zh, tl, ko, pt, gu, hi, it, ar, pl)
tools/generate-pages.py — Generates translated HTML from templates + JSON
{lang}/                 — Generated translated pages (50 total, 5 per language)
```

## Rules

1. **No build tools.** Do not add package.json, webpack, vite, or any bundler. The zero-build approach is intentional.
2. **No external dependencies.** No CDN libraries, no npm packages. Everything is vanilla JS/CSS/HTML.
3. **Use `var` declarations.** The codebase uses ES5-style `var` for browser compatibility. Do not convert to `let`/`const`.
4. **IIFE pattern.** All JavaScript is wrapped in `(function() { "use strict"; ... })()`. Keep it that way.
5. **Use `esc()` for HTML insertion.** Always sanitize text with the `esc()` helper before inserting into the DOM. Never use `innerHTML` with unsanitized data.
6. **CSS custom properties for theming.** Colors and spacing use `--var-name` tokens defined in `:root`. Use existing tokens; add new ones to `:root` if needed.
7. **Mobile-first responsive.** Breakpoints at 768px and 480px. Test all changes at both sizes.
8. **Data accuracy matters.** All transit information in `LINE_DATA` must be traceable to official NJ Transit sources.

## Data model

The `LINE_DATA` object in `js/app.js` drives all content. Each line has an `impactType` that determines which templates render:

- `hoboken-diversion` — Trains rerouted to Hoboken (Montclair-Boonton, Morris & Essex)
- `reduced-service` — Fewer trains, same route (Northeast Corridor, North Jersey Coast)
- `newark-termination` — Trains stop at Newark Penn (Raritan Valley)

To add or modify line data, edit the `LINE_DATA` object directly. The UI generates from this data automatically.

## Translation system

All 5 pages are translated into 10 languages using a hybrid approach:

- **Build time:** `tools/generate-pages.py` reads English HTML templates and swaps static text with translated strings from `translations/{lang}.json`. Output goes to `{lang}/` directories (e.g., `es/index.html`).
- **Runtime:** `js/i18n.js` loads `window._T` (injected by the generator) for JS-driven UI strings like station impacts, route cards, and comparison results.

### Translation keys

Keys use dot notation organized by page: `index.hoboken_terminal_title`, `coverage.cat_news`, `embed.generator_intro`, etc. The `common.*` namespace covers shared elements (nav, footer, accessibility toggles).

### Adding content to translated pages

When adding new visible text to any HTML page:
1. Add a key to `translations/en.json`
2. Add the corresponding replacement logic in `generate-pages.py`
3. Add translated values to all 10 language files
4. Run `python3 tools/generate-pages.py` to regenerate

### What stays in English

Station names, line names (PATH, NJ Transit, Amtrak), and place names are proper nouns and stay in English across all languages. URLs stay unchanged.

## Testing

No test suite. Verify changes by:
1. Opening `index.html`, `compare.html`, `coverage.html`, `map.html`, and `embed.html` in a browser
2. Selecting each line and at least one station per line
3. Checking the comparison tool with different station/destination pairs
4. Testing coverage page filters (source, category, line, direction, search)
5. Resizing the browser to mobile width
6. Checking the browser console for errors
7. After translation changes, check at least 2 translated pages (e.g., `es/index.html`, `zh/embed.html`) for untranslated English text
