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

# Pages to generate
PAGES = ["index.html", "compare.html", "coverage.html", "map.html", "embed.html", "blog.html", "blog/cutover-begins.html", "blog/why-we-built-reroute-nj.html", "blog/new-embed-system.html", "about.html"]

# Map page filenames to translation key prefixes (when different from filename stem)
PAGE_KEY_MAP = {
    "blog/cutover-begins.html": "blog_post_cutover",
    "blog/why-we-built-reroute-nj.html": "blog_post",
    "blog/new-embed-system.html": "blog_post_embed",
}

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

# Page-specific links: keep as same-directory relative links
# (translated pages live in /{lang}/ alongside each other, so
# compare.html from /es/ correctly resolves to /es/compare.html)
PAGE_LINKS = []


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


def fix_asset_paths(html, page_name):
    """Adjust relative paths for subdirectory deployment.

    For root-level pages (depth 0), assets go from css/ to ../css/.
    For nested pages like blog/slug.html (depth 1), assets already have
    ../ in the source template, so we adjust ../css/ to ../../css/.
    """
    depth = page_name.count('/')
    if depth == 0:
        # Root-level page: css/ → ../css/
        for old, new in ASSET_PREFIXES:
            html = html.replace(old, new)
    else:
        # Nested page: existing ../ paths need one more ../
        existing = '../' * depth
        target = '../' * (depth + 1)
        for d in ['css/', 'img/', 'js/', 'data/']:
            for attr in ['href="', 'src="']:
                html = html.replace(f'{attr}{existing}{d}', f'{attr}{target}{d}')

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


def replace_meta_description(html, translations, page_key):
    """Replace meta description and og:description with translated values."""
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


def fix_og_url(html, lang, page_name):
    """Fix og:url to point to the translated page's own URL."""
    translated_url = f"https://reroutenj.org/{lang}/{page_name}"
    html = re.sub(
        r'<meta property="og:url" content="[^"]*">',
        f'<meta property="og:url" content="{translated_url}">',
        html
    )
    return html


