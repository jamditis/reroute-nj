#!/usr/bin/env python3
"""
Generate translated HTML pages from English templates + translation JSON files.

Usage:
    python tools/generate-pages.py           # Generate all languages
    python tools/generate-pages.py es        # Generate Spanish only
    python tools/generate-pages.py es zh ko   # Generate specific languages

For each target language, creates /{lang}/ directory with translated HTML pages.
Static HTML text is replaced via data-i18n attributes. JS translations are
injected as an inline <script> setting window._T before i18n.js loads.
"""

import json
import os
import re
import sys
from html.parser import HTMLParser

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRANSLATIONS_DIR = os.path.join(PROJECT_ROOT, "translations")

# Pages to generate (blog.html excluded — English-only content)
PAGES = ["index.html", "compare.html", "coverage.html", "map.html", "embed.html"]

# All supported languages for hreflang tags
ALL_LANGS = ["en", "es", "zh", "tl", "ko", "pt", "gu", "hi", "it", "ar", "pl"]

# Relative path prefixes that need adjusting for subdirectory
ASSET_PREFIXES = [
    ('href="css/', 'href="../css/'),
    ('href="img/', 'href="../img/'),
    ('src="js/', 'src="../js/'),
    ('href="data/', 'href="../data/'),
    ('src="data/', 'src="../data/'),
]

# Page-specific links that need adjusting
PAGE_LINKS = [
    ('href="index.html"', 'href="../index.html"'),
    ('href="compare.html"', 'href="../compare.html"'),
    ('href="coverage.html"', 'href="../coverage.html"'),
    ('href="map.html"', 'href="../map.html"'),
    ('href="embed.html"', 'href="../embed.html"'),
    ('href="blog.html"', 'href="../blog.html"'),
]


