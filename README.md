<div align="center">

# Reroute NJ

**Free tools to help NJ Transit riders navigate the Portal North Bridge cutover**

[![Live site](https://img.shields.io/badge/live_site-jamditis.github.io/reroute--nj-1a3a5c?style=for-the-badge)](https://jamditis.github.io/reroute-nj)
[![Phase 1](https://img.shields.io/badge/phase_1-Feb_15_--_Mar_15,_2026-e87722?style=for-the-badge)](#timeline)
[![Lines covered](https://img.shields.io/badge/lines_covered-5-0a8f4f?style=for-the-badge)](#lines-covered)

[![GitHub Pages](https://img.shields.io/github/deployments/jamditis/reroute-nj/github-pages?label=deploy&style=flat-square)](https://github.com/jamditis/reroute-nj/deployments)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No build step](https://img.shields.io/badge/build-none_required-lightgrey?style=flat-square)](#running-locally)

<br>

<img src="screenshot.png" alt="Reroute NJ showing Bloomfield station impact during the Portal Bridge cutover" width="720">

</div>

---

## What's here

- **[Line guide](https://jamditis.github.io/reroute-nj/)** — Select your NJ Transit line and station to see how the cutover affects your commute, get route alternatives, and figure out what ticket to buy
- **[Commute comparison](https://jamditis.github.io/reroute-nj/compare.html)** — Pick your station and Manhattan destination, see every route option side by side with visual time breakdowns

## Lines covered

All NJ Transit rail lines affected by the Portal North Bridge cutover:

| Line | Impact | What changes |
|------|--------|--------------|
| Montclair-Boonton | Diverted to Hoboken | All weekday Midtown Direct trains go to Hoboken instead of Penn Station NY |
| Morris & Essex / Gladstone | Diverted to Hoboken | All weekday Midtown Direct trains go to Hoboken instead of Penn Station NY |
| Northeast Corridor | Reduced service | 50% fewer trains between Newark and Penn Station NY |
| North Jersey Coast | Reduced service | 50% fewer trains between Newark and Penn Station NY |
| Raritan Valley | Newark termination | One-seat rides to Penn Station NY suspended; trains terminate at Newark Penn |

## Architecture

Reroute NJ is a zero-build static site. No npm, no webpack, no framework — just HTML, CSS, and vanilla JavaScript.

```
reroute-nj/
├── index.html       # Line guide tool
├── compare.html     # Commute comparison tool
├── app.js           # Line guide logic (IIFE pattern, ~1400 lines)
├── compare.js       # Comparison tool logic (IIFE pattern, ~900 lines)
├── styles.css       # All styles, CSS custom properties for theming
└── favicon.svg      # SVG favicon
```

**Why no build step?** This site serves transit riders during a stressful infrastructure change. A simple architecture means anyone can contribute — including journalists and civic tech volunteers who may not have Node.js installed. Open `index.html` in a browser and you're running the full app.

**Data model:** All transit data lives in the `LINE_DATA` object in `app.js`. Each line has an `impactType` (`hoboken-diversion`, `reduced-service`, or `newark-termination`) that drives which content templates render. See [AGENTS.md](AGENTS.md) for details.

## Timeline

| Phase | Dates | Status |
|-------|-------|--------|
| **Phase 1** | Feb 15 – Mar 15, 2026 | Current |
| **Phase 2** | Fall 2026 (estimated) | Planned |

Phase 1 covers the initial Portal North Bridge cutover with 50% service reduction through the Hudson tunnels. Phase 2 will address the second major service change when construction enters the next stage.

## Running locally

No build step. Clone and serve:

```bash
git clone https://github.com/jamditis/reroute-nj.git
cd reroute-nj
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.

## Contributing

There are two ways to help:

**Riders and journalists** — Report incorrect information, suggest improvements, or help verify data against NJ Transit sources. No code required. See the [issue templates](https://github.com/jamditis/reroute-nj/issues/new/choose).

**Developers** — Fix bugs, add features, or improve the tools. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and code conventions.

## Data sources

All transit information is based on official NJ Transit announcements:

- [NJ Transit Portal cutover page](https://www.njtransit.com/portalcutover)
- [NJ Transit rail schedules](https://www.njtransit.com/rail-schedules)
- NJ Transit customer service announcements and press releases

This is an independent community tool. Not affiliated with or endorsed by NJ Transit, Amtrak, or any government agency. Always verify with official sources before traveling.

## Roadmap

- [ ] Phase 2 coverage when NJ Transit announces fall 2026 service changes
- [ ] Bus bridge and shuttle information
- [ ] Accessibility improvements (screen reader testing, WCAG audit)
- [ ] Expanded ferry and PATH connection details

Ideas and suggestions welcome in [Discussions](https://github.com/jamditis/reroute-nj/discussions).

## License

[MIT](LICENSE)
