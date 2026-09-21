# Reroute NJ identity

## Direction

This identity adapts the approved NJ Transit-inspired concept into production assets. Reroute NJ remains an independent commuter guide, not an agency product. Keep the existing non-affiliation disclaimer. Do not use the official NJ Transit logo or describe these colors as an official agency specification.

The route-arrow R, navy wordmark, blue actions, and narrow orange/magenta/blue ribbons replace the earlier teal palette and skewed-border placeholder. Typography uses locally available Helvetica-style system fonts with the existing multilingual fallback families. No font downloads, framework, build step, or new third-party dependency is required.

## Palette and meaning

| Use | Color |
| --- | --- |
| Navy wordmark and primary text | `#071B38` |
| Blue actions and focus | `#0755B8` |
| Decorative orange | `#F76919` |
| Decorative magenta | `#B51F70` |
| Page background | `#F5F7FA` |
| Secondary text | `#46566D` |
| Muted text | `#526078` |

Decorative orange is not a small-text color. Functional orange uses the darker `--accent` and `--accent-dark` tokens. Preserve success, warning, and danger semantics. Official rail-line colors remain separate from the identity palette: do not recolor a line to match a logo ribbon. The concept illustration is not a source of route, service, or station facts.

## Assets

- `img/logo.svg`: full-color master mark for light backgrounds.
- `img/logo-mono.svg`: identical geometry in navy for single-color use and the high-contrast header.
- `img/logo-reverse.svg`: white structural strokes and colored ribbons for dark backgrounds.
- `img/logo-lockup.svg`: mark, wordmark, and independent-guide descriptor for brand presentations.
- `img/favicon.svg`: simplified small-size R/arrow on a white tile. Do not substitute the detailed mark at 16px.
- `img/og-image.svg`: editable social-image source.
- `img/og-image.png`: existing deployed 1200-by-630 raster, unchanged in this PR. The new identity is supplied as editable `og-image.svg`; replace the raster from that source when updating the deployed share card.

Keep the SVG viewBox and internal clear space. Do not stretch, mirror, or add gradients to the mark. The site header retains real wordmark text; its CSS logo is decorative. Thus the site name remains available when images are blocked, in simplified view, and in forced-colors mode. The wordmark retains left-to-right order within Arabic pages.

## Implementation and maintenance

The existing `css/styles.css` entry point updates all translated pages without changing their content. `css/foundation.css` and transit data are unchanged. The only new normal header request is a small cacheable SVG; no extra CSS layer is added.

`card.html` contains the standalone card stylesheet. Both full-color and reversed marks are inlined as SVG data URLs so downloaded HTML does not require image requests. After editing a master mark or card styles, synchronize the card and the HTML-export stylesheet:

```sh
python3 tools/sync-card-brand.py
node tests/test-transit-branding.js
node tests/test-wayfinding-ui.js
```

The Python script is an optional standard-library authoring helper, not a runtime build requirement. Commit both synchronized files. Tests assert exact stylesheet parity and exact embedded-master SVG parity. Canvas PNG/PDF card output receives the new text palette; its existing geometry, content, and export API remain unchanged.

## Validation for this change

All 18 repository Node test files passed locally, including 15 new branding checks. The data validator returned 433 passes, three warnings, and no errors. No transit-data warnings are resolved by this branding change.

Chromium rendered 44 page/viewport cases without horizontal overflow: six English pages at 320/390/768/1440px and the line guide in each of the other ten locales at 320/1440px. Twenty-seven interaction checks passed, including all five lines, station results, comparison, menu keyboard behavior, assistive display modes, light/dark cards, and an actual downloaded HTML card opened without external resource requests.

Browser navigation restrictions required loading actual local HTML with local CSS/JS/JSON resource responses. These are local integration checks, not hosted-site certification. Live Leaflet and third-party tile loading, cross-origin publisher integrations, deployed cache behavior, full screen-reader review, and actual print output still need a hosted-browser review. This change does not alter map geometry or the recent map-export fixes.