def load_translations(lang):
    path = os.path.join(TRANSLATIONS_DIR, f"{lang}.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_translation(translations, key):
    """Look up a dot-notation key in the translations dict."""
    parts = key.split(".")
    obj = translations
    for part in parts:
        if not isinstance(obj, dict) or part not in obj:
            return None
        obj = obj[part]
    return obj


def fix_asset_paths(html):
    """Adjust relative paths for subdirectory deployment."""
    for old, new in ASSET_PREFIXES:
        html = html.replace(old, new)
    for old, new in PAGE_LINKS:
        html = html.replace(old, new)

    return html


def set_html_lang(html, lang, direction="ltr"):
    """Set the lang and dir attributes on <html>."""
    html = re.sub(r'<html\s+lang="[^"]*"', f'<html lang="{lang}"', html)
    if direction == "rtl":
        html = re.sub(r'<html\s+lang="' + lang + '"',
                       f'<html lang="{lang}" dir="rtl"', html)
    return html


def replace_title(html, translations, page_key):
    """Replace <title> content."""
    title = get_translation(translations, f"{page_key}.title")
    if title:
        html = re.sub(r'<title>[^<]+</title>', f'<title>{title}</title>', html)
    return html


def replace_meta(html, translations, page_key):
    """Replace OG/Twitter meta content with translated values."""
    title = get_translation(translations, f"{page_key}.title")
    if title:
        html = re.sub(
            r'<meta property="og:title" content="[^"]*">',
            f'<meta property="og:title" content="{title}">',
            html
        )
        html = re.sub(
            r'<meta name="twitter:title" content="[^"]*">',
            f'<meta name="twitter:title" content="{title}">',
            html
        )
    return html


def replace_tagline(html, translations, page_key):
    """Replace the tagline text."""
    tagline = get_translation(translations, f"{page_key}.tagline")
    if tagline:
        html = re.sub(
            r'(<p class="tagline">)[^<]+(</p>)',
            lambda m: m.group(1) + tagline + m.group(2),
            html
        )
    return html


def replace_nav_links(html, translations):
    """Replace navigation link text."""
    nav_map = {
        "Line guide": "common.nav_line_guide",
        "Commute comparison": "common.nav_commute_comparison",
        "News coverage": "common.nav_news_coverage",
        "Map": "common.nav_map",
        "Embed &amp; share": "common.nav_embed",
    }
    for eng_text, key in nav_map.items():
        translated = get_translation(translations, key)
        if translated:
            escaped = translated.replace("&", "&amp;")
            # Handle both active and non-active nav links
            html = re.sub(
                r'(class="tool-nav-link[^"]*">)' + re.escape(eng_text) + r'(</a>)',
                lambda m: m.group(1) + escaped + m.group(2),
                html
            )
    return html


def replace_a11y_buttons(html, translations):
    """Replace accessibility toggle button text."""
    hc = get_translation(translations, "common.high_contrast")
    sv = get_translation(translations, "common.simplified_view")
    if hc:
        html = html.replace(
            'aria-label="Toggle high contrast">High contrast</button>',
            f'aria-label="Toggle high contrast">{hc}</button>'
        )
    if sv:
        html = html.replace(
            'aria-label="Toggle simplified view">Simplified view</button>',
            f'aria-label="Toggle simplified view">{sv}</button>'
        )
    return html


def replace_skip_link(html, translations):
    """Replace skip link text."""
    text = get_translation(translations, "common.skip_to_main")
    if text:
        html = html.replace(
            'class="skip-link">Skip to main content</a>',
            f'class="skip-link">{text}</a>'
        )
    return html


def replace_footer(html, translations, page_key):
    """Replace footer text with full per-page translations."""
    disclaimer = get_translation(translations, "common.footer_disclaimer")
    built_by = get_translation(translations, "common.footer_built_by")

    # Build per-page footer disclaimer paragraph
    if disclaimer:
        # Construct the translated tail per page
        tail_map = {
            "index": ' {idx} <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com</a> {idx_after}',
            "compare": ' {idx} <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com</a> {idx_after}',
            "coverage": ' {cov} <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com</a> {cov_after}',
            "map": ' {map_data} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>. {map_tiles} <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>.',
            "embed": ' <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">{embed_gh}</a>.',
        }
        idx = get_translation(translations, "common.footer_disclaimer_index") or "Information is based on official announcements and may change. Always verify with"
        idx_after = get_translation(translations, "common.footer_disclaimer_index_after") or "before traveling."
        cov = get_translation(translations, "common.footer_disclaimer_coverage") or "News links go to their original sources. Always verify with"
        cov_after = get_translation(translations, "common.footer_disclaimer_coverage_after") or "before traveling."
        map_data = get_translation(translations, "common.footer_disclaimer_map") or "Map data &copy; contributors of"
        map_tiles = get_translation(translations, "common.footer_disclaimer_map_tiles") or "Tiles &copy;"
        embed_gh = get_translation(translations, "common.footer_disclaimer_embed") or "View source on GitHub"

        tail_template = tail_map.get(page_key, tail_map["index"])
        tail = tail_template.format(
            idx=idx, idx_after=idx_after,
            cov=cov, cov_after=cov_after,
            map_data=map_data, map_tiles=map_tiles,
            embed_gh=embed_gh,
        )

        new_disclaimer = f'<p class="disclaimer"><strong>Reroute NJ</strong> {disclaimer}{tail}</p>'
        html = re.sub(
            r'<p class="disclaimer">.*?</p>',
            new_disclaimer,
            html,
            flags=re.DOTALL
        )

    if built_by:
        html = re.sub(
            r'Built by',
            built_by,
            html,
            count=1
        )
    return html


def inject_translations_script(html, translations):
    """Inject window._T before i18n.js so translations load synchronously."""
    # Only include the sections needed at runtime (js, common, compare, coverage)
    runtime_keys = ["common", "js", "compare", "coverage"]
    runtime_t = {}
    for key in runtime_keys:
        if key in translations:
            runtime_t[key] = translations[key]

    t_json = json.dumps(runtime_t, ensure_ascii=False, separators=(",", ":"))
    inject = f'<script>window.BASE_PATH="../";window._T={t_json};</script>\n  '

    # Insert before the i18n.js script tag
    html = html.replace(
        '<script src="../js/i18n.js"></script>',
        inject + '<script src="../js/i18n.js"></script>'
    )
    return html


def add_hreflang_tags(html, page_name):
    """Add hreflang link tags for SEO."""
    tags = []
    for lang in ALL_LANGS:
        if lang == "en":
            url = f"https://reroutenj.org/{page_name}"
        else:
            url = f"https://reroutenj.org/{lang}/{page_name}"
        tags.append(f'  <link rel="alternate" hreflang="{lang}" href="{url}">')

    # Add x-default pointing to English
    tags.append(f'  <link rel="alternate" hreflang="x-default" href="https://reroutenj.org/{page_name}">')

    hreflang_block = "\n".join(tags)

    # Insert before </head>
    html = html.replace("</head>", f"{hreflang_block}\n</head>")
    return html


def replace_page_specific_content(html, translations, page_key):
    """Replace page-specific static content using translation keys."""
    if page_key == "index":
        # Alert banner
        phase1 = get_translation(translations, "index.alert_phase1")
        details = get_translation(translations, "index.alert_details")
        if phase1:
            html = html.replace('<strong>Phase 1:</strong>', f'<strong>{phase1}</strong>')
        if details:
            html = html.replace(
                'Feb 15 – Mar 15, 2026 &middot; All lines affected except Atlantic City &middot; 50% service reduction between Newark &amp; Secaucus',
                details.replace("&", "&amp;").replace("·", "&middot;")
            )

        # Station selector
        your_station = get_translation(translations, "index.your_station")
        choose_station = get_translation(translations, "index.choose_station")
        direction_label = get_translation(translations, "index.direction_label")
        if your_station:
            html = html.replace('>Your station</label>', f'>{your_station}</label>')
        if choose_station:
            html = html.replace('Choose your station&hellip;', choose_station)
        if direction_label:
            html = html.replace('>Direction of travel</label>', f'>{direction_label}</label>')

        # Direction buttons (HTML uses &rarr; entities and dir-sub class)
        nj_nyc = get_translation(translations, "index.nj_to_nyc")
        nyc_nj = get_translation(translations, "index.nyc_to_nj")
        morning = get_translation(translations, "index.morning_commute")
        evening = get_translation(translations, "index.evening_commute")
        if nj_nyc and morning:
            html = html.replace(
                'NJ &rarr; NYC <span class="dir-sub">morning commute</span>',
                nj_nyc.replace("→", "&rarr;") + f' <span class="dir-sub">{morning}</span>'
            )
        if nyc_nj and evening:
            html = html.replace(
                'NYC &rarr; NJ <span class="dir-sub">evening commute</span>',
                nyc_nj.replace("→", "&rarr;") + f' <span class="dir-sub">{evening}</span>'
            )

        # Tab labels
        tab_affected = get_translation(translations, "index.tab_affected")
        tab_routes = get_translation(translations, "index.tab_routes")
        tab_tickets = get_translation(translations, "index.tab_tickets")
        if tab_affected:
            html = html.replace('>Am I affected?</button>', f'>{tab_affected}</button>')
        if tab_routes:
            html = html.replace('>Route planner</button>', f'>{tab_routes}</button>')
        if tab_tickets:
            html = html.replace('>Ticket guide</button>', f'>{tab_tickets}</button>')

        # Impact empty state
        ami = get_translation(translations, "index.am_i_affected")
        select_line = get_translation(translations, "index.select_line_station")
        if ami:
            # Panel intro has h2, impact-empty has h3
            html = re.sub(r'(<h[23]>)Am I affected\?(</h[23]>)', lambda m: m.group(1) + ami + m.group(2), html)
        if select_line:
            html = re.sub(
                r'Select your line and station above to see exactly how the cutover changes your commute\.',
                select_line,
                html
            )

        # Stat labels
        lines_aff = get_translation(translations, "index.lines_affected")
        svc_red = get_translation(translations, "index.service_reduction")
        if lines_aff:
            html = html.replace('>lines affected<', f'>{lines_aff}<')
        if svc_red:
            html = html.replace('>service reduction<', f'>{svc_red}<')

        # Section headings
        for key, eng_text in [
            ("index.cutover_summary_title", "How the cutover affects your commute"),
            ("index.hoboken_terminal_title", "Navigating Hoboken Terminal"),
            ("index.compare_callout_title", "Want to compare all your options side by side?"),
            ("index.secaucus_title", "Secaucus Junction: the choke point"),
            ("index.timeline_title", "Timeline"),
            ("index.resources_title", "Official resources"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")

        # Section descriptions
        for key, eng_text in [
            ("index.cutover_summary_desc", "Starting February 15, the Portal North Bridge connection will reduce NJ Transit service for four weeks. Select your line and station above to see exactly what changes for you."),
            ("index.hoboken_terminal_desc", "If your line is diverted to Hoboken, you may be arriving at Hoboken Terminal for the first time. Here's how to get from your train to PATH, the ferry, or Bus 126."),
            ("index.compare_callout_desc", "Our commute comparison tool shows you every route to your Manhattan destination with visual time breakdowns, so you can pick the fastest option for where you're actually going."),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(eng_text, translated)

        # Compare callout button
        cta = get_translation(translations, "index.compare_callout_btn")
        if cta:
            html = html.replace('Compare commute options &rarr;', cta.replace("→", "&rarr;"))

    elif page_key == "compare":
        # Hero section
        for key, eng_text in [
            ("compare.hero_title", "How does your commute change?"),
            ("compare.hero_desc", "Pick your station and Manhattan destination. We'll show you every option side by side with visual time breakdowns."),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")

        # Step labels (pattern: </span> Text</div>)
        for key, eng_text in [
            ("compare.step1", "Your line"),
            ("compare.step2", "Your station"),
            ("compare.step3", "Where in Manhattan?"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"</span> {eng_text}</div>", f"</span> {translated}</div>")

        # Station placeholder
        choose = get_translation(translations, "index.choose_station")
        if choose:
            html = html.replace('Choose your station&hellip;', choose)

    elif page_key == "coverage":
        for key, eng_text in [
            ("coverage.hero_title", "Portal Bridge in the news"),
            ("coverage.hero_desc", "Curated coverage of the cutover from local and regional news sources."),
            ("coverage.all_sources", "All sources"),
            ("coverage.all_categories", "All categories"),
            ("coverage.all_lines", "All lines"),
            ("coverage.all_directions", "All directions"),
            ("coverage.source_label", "Source"),
            ("coverage.category_label", "Category"),
            ("coverage.line_label", "Line"),
            ("coverage.direction_label", "Direction"),
            ("coverage.search_label", "Search"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")
        # Search placeholder
        search_ph = get_translation(translations, "coverage.search_placeholder")
        if search_ph:
            html = html.replace('placeholder="Search articles…"', f'placeholder="{search_ph}"')

    elif page_key == "map":
        for key, eng_text in [
            ("map.hero_title", "Portal Bridge cutover map"),
            ("map.hero_desc", "See the geography of the cutover: the Portal Bridge location, affected stations, key transfer hubs, and alternative routes."),
            ("map.filter_all", "All"),
            ("map.filter_transfer_hubs", "Transfer hubs"),
            ("map.legend_title", "Legend"),
            ("map.about_title", "About the Portal Bridge"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")
        about_desc = get_translation(translations, "map.about_desc")
        if about_desc:
            html = html.replace(
                "The Portal Bridge spans the Hackensack River in Kearny, NJ, between Newark and Secaucus. It is the single most critical piece of infrastructure on the Northeast Corridor between New York and Washington, D.C.",
                about_desc
            )

    elif page_key == "embed":
        for key, eng_text in [
            ("embed.hero_title", "Put Reroute NJ on your website"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")
        hero_desc = get_translation(translations, "embed.hero_desc")
        if hero_desc:
            html = html.replace(
                "Reroute NJ is free, open source, and built for the community. Newsrooms, publishers, community organizations, and anyone else can embed our tools, link to them, or republish them on their own sites.",
                hero_desc
            )

    return html


def generate_page(page_name, lang, translations):
    """Generate a single translated page."""
    src_path = os.path.join(PROJECT_ROOT, page_name)
    with open(src_path, "r", encoding="utf-8") as f:
        html = f.read()

    page_key = page_name.replace(".html", "")
    direction = get_translation(translations, "meta.dir") or "ltr"

    # 1. Set language and direction
    html = set_html_lang(html, lang, direction)

    # 2. Fix asset paths for subdirectory
    html = fix_asset_paths(html)

    # 3. Replace common elements
    html = replace_skip_link(html, translations)
    html = replace_nav_links(html, translations)
    html = replace_a11y_buttons(html, translations)
    html = replace_footer(html, translations, page_key)
    html = replace_tagline(html, translations, page_key)
    html = replace_title(html, translations, page_key)
    html = replace_meta(html, translations, page_key)

    # 4. Replace page-specific content
    html = replace_page_specific_content(html, translations, page_key)

    # 5. Inject translations for JS runtime
    html = inject_translations_script(html, translations)

    # 6. Add hreflang tags
    html = add_hreflang_tags(html, page_name)

    # 7. Write output
    out_dir = os.path.join(PROJECT_ROOT, lang)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, page_name)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    return out_path


def main():
    # Determine which languages to generate
    if len(sys.argv) > 1:
        langs = sys.argv[1:]
    else:
        # Find all translation files except English
        langs = []
        for f in sorted(os.listdir(TRANSLATIONS_DIR)):
            if f.endswith(".json") and f != "en.json":
                langs.append(f.replace(".json", ""))

    if not langs:
        print("No translation files found. Create translations/*.json first.")
        sys.exit(1)

    total = 0
    for lang in langs:
        trans_path = os.path.join(TRANSLATIONS_DIR, f"{lang}.json")
        if not os.path.exists(trans_path):
            print(f"  Warning: {trans_path} not found, skipping {lang}")
            continue

        translations = load_translations(lang)
        label = get_translation(translations, "meta.nativeName") or lang
        print(f"Generating {label} ({lang})...")

        for page in PAGES:
            out_path = generate_page(page, lang, translations)
            print(f"  {out_path}")
            total += 1

    print(f"\nDone. Generated {total} pages.")


if __name__ == "__main__":
    main()
