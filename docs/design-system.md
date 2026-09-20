# Wayfinding design system

## Purpose

Reroute NJ is a commuter utility, not a marketing landing page. The interface should help a rider identify a line, choose a station, understand a change, and compare alternatives. Reference material remains available without competing with these tasks.

## Visual language

Use warm neutral surfaces, graphite text, restrained teal actions, and amber service notices. Preserve official rail colors for line identity. Active lines also have a checkmark and an outline: color alone must not communicate selection. Use modest corner radii, thin rules, generous reading space, and short functional transitions. Avoid decorative destination emoji, full-color card backgrounds, animated counters, stock station photographs, or invented geographic drawings.

Use sentence-case headings. Keep actual station names and existing translated text. This change introduces no new transit facts or route calculations.

## Files and cascade

- `css/foundation.css` is the previous stylesheet, preserved byte for byte. It retains component, embed, responsive, accessibility, and print contracts.
- `css/styles.css` imports that local foundation and defines the wayfinding tokens, composition, and component treatments. Existing English and translated HTML entry points still load the same stylesheet URL. There is one additional local, cacheable CSS request; no build step or third-party dependency.
- The wayfinding IIFE at the end of `js/shared.js` moves existing DOM nodes instead of regenerating them. Existing IDs, event listeners, panel logic, translated text, and source order remain intact. Embedded renderers are excluded.
- `card.html` retains its standalone inline stylesheet and receives a matching visual treatment. Download HTML inlines that same stylesheet so the self-contained artifact matches the preview. Canvas PNG/PDF export layouts and calculations are unchanged.
- `tests/read-styles.js` resolves local CSS imports for the existing integrity and accessibility tests. Their assertions remain unchanged.

## Page composition

The desktop line guide has a line/station/direction sidebar next to the answers. Narrow layouts keep inputs before results. Mobile service and background notices use native disclosures, expanded by default on wide screens. Print handlers open those disclosures temporarily and then restore their state. Long reference sections have local jump links.

Comparison inputs form a single three-step workspace. Coverage uses an editorial list, with publication dates visible and filters separated from the stories. The map, publishing configurator, blog, about page, and footer share the same typography, controls, spacing, and surfaces. Map geometry, official line colors, attribution, data, and all underlying export APIs remain unchanged.

## Accessibility and languages

Keep visible keyboard focus, text/non-color selection indicators, touch-sized controls, reduced-motion support, forced-colors support, high-contrast mode, and simplified view. New alignment uses logical properties where direction matters. The brand keeps left-to-right order inside right-to-left layouts. The line heading captures the existing translated HTML placeholder before app.js replaces the badge with a selected line name; it does not depend on a translation section omitted from runtime dictionaries.

The mobile navigation has an explicit `aria-controls` target and Escape closes it and returns focus. Existing tab and direction-button behavior is retained. These checks do not constitute a full WCAG or screen-reader audit.

## Validation

Run the dependency-free repository checks:

```sh
for test in tests/test-*.js; do node "$test" || exit 1; done
python3 tools/validate-data.py
```

Implementation-session results: all 17 test files passed, including 28 new wayfinding checks. The data validator reported 433 passes, zero errors, and three warnings; content freshness is outside this visual change.

Offline Chromium checks exercised all five lines, station results, both direction states, the three result panels, comparison results, news filtering and empty states, accessibility toggles, mobile disclosures, print state restoration, and Escape behavior (40 checks). Sixty page/viewport renders checked English and Arabic at 390/768/1440px and Spanish and Chinese at 390/1440px across line guide, comparison, coverage, embed, blog, and about. No horizontal overflow was found in those cases; localized line headings were also checked.

The browser environment blocked URL navigation and external network resources. Rendering used actual local HTML/CSS/JS with local JSON responses, not a mock reimplementation of the tools. The live Leaflet CDN/tile pipeline, external iframe communication, downloads, and production hosting/cache behavior still need a deployed-browser pass before merge. No live-map or cross-origin-export success is claimed.

Before merge, also check the remaining locales, screen-reader reading order, 200% zoom, and print output on the deployed preview. No merge or deployment is included in this change.
