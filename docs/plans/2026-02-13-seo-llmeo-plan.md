# SEO + LLMEO implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add crawlability foundations, structured data, LLMEO optimization, and translated meta fixes to reroutenj.org so the site is discoverable by Google, newsrooms, and AI search tools.

**Architecture:** Static files only — no build step. New files at site root (`robots.txt`, `sitemap.xml`, `llms.txt`). JSON-LD injected into `<head>` of each English page. Translation generator updated to handle meta descriptions, og:url, and canonical tags for all 50 translated pages.

**Tech Stack:** HTML, JSON-LD, Python (generate-pages.py), JSON translation files.

---

### Task 1: Create robots.txt

**Files:**
- Create: `robots.txt`

**Step 1: Create the file**

```
User-agent: *
Allow: /

# AI search bots — explicitly welcome
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: https://reroutenj.org/sitemap.xml
```

**Step 2: Verify**

Run: `python3 -m http.server 8000 --directory ~/projects/reroute-nj &` then `curl -s http://localhost:8000/robots.txt | head -5`
Expected: Shows `User-agent: *` and `Allow: /`

**Step 3: Commit**

```bash
git add robots.txt
git commit -m "Add robots.txt with AI bot allowances and sitemap reference"
```

---

### Task 2: Create sitemap.xml

**Files:**
- Create: `sitemap.xml`

**Step 1: Create the sitemap**

The sitemap should include all 56 pages. Use today's date (2026-02-13) as lastmod. Structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <!-- English pages -->
  <url>
    <loc>https://reroutenj.org/</loc>
    <lastmod>2026-02-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <!-- xhtml:link hreflang entries for all 11 languages + x-default -->
  </url>
  <!-- ... remaining 5 English pages ... -->
  <!-- 50 translated pages (10 langs x 5 pages) -->
  <url>
    <loc>https://reroutenj.org/es/index.html</loc>
    <lastmod>2026-02-13</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
    <!-- xhtml:link hreflang entries -->
  </url>
  <!-- ... etc ... -->
</urlset>
```

Each `<url>` entry for pages that have translations should include `xhtml:link` elements for all language alternates:
```xml
<xhtml:link rel="alternate" hreflang="en" href="https://reroutenj.org/index.html"/>
<xhtml:link rel="alternate" hreflang="es" href="https://reroutenj.org/es/index.html"/>
<!-- ... all 11 languages + x-default ... -->
```

English pages:
| Page | loc | priority | changefreq |
|------|-----|----------|------------|
| index.html | `https://reroutenj.org/` | 1.0 | daily |
| compare.html | `https://reroutenj.org/compare.html` | 0.8 | weekly |
| coverage.html | `https://reroutenj.org/coverage.html` | 0.8 | daily |
| map.html | `https://reroutenj.org/map.html` | 0.8 | weekly |
| embed.html | `https://reroutenj.org/embed.html` | 0.8 | monthly |
| blog.html | `https://reroutenj.org/blog.html` | 0.7 | monthly |

Translated pages: priority 0.6, changefreq matches English parent.

`blog.html` has NO translations, so it gets NO `xhtml:link` hreflang entries.

**Step 2: Validate XML**

Run: `python3 -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml'); print('Valid XML')"`
Expected: `Valid XML`

**Step 3: Verify URL count**

Run: `grep -c '<loc>' sitemap.xml`
Expected: `56` (6 English + 50 translated)

**Step 4: Commit**

```bash
git add sitemap.xml
git commit -m "Add sitemap.xml with all 56 pages and hreflang cross-references"
```

---

### Task 3: Create llms.txt

**Files:**
- Create: `llms.txt`

**Step 1: Create the file**

