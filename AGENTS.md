# AGENTS.md

Guidelines for AI coding assistants (Claude Code, Copilot, Cursor, etc.) working on this project.

## Architecture

This is a **zero-build static site**. No npm, no bundler, no framework. Do not add a build step.

```
index.html    — Line guide tool
compare.html  — Commute comparison tool
app.js        — Line guide logic (~1400 lines, IIFE)
compare.js    — Comparison tool logic (~900 lines, IIFE)
styles.css    — All styles, CSS custom properties
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

The `LINE_DATA` object in `app.js` drives all content. Each line has an `impactType` that determines which templates render:

- `hoboken-diversion` — Trains rerouted to Hoboken (Montclair-Boonton, Morris & Essex)
- `reduced-service` — Fewer trains, same route (Northeast Corridor, North Jersey Coast)
- `newark-termination` — Trains stop at Newark Penn (Raritan Valley)

To add or modify line data, edit the `LINE_DATA` object directly. The UI generates from this data automatically.

## Testing

No test suite. Verify changes by:
1. Opening both `index.html` and `compare.html` in a browser
2. Selecting each line and at least one station per line
3. Checking the comparison tool with different station/destination pairs
4. Resizing the browser to mobile width
5. Checking the browser console for errors
