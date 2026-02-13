# Contributing to Reroute NJ

Thanks for wanting to help NJ Transit riders navigate the Portal Bridge cutover. There are two ways to contribute, depending on your background.

## Path A: Data and content (no code required)

You don't need to write code to make a meaningful contribution. If you ride NJ Transit or cover transit news, you can help by:

- **Reporting incorrect information** — Use the [data correction issue template](https://github.com/jamditis/reroute-nj/issues/new?template=data-correction.yml) to flag wrong schedules, routes, or station details
- **Suggesting content improvements** — Use the [content suggestion template](https://github.com/jamditis/reroute-nj/issues/new?template=content-suggestion.yml) for missing or unclear information
- **Verifying data** — Cross-check station impacts against [njtransit.com/portalcutover](https://www.njtransit.com/portalcutover)

**Data accuracy standard:** All transit information should be traceable to official NJ Transit announcements. Include a link or source when reporting corrections.

## Path B: Code contributions (developers)

### Setup

No build step required. Clone the repo and serve it locally:

```bash
git clone https://github.com/jamditis/reroute-nj.git
cd reroute-nj
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser. That's it.

### Architecture

This is a zero-build static site. No npm, no webpack, no framework.

```
reroute-nj/
├── index.html              # Line guide tool
├── compare.html            # Commute comparison tool
├── coverage.html           # News coverage feed
├── map.html                # Interactive cutover map
├── embed.html              # Embed & share page
├── robots.txt              # Crawler guidance + AI bot allowances
├── sitemap.xml             # All 56 pages with hreflang cross-references
├── llms.txt                # AI search engine discoverability
├── js/
│   ├── shared.js           # Shared globals: esc(), countdown, date constants
│   ├── app.js              # Line guide logic (IIFE, ~1000 lines)
│   ├── compare.js          # Comparison tool logic (IIFE, ~700 lines)
│   ├── coverage.js         # Coverage feed logic (IIFE)
│   └── i18n.js             # Runtime translation loader with t() function
├── css/
│   └── styles.css          # All styles, CSS custom properties for theming
├── img/                    # Favicon, OG image, screenshot
├── data/
│   └── coverage.json       # Curated article data
├── translations/           # Translation JSON files (en + 10 languages)
│   ├── en.json             # English source strings
│   └── {lang}.json         # es, zh, tl, ko, pt, gu, hi, it, ar, pl
├── tools/
│   └── generate-pages.py   # Generates translated HTML pages
└── {lang}/                 # Generated translated pages (5 per language)
```

### Code conventions

- **IIFE pattern** — All JS is wrapped in `(function() { "use strict"; ... })()` to avoid globals
- **`var` declarations** — ES5 compatibility for widest browser support
- **`esc()` for HTML** — Always use the `esc()` helper when inserting user-facing text into HTML to prevent XSS
- **CSS custom properties** — Colors and spacing use `--var-name` tokens in `:root`
- **No external dependencies** — No CDN libraries, no npm packages

### Data model

Transit data lives in the `LINE_DATA` object at the top of `js/app.js`. Each line entry has:

```
{
  name: "Line Name",
  impactType: "hoboken-diversion" | "reduced-service" | "newark-termination",
  impactLevel: "severe" | "moderate",
  stations: [{ id, name, branch, zone }],
  ...
}
```

The `impactType` field drives which content templates render for each line.

### Translations

All 5 pages are fully translated into 10 languages. To improve or fix a translation:

1. Edit the relevant `translations/{lang}.json` file
2. Run `python3 tools/generate-pages.py {lang}` to regenerate that language's pages
3. Check the output in `{lang}/` to verify

To add a new language, create `translations/{code}.json` following the key structure in `translations/en.json`, then run the generator.

### Pull request process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test by opening `index.html`, `compare.html`, `coverage.html`, `map.html`, and `embed.html` in a browser
4. Check mobile layout (responsive breakpoints at 768px and 480px)
5. If you changed translations, run `python3 tools/generate-pages.py` and include generated pages in your PR
6. Submit a PR using the template

## Getting help

Have a question? Start a thread in [Discussions](https://github.com/jamditis/reroute-nj/discussions).

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind and constructive.