```markdown
# Reroute NJ

> Free tools helping NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026). Five interactive tools in 11 languages.

Reroute NJ provides real-time guidance for the roughly 300,000 daily NJ Transit rail commuters affected by the Portal North Bridge construction cutover. During this period, approximately 50% of NJ Transit trains between New Jersey and New York Penn Station are cut. All rail lines except the Atlantic City Rail Line are affected.

The cutover is caused by Amtrak transferring the first of two tracks from the 115-year-old Portal Bridge to the new Portal North Bridge over the Hackensack River in Kearny, NJ. This is Phase 1 of the Gateway Program milestone.

## Tools

- [Line guide](https://reroutenj.org/index.html): Select your NJ Transit line and station to see exactly what changes and what to do during the cutover
- [Commute comparison](https://reroutenj.org/compare.html): Side-by-side comparison of alternative routes to Manhattan (PATH, ferry, bus) with visual time breakdowns and costs
- [News coverage](https://reroutenj.org/coverage.html): Curated feed of Portal Bridge cutover reporting from 15+ regional news sources, filterable by line, direction, and category
- [Interactive map](https://reroutenj.org/map.html): OpenStreetMap-based map showing the Portal Bridge location, all affected stations, and key transfer hubs
- [Embed and share](https://reroutenj.org/embed.html): Free embed codes for newsrooms and publishers to republish any Reroute NJ tool on their websites

## Key facts

- Dates: February 15 to March 15, 2026 (Phase 1)
- Cause: Amtrak transferring first track from old Portal Bridge to new Portal North Bridge
- Impact: Approximately 50% service reduction between Newark Penn Station and New York Penn Station
- Affected lines: Montclair-Boonton Line, Morris & Essex Lines, Northeast Corridor, North Jersey Coast Line, Raritan Valley Line
- Not affected: Atlantic City Rail Line
- Hoboken diversions: Montclair-Boonton and Morris & Essex weekday trains rerouted to Hoboken Terminal instead of New York Penn Station
- Alternative transit from Hoboken: PATH train to 33rd St (~25 min), NY Waterway ferry to W. 39th St (~10 min), Bus 126 to Port Authority (~30-45 min)
- Phase 2: Expected fall 2026 (second track cutover, dates TBA)

## Line-by-line impact summary

- **Montclair-Boonton Line**: Weekday trains diverted to Hoboken Terminal. Use PATH, ferry, or bus to reach Manhattan.
- **Morris & Essex Lines (Morristown, Gladstone)**: Weekday trains diverted to Hoboken Terminal. Same alternatives as Montclair-Boonton.
- **Northeast Corridor**: Reduced frequency. Trains still run to New York Penn Station but with fewer departures and possible delays at Secaucus.
- **North Jersey Coast Line**: Reduced frequency. Same route but fewer trains. Allow extra travel time.
- **Raritan Valley Line**: Trains terminate at Newark Penn Station (as usual). Transfer to reduced-frequency NEC trains for Penn Station.

## Translations

Available in 11 languages: English, Spanish (Español), Chinese (中文), Tagalog, Korean (한국어), Portuguese (Português), Gujarati (ગુજરાતી), Hindi (हिंदी), Italian (Italiano), Arabic (العربية), Polish (Polski)

## About

Reroute NJ is an independent, open-source community project created by Joe Amditis at the Center for Cooperative Media at Montclair State University. It is not affiliated with or endorsed by NJ Transit, Amtrak, or any government agency. Source code: https://github.com/jamditis/reroute-nj (MIT License).
```

**Step 2: Verify it's valid markdown and accessible**

Run: `wc -l llms.txt && head -3 llms.txt`
Expected: Shows `# Reroute NJ` as first line

**Step 3: Commit**

```bash
git add llms.txt
git commit -m "Add llms.txt for AI search engine discoverability"
```

---

### Task 4: Add canonical tags and JSON-LD to index.html

**Files:**
- Modify: `index.html` (lines 19-33 in `<head>`, and after the `<h2>Am I affected?</h2>` block)

**Step 1: Add canonical link in `<head>`**

Insert after the favicon line (line 19) and before the stylesheet line (line 20):

```html
  <link rel="canonical" href="https://reroutenj.org/">
```

**Step 2: Add JSON-LD structured data in `<head>`**

Insert before `</head>` (line 33). Three JSON-LD blocks:

