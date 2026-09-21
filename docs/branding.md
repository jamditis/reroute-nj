# Independent rail identity

## Direction

This revision replaces the agency-inspired tricolor ribbon R and diagonal header stripes with a compact train face and a single branching track. Ink text, forest-green actions, warm off-white surfaces, and simple line icons carry the identity. The logo has no agency name, livery, chevron, or state seal. Official rail-line colors remain data, not brand decoration.

The design aims to reduce visual resemblance to NJ TRANSIT; it is not a trademark clearance opinion and cannot guarantee that confusion is impossible. Keep the existing non-affiliation statement visible near the header as well as in the footer. Do not imply endorsement or ownership by a transit operator.

## Palette

| Role | Color |
| --- | --- |
| Primary text and train silhouette | `#142B38` |
| Actions, selected controls and track accent | `#175C50` |
| Hover and pressed actions | `#124C43` |
| Page surface | `#FAFAF7` |
| Quiet surface | `#F0F4F1` |
| Secondary text | `#465B64` |
| Muted text | `#52636B` |

Keep success, warning, danger, and the published rail-line colors separate. Do not recolor a line to match the train icon. Color contrast is tested for the text/action tokens, not asserted for every conceivable composition.

## Assets

`img/logo.svg` is the full-color train/track master. `logo-mono.svg` preserves its geometry in one ink. `logo-reverse.svg` provides a light mark for dark surfaces. `favicon.svg` uses a stable white tile; `logo-lockup.svg` pairs the mark with the independent-guide descriptor.

Both `img/og-image.svg` and the deployed 1200-by-630 `og-image.png` use the new identity. Unlike the earlier PR, this change updates the actual raster shared by social platforms, not just its editable source.

`img/rail-platform.webp` is an unlettered crop from the user-approved, AI-generated interface concept. It is decorative illustration, not a photograph of a real station or an illustration of a verified route. It has empty alt text and is hidden from assistive technologies, narrow layouts, simplified view, forced colors, and print. Do not use it as evidence for travel information. No new font files are distributed.

## Site-wide application

The shared stylesheet covers the line guide, comparison, news, map controls, publishing configurator, blog, about page, and compact widgets. Standalone light/dark cards and downloaded HTML use the synchronized inline card stylesheet and embedded master icons. Map geometry, tile loading, route calculations, fares, transit data, and Canvas drawing code are unchanged.

The homepage puts a native line selector, station selector, and direction controls inside a compact form beside the decorative train panel. The result button checks the station, selects the existing impact tab, and moves focus to the results. Four links lead to actual comparison, map, coverage, and publishing tools. No mock search, live-data status, saved-station feature, or unimplemented navigation is introduced.

## Translations and maintenance

Visible interface text is reused from existing translated DOM labels and `common`/`compare` translation keys. The existing canonical `compare.hero_title` key is also included in the English runtime fallback. No translation JSON or generated locale pages need changing. The brand's non-affiliation statement is real localized text, not a CSS-generated English label.

The rail enhancement at the end of `js/shared.js` preserves existing nodes, IDs, listeners, and data logic. It skips `?embed=true`, card renderers, and widgets. The original page remains the fallback if enhancement does not run. Assets resolve from the shared script URL, including nested blog and locale pages.

After editing card styles or the master marks, run:

```sh
python3 tools/sync-card-brand.py
for test in tests/test-*.js; do node "$test" || exit 1; done
python3 tools/validate-data.py
```

The optional Python utility is an authoring helper; deployment remains zero-build. Its stylesheet and SVG parity checks must continue to pass. No framework, npm package, remote font, or additional CSS import is introduced.
