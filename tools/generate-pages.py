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
    }
    eng_map = {
        "index": "Line guide",
        "compare": "Commute comparison",
        "coverage": "News coverage",
        "map": "Map",
        "embed": "Embed &amp; share",
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

        # Embed generator section
        for key, eng_text in [
            ("embed.generator_title", "Embed code generator"),
            ("embed.direct_links_title", "Direct links"),
            ("embed.publishers_title", "For newsrooms &amp; publishers"),
            ("embed.branding_title", "Co-branding &amp; customization"),
            ("embed.contribute_title", "How to contribute"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                escaped = translated.replace("&", "&amp;")
                html = html.replace(f">{eng_text}<", f">{escaped}<")

        # Generator intro
        gen_intro = get_translation(translations, "embed.generator_intro")
        if gen_intro:
            html = html.replace(
                "Copy and paste an iframe embed code to put any Reroute NJ tool on your website. The tool is fully interactive and responsive inside the iframe.",
                gen_intro
            )

        # Generator form labels
        for key, eng_text in [
            ("embed.which_tool", "Which tool?"),
            ("embed.width_label", "Width"),
            ("embed.height_label", "Height"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}</label>", f">{translated}</label>")

        # Generator select options
        for key, eng_text in [
            ("embed.tool_line_guide", "Line guide"),
            ("embed.tool_compare", "Commute comparison"),
            ("embed.tool_coverage", "News coverage"),
            ("embed.tool_map", "Interactive map"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f">{eng_text}</option>", f">{translated}</option>")

        full_width = get_translation(translations, "embed.full_width")
        if full_width:
            html = html.replace(">Full width (100%)</option>", f">{full_width}</option>")

        # Embed code output
        embed_code_label = get_translation(translations, "embed.your_embed_code")
        if embed_code_label:
            html = html.replace(
                '>Your embed code</label>',
                f'>{embed_code_label}</label>'
            )
        copy_btn = get_translation(translations, "embed.copy_btn")
        if copy_btn:
            html = html.replace('>Copy embed code</button>', f'>{copy_btn}</button>')
        copied = get_translation(translations, "embed.copied")
        if copied:
            html = html.replace('>Copied!</span>', f'>{copied}</span>')

        # Direct links intro
        dl_intro = get_translation(translations, "embed.direct_links_intro")
        if dl_intro:
            html = html.replace(
                "Link directly to any tool. These URLs are permanent and shareable.",
                dl_intro
            )

        # Direct link labels (these are in <strong> tags within resource-link divs)
        for key, eng_text in [
            ("embed.link_line_guide", "Line guide"),
            ("embed.link_compare", "Commute comparison"),
            ("embed.link_coverage", "News coverage"),
            ("embed.link_map", "Interactive map"),
        ]:
            translated = get_translation(translations, key)
            if translated:
                # These are in the direct-links section, wrapped in <strong>
                # Since "Line guide" etc. also appear in select options and nav,
                # target the <strong> wrapper specifically
                html = html.replace(
                    f'<strong>{eng_text}</strong>\n          <span id="link-',
                    f'<strong>{translated}</strong>\n          <span id="link-'
                )

        # Publishers intro
        pub_intro = get_translation(translations, "embed.publishers_intro")
        if pub_intro:
            html = html.replace(
                "Reroute NJ is designed to be used by journalists, newsrooms, and community publishers. Here&#x27;s how you can use it.",
                pub_intro
            )
            html = html.replace(
                "Reroute NJ is designed to be used by journalists, newsrooms, and community publishers. Here's how you can use it.",
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
            "embed.pub_embed_item1": "Use the embed code generator above to get an iframe snippet.",
            "embed.pub_embed_item2": 'Paste it into your CMS (WordPress, Ghost, Squarespace, etc.) — most support raw HTML blocks.',
            "embed.pub_embed_item3": "The embed is responsive and works on mobile.",
            "embed.pub_embed_item4": "No API key or account needed. It just works.",
            "embed.pub_link_item1": 'Add a "Plan your commute" link box to your Portal Bridge stories.',
            "embed.pub_link_item2": "Link to specific tools based on what the article covers.",
            "embed.pub_link_item3": "We have OG images and social cards already set up for clean social media previews.",
            "embed.pub_link_item4": 'Suggested anchor text: "Use the free Reroute NJ tool to plan your commute."',
            "embed.pub_contribute_item1": 'We curate Portal Bridge coverage on our <a href="coverage.html">news coverage page</a>.',
            "embed.pub_contribute_item2": 'To suggest an article, <a href="https://github.com/jamditis/reroute-nj/issues/new?template=article-suggestion.md" target="_blank" rel="noopener">open a GitHub issue</a> with the URL and details.',
            "embed.pub_contribute_item3": 'Or email <strong><a href="mailto:amditisj@montclair.edu">amditisj@montclair.edu</a></strong> with "Reroute NJ coverage" in the subject line.',
            "embed.pub_contribute_item4": "We include all relevant coverage — opinion, analysis, community reporting, and more.",
        }
        for key, eng_text in pub_items.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<li>{eng_text}</li>", f"<li>{translated}</li>")

        # Co-branding intro
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

        # Fork/embed option headings
        fork_title = get_translation(translations, "embed.fork_title")
        if fork_title:
            html = html.replace("<h3>Option 1: Fork the project</h3>", f"<h3>{fork_title}</h3>")
        embed_opt_title = get_translation(translations, "embed.embed_option_title")
        if embed_opt_title:
            html = html.replace("<h3>Option 2: Embed with your own intro</h3>", f"<h3>{embed_opt_title}</h3>")

        # Fork steps
        fork_steps = {
            "embed.fork_step1": 'Fork the <a href="https://github.com/jamditis/reroute-nj" target="_blank" rel="noopener">GitHub repository</a> to your organization\'s account.',
            "embed.fork_step2": 'Edit <code>css/styles.css</code> to change colors, fonts, and branding. All theme values are CSS custom properties in the <code>:root</code> block.',
            "embed.fork_step3": 'Replace the brand name, logo, and footer credit with your own. Add your newsroom\'s header/nav if you want.',
            "embed.fork_step4": 'Deploy to GitHub Pages, Netlify, Vercel, or your own server. No build step required — it\'s just static HTML.',
        }
        for key, eng_text in fork_steps.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<p>{eng_text}</p>", f"<p>{translated}</p>")
                # Also handle HTML entity versions of apostrophes
                eng_entity = eng_text.replace("'", "&#x27;")
                html = html.replace(f"<p>{eng_entity}</p>", f"<p>{translated}</p>")

        # Embed option steps
        embed_steps = {
            "embed.embed_option_step1": "Embed the tool using the iframe code above.",
            "embed.embed_option_step2": "Add your own header, intro text, and branding around the iframe.",
            "embed.embed_option_step3": "Style the surrounding page to match your publication's design.",
        }
        for key, eng_text in embed_steps.items():
            translated = get_translation(translations, key)
            if translated:
                html = html.replace(f"<p>{eng_text}</p>", f"<p>{translated}</p>")
                eng_entity = eng_text.replace("'", "&#x27;")
                html = html.replace(f"<p>{eng_entity}</p>", f"<p>{translated}</p>")

        # Contribute section
        contribute_intro = get_translation(translations, "embed.contribute_intro")
        if contribute_intro:
            html = html.replace(
                "Reroute NJ is a community project. Here's how you can help, regardless of your technical skill level.",
                contribute_intro
            )
            html = html.replace(
                "Reroute NJ is a community project. Here&#x27;s how you can help, regardless of your technical skill level.",
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
            "embed.nontechnical_item4": '<strong>Translate:</strong> Help us translate the tool into Spanish or other languages spoken by NJ Transit riders.',
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
    html = replace_hamburger_label(html, translations, page_key)
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