1. WebSite + Organization:
```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Reroute NJ",
    "url": "https://reroutenj.org",
    "description": "Free tools to help NJ Transit riders navigate the Portal North Bridge cutover (Feb 15 – Mar 15, 2026)",
    "inLanguage": ["en", "es", "zh", "tl", "ko", "pt", "gu", "hi", "it", "ar", "pl"],
    "publisher": {
      "@type": "Organization",
      "name": "Reroute NJ",
      "url": "https://reroutenj.org",
      "logo": {
        "@type": "ImageObject",
        "url": "https://reroutenj.org/img/og-image.png"
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://reroutenj.org/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }
  </script>
```

2. FAQPage (the biggest SEO win — maps to rich results):
```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does the Portal Bridge cutover affect the Montclair-Boonton Line?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "During Feb 15 – Mar 15, 2026, Montclair-Boonton weekday trains are diverted to Hoboken Terminal instead of New York Penn Station. Riders can transfer to PATH (33rd Street, ~25 min), NY Waterway ferry (W. 39th St, ~10 min), or Bus 126 (Port Authority, ~30-45 min) to reach Manhattan."
        }
      },
      {
        "@type": "Question",
        "name": "How does the Portal Bridge cutover affect the Morris & Essex Lines?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "During Feb 15 – Mar 15, 2026, Morris & Essex (Morristown and Gladstone) weekday trains are diverted to Hoboken Terminal instead of New York Penn Station. Riders can transfer to PATH, NY Waterway ferry, or Bus 126 to reach Manhattan."
        }
      },
      {
        "@type": "Question",
        "name": "How does the Portal Bridge cutover affect the Northeast Corridor?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "During Feb 15 – Mar 15, 2026, Northeast Corridor trains continue to New York Penn Station but with reduced frequency due to single-track operations between Newark and Secaucus. Expect fewer departures and possible delays of 15-30 minutes during peak hours."
        }
      },
      {
        "@type": "Question",
        "name": "How does the Portal Bridge cutover affect the North Jersey Coast Line?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "During Feb 15 – Mar 15, 2026, North Jersey Coast Line trains continue on their normal route but with reduced frequency. Allow extra travel time due to single-track operations between Newark and Secaucus."
        }
      },
      {
        "@type": "Question",
        "name": "How does the Portal Bridge cutover affect the Raritan Valley Line?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "During Feb 15 – Mar 15, 2026, Raritan Valley Line trains continue to terminate at Newark Penn Station as usual. Riders transferring to Penn Station will encounter reduced-frequency Northeast Corridor trains at Newark."
        }
      },
      {
        "@type": "Question",
        "name": "What is the Portal North Bridge cutover?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The Portal North Bridge cutover is a four-week period (Feb 15 – Mar 15, 2026) when Amtrak transfers the first track from the 115-year-old Portal Bridge to the new Portal North Bridge over the Hackensack River in Kearny, NJ. This requires single-track operations, reducing NJ Transit service by approximately 50% between Newark Penn Station and New York Penn Station."
        }
      },
      {
        "@type": "Question",
        "name": "How do I get from Hoboken Terminal to Manhattan during the cutover?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "From Hoboken Terminal, you have three options to reach Manhattan: (1) PATH train to 33rd Street (~25 minutes, runs frequently), (2) NY Waterway ferry to W. 39th Street (~10 minutes), or (3) Bus 126 to Port Authority Bus Terminal (~30-45 minutes via Lincoln Tunnel)."
        }
      }
    ]
  }
  </script>
```

3. BreadcrumbList:
```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Reroute NJ",
        "item": "https://reroutenj.org/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Line guide"
      }
    ]
  }
  </script>
```

**Step 3: Validate JSON-LD**

Run: `python3 -c "import json, re; html=open('index.html').read(); blocks=re.findall(r'<script type=\"application/ld\+json\">\s*(.*?)\s*</script>', html, re.DOTALL); [json.loads(b) for b in blocks]; print(f'{len(blocks)} valid JSON-LD blocks')"`
Expected: `3 valid JSON-LD blocks`

**Step 4: Commit**

```bash
git add index.html
git commit -m "Add canonical tag and JSON-LD structured data to index.html

Adds WebSite, FAQPage (7 questions), and BreadcrumbList schemas."
```

---

### Task 5: Add canonical tags and JSON-LD to compare.html, coverage.html, map.html, embed.html

**Files:**
- Modify: `compare.html`, `coverage.html`, `map.html`, `embed.html`

