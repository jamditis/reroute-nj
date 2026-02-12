# Security policy

## Data accuracy

If you find incorrect transit information on Reroute NJ, please report it using the [data correction issue template](https://github.com/jamditis/reroute-nj/issues/new?template=data-correction.yml). These are public reports since schedule data isn't sensitive.

## Code vulnerabilities

If you discover a security vulnerability in the code (e.g., XSS, injection), please report it privately by emailing **jamditis@gmail.com** with the subject line "Reroute NJ security report."

Do not open a public issue for security vulnerabilities.

## Scope

Reroute NJ is a static site with no backend, no database, and no user accounts. The main security considerations are:

- **XSS prevention** — All user-facing text inserted via JavaScript uses the `esc()` sanitization helper
- **No external scripts** — No CDN-loaded JavaScript, reducing supply chain risk
- **No data collection** — No forms, no cookies, no analytics

## Response time

I'll acknowledge security reports within 48 hours and aim to resolve confirmed vulnerabilities within 7 days.