def add_canonical(html, lang, page_name):
    """Replace or add canonical link pointing to this translated page's own URL."""
    canonical_url = f"https://reroutenj.org/{lang}/{page_name}"
    if re.search(r'<link rel="canonical" href="[^"]*">', html):
        html = re.sub(
            r'<link rel="canonical" href="[^"]*">',
            f'<link rel="canonical" href="{canonical_url}">',
            html
        )
    else:
        html = html.replace(
            '<link rel="icon"',
            f'<link rel="canonical" href="{canonical_url}">\n  <link rel="icon"'
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
        "Blog": "common.nav_blog",
        "About": "common.nav_about",
    }
    for eng_text, key in nav_map.items():
        translated = get_translation(translations, key)
        if translated:
            escaped = translated.replace("&", "&amp;")
            # Handle both active and non-active nav links
            # [^>]* after the closing " matches extra attrs like aria-current="page"
            html = re.sub(
                r'(class="tool-nav-link[^"]*"[^>]*>)' + re.escape(eng_text) + r'(</a>)',
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
            "blog": ' <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">{embed_gh}</a>.',
            "blog_post": ' <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">{embed_gh}</a>.',
            "blog_post_embed": ' <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">{embed_gh}</a>.',
            "blog_post_cutover": ' <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">{embed_gh}</a>.',
            "about": ' <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">{embed_gh}</a>.',
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

    # Translate "About our methodology" footer link
    about_link_text = get_translation(translations, "about.heading") or "About our methodology"
    html = html.replace('>About our methodology</a>', f'>{about_link_text}</a>')

    return html


def inject_translations_script(html, translations, page_name):
    """Inject window._T before i18n.js so translations load synchronously."""
    # Only include the sections needed at runtime (js, common, compare, coverage)
    runtime_keys = ["common", "js", "compare", "coverage", "card"]
    runtime_t = {}
    for key in runtime_keys:
        if key in translations:
            runtime_t[key] = translations[key]

    t_json = json.dumps(runtime_t, ensure_ascii=False, separators=(",", ":"))

    # Depth-aware BASE_PATH: root pages get ../, nested pages get ../../
    depth = page_name.count('/') + 1  # +1 for the lang directory
    base_path = '../' * depth
    js_path = f'{base_path}js/i18n.js'

    inject = f'<script>window.BASE_PATH="{base_path}";window._T={t_json};</script>\n  '

    # Find the i18n.js script tag (path varies by depth)
    for prefix in ['../../', '../']:
        old_tag = f'<script src="{prefix}js/i18n.js"></script>'
        if old_tag in html:
            html = html.replace(old_tag, inject + f'<script src="{prefix}js/i18n.js"></script>')
            break

    return html


def add_hreflang_tags(html, page_name):
    """Add hreflang link tags for SEO (skips if already present in source)."""
    if 'hreflang=' in html:
        return html

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


def replace_hamburger_label(html, translations, page_key):
    """Replace the mobile hamburger menu label with translated nav text."""
    label_map = {
        "index": "common.nav_line_guide",
        "compare": "common.nav_commute_comparison",
        "coverage": "common.nav_news_coverage",
        "map": "common.nav_map",
        "embed": "common.nav_embed",
        "blog": "common.menu",
        "blog_post": "common.menu",
        "blog_post_embed": "common.menu",
        "about": "about.hamburger_label",
    }
    eng_map = {
        "index": "Line guide",
        "compare": "Commute comparison",
        "coverage": "News coverage",
        "map": "Map",
        "embed": "Embed &amp; share",
        "blog": "Menu",
        "blog_post": "Menu",
        "blog_post_embed": "Menu",
        "about": "About",
    }
    key = label_map.get(page_key)
    eng = eng_map.get(page_key)
    if key and eng:
        translated = get_translation(translations, key)
        if translated:
            escaped = translated.replace("&", "&amp;")
            html = html.replace(
                f'<span class="hamburger-label">{eng}</span>',
                f'<span class="hamburger-label">{escaped}</span>'
            )
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
            html = html.replace('>Direction of travel</span>', f'>{direction_label}</span>')

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

        # Stat "4 weeks" and "Feb 15 – Mar 15"
        stat_weeks = get_translation(translations, "index.stat_4_weeks")
        stat_dates = get_translation(translations, "index.stat_dates")
        if stat_weeks:
            html = html.replace('>4 weeks<', f'>{stat_weeks}<')
        if stat_dates:
            html = html.replace('>Feb 15 &ndash; Mar 15<', f'>{stat_dates}<')

        # Line badge default
        line_badge = get_translation(translations, "index.line_badge_default")
        if line_badge:
            html = html.replace('>Select a line</div>', f'>{line_badge}</div>')

        # Route planner panel intro
        rp_title = get_translation(translations, "index.route_planner_title")
        rp_empty = get_translation(translations, "index.route_planner_empty")
        if rp_title:
            html = html.replace(
                '<h2>Route planner</h2>',
                f'<h2>{rp_title}</h2>'
            )
        if rp_empty:
            html = html.replace(
                'Select a line above to see your options during the cutover.',
                rp_empty
            )

        # Ticket guide panel intro
        tg_title = get_translation(translations, "index.ticket_guide_title")
        tg_empty = get_translation(translations, "index.ticket_guide_empty")
        if tg_title:
            html = html.replace(
                '<h2>What ticket should I buy?</h2>',
                f'<h2>{tg_title}</h2>'
            )
        if tg_empty:
            html = html.replace(
                'Select a line above to see ticket guidance for the cutover period.',
                tg_empty
            )

        # Terminal map labels
        for key, eng_text in [
            ("index.terminal_hudson_river", "Hudson River"),
            ("index.terminal_ferry_dock", "Ferry dock"),
            ("index.terminal_ferry_detail", "NY Waterway to W. 39th St"),
            ("index.terminal_building", "Terminal building"),
            ("index.terminal_platforms", "Train platforms"),
            ("index.terminal_platforms_detail", "NJ Transit arrives here"),
            ("index.terminal_concourse", "Main concourse"),
            ("index.terminal_concourse_detail", "Follow signs from here"),
            ("index.terminal_path_entrance", "PATH entrance"),
            ("index.terminal_path_detail", "Downstairs from concourse"),
            ("index.terminal_bus_area", "Bus area"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")

        # Bus detail has middot entity
        bus_detail = get_translation(translations, "index.terminal_bus_detail")
        if bus_detail:
            html = html.replace(
                ">Bus 126 to Port Authority &middot; Hudson Place<",
                f">{bus_detail.replace('·', '&middot;')}<"
            )

        # Transfer cards
        for prefix, eng_title, eng_time in [
            ("index.path", "To PATH (33rd Street)", "~5 min from train"),
            ("index.ferry", "To NY Waterway ferry", "~8 min from train"),
            ("index.bus", "To Bus 126 (Port Authority)", "~5 min from train"),
        ]:
            title = get_translation(translations, f"{prefix}_title")
            time = get_translation(translations, f"{prefix}_time")
            if title:
                html = html.replace(f"<h4>{eng_title}</h4>", f"<h4>{title}</h4>")
            if time:
                html = html.replace(f'<span class="transfer-time">{eng_time}</span>',
                                    f'<span class="transfer-time">{time}</span>')
            for i in range(1, 6):
                step = get_translation(translations, f"{prefix}_step{i}")
                if step:
                    # Find the English step text from en.json to replace
                    eng_steps = {
                        "index.path_step1": "Exit your train and walk toward the main terminal building",
                        "index.path_step2": "Enter the historic waiting room / main concourse",
                        "index.path_step3": 'Look for PATH signs — the entrance is <strong>downstairs</strong>',
                        "index.path_step4": "Take escalator/stairs down to PATH platform level",
                        "index.path_step5": "Board the Hoboken &rarr; 33rd Street train",
                        "index.ferry_step1": "Exit your train and walk through the terminal building",
                        "index.ferry_step2": 'Exit on the <strong>waterfront side</strong> (east side, toward the river)',
                        "index.ferry_step3": "The ferry dock is along the waterfront walkway to the right",
                        "index.ferry_step4": "Look for NY Waterway signage and the boarding area",
                        "index.ferry_step5": "Board the ferry to W. 39th St, Midtown",
                        "index.bus_step1": "Exit your train and walk through the terminal building",
                        "index.bus_step2": 'Exit on the <strong>street side</strong> (west side, away from the river)',
                        "index.bus_step3": 'The bus stops are on <strong>Hudson Place</strong>, the street in front of the terminal',
                        "index.bus_step4": "Look for Bus 126 signage or ask NJ Transit staff",
                        "index.bus_step5": "Board Bus 126 to Port Authority Bus Terminal",
                    }
                    eng_step = eng_steps.get(f"{prefix}_step{i}")
                    if eng_step:
                        # Handle → entity in path_step5
                        eng_html = eng_step.replace("→", "&rarr;")
                        step_html = step.replace("→", "&rarr;")
                        html = html.replace(f"<li>{eng_html}</li>", f"<li>{step_html}</li>")

            tip = get_translation(translations, f"{prefix}_tip")
            if tip:
                eng_tips = {
                    "index.path_tip": "NJ Transit staff will be deployed throughout the terminal. Follow the crowds — most people will be heading to PATH.",
                    "index.ferry_tip": "Check the NY Waterway app for next departure time before leaving the terminal. Ferries run less frequently than PATH.",
                    "index.bus_tip": "Bus 126 goes through the Lincoln Tunnel. During peak hours, allow extra time for tunnel traffic.",
                }
                eng_tip = eng_tips.get(f"{prefix}_tip")
                if eng_tip:
                    html = html.replace(
                        f'<p class="transfer-tip">{eng_tip}</p>',
                        f'<p class="transfer-tip">{tip}</p>'
                    )

        # Secaucus section
        secaucus_intro = get_translation(translations, "index.secaucus_intro")
        if secaucus_intro:
            html = html.replace(
                "During the cutover, only one track operates between Newark Penn Station and Secaucus Junction. This is the bottleneck that causes the 50% service reduction. Even if you don&#x27;t transfer at Secaucus, delays here ripple across the entire system.",
                secaucus_intro
            )
            # Also try without HTML entity
            html = html.replace(
                "During the cutover, only one track operates between Newark Penn Station and Secaucus Junction. This is the bottleneck that causes the 50% service reduction. Even if you don't transfer at Secaucus, delays here ripple across the entire system.",
                secaucus_intro
            )

        # Secaucus card headings
        for key, eng_text in [
            ("index.secaucus_transfer_title", "If you transfer at Secaucus"),
            ("index.secaucus_avoid_title", "Avoiding Secaucus entirely"),
            ("index.secaucus_delays_title", "Delay expectations"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<h4>{eng_text}</h4>", f"<h4>{translated}</h4>")

        # Secaucus list items
        secaucus_items = {
            "index.secaucus_transfer_item1": '<strong>Allow extra time.</strong> Connections that normally take 5–10 minutes may take 15–25 minutes due to single-track delays.',
            "index.secaucus_transfer_item2": '<strong>Fewer trains means fewer connections.</strong> Check the temporary schedule for your specific connection — some may be eliminated.',
            "index.secaucus_transfer_item3": '<strong>Follow the signs.</strong> NJ Transit is deploying extra staff at Secaucus to help with wayfinding and crowd management.',
            "index.secaucus_transfer_item4": '<strong>Have a backup plan.</strong> If you miss a connection, know your next option (next train, or bus alternative).',
            "index.secaucus_avoid_item1": '<strong>Hoboken-diverted lines (M-B, M&amp;E, Gladstone):</strong> Your trains go to Hoboken, not through Secaucus. The bottleneck doesn\'t directly affect you.',
            "index.secaucus_avoid_item2": '<strong>Consider Hoboken as your hub.</strong> If you can get to a Morris &amp; Essex or Montclair-Boonton station, routing through Hoboken may be faster than fighting through Secaucus.',
            "index.secaucus_avoid_item3": '<strong>Bus alternatives:</strong> NJ Transit buses that go directly to Port Authority skip Secaucus entirely.',
            "index.secaucus_avoid_item4": '<strong>Drive to Newark Penn:</strong> If you normally drive to a station, consider driving directly to Newark Penn Station for a more direct NEC train to PSNY.',
            "index.secaucus_delays_item1": '<strong>Peak hours (7–9am, 5–7pm):</strong> Delays of 15–30+ minutes are likely at Secaucus due to single-track operations.',
            "index.secaucus_delays_item2": '<strong>Off-peak:</strong> Delays should be shorter but still expect 5–15 minutes of added travel time.',
            "index.secaucus_delays_item3": '<strong>Cascading delays:</strong> A delay on one line backs up all lines sharing the single track. One late train affects everything behind it.',
            "index.secaucus_delays_item4": '<strong>Check real-time status:</strong> Use the NJ Transit app or <a href="https://www.njtransit.com/travel-alerts-to" target="_blank" rel="noopener">njtransit.com travel alerts</a> before leaving home.',
        }
        for key, eng_text in secaucus_items.items():
            translated = get_translation(translations, key)
            if translated:
                # Escape & to &amp; in translated text for HTML context
                trans_html = translated.replace("&", "&amp;").replace("&amp;lt;", "&lt;").replace("&amp;gt;", "&gt;")
                # But preserve HTML tags - undo escaping inside tags
                trans_html = re.sub(r'&amp;(#?\w+;)', r'&\1', trans_html)
                # Actually, just use the raw translation which already has proper HTML
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")

        # Timeline events
        tl_events = [
            ("index.tl_announce_title", "Cutover announced",
             "index.tl_announce_desc", "NJ Transit and Amtrak announce the Portal North Bridge cutover schedule and temporary service changes."),
            ("index.tl_tickets_title", "New ticket rules begin",
             "index.tl_tickets_desc", "Midtown Direct riders should start buying Hoboken monthly passes (valid for Penn Station travel Feb 1–15)."),
            ("index.tl_start_title", "Phase 1 begins",
             "index.tl_start_desc", "Temporary schedules take effect. Midtown Direct weekday trains diverted to Hoboken. Single-track operation between Newark and Secaucus."),
            ("index.tl_end_title", "Phase 1 ends (expected)",
             "index.tl_end_desc", "Regular schedules resume, subject to completion of safety testing. First track on the new Portal North Bridge enters service."),
            ("index.tl_phase2_title", "Phase 2",
             "index.tl_phase2_desc", "Second track cutover. Similar service disruptions expected. Dates TBA. After this, the old Portal Bridge is permanently retired."),
        ]
        for title_key, eng_title, desc_key, eng_desc in tl_events:
            title = get_translation(translations, title_key)
            desc = get_translation(translations, desc_key)
            if title:
                html = html.replace(f"<h4>{eng_title}</h4>", f"<h4>{title}</h4>")
            if desc:
                html = html.replace(f"<p>{eng_desc}</p>", f"<p>{desc}</p>")

        # Resource links
        res_links = [
            ("index.res_cutover_title", "NJ Transit cutover page",
             "index.res_cutover_desc", "Official schedules, maps, and FAQs"),
            ("index.res_schedules_title", "Temporary train schedules",
             "index.res_schedules_desc", "Line-by-line PDF schedules for Feb 15 – Mar 15"),
            ("index.res_alerts_title", "Real-time travel alerts",
             "index.res_alerts_desc", "Live service status and delay notifications"),
            ("index.res_path_title", "PATH train schedules",
             "index.res_path_desc", "Hoboken – 33rd Street service info"),
            ("index.res_ferry_title", "NY Waterway ferries",
             "index.res_ferry_desc", "Hoboken – Midtown ferry schedules"),
        ]
        for title_key, eng_title, desc_key, eng_desc in res_links:
            title = get_translation(translations, title_key)
            desc = get_translation(translations, desc_key)
            if title:
                html = html.replace(f"<strong>{eng_title}</strong>", f"<strong>{title}</strong>")
            if desc:
                html = html.replace(f"<span>{eng_desc}</span>", f"<span>{desc}</span>")

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
                # Step 2 uses <label> instead of <div>, handle both
                html = html.replace(f"</span> {eng_text}</div>", f"</span> {translated}</div>")
                html = html.replace(f"</span> {eng_text}</label>", f"</span> {translated}</label>")

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
            ("coverage.sort_label", "Sort"),
            ("coverage.search_label", "Search"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")
        # Search placeholder (HTML uses &hellip; entity, match both forms)
        search_ph = get_translation(translations, "coverage.search_placeholder")
        if search_ph:
            html = html.replace('placeholder="Search articles&hellip;"', f'placeholder="{search_ph}"')
            html = html.replace('placeholder="Search articles…"', f'placeholder="{search_ph}"')

        # Category options
        for key, eng_text in [
            ("coverage.cat_news", "News"),
            ("coverage.cat_opinion", "Opinion"),
            ("coverage.cat_analysis", "Analysis"),
            ("coverage.cat_official", "Official"),
            ("coverage.cat_community", "Community"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                # Match option elements: value stays in English, text gets translated
                html = html.replace(f">{eng_text}</option>", f">{translated}</option>")

        # Direction options
        for key, eng_text in [
            ("coverage.dir_nj_nyc", "NJ to NYC"),
            ("coverage.dir_nyc_nj", "NYC to NJ"),
            ("coverage.dir_both", "Both directions"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}</option>", f">{translated}</option>")

        # Sort options
        for key, eng_text in [
            ("coverage.sort_newest", "Newest first"),
            ("coverage.sort_relevance", "Most relevant"),
            ("coverage.sort_oldest", "Oldest first"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}</option>", f">{translated}</option>")

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

        # Legend items
        legend_portal = get_translation(translations, "map.legend_portal_bridge")
        legend_hub = get_translation(translations, "map.legend_transfer_hub")
        if legend_portal:
            html = html.replace(
                '></span> Portal Bridge</div>',
                f'></span> {legend_portal}</div>'
            )
        if legend_hub:
            html = html.replace(
                '></span> Transfer hub</div>',
                f'></span> {legend_hub}</div>'
            )

        # Bridge info cards
        for key, eng_text in [
            ("map.old_bridge_title", "The old bridge"),
            ("map.new_bridge_title", "The new bridge"),
            ("map.cutover_title", "The cutover"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<h4>{eng_text}</h4>", f"<h4>{translated}</h4>")

        # Bridge card list items
        bridge_items = {
            "map.old_bridge_item1": 'Built in <strong>1910</strong> &mdash; 115 years old',
            "map.old_bridge_item2": 'Swing bridge design that opens for marine traffic',
            "map.old_bridge_item3": 'Frequently gets stuck, causing hours of delay',
            "map.old_bridge_item4": 'Carries every NJ Transit and Amtrak train on the Northeast Corridor',
            "map.new_bridge_item1": 'Portal North Bridge: $1.5 billion replacement',
            "map.new_bridge_item2": 'Fixed-span design &mdash; never opens, never gets stuck',
            "map.new_bridge_item3": '50 feet higher than the old bridge, allowing boats to pass underneath',
            "map.new_bridge_item4": 'Part of the larger Gateway Program to modernize the corridor',
            "map.cutover_item1": '<strong>Phase 1</strong> (Feb 15 &ndash; Mar 15, 2026): First track transferred to new bridge',
            "map.cutover_item2": 'Requires single-track operations between Newark and Secaucus',
            "map.cutover_item3": '50% service reduction across all lines',
            "map.cutover_item4": '<strong>Phase 2</strong> (Fall 2026): Second track transferred, old bridge retired',
        }
        for key, eng_text in bridge_items.items():
            translated = get_translation(translations, key)
            if translated:
                # Convert translation dashes to HTML entities to match source
                trans_html = translated.replace("—", "&mdash;").replace("–", "&ndash;")
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{trans_html}</li>")

    elif page_key == "embed":
        # SEO summary
        seo_summary = get_translation(translations, "embed.seo_summary")
        if seo_summary:
            html = html.replace(
                "Embed Reroute NJ tools on your website for free. Newsrooms, publishers, and community organizations can iframe any tool, link directly, or fork the open-source code to create a branded version.",
                seo_summary
            )

        # Hero
        for key, eng_text in [
            ("embed.hero_title", "Put Reroute NJ on your website"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")
        hero_desc = get_translation(translations, "embed.hero_desc")
        if hero_desc:
            html = html.replace(
                "Reroute NJ is free, open source, and built for the community. Pick an embed type, configure it, and grab the code.",
                hero_desc
            )

        # Section titles (h2 headings)
        for key, eng_text in [
            ("embed.cfg_step1_title", "Pick an embed type"),
            ("embed.cfg_step2_title", "Configure your embed"),
            ("embed.cfg_step3_title", "Preview &amp; grab the code"),
            ("embed.direct_links_title", "Direct links"),
            ("embed.publishers_title", "For newsrooms &amp; publishers"),
            ("embed.branding_title", "Co-branding &amp; customization"),
            ("embed.contribute_title", "How to contribute"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                escaped = translated.replace("&", "&amp;")
                html = html.replace(f">{eng_text}<", f">{escaped}<")

        # Configurator type cards
        for key, eng_text in [
            ("embed.cfg_type_card", "Info card"),
            ("embed.cfg_type_widget", "Interactive widget"),
            ("embed.cfg_type_tool", "Full tool"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(
                    f'<strong class="cfg-type-name">{eng_text}</strong>',
                    f'<strong class="cfg-type-name">{translated}</strong>'
                )
        for key, eng_text in [
            ("embed.cfg_type_card_desc", "A compact card with key facts about a line or station. Great for newsletters, social media, and article sidebars."),
            ("embed.cfg_type_widget_desc", "A mini version of our tools your readers can use inline. Works in any CMS that supports HTML blocks."),
            ("embed.cfg_type_tool_desc", "The complete tool experience, embedded on your page. All features, fully interactive."),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(
                    f'<span class="cfg-type-desc">{eng_text}</span>',
                    f'<span class="cfg-type-desc">{translated}</span>'
                )

        # Step 2: Configure form labels
        for key, eng_text in [
            ("embed.cfg_card_type_label", "Card type"),
            ("embed.cfg_tool_label", "Tool"),
            ("embed.cfg_line_label", "Line"),
            ("embed.cfg_station_label", "Station"),
            ("embed.cfg_theme_label", "Theme"),
            ("embed.cfg_accent_label", "Accent color"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}</label>", f">{translated}</label>")

        # Step 2: Select options
        for key, eng_text in [
            ("embed.cfg_card_type_line", "Line overview"),
            ("embed.cfg_card_type_station", "Station info"),
            ("embed.cfg_card_type_summary", "Cutover summary"),
            ("embed.cfg_tool_line_guide", "Line guide"),
            ("embed.cfg_tool_compare", "Commute comparison"),
            ("embed.cfg_tool_coverage", "News coverage"),
            ("embed.cfg_tool_map", "Interactive map"),
            ("embed.cfg_theme_light", "Light"),
            ("embed.cfg_theme_dark", "Dark"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}</option>", f">{translated}</option>")

        # Select placeholders with HTML entities
        line_ph = get_translation(translations, "embed.cfg_line_placeholder")
        if line_ph:
            html = html.replace('Select a line&hellip;', line_ph)
        station_ph = get_translation(translations, "embed.cfg_station_placeholder")
        if station_ph:
            html = html.replace('Select a station&hellip;', station_ph)

        # Step 3: Preview and output
        preview_label = get_translation(translations, "embed.cfg_preview_label")
        if preview_label:
            html = html.replace(
                '<div class="cfg-preview-label">Live preview</div>',
                f'<div class="cfg-preview-label">{preview_label}</div>'
            )

        # Output tabs
        for key, eng_text in [
            ("embed.cfg_tab_iframe", "Iframe"),
            ("embed.cfg_tab_script", "Script tag"),
            ("embed.cfg_tab_png", "Download PNG"),
            ("embed.cfg_tab_html", "Download HTML"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}</button>", f">{translated}</button>")

        # Copy/download buttons and messages
        copy_btn = get_translation(translations, "embed.cfg_copy_btn")
        if copy_btn:
            html = html.replace('>Copy code</button>', f'>{copy_btn}</button>')
        copied = get_translation(translations, "embed.cfg_copied")
        if copied:
            html = html.replace('>Copied!</span>', f'>{copied}</span>')

        png_msg = get_translation(translations, "embed.cfg_png_msg")
        if png_msg:
            html = html.replace(
                "Click the button below to export the info card as a PNG image.",
                png_msg
            )
        dl_png = get_translation(translations, "embed.cfg_download_png")
        if dl_png:
            html = html.replace('>Download PNG</button>', f'>{dl_png}</button>')

        html_msg = get_translation(translations, "embed.cfg_html_msg")
        if html_msg:
            html = html.replace(
                "Click the button below to download a self-contained HTML file of the info card.",
                html_msg
            )
        dl_html = get_translation(translations, "embed.cfg_download_html")
        if dl_html:
            html = html.replace('>Download HTML</button>', f'>{dl_html}</button>')

        # Section intro texts
        dl_intro = get_translation(translations, "embed.direct_links_intro")
        if dl_intro:
            html = html.replace(
                "Link directly to any tool. These URLs are permanent and shareable.",
                dl_intro
            )

        # Direct link labels in <strong> within resource-link divs
        for key, eng_text in [
            ("embed.link_line_guide", "Line guide"),
            ("embed.link_compare", "Commute comparison"),
            ("embed.link_coverage", "News coverage"),
            ("embed.link_map", "Interactive map"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(
                    f'<strong>{eng_text}</strong>\n          <span class="embed-url">',
                    f'<strong>{translated}</strong>\n          <span class="embed-url">'
                )

        # Publishers section
        pub_intro = get_translation(translations, "embed.publishers_intro")
        if pub_intro:
            html = html.replace(
                "Reroute NJ is designed for journalists, newsrooms, and community publishers.",
                pub_intro
            )

        # Publisher card headings
        for key, eng_text in [
            ("embed.pub_embed_title", "Embed in your articles"),
            ("embed.pub_link_title", "Link from your coverage"),
            ("embed.pub_contribute_title", "Contribute coverage"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<h4>{eng_text}</h4>", f"<h4>{translated}</h4>")

        # Publisher card items
        pub_items = {
            "embed.pub_embed_item1": "Use the configurator above to generate embed code for any format.",
            "embed.pub_embed_item2": 'Paste into your CMS (WordPress, Ghost, Squarespace, etc.) &mdash; most support raw HTML blocks.',
            "embed.pub_embed_item3": "The embeds are responsive and work on mobile.",
            "embed.pub_embed_item4": "No API key or account needed.",
            "embed.pub_link_item1": 'Add a "Plan your commute" link box to your Portal Bridge stories.',
            "embed.pub_link_item2": "Link to specific tools based on what the article covers.",
            "embed.pub_link_item3": "OG images and social cards are already set up for clean previews.",
            "embed.pub_link_item4": 'Suggested anchor text: "Use the free Reroute NJ tool to plan your commute."',
            "embed.pub_contribute_item1": 'We curate Portal Bridge coverage on our <a href="coverage.html">news coverage page</a>.',
            "embed.pub_contribute_item2": 'To suggest an article, <a href="https://github.com/jamditis/reroute-nj/issues/new?template=article-suggestion.md" target="_blank" rel="noopener">open a GitHub issue</a>.',
            "embed.pub_contribute_item3": 'Or email <strong><a href="mailto:amditisj@montclair.edu">amditisj@montclair.edu</a></strong> with "Reroute NJ coverage" in the subject.',
            "embed.pub_contribute_item4": "We include all relevant coverage &mdash; opinion, analysis, community reporting, and more.",
        }
        for key, eng_text in pub_items.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")

        # Co-branding section
        brand_intro = get_translation(translations, "embed.branding_intro")
        if brand_intro:
            html = html.replace(
                "Want to run Reroute NJ with your own branding? Since it's open source, you can.",
                brand_intro
            )
            html = html.replace(
                "Want to run Reroute NJ with your own branding? Since it&#x27;s open source, you can.",
                brand_intro
            )

        # Fork section heading
        fork_title = get_translation(translations, "embed.fork_title")
        if fork_title:
            html = html.replace("<h3>Fork the project</h3>", f"<h3>{fork_title}</h3>")

        # Fork steps
        fork_steps = {
            "embed.fork_step1": 'Fork the <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">GitHub repository</a> to your organization\'s account.',
            "embed.fork_step2": 'Edit <code>css/styles.css</code> to change colors, fonts, and branding. All theme values are CSS custom properties in the <code>:root</code> block.',
            "embed.fork_step3": 'Replace the brand name, logo, and footer credit with your own.',
            "embed.fork_step4": 'Deploy to GitHub Pages, Netlify, Vercel, or your own server. No build step required.',
        }
        for key, eng_text in fork_steps.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<p>{eng_text}</p>", f"<p>{translated}</p>")
                eng_entity = eng_text.replace("'", "&#x27;")
                html = html.replace(f"<p>{eng_entity}</p>", f"<p>{translated}</p>")

        # Contribute section
        contribute_intro = get_translation(translations, "embed.contribute_intro")
        if contribute_intro:
            html = html.replace(
                "Reroute NJ is a community project. Here's how you can help.",
                contribute_intro
            )
            html = html.replace(
                "Reroute NJ is a community project. Here&#x27;s how you can help.",
                contribute_intro
            )

        # Contribute card headings
        for key, eng_text in [
            ("embed.nontechnical_title", "Non-technical contributions"),
            ("embed.technical_title", "Technical contributions"),
            ("embed.license_title", "License"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<h4>{eng_text}</h4>", f"<h4>{translated}</h4>")

        # Contribute card items
        contribute_items = {
            "embed.nontechnical_item1": '<strong>Submit article suggestions:</strong> Know of a Portal Bridge article we missed? <a href="https://github.com/jamditis/reroute-nj/issues/new?template=article-suggestion.md" target="_blank" rel="noopener">Open an issue</a> or email joe@amditis.com.',
            "embed.nontechnical_item2": '<strong>Report inaccuracies:</strong> If schedule data or transfer times are wrong, let us know.',
            "embed.nontechnical_item3": '<strong>Share the tool:</strong> Tell your commuter friends, share on social media, post in your neighborhood group.',
            "embed.technical_item1": '<strong>File bugs:</strong> Found a bug? <a href="https://github.com/jamditis/reroute-nj/issues" target="_blank" rel="noopener">Open an issue on GitHub</a>.',
            "embed.technical_item2": '<strong>Submit a pull request:</strong> The codebase is vanilla HTML/CSS/JS with no build step. Fork, change, PR.',
            "embed.technical_item3": '<strong>Add data:</strong> Help us keep <code>data/coverage.json</code> up to date with new articles.',
            "embed.technical_item4": '<strong>Improve accessibility:</strong> Screen reader testing, WCAG compliance, keyboard navigation.',
            "embed.license_item1": 'Reroute NJ is released under the <strong>MIT License</strong>.',
            "embed.license_item2": 'You can use, copy, modify, and distribute it freely.',
            "embed.license_item3": 'Attribution is appreciated but not required.',
            "embed.license_item4": 'The project is maintained by <a href="https://github.com/jamditis" target="_blank" rel="noopener">Joe Amditis</a>.',
        }
        for key, eng_text in contribute_items.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")

    elif page_key == "blog":
        # Blog index page
        heading = get_translation(translations, "blog.heading")
        if heading:
            html = html.replace(">Blog</h1>", f">{heading}</h1>")

        index_tagline = get_translation(translations, "blog.index_tagline")
        if index_tagline:
            html = html.replace(
                ">Updates and stories from the Reroute NJ project</p>",
                f">{index_tagline}</p>"
            )

        # Post card
        post1_title = get_translation(translations, "blog.post1_title")
        if post1_title:
            html = html.replace(">Why we built Reroute NJ</h2>", f">{post1_title}</h2>")

        post1_date = get_translation(translations, "blog.post1_date")
        if post1_date:
            html = html.replace(">February 12, 2026</time>", f">{post1_date}</time>")

        post1_excerpt = get_translation(translations, "blog.post1_excerpt")
        if post1_excerpt:
            html = html.replace(
                '>Five free tools in 11 languages to help NJ Transit riders navigate the Portal Bridge cutover. Here&#x27;s why we built it and how you can help.</p>',
                f'>{post1_excerpt}</p>'
            )
            html = html.replace(
                ">Five free tools in 11 languages to help NJ Transit riders navigate the Portal Bridge cutover. Here's why we built it and how you can help.</p>",
                f'>{post1_excerpt}</p>'
            )

        read_more = get_translation(translations, "blog.read_more")
        if read_more:
            html = html.replace(
                '>Read more &rarr;</span>',
                f'>{read_more.replace("→", "&rarr;")}</span>'
            )

        # Post 2 card (embed system post)
        post2_title = get_translation(translations, "blog.post2_title")
        if post2_title:
            html = html.replace(">New: Embed Reroute NJ on your website</h2>", f">{post2_title}</h2>")

        post2_date = get_translation(translations, "blog.post2_date")
        if post2_date:
            html = html.replace(">February 13, 2026</time>", f">{post2_date}</time>")

        post2_excerpt = get_translation(translations, "blog.post2_excerpt")
        if post2_excerpt:
            html = html.replace(
                ">Newsrooms and publishers can now embed Reroute NJ tools directly on their websites. Four embed formats, a visual configurator, and PNG export — all free.</p>",
                f'>{post2_excerpt}</p>'
            )
            html = html.replace(
                ">Newsrooms and publishers can now embed Reroute NJ tools directly on their websites. Four embed formats, a visual configurator, and PNG export &#x2014; all free.</p>",
                f'>{post2_excerpt}</p>'
            )

        # Post 3 card (cutover begins post)
        post3_title = get_translation(translations, "blog.post3_title")
        if post3_title:
            html = html.replace(">The cutover starts today</h2>", f">{post3_title}</h2>")

        post3_date = get_translation(translations, "blog.post3_date")
        if post3_date:
            html = html.replace(">February 15, 2026</time>", f">{post3_date}</time>")

        post3_excerpt = get_translation(translations, "blog.post3_excerpt")
        if post3_excerpt:
            html = html.replace(
                ">The Portal North Bridge cutover starts today. Here's what NJ Transit riders need to know and how Reroute NJ can help for the next four weeks.</p>",
                f'>{post3_excerpt}</p>'
            )
            html = html.replace(
                ">The Portal North Bridge cutover starts today. Here&#x27;s what NJ Transit riders need to know and how Reroute NJ can help for the next four weeks.</p>",
                f'>{post3_excerpt}</p>'
            )

    elif page_key == "blog_post":
        # Blog post: "Why we built Reroute NJ"
        # Back/footer nav links
        all_posts = get_translation(translations, "blog.all_posts")
        if all_posts:
            html = html.replace(">&larr; All posts</a>", f">&larr; {all_posts}</a>")
        back_all = get_translation(translations, "blog.back_to_all_posts")
        if back_all:
            html = html.replace(">&larr; Back to all posts</a>", f">&larr; {back_all}</a>")

        heading = get_translation(translations, "blog_post.heading")
        if heading:
            html = html.replace(">Why we built Reroute NJ</h1>", f">{heading}</h1>")

        # Author prefix
        by_prefix = get_translation(translations, "blog_post.by_prefix")
        if by_prefix:
            html = html.replace(">By Joe Amditis</span>", f">{by_prefix} Joe Amditis</span>")

        # Date
        date = get_translation(translations, "blog_post.date")
        if date:
            html = html.replace(">February 12, 2026</time>", f">{date}</time>")

        # Intro paragraphs
        intro_p1 = get_translation(translations, "blog_post.intro_p1")
        if intro_p1:
            html = html.replace(
                "<p>On February 15, NJ Transit is implementing the largest service disruption in its history. For four weeks, as Amtrak connects the new Portal North Bridge to the Northeast Corridor, every rail line except the Atlantic City Rail Line will be affected. Roughly half of all trains between New Jersey and New York will be cut.</p>",
                f"<p>{intro_p1}</p>"
            )

        intro_p2 = get_translation(translations, "blog_post.intro_p2")
        if intro_p2:
            html = html.replace(
                "<p>Hundreds of thousands of commuters need to figure out, in a short time, how their daily routine changes. The official resources don&#x27;t always give you the clear, personalized answer you need at 6:30 in the morning when you&#x27;re trying to get to work.</p>",
                f"<p>{intro_p2}</p>"
            )
            # Also try with literal apostrophes
            html = html.replace(
                "<p>Hundreds of thousands of commuters need to figure out, in a short time, how their daily routine changes. The official resources don't always give you the clear, personalized answer you need at 6:30 in the morning when you're trying to get to work.</p>",
                f"<p>{intro_p2}</p>"
            )

        intro_p3 = get_translation(translations, "blog_post.intro_p3")
        if intro_p3:
            html = html.replace(
                "<p>Reroute NJ is an attempt to help.</p>",
                f"<p>{intro_p3}</p>"
            )

        # Section headings
        for key, eng_text in [
            ("blog_post.h2_tools", "Five tools, eleven languages"),
            ("blog_post.h2_built", "Why it&#x27;s built the way it is"),
            ("blog_post.h2_newsrooms", "For newsrooms and publishers"),
            ("blog_post.h2_help", "How you can help"),
            ("blog_post.h2_bigger", "The bigger picture"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}<", f">{translated}<")
        # Also try with literal apostrophe for "Why it's built..."
        h2_built = get_translation(translations, "blog_post.h2_built")
        if h2_built:
            html = html.replace(">Why it's built the way it is<", f">{h2_built}<")

        # Tools intro
        tools_intro = get_translation(translations, "blog_post.tools_intro")
        if tools_intro:
            html = html.replace(
                "<p>We built five interactive tools that help riders answer the questions they're asking:</p>",
                f"<p>{tools_intro}</p>"
            )
            html = html.replace(
                "<p>We built five interactive tools that help riders answer the questions they&#x27;re asking:</p>",
                f"<p>{tools_intro}</p>"
            )

        # Tool description paragraphs
        tool_items = {
            "blog_post.tool_line_guide": '<strong><a href="../index.html">Line guide</a></strong> &mdash; Select your NJ Transit line and station to see exactly how your commute changes, what alternative routes are available, and what tickets you need. Works for both directions: morning commuters heading into NYC and evening commuters heading home.',
            "blog_post.tool_compare": '<strong><a href="../compare.html">Commute comparison</a></strong> &mdash; Pick your NJ station and your Manhattan destination, and see every route option side by side with visual time breakdowns. PATH vs. ferry vs. bus, ranked by total travel time, with cost and transfer details.',
            "blog_post.tool_coverage": '<strong><a href="../coverage.html">News coverage</a></strong> &mdash; Curated reporting about the cutover from more than a dozen regional news sources. Filter by source, line, direction, or category.',
            "blog_post.tool_map": '<strong><a href="../map.html">Interactive map</a></strong> &mdash; All five affected NJ Transit lines rendered on a map with station markers, key transfer points (Hoboken Terminal, Secaucus Junction, Newark Penn), and the Portal Bridge location over the Hackensack River.',
            "blog_post.tool_embed": '<strong><a href="../embed.html">Embed and share</a></strong> &mdash; Iframe embed codes, direct links, and instructions for newsrooms and publishers who want to republish any of these tools on their own sites.',
        }
        for key, eng_text in tool_items.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<p>{eng_text}</p>", f"<p>{translated}</p>")

        # Tools languages paragraph
        tools_languages = get_translation(translations, "blog_post.tools_languages")
        if tools_languages:
            html = html.replace(
                "<p>Every tool page is available in 11 languages: English, Spanish, Chinese, Tagalog, Korean, Portuguese, Gujarati, Hindi, Italian, Arabic, and Polish. These aren&#x27;t machine-translated afterthoughts &mdash; each language has its own set of pages with translated navigation, labels, descriptions, and metadata. Station names, line names, and place names stay in English because that&#x27;s what&#x27;s on the signs.</p>",
                f"<p>{tools_languages}</p>"
            )
            html = html.replace(
                "<p>Every tool page is available in 11 languages: English, Spanish, Chinese, Tagalog, Korean, Portuguese, Gujarati, Hindi, Italian, Arabic, and Polish. These aren't machine-translated afterthoughts &mdash; each language has its own set of pages with translated navigation, labels, descriptions, and metadata. Station names, line names, and place names stay in English because that's what's on the signs.</p>",
                f"<p>{tools_languages}</p>"
            )

        # "Why it's built" paragraphs
        built_p1 = get_translation(translations, "blog_post.built_p1")
        if built_p1:
            html = html.replace(
                "<p>Reroute NJ is a zero-build static site. Plain HTML, CSS, and JavaScript. No frameworks, no npm, no build step. You can fork the repo, edit a file, and deploy it on GitHub Pages in minutes.</p>",
                f"<p>{built_p1}</p>"
            )

        built_p2 = get_translation(translations, "blog_post.built_p2")
        if built_p2:
            html = html.replace(
                "<p>We wanted the project to be accessible to anyone who might want to contribute &mdash; journalists who can add articles to the coverage feed, community members who can report inaccuracies, and developers who can add features. Lowering the barrier to contribution matters more than using the latest technology.</p>",
                f"<p>{built_p2}</p>"
            )

        built_p3 = get_translation(translations, "blog_post.built_p3")
        if built_p3:
            html = html.replace(
                "<p>Everything is client-side. No server, no database, no API keys. The data is bundled as JSON and JavaScript objects. The site is fast and works even if GitHub&#x27;s servers are under load.</p>",
                f"<p>{built_p3}</p>"
            )
            html = html.replace(
                "<p>Everything is client-side. No server, no database, no API keys. The data is bundled as JSON and JavaScript objects. The site is fast and works even if GitHub's servers are under load.</p>",
                f"<p>{built_p3}</p>"
            )

        # Newsrooms section
        newsrooms_intro = get_translation(translations, "blog_post.newsrooms_intro")
        if newsrooms_intro:
            html = html.replace(
                "<p>We built Reroute NJ to be shared, embedded, and republished. If you run a local news site, a community blog, or a transit advocacy page, we want you to use these tools.</p>",
                f"<p>{newsrooms_intro}</p>"
            )

        newsrooms_items = {
            "blog_post.newsrooms_item1": '<strong>Embed any tool</strong> on your website using our <a href="../embed.html">embed code generator</a>. Copy and paste an iframe.',
            "blog_post.newsrooms_item2": '<strong>Link to the tools</strong> from your Portal Bridge coverage. The URLs are permanent and have social meta tags for clean previews.',
            "blog_post.newsrooms_item3": '<strong>Fork the project</strong> and run your own branded version. The <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">code is MIT-licensed</a>. Change the colors, add your logo, deploy it on your own domain.',
            "blog_post.newsrooms_item4": '<strong>Add your coverage</strong> to our <a href="../coverage.html">news feed</a>. <a href="https://github.com/jamditis/reroute-nj/issues/new" target="_blank" rel="noopener">Open a GitHub issue</a> or email <a href="mailto:amditisj@montclair.edu">amditisj@montclair.edu</a> with your article links.',
        }
        for key, eng_text in newsrooms_items.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")

        newsrooms_outro = get_translation(translations, "blog_post.newsrooms_outro")
        if newsrooms_outro:
            html = html.replace(
                "<p>We&#x27;re interested in hearing from local publishers and community news outlets who serve the specific towns affected by the cutover. Your local coverage is what riders need, and we want to help get it in front of them.</p>",
                f"<p>{newsrooms_outro}</p>"
            )
            html = html.replace(
                "<p>We're interested in hearing from local publishers and community news outlets who serve the specific towns affected by the cutover. Your local coverage is what riders need, and we want to help get it in front of them.</p>",
                f"<p>{newsrooms_outro}</p>"
            )

        # How you can help section
        help_intro = get_translation(translations, "blog_post.help_intro")
        if help_intro:
            html = html.replace(
                "<p>This is a community project and we need community help:</p>",
                f"<p>{help_intro}</p>"
            )

        help_items = {
            "blog_post.help_item1": '<strong>Share the tool.</strong> Text it to your train friends. Post it in your town\'s Facebook group. The more people who know about it, the better it works.',
            "blog_post.help_item2": '<strong>Report inaccuracies.</strong> If a travel time estimate is wrong, or a schedule change isn\'t reflected, <a href="https://github.com/jamditis/reroute-nj/issues" target="_blank" rel="noopener">let us know</a>.',
            "blog_post.help_item3": '<strong>Suggest articles.</strong> Found good Portal Bridge coverage we haven\'t listed? <a href="https://github.com/jamditis/reroute-nj/issues/new" target="_blank" rel="noopener">Submit it</a>.',
            "blog_post.help_item4": '<strong>Contribute code.</strong> The <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">GitHub repo</a> is open. No build step, no framework knowledge required. If you can edit HTML, you can contribute.',
            "blog_post.help_item5": '<strong>Help with accessibility.</strong> We want the tool to work for everyone. Screen reader testing, keyboard navigation improvements, and WCAG compliance review are all welcome.',
        }
        for key, eng_text in help_items.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")
                # Also try with HTML entity apostrophes
                eng_entity = eng_text.replace("'", "&#x27;")
                html = html.replace(f"<li>{eng_entity}</li>", f"<li>{translated}</li>")

        # The bigger picture paragraphs
        bigger_p1 = get_translation(translations, "blog_post.bigger_p1")
        if bigger_p1:
            html = html.replace(
                "<p>The Portal Bridge cutover is painful, but it&#x27;s a good thing. The 115-year-old Portal Bridge has been the worst bottleneck on the Northeast Corridor for decades. Every time it gets stuck opening for boat traffic, cascading delays affect hundreds of thousands of riders. The new Portal North Bridge eliminates that problem.</p>",
                f"<p>{bigger_p1}</p>"
            )
            html = html.replace(
                "<p>The Portal Bridge cutover is painful, but it's a good thing. The 115-year-old Portal Bridge has been the worst bottleneck on the Northeast Corridor for decades. Every time it gets stuck opening for boat traffic, cascading delays affect hundreds of thousands of riders. The new Portal North Bridge eliminates that problem.</p>",
                f"<p>{bigger_p1}</p>"
            )

        bigger_p2 = get_translation(translations, "blog_post.bigger_p2")
        if bigger_p2:
            html = html.replace(
                "<p>This four-week disruption is the price of progress. When Phase 2 comes in the fall of 2026, we&#x27;ll update Reroute NJ to cover that, too.</p>",
                f"<p>{bigger_p2}</p>"
            )
            html = html.replace(
                "<p>This four-week disruption is the price of progress. When Phase 2 comes in the fall of 2026, we'll update Reroute NJ to cover that, too.</p>",
                f"<p>{bigger_p2}</p>"
            )

        bigger_p3 = get_translation(translations, "blog_post.bigger_p3")
        if bigger_p3:
            html = html.replace(
                "<p>In the meantime, we hope these tools make the next month a little easier to navigate. Plan ahead, be patient with each other on the platforms, and remember: this is temporary.</p>",
                f"<p>{bigger_p3}</p>"
            )

        # CTA button
        cta = get_translation(translations, "blog_post.cta")
        if cta:
            html = html.replace(
                '>Plan your commute &rarr;</a>',
                f'>{cta.replace("→", "&rarr;")}</a>'
            )

    elif page_key == "blog_post_cutover":
        # Blog post: "The cutover starts today"
        # Back/footer nav links
        all_posts = get_translation(translations, "blog.all_posts")
        if all_posts:
            html = html.replace(">&larr; All posts</a>", f">&larr; {all_posts}</a>")
        back_all = get_translation(translations, "blog.back_to_all_posts")
        if back_all:
            html = html.replace(">&larr; Back to all posts</a>", f">&larr; {back_all}</a>")

        heading = get_translation(translations, "blog_post_cutover.heading")
        if heading:
            html = html.replace(">The cutover starts today</h1>", f">{heading}</h1>")

        by_prefix = get_translation(translations, "blog_post_cutover.by_prefix")
        if by_prefix:
            html = html.replace(">By Joe Amditis</span>", f">{by_prefix} Joe Amditis</span>")

        date = get_translation(translations, "blog_post_cutover.date")
        if date:
            html = html.replace(">February 15, 2026</time>", f">{date}</time>")

        # Intro paragraphs
        intro_p1 = get_translation(translations, "blog_post_cutover.intro_p1")
        if intro_p1:
            html = html.replace(
                "<p>The Portal North Bridge cutover is happening. Starting today, February 15, Amtrak is connecting the new bridge to the Northeast Corridor, and NJ Transit service will be disrupted for four weeks. Every rail line except the Atlantic City Rail Line is affected.</p>",
                f"<p>{intro_p1}</p>"
            )

        intro_p2 = get_translation(translations, "blog_post_cutover.intro_p2")
        if intro_p2:
            html = html.replace(
                "<p>If you ride NJ Transit into New York, your commute changes today. This post covers what you need to know and how Reroute NJ can help you figure out the specifics.</p>",
                f"<p>{intro_p2}</p>"
            )

        # Section headings
        for key, eng_text in [
            ("blog_post_cutover.h2_need_to_know", "What you need to know"),
            ("blog_post_cutover.h2_how_helps", "How Reroute NJ helps"),
            ("blog_post_cutover.h2_languages", "Available in 11 languages"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<h2>{eng_text}</h2>", f"<h2>{translated}</h2>")

        # Need to know paragraph
        need_to_know_p = get_translation(translations, "blog_post_cutover.need_to_know_p")
        if need_to_know_p:
            html = html.replace(
                "<p>The cutover runs from February 15 through March 15, 2026. During this period, roughly half of all NJ Transit trains between New Jersey and New York Penn Station will be cut. The impact depends on your line:</p>",
                f"<p>{need_to_know_p}</p>"
            )

        # Need to know list items
        ntk_items = {
            "blog_post_cutover.ntk_hoboken": '<strong>Montclair-Boonton and Morris &amp; Essex lines</strong> are diverted to Hoboken Terminal instead of New York Penn Station. From Hoboken, you transfer to PATH, ferry, or bus to reach Manhattan.',
            "blog_post_cutover.ntk_reduced": '<strong>Northeast Corridor and North Jersey Coast Line</strong> continue to New York Penn Station but with reduced frequency. Fewer trains, longer waits.',
            "blog_post_cutover.ntk_newark": '<strong>Raritan Valley Line</strong> loses all one-seat rides to Penn Station. Trains terminate at Newark Penn Station. Transfer to Northeast Corridor or PATH from there.',
        }
        for key, eng_text in ntk_items.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")

        # How helps intro
        how_helps_intro = get_translation(translations, "blog_post_cutover.how_helps_intro")
        if how_helps_intro:
            html = html.replace(
                "<p>We built five tools to help you navigate the next four weeks:</p>",
                f"<p>{how_helps_intro}</p>"
            )

        # Tool description paragraphs
        tool_items = {
            "blog_post_cutover.tool_line_guide": '<strong><a href="../index.html">Line guide</a></strong> &mdash; Select your line and station to see exactly how your commute changes, what alternative routes are available, and what tickets you need.',
            "blog_post_cutover.tool_compare": '<strong><a href="../compare.html">Commute comparison</a></strong> &mdash; Pick your NJ station and your Manhattan destination, then see every route option side by side with travel times, costs, and transfer details.',
            "blog_post_cutover.tool_coverage": '<strong><a href="../coverage.html">News coverage</a></strong> &mdash; Reporting about the cutover from local and regional news sources, updated throughout the day. Filter by source, line, or category.',
            "blog_post_cutover.tool_map": '<strong><a href="../map.html">Interactive map</a></strong> &mdash; All five affected lines rendered on a map with station markers, transfer points, and the Portal Bridge location.',
            "blog_post_cutover.tool_embed": '<strong><a href="../embed.html">Embed and share</a></strong> &mdash; Embed codes and tools for newsrooms and publishers who want to put these resources on their own sites.',
        }
        for key, eng_text in tool_items.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<p>{eng_text}</p>", f"<p>{translated}</p>")

        # Languages paragraph
        languages_p = get_translation(translations, "blog_post_cutover.languages_p")
        if languages_p:
            html = html.replace(
                "<p>Every page on Reroute NJ is available in English, Spanish, Chinese, Tagalog, Korean, Portuguese, Gujarati, Hindi, Italian, Arabic, and Polish. These are the most commonly spoken languages in New Jersey. Each language has its own complete set of translated pages with navigation, labels, descriptions, and metadata. Station names and line names stay in English because that's what's on the signs.</p>",
                f"<p>{languages_p}</p>"
            )
            html = html.replace(
                "<p>Every page on Reroute NJ is available in English, Spanish, Chinese, Tagalog, Korean, Portuguese, Gujarati, Hindi, Italian, Arabic, and Polish. These are the most commonly spoken languages in New Jersey. Each language has its own complete set of translated pages with navigation, labels, descriptions, and metadata. Station names and line names stay in English because that&#x27;s what&#x27;s on the signs.</p>",
                f"<p>{languages_p}</p>"
            )

        # Support note (deemphasized)
        support_p = get_translation(translations, "blog_post_cutover.support_p")
        if support_p:
            html = html.replace(
                '<p class="blog-support-note" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2rem;">Reroute NJ is free, open source, and community-supported. If you find it useful, share it with someone who rides NJ Transit or <a href="https://github.com/sponsors/jamditis" target="_blank" rel="noopener">support the project</a>.</p>',
                f'<p class="blog-support-note" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2rem;">{support_p}</p>'
            )

        # Closing paragraphs
        closing_p1 = get_translation(translations, "blog_post_cutover.closing_p1")
        if closing_p1:
            html = html.replace(
                "<p>This disruption is temporary. The new Portal North Bridge will replace a 115-year-old bottleneck that has caused cascading delays across the Northeast Corridor for decades. Four weeks of pain for years of better service.</p>",
                f"<p>{closing_p1}</p>"
            )

        closing_p2 = get_translation(translations, "blog_post_cutover.closing_p2")
        if closing_p2:
            html = html.replace(
                "<p>Plan ahead, leave early, and be patient with each other on the platforms. We'll get through it.</p>",
                f"<p>{closing_p2}</p>"
            )
            html = html.replace(
                "<p>Plan ahead, leave early, and be patient with each other on the platforms. We&#x27;ll get through it.</p>",
                f"<p>{closing_p2}</p>"
            )

        # CTA button
        cta = get_translation(translations, "blog_post_cutover.cta")
        if cta:
            html = html.replace(
                '>Plan your commute &rarr;</a>',
                f'>{cta.replace("→", "&rarr;")}</a>'
            )

    elif page_key == "blog_post_embed":
        # Blog post: "New: embed Reroute NJ on your website"
        # Back/footer nav links
        all_posts = get_translation(translations, "blog.all_posts")
        if all_posts:
            html = html.replace(">&larr; All posts</a>", f">&larr; {all_posts}</a>")
        back_all = get_translation(translations, "blog.back_to_all_posts")
        if back_all:
            html = html.replace(">&larr; Back to all posts</a>", f">&larr; {back_all}</a>")

        heading = get_translation(translations, "blog_post_embed.heading")
        if heading:
            html = html.replace(">New: Embed Reroute NJ on your website</h1>", f">{heading}</h1>")

        by_prefix = get_translation(translations, "blog_post_embed.by_prefix")
        if by_prefix:
            html = html.replace(">By Joe Amditis</span>", f">{by_prefix} Joe Amditis</span>")

        date = get_translation(translations, "blog_post_embed.date")
        if date:
            html = html.replace(">February 13, 2026</time>", f">{date}</time>")

        # Body paragraphs
        para_map = {
            "blog_post_embed.intro_p1": "The Portal Bridge cutover starts Saturday. If you cover transit in New Jersey &mdash; or if you run a community site, town Facebook page, or commuter forum &mdash; you can now put Reroute NJ tools directly on your website.",
            "blog_post_embed.intro_p2": "We just shipped a full embed system. Four output formats, a visual configurator that builds the embed code for you, and PNG export for social media and email newsletters. Everything is free to use.",
            "blog_post_embed.format_cards": '<strong>Info cards</strong> &mdash; Compact cards showing line impact, station details, or a full cutover summary. Drop one into an article sidebar or at the top of a liveblog. Three card types: line cards (one line\'s impact), station cards (one station\'s changes), and summary cards (all five lines at a glance).',
            "blog_post_embed.format_widgets": '<strong>Interactive widgets</strong> &mdash; Mini versions of the line guide, comparison tool, news feed, or map. These are live, working tools that readers can interact with inside your page. Pick a tool and it loads in an iframe sized to fit.',
            "blog_post_embed.format_full": '<strong>Full tool embeds</strong> &mdash; Any Reroute NJ page with the header and footer stripped out. Append <code>?embed=true</code> to any tool URL and it becomes embeddable. Good for dedicated cutover pages where you want to give readers the complete experience.',
            "blog_post_embed.format_script": '<strong>Script-tag embeds</strong> &mdash; A single <code>&lt;script&gt;</code> tag and a <code>&lt;div&gt;</code>. No iframe configuration needed. Add the div with data attributes for the embed type, line, and station, include the script, and it handles the rest. Works in CMSes where pasting iframe code is restricted.',
            "blog_post_embed.configurator_p1": 'The <a href="../embed.html">embed page</a> has a visual configurator that walks you through choosing your embed type, selecting the line and station, picking a theme (light or dark), and setting a custom accent color. It shows a live preview and gives you copy-paste code in all four formats.',
            "blog_post_embed.configurator_p2": 'For info cards, you also get a <strong>Download PNG</strong> button that renders the card to a high-fidelity image. The PNG export uses Canvas rendering (not a screenshot), so text stays sharp at any size. Use it in newsletters, tweets, or print handouts.',
            "blog_post_embed.configurator_p3": 'There\'s also a <strong>Download HTML</strong> option that gives you a self-contained file with all styles and data bundled in. No external dependencies, no network requests. Open it in a browser and it works offline.',
            "blog_post_embed.customization_intro": "Every embed supports two customization options:",
            "blog_post_embed.customization_outro": "Match the embed to your site\'s design without touching any code.",
            "blog_post_embed.newsrooms_p1": "We built this for you. The cutover will dominate transit coverage in the region for a month, and your readers need tools, not just articles. A line card in your sidebar tells a Montclair-Boonton commuter exactly what changes for them. A comparison widget lets a reader punch in their station and see every alternative route.",
            "blog_post_embed.newsrooms_p2": 'The embed codes work on WordPress, Squarespace, Ghost, Substack (with the script-tag format), and any platform that accepts HTML. If you run into trouble embedding on your specific platform, <a href="https://github.com/jamditis/reroute-nj/issues/new" target="_blank" rel="noopener">open an issue</a> or email <a href="mailto:amditisj@montclair.edu">amditisj@montclair.edu</a> and we\'ll help.',
            "blog_post_embed.newsrooms_p3": 'Everything is MIT-licensed. No attribution required, though we appreciate a link back to <a href="https://reroutenj.org">reroutenj.org</a>.',
            "blog_post_embed.whatelse_intro": "Along with the embed system, this release includes:",
            "blog_post_embed.tryit_p1": 'Go to the <a href="../embed.html">embed configurator</a>, pick a format, and copy the code. It takes about 30 seconds.',
            "blog_post_embed.tryit_p2": 'If you embed Reroute NJ on your site, we\'d like to know about it. Drop us a line at <a href="mailto:amditisj@montclair.edu">amditisj@montclair.edu</a> &mdash; we\'ll add your site to our <a href="../coverage.html">coverage page</a>.',
        }
        for key, eng_text in para_map.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<p>{eng_text}</p>", f"<p>{translated}</p>")

        # H2 headings
        h2_map = [
            ("blog_post_embed.h2_formats", "Four ways to embed"),
            ("blog_post_embed.h2_configurator", "The configurator"),
            ("blog_post_embed.h2_customization", "Customization"),
            ("blog_post_embed.h2_newsrooms", "For newsrooms"),
            ("blog_post_embed.h2_whatelse", "What else is new"),
            ("blog_post_embed.h2_tryit", "Try it"),
        ]
        for key, eng_text in h2_map:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<h2>{eng_text}</h2>", f"<h2>{translated}</h2>")

        # List items
        li_map = {
            "blog_post_embed.customization_theme": '<strong>Theme</strong> &mdash; Light or dark. Append <code>&amp;theme=dark</code> to any embed URL or set <code>data-theme="dark"</code> on the script-tag div.',
            "blog_post_embed.customization_accent": '<strong>Accent color</strong> &mdash; Any hex color. Append <code>&amp;accent=FF6B35</code> or set <code>data-accent="FF6B35"</code>. The accent applies to CTA buttons and color highlights.',
            "blog_post_embed.whatelse_blog": "<strong>Blog in all 11 languages</strong> &mdash; Blog posts are now translated alongside the rest of the site. The blog has its own index page with a proper post structure.",
            "blog_post_embed.whatelse_seo": '<strong>SEO and AI search optimization</strong> &mdash; Structured data (JSON-LD), full hreflang cross-references, <code>robots.txt</code> with AI bot guidance, <code>llms.txt</code> for AI search engines, and <code>sitemap.xml</code> covering all 79 pages.',
            "blog_post_embed.whatelse_html": "<strong>Self-contained HTML downloads</strong> &mdash; Export any info card as a standalone HTML file that works without an internet connection.",
        }
        for key, eng_text in li_map.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")

        # CTA button
        cta = get_translation(translations, "blog_post_embed.cta")
        if cta:
            html = html.replace(
                '>Try the embed configurator &rarr;</a>',
                f'>{cta.replace("→", "&rarr;")}</a>'
            )

    elif page_key == "about":
        # About / methodology page
        heading = get_translation(translations, "about.heading")
        if heading:
            html = html.replace(">About our methodology</h1>", f">{heading}</h1>")

        intro = get_translation(translations, "about.intro")
        if intro:
            html = html.replace(
                "Reroute NJ gives commuters specific guidance: which train to take, which ticket to buy, where to transfer. That information has to be right. People depend on it to get to work on time. Our approach prioritizes accuracy and accessibility over everything else.",
                intro
            )

        # H2 headings
        h2_map = [
            ("about.h2_translations", "How we produce translations"),
            ("about.h2_verification", "How we verify transit data"),
            ("about.h2_accessibility", "Our accessibility standards"),
            ("about.h2_philosophy", "Why we built it this way"),
            ("about.h2_mistakes", "What we get wrong"),
        ]
        for key, eng_text in h2_map:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<h2>{eng_text}</h2>", f"<h2>{translated}</h2>")

        # Body paragraphs
        para_map = {
            "about.translations_p1": 'Every tool on this site is available in 11 languages: English, Spanish, Chinese, Tagalog, Korean, Portuguese, Gujarati, Hindi, Italian, Arabic, and Polish. These languages were chosen because they are the most commonly spoken languages in New Jersey according to U.S. Census data.',
            "about.translations_p2": 'Translations are produced with the help of AI language models and reviewed for natural phrasing and accuracy. Each language gets its own complete set of HTML pages with translated navigation, labels, headings, descriptions, accessibility text, and metadata. This is not a browser auto-translate overlay &mdash; every translated page is a standalone document that works without JavaScript if necessary.',
            "about.translations_rules": "We follow specific rules about what gets translated and what doesn't:",
            "about.translations_fidelity": 'This is a deliberate choice: fidelity to what riders actually see and hear at the station matters more than linguistic consistency. A Spanish-speaking commuter looking at their phone needs to read "Tome el tren a Hoboken Terminal" &mdash; not "Tome el tren a Terminal de Hoboken" &mdash; because the sign above the platform says "Hoboken Terminal."',
            "about.verification_p1": 'Every claim on this site &mdash; train counts, schedule changes, fare information, transfer directions &mdash; is traceable to an official source. We maintain a <a href="https://github.com/jamditis/reroute-nj/blob/main/data/sources.json" target="_blank" rel="noopener">citation database</a> linking 28 specific claims to the official NJ Transit, Amtrak, PATH, and NY Waterway pages they come from.',
            "about.verification_intro": "Our verification process:",
            "about.accessibility_p1": 'Accessibility is not a feature we added &mdash; it\'s a constraint we designed around. The site meets WCAG 2.1 AA, the international standard for web accessibility.',
            "about.accessibility_intro": "What that means in practice:",
            "about.philosophy_p1": "Reroute NJ is a plain HTML, CSS, and JavaScript site. No frameworks, no build step, no server, no database. This isn't a technology preference &mdash; it's a reliability decision.",
            "about.philosophy_p2": "During the cutover, hundreds of thousands of commuters will need this information at peak hours. A static site served from a CDN handles traffic spikes without breaking. It works on old phones, slow connections, and every browser. There's no server to go down, no API to rate-limit, no dependency to break.",
            "about.philosophy_p3": "The tools are designed for someone checking their phone at 6:30 in the morning, standing on a platform, trying to figure out if their train still runs. That person needs a clear answer fast. They don't need animations, loading spinners, or a signup form. Every design decision starts from that scenario.",
            "about.mistakes_p1": "We make mistakes. When we find them, we fix them and document the change. A few things to know:",
            "about.mistakes_p2": 'This is an independent project. We are not affiliated with NJ Transit, Amtrak, or any government agency. Always verify critical travel information at <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com</a> before traveling.',
        }
        for key, eng_text in para_map.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<p>{eng_text}</p>", f"<p>{translated}</p>")

        # List items
        li_map = {
            "about.li_stations": "<strong>Station names stay in English.</strong> \"Secaucus Junction\" is what's on the platform sign. Translating it would make it harder to find your train, not easier.",
            "about.li_lines": '<strong>Line names stay in English.</strong> "Northeast Corridor" and "Montclair-Boonton Line" are official NJ Transit designations. They appear in English on every schedule, app, and sign.',
            "about.li_places": '<strong>Place names stay in English.</strong> "Hoboken Terminal," "Penn Station New York," and "Port Authority" are proper nouns. Riders need to match what they see to what they read.',
            "about.li_everything_else": "<strong>Everything else is translated.</strong> Instructions, descriptions, labels, navigation, button text, accessibility announcements, error messages, and page metadata are all translated into each language.",
            "about.li_official_sources": '<strong>Official sources first.</strong> Train counts, diversions, cross-honoring policies, and fare information come from <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com/portalcutover</a> and official NJ Transit press releases. We do not use secondhand reporting as a primary source for transit data.',
            "about.li_automated_validation": "<strong>Automated validation.</strong> We run 698+ automated checks across 14 test suites that verify data structure, transit facts, cross-references between pages, HTML integrity, translation completeness, and accessibility compliance. These tests run before every change is published.",
            "about.li_automated_monitoring": "<strong>Automated monitoring.</strong> A scraper checks official NJ Transit and Amtrak pages four times a day for schedule or policy changes. When content changes, we review and update the site.",
            "about.li_source_attribution": "<strong>Source attribution on every page.</strong> Each line guide card and commute comparison result includes links to the official sources backing its claims, so riders can verify for themselves.",
            "about.li_open_source": '<strong>Open source.</strong> The entire codebase, all data files, and all test suites are <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">public on GitHub</a>. Anyone can inspect, challenge, or correct the data.',
            "about.li_high_contrast": "<strong>High contrast mode.</strong> A toggle on every page switches to a high-contrast color scheme for riders with low vision. The setting persists across pages.",
            "about.li_simplified": "<strong>Simplified view.</strong> Strips decorative elements to reduce visual noise for riders who need fewer distractions.",
            "about.li_keyboard": "<strong>Keyboard navigation.</strong> Every control is reachable by keyboard. Focus indicators are visible. The tab order follows the visual layout.",
            "about.li_screenreader": "<strong>Screen reader support.</strong> ARIA labels, roles, and live regions let screen readers announce content changes. Skip-to-content links on every page.",
            "about.li_touch": "<strong>Touch targets.</strong> All buttons and controls are at least 44 pixels on mobile &mdash; large enough to tap accurately on a bumpy train.",
            "about.li_rtl": "<strong>Right-to-left support.</strong> The Arabic translation renders with proper right-to-left layout, text direction, and mirrored navigation.",
            "about.li_print": "<strong>Print stylesheets.</strong> Every page prints cleanly for riders who want a paper backup.",
            "about.li_travel_times": '<strong>Travel time estimates are approximations.</strong> We use published schedules and average travel times, not live data. Actual times will vary, especially during the cutover when the system is under stress.',
            "about.li_schedules_change": "<strong>Schedules change.</strong> NJ Transit may adjust service during the cutover based on ridership patterns. We monitor for changes four times a day, but there may be a delay between an official update and our site reflecting it.",
            "about.li_translation_errors": '<strong>Translations may have errors.</strong> While we work to make translations natural and accurate, we rely on AI-assisted translation. If you find an error in any language, please <a href="https://github.com/jamditis/reroute-nj/issues/new" target="_blank" rel="noopener">report it</a> and we\'ll fix it.',
        }
        for key, eng_text in li_map.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")

        # CTA button
        cta = get_translation(translations, "about.cta")
        if cta:
            html = html.replace(
                '>Plan your commute &rarr;</a>',
                f'>{cta.replace("→", "&rarr;")}</a>'
            )

    return html


def translate_jsonld(html, translations, page_key, lang, page_name):
    """Translate JSON-LD structured data blocks for the target language.

    Finds each <script type="application/ld+json"> block, parses the JSON,
    translates fields based on @type, updates URLs with language prefix,
    and replaces the block in the HTML.
    """
    pattern = re.compile(
        r'(<script type="application/ld\+json">\s*)(.*?)(</script>)',
        re.DOTALL
    )

    def replace_block(match):
        prefix = match.group(1)
        raw_json = match.group(2)
        suffix = match.group(3)

        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError:
            return match.group(0)  # Leave malformed blocks untouched

        schema_type = data.get("@type", "")

        if schema_type == "WebSite":
            desc = get_translation(translations, "schema.site_description")
            if desc:
                data["description"] = desc

        elif schema_type == "FAQPage":
            entities = data.get("mainEntity", [])
            for i, entity in enumerate(entities):
                q_key = f"schema.faq_q{i + 1}"
                a_key = f"schema.faq_a{i + 1}"
                q = get_translation(translations, q_key)
                a = get_translation(translations, a_key)
                if q:
                    entity["name"] = q
                if a and "acceptedAnswer" in entity:
                    entity["acceptedAnswer"]["text"] = a

        elif schema_type == "BreadcrumbList":
            items = data.get("itemListElement", [])
            for item in items:
                pos = item.get("position", 0)
                if pos == 1:
                    # Home breadcrumb — URL stays as site root
                    continue
                if pos == 2:
                    # Second-level breadcrumb
                    if len(items) == 3:
                        # 3-level breadcrumb (blog posts): pos 2 is always "Blog"
                        bc = get_translation(translations, "schema.breadcrumb_blog")
                    else:
                        # 2-level breadcrumb: pos 2 is the page itself
                        bc = get_translation(translations, f"schema.breadcrumb_{page_key}")
                    if bc:
                        item["name"] = bc
                    # Update URL if present
                    if "item" in item:
                        item["item"] = item["item"].replace(
                            "https://reroutenj.org/",
                            f"https://reroutenj.org/{lang}/"
                        )
                elif pos == 3:
                    # Third-level breadcrumb (blog post title)
                    bc = get_translation(translations, f"schema.breadcrumb_{page_key}")
                    if bc:
                        item["name"] = bc

        elif schema_type == "CollectionPage":
            name = get_translation(translations, "schema.collection_name")
            desc = get_translation(translations, "schema.collection_description")
            if name:
                data["name"] = name
            if desc:
                data["description"] = desc
            # Update page URL
            if "url" in data:
                data["url"] = data["url"].replace(
                    "https://reroutenj.org/",
                    f"https://reroutenj.org/{lang}/"
                )
            # Translate item list entries
            main_entity = data.get("mainEntity", {})
            if main_entity.get("@type") == "ItemList":
                for item in main_entity.get("itemListElement", []):
                    item_key = f"schema.collection_item{item.get('position', 0)}"
                    item_name = get_translation(translations, item_key)
                    if item_name:
                        item["name"] = item_name
                    if "url" in item:
                        item["url"] = item["url"].replace(
                            "https://reroutenj.org/",
                            f"https://reroutenj.org/{lang}/"
                        )

        elif schema_type == "Article":
            # Determine which article (blog_post, blog_post_embed, or blog_post_cutover)
            if page_key == "blog_post":
                art_prefix = "article1"
            elif page_key == "blog_post_embed":
                art_prefix = "article2"
            elif page_key == "blog_post_cutover":
                art_prefix = "article3"
            else:
                art_prefix = None

            if art_prefix:
                headline = get_translation(translations, f"schema.{art_prefix}_headline")
                desc = get_translation(translations, f"schema.{art_prefix}_description")
                if headline:
                    data["headline"] = headline
                if desc:
                    data["description"] = desc
                # Update mainEntityOfPage URL
                mep = data.get("mainEntityOfPage", {})
                if "@id" in mep:
                    mep["@id"] = mep["@id"].replace(
                        "https://reroutenj.org/",
                        f"https://reroutenj.org/{lang}/"
                    )

        new_json = json.dumps(data, ensure_ascii=False, indent=4)
        return prefix + new_json + "\n  " + suffix

    return pattern.sub(replace_block, html)


def generate_page(page_name, lang, translations):
    """Generate a single translated page."""
    src_path = os.path.join(PROJECT_ROOT, page_name)
    with open(src_path, "r", encoding="utf-8") as f:
        html = f.read()

    page_key = PAGE_KEY_MAP.get(page_name, page_name.replace(".html", ""))
    direction = get_translation(translations, "meta.dir") or "ltr"

    # 1. Set language and direction
    html = set_html_lang(html, lang, direction)

    # 2. Fix asset paths for subdirectory
    html = fix_asset_paths(html, page_name)

    # 3. Replace common elements
    html = replace_skip_link(html, translations)
    html = replace_nav_links(html, translations)
    html = replace_hamburger_label(html, translations, page_key)
    html = replace_a11y_buttons(html, translations)
    html = replace_footer(html, translations, page_key)
    html = replace_tagline(html, translations, page_key)
    html = replace_title(html, translations, page_key)
    html = replace_meta(html, translations, page_key)
    html = replace_meta_description(html, translations, page_key)
    html = fix_og_url(html, lang, page_name)
    html = add_canonical(html, lang, page_name)

    # 4. Replace page-specific content
    html = replace_page_specific_content(html, translations, page_key)

    # 4.5. Translate JSON-LD structured data
    html = translate_jsonld(html, translations, page_key, lang, page_name)

    # 5. Inject translations for JS runtime
    html = inject_translations_script(html, translations, page_name)

    # 6. Add hreflang tags
    html = add_hreflang_tags(html, page_name)

    # 7. Write output
    out_path = os.path.join(PROJECT_ROOT, lang, page_name)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
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