**Step 1: Add to each file**

For each page, insert after the favicon `<link>` and before the stylesheet `<link>`:

```html
  <link rel="canonical" href="https://reroutenj.org/{page}.html">
```

And before `</head>`, add WebSite + BreadcrumbList JSON-LD (same WebSite block as index.html, BreadcrumbList with the page-specific name):

| Page | Breadcrumb name |
|------|----------------|
| compare.html | "Compare commute options" |
| coverage.html | "News coverage" |
| map.html | "Interactive map" |
| embed.html | "Embed & share" |

**Step 2: Validate all pages**

Run: `for f in compare.html coverage.html map.html embed.html; do echo "$f:"; python3 -c "import json,re; html=open('$f').read(); blocks=re.findall(r'<script type=\"application/ld\+json\">\s*(.*?)\s*</script>', html, re.DOTALL); [json.loads(b) for b in blocks]; print(f'  {len(blocks)} valid JSON-LD blocks')"; done`
Expected: Each page shows `2 valid JSON-LD blocks`

**Step 3: Commit**

```bash
git add compare.html coverage.html map.html embed.html
git commit -m "Add canonical tags and JSON-LD to compare, coverage, map, embed pages"
```

---

### Task 6: Fix blog.html (canonical, hreflang, Article schema, duplicate skip-link)

**Files:**
- Modify: `blog.html`

**Step 1: Remove the duplicate skip-link**

`blog.html` has two identical `<a href="#main-content" class="skip-link">` on lines 23 and 25. Remove the duplicate (line 25).

**Step 2: Add canonical and self-referencing hreflang in `<head>`**

After the favicon line, before the stylesheet line:

```html
  <link rel="canonical" href="https://reroutenj.org/blog.html">
  <link rel="alternate" hreflang="en" href="https://reroutenj.org/blog.html">
  <link rel="alternate" hreflang="x-default" href="https://reroutenj.org/blog.html">
```

**Step 3: Add Article + BreadcrumbList JSON-LD**

Before `</head>`:

```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Why we built Reroute NJ",
    "description": "Announcing Reroute NJ: a free, open-source tool to help NJ Transit riders navigate the Portal Bridge cutover.",
    "author": {
      "@type": "Person",
      "name": "Joe Amditis",
      "url": "https://github.com/jamditis"
    },
    "datePublished": "2026-02-12",
    "dateModified": "2026-02-12",
    "publisher": {
      "@type": "Organization",
      "name": "Reroute NJ",
      "url": "https://reroutenj.org",
      "logo": {
        "@type": "ImageObject",
        "url": "https://reroutenj.org/img/og-image.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://reroutenj.org/blog.html"
    },
    "image": "https://reroutenj.org/img/og-image.png"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Reroute NJ",
        "item": "https://reroutenj.org/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Why we built Reroute NJ"
      }
    ]
  }
  </script>
```

**Step 4: Validate**

Run: `python3 -c "import json,re; html=open('blog.html').read(); blocks=re.findall(r'<script type=\"application/ld\+json\">\s*(.*?)\s*</script>', html, re.DOTALL); [json.loads(b) for b in blocks]; print(f'{len(blocks)} valid JSON-LD blocks'); print('Duplicate skip-link:', 'STILL PRESENT' if html.count('skip-link') > 1 else 'FIXED')"`
Expected: `2 valid JSON-LD blocks` and `Duplicate skip-link: FIXED`

**Step 5: Commit**

```bash
git add blog.html
git commit -m "Fix blog.html: add canonical, hreflang, Article schema, remove duplicate skip-link"
```

---

### Task 7: Add meta description translation keys to en.json and all 10 language files

**Files:**
- Modify: `translations/en.json`
- Modify: `translations/es.json`, `translations/zh.json`, `translations/tl.json`, `translations/ko.json`, `translations/pt.json`, `translations/gu.json`, `translations/hi.json`, `translations/it.json`, `translations/ar.json`, `translations/pl.json`

**Step 1: Add keys to en.json**

Add these keys to the `"meta"` section of `translations/en.json`:

