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

- **Line guide** — Select your NJ Transit line and station to see how the cutover affects your commute, get route alternatives, and figure out what ticket to buy
- **Commute comparison** — Pick your station and Manhattan destination, see every route option side by side with visual time breakdowns

## Lines covered

All NJ Transit rail lines affected by the Portal North Bridge cutover:

| Line | Impact | What changes |
|------|--------|--------------|
| Montclair-Boonton | Diverted to Hoboken | All weekday Midtown Direct trains go to Hoboken instead of Penn Station NY |
| Morris & Essex / Gladstone | Diverted to Hoboken | All weekday Midtown Direct trains go to Hoboken instead of Penn Station NY |
| Northeast Corridor | Reduced service | 50% fewer trains between Newark and Penn Station NY |
| North Jersey Coast | Reduced service | 50% fewer trains between Newark and Penn Station NY |
| Raritan Valley | Newark termination | One-seat rides to Penn Station NY suspended; trains terminate at Newark Penn |

## Running locally

No build step. Open `index.html` in a browser or serve with any static file server:

```bash
python3 -m http.server 8000
```

## Contributing

Found incorrect information or have an idea? [Open an issue](https://github.com/jamditis/reroute-nj/issues) or submit a pull request.

## Disclaimer

This is an independent community tool. Not affiliated with or endorsed by NJ Transit, Amtrak, or any government agency. Information is based on official announcements and may change. Always verify with [njtransit.com](https://www.njtransit.com/portalcutover) before traveling.

## License

[MIT](LICENSE)