```json
"meta": {
    "lang": "en",
    "dir": "ltr",
    "label": "English",
    "nativeName": "English",
    "index_description": "Free tools to help NJ Transit riders navigate the Portal North Bridge cutover. Find alternative routes, figure out what ticket to buy, and understand how your commute changes.",
    "index_og_description": "Free tools for NJ Transit riders affected by the Portal North Bridge cutover (Feb 15 – Mar 15, 2026).",
    "compare_description": "Compare your commute options during the NJ Transit Portal Bridge cutover. See visual side-by-side breakdowns of every route to Manhattan.",
    "compare_og_description": "Visual side-by-side commute comparison during the Portal Bridge cutover. Pick your station and destination, see all options ranked.",
    "coverage_description": "Curated news coverage of the NJ Transit Portal North Bridge cutover. Articles from NJ.com, Gothamist, NorthJersey.com, and more.",
    "coverage_og_description": "Curated news coverage of the Portal Bridge cutover. Stay informed with reporting from local and regional news sources.",
    "map_description": "Interactive map of the Portal Bridge cutover showing affected stations, transfer points, and alternative routes.",
    "map_og_description": "Interactive map of the Portal Bridge cutover showing affected stations, transfer points, and alternative routes.",
    "embed_description": "Embed Reroute NJ tools on your website. Free for newsrooms, publishers, and community organizations.",
    "embed_og_description": "Embed Reroute NJ transit tools on your website. Free for newsrooms, publishers, and community organizations."
}
```

**Step 2: Add translated keys to all 10 language files**

For each of the 10 language files, add translated versions of these 10 meta keys to their `"meta"` section. The translations should be natural, not machine-literal. Each description should read well as a Google search snippet in that language.

Example for `es.json`:
```json
"meta": {
    "lang": "es",
    "dir": "ltr",
    "label": "Español",
    "nativeName": "Español",
    "index_description": "Herramientas gratuitas para ayudar a los pasajeros de NJ Transit a navegar el cambio del Portal North Bridge. Encuentra rutas alternativas y entiende cómo cambia tu viaje.",
    "index_og_description": "Herramientas gratuitas para los pasajeros de NJ Transit afectados por el cambio del Portal North Bridge (15 de feb – 15 de mar, 2026).",
    "compare_description": "Compara tus opciones de viaje durante el cambio del Portal Bridge de NJ Transit. Ve comparaciones visuales lado a lado de cada ruta a Manhattan.",
    "compare_og_description": "Comparación visual de opciones de viaje durante el cambio del Portal Bridge. Elige tu estación y destino, ve todas las opciones.",
    "coverage_description": "Cobertura de noticias sobre el cambio del Portal North Bridge de NJ Transit. Artículos de NJ.com, Gothamist, NorthJersey.com y más.",
    "coverage_og_description": "Cobertura curada de noticias sobre el cambio del Portal Bridge. Mantente informado con reportajes de fuentes locales y regionales.",
    "map_description": "Mapa interactivo del cambio del Portal Bridge que muestra estaciones afectadas, puntos de transbordo y rutas alternativas.",
    "map_og_description": "Mapa interactivo del cambio del Portal Bridge que muestra estaciones afectadas, puntos de transbordo y rutas alternativas.",
    "embed_description": "Inserta las herramientas de Reroute NJ en tu sitio web. Gratis para redacciones, editores y organizaciones comunitarias.",
    "embed_og_description": "Inserta las herramientas de tránsito de Reroute NJ en tu sitio web. Gratis para redacciones, editores y organizaciones comunitarias."
}
```

Repeat for zh, tl, ko, pt, gu, hi, it, ar, pl — with proper translations for each language.

**Step 3: Validate JSON**

Run: `for f in translations/*.json; do python3 -c "import json; json.load(open('$f')); print('OK: $f')"; done`
Expected: All 11 files print `OK`

**Step 4: Commit**

```bash
git add translations/
git commit -m "Add translated meta description keys for all 11 languages"
```

---

### Task 8: Update generate-pages.py to handle meta descriptions, og:url, and canonical tags

**Files:**
- Modify: `tools/generate-pages.py`

**Step 1: Add a `replace_meta_description` function**

After the existing `replace_meta` function (~line 103), add:

```python
def replace_meta_description(html, translations, page_key):
    """Replace <meta name='description'> and og:description with translated values."""
    desc = get_translation(translations, f"meta.{page_key}_description")
    og_desc = get_translation(translations, f"meta.{page_key}_og_description")
    if desc:
        html = re.sub(
            r'<meta name="description" content="[^"]*">',
            f'<meta name="description" content="{desc}">',
            html
        )
    if og_desc:
        html = re.sub(
            r'<meta property="og:description" content="[^"]*">',
            f'<meta property="og:description" content="{og_desc}">',
            html
        )
        html = re.sub(
            r'<meta name="twitter:description" content="[^"]*">',
            f'<meta name="twitter:description" content="{og_desc}">',
            html
        )
    return html
```

**Step 2: Add a `fix_og_url` function**

```python
def fix_og_url(html, lang, page_name):
    """Fix og:url to point to the translated page's own URL."""
    translated_url = f"https://reroutenj.org/{lang}/{page_name}"
    html = re.sub(
        r'<meta property="og:url" content="[^"]*">',
        f'<meta property="og:url" content="{translated_url}">',
        html
    )
    return html
```

**Step 3: Add a `add_canonical` function**

```python
def add_canonical(html, lang, page_name):
    """Add <link rel='canonical'> pointing to this translated page's own URL."""
    canonical_url = f"https://reroutenj.org/{lang}/{page_name}"
    # Insert after favicon link
    html = html.replace(
        '<link rel="icon"',
        f'<link rel="canonical" href="{canonical_url}">\n  <link rel="icon"'
    )
    return html
```

**Step 4: Wire them into `generate_page`**

In the `generate_page` function, after `replace_meta` (step 3, ~line 999), add:

```python
    html = replace_meta_description(html, translations, page_key)
    html = fix_og_url(html, lang, page_name)
    html = add_canonical(html, lang, page_name)
```

**Step 5: Regenerate all translated pages**

Run: `cd ~/projects/reroute-nj && python3 tools/generate-pages.py`
Expected: `Done. Generated 50 pages.`

**Step 6: Verify translated pages have correct meta tags**

Run: `grep -m1 'meta name="description"' es/index.html`
Expected: Contains Spanish text, not English

Run: `grep -m1 'og:url' es/index.html`
Expected: `https://reroutenj.org/es/index.html`

Run: `grep -m1 'canonical' es/index.html`
Expected: `https://reroutenj.org/es/index.html`

**Step 7: Spot-check a second language**

Run: `grep -m1 'meta name="description"' zh/index.html`
Expected: Contains Chinese text

Run: `grep -m1 'og:url' zh/compare.html`
Expected: `https://reroutenj.org/zh/compare.html`

**Step 8: Commit**

```bash
git add tools/generate-pages.py es/ zh/ tl/ ko/ pt/ gu/ hi/ it/ ar/ pl/
git commit -m "Update page generator: translated meta descriptions, correct og:url, canonical tags

Regenerated all 50 translated pages with proper per-language meta
descriptions, og:url pointing to the translated page, and canonical tags."
```

---

### Task 9: Add citation-ready answer blocks to all English pages

**Files:**
- Modify: `index.html`, `compare.html`, `coverage.html`, `map.html`, `embed.html`

**Step 1: Add answer blocks**

For each page, add a concise factual paragraph right after the opening of the `<main>` content area, visible as the first text content users and crawlers encounter. These should be wrapped in a `<p>` with a class for optional styling.

**index.html** — after the alert banner, before the control panel (~line 84 area). Insert as the first child inside `<main>`:

```html
    <p class="seo-summary">During February 15 – March 15, 2026, NJ Transit rail service is reduced by approximately 50% as Amtrak connects the new Portal North Bridge. Select your line and station below to see exactly how your commute changes, what alternative routes are available, and what tickets you need.</p>
```

**compare.html** — as first child in `<main>`:

```html
    <p class="seo-summary">Compare your commute options during the Portal Bridge cutover. Pick your NJ Transit station and Manhattan destination to see every alternative route — PATH, ferry, bus, and direct train — ranked by travel time with visual breakdowns.</p>
```

**coverage.html** — as first child in `<main>`:

```html
    <p class="seo-summary">Curated news coverage of the NJ Transit Portal North Bridge cutover from 15+ regional news sources including NJ.com, Gothamist, and NorthJersey.com. Filter by line, direction, source, or category.</p>
```

**map.html** — as first child in `<main>`:

```html
    <p class="seo-summary">Interactive map showing the Portal Bridge location over the Hackensack River in Kearny, NJ, all affected NJ Transit stations, key transfer hubs (Hoboken Terminal, Secaucus Junction, Newark Penn), and alternative transit routes during the Feb 15 – Mar 15, 2026 cutover.</p>
```

**embed.html** — as first child in `<main>`:

```html
    <p class="seo-summary">Embed Reroute NJ tools on your website for free. Newsrooms, publishers, and community organizations can iframe any tool, link directly, or fork the open-source code to create a branded version.</p>
```

**Step 2: Add minimal CSS for the summary class**

In `css/styles.css`, add a style for `.seo-summary` that keeps it visible but styled as an intro paragraph (not hidden — hidden text is a Google penalty):

```css
.seo-summary {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--text-secondary, #555);
  margin-bottom: 1.5rem;
  max-width: 680px;
}
```

**Step 3: Verify paragraphs appear**

Serve the site locally and check that each page shows the summary paragraph as natural intro text.

**Step 4: Commit**

```bash
git add index.html compare.html coverage.html map.html embed.html css/styles.css
git commit -m "Add citation-ready answer blocks to all English pages

Visible intro paragraphs with key facts for search engines and AI tools."
```

---

### Task 10: Add .gitignore entry for .firecrawl/ and final verification

**Files:**
- Modify: `.gitignore` (create if needed)

**Step 1: Add .firecrawl/ to .gitignore**

```
.firecrawl/
```

**Step 2: Full verification pass**

Run these checks in sequence:

```bash
# robots.txt exists and references sitemap
grep "Sitemap" robots.txt

# sitemap.xml is valid and has 56 URLs
python3 -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml'); print('Valid')"
grep -c '<loc>' sitemap.xml

# llms.txt starts with correct header
head -1 llms.txt

# All English pages have canonical tags
for f in index.html compare.html coverage.html map.html embed.html blog.html; do
  echo "$f: $(grep -c 'rel="canonical"' $f) canonical"
done

# All English pages have JSON-LD
for f in index.html compare.html coverage.html map.html embed.html blog.html; do
  count=$(grep -c 'application/ld+json' $f)
  echo "$f: $count JSON-LD blocks"
done

# Translated pages have correct og:url
grep 'og:url' es/index.html
grep 'og:url' zh/compare.html

# Translated pages have translated descriptions
grep 'meta name="description"' es/index.html
grep 'meta name="description"' ko/coverage.html

# No duplicate skip-link in blog
grep -c 'skip-link' blog.html  # Should be 1
```

**Step 3: Commit .gitignore**

```bash
git add .gitignore
git commit -m "Add .gitignore with .firecrawl/ exclusion"
```

---

### Task 11: Google Search Console setup (post-deploy)

This task happens after the changes are pushed and deployed.

**Step 1: Push to main**

```bash
git push origin main
```

**Step 2: Verify live deployment**

Wait 1-2 minutes for GitHub Pages to deploy, then:

```bash
curl -s https://reroutenj.org/robots.txt | head -3
curl -s https://reroutenj.org/sitemap.xml | head -5
curl -s https://reroutenj.org/llms.txt | head -3
```

**Step 3: Register with Google Search Console**

Navigate to https://search.google.com/search-console and add `reroutenj.org` as a property. Use the "URL prefix" method with `https://reroutenj.org/`.

For verification, use the HTML file method:
1. Download the verification HTML file from Google
2. Add it to the repo root
3. Push to deploy
4. Click "Verify" in Search Console

**Step 4: Submit sitemap**

In Google Search Console > Sitemaps, submit: `https://reroutenj.org/sitemap.xml`

**Step 5: Commit verification file**

```bash
git add google*.html
git commit -m "Add Google Search Console verification file"
git push origin main
```
