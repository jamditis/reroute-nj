// Reroute NJ — Internationalization
// Loaded before shared.js and page-specific scripts.
// English translations are built-in. For other languages, set window._T
// via an inline <script> BEFORE this file loads.

(function () {
  "use strict";
  // Built-in English translations (canonical source: translations/en.json)
  var EN = {
    "common": {
      "skip_to_main": "Skip to main content",
      "high_contrast": "High contrast",
      "simplified_view": "Simplified view",
      "nav_line_guide": "Line guide",
      "nav_commute_comparison": "Commute comparison",
      "nav_news_coverage": "News coverage",
      "nav_map": "Map",
      "nav_embed": "Embed & share",
      "footer_disclaimer": "is an independent community tool. Not affiliated with or endorsed by NJ Transit, Amtrak, or any government agency.",
      "footer_built_by": "Built by",
      "cutover_begins_in": "Cutover begins in",
      "days": "days",
      "day": "day",
      "remaining_phase1": "remaining in Phase 1",
      "remaining_phase2": "remaining in Phase 2",
      "phase1_complete": "Phase 1 complete",
      "phase2_expected": "Phase 2 expected",
      "phase2_complete": "Phase 2 complete \u00b7 Regular schedules resume Nov 15, subject to testing"
    },
    "js": {
      "major_changes": "MAJOR CHANGES",
      "schedule_changes": "SCHEDULE CHANGES",
      "before_normal": "Before (normal service)",
      "during_cutover": "During cutover (weekdays, Oct 11 \u2013 Nov 14)",
      "during_cutover_short": "During cutover (Oct 11 \u2013 Nov 15)",
      "what_you_need_to_know": "What you need to know",
      "weekends_different": "Weekends are different:",
      "weekend_service_continues": "Midtown Direct service to Penn Station NY continues on Saturday and Sunday. Buy regular Penn Station tickets for weekend travel.",
      "estimated_savings": "Estimated savings for",
      "zone": "zone",
      "monthly_pass_penn": "Monthly pass to Penn Station:",
      "monthly_pass_hoboken": "Monthly pass to Hoboken:",
      "you_save": "You save",
      "per_month": "/month",
      "cross_honored_free": "and PATH/ferry from Hoboken is cross-honored at no extra cost.",
      "fare_disclaimer": "Fares are approximate estimates. Verify at njtransit.com before purchasing.",
      "how_get_manhattan": "How do I get to Manhattan?",
      "how_get_home": "How do I get home from Manhattan?",
      "planning_commute": "Planning your commute",
      "getting_home": "Getting home in the evening",
      "getting_past_newark": "Getting past Newark Penn",
      "getting_home_manhattan": "Getting home from Manhattan",
      "what_ticket": "What ticket should I buy?",
      "recommended": "Best for most riders",
      "scenic_less_crowded": "Scenic & less crowded",
      "port_authority_area": "Best for Port Authority area",
      "other_options": "Other options to consider",
      "pro_tip": "Pro tip:",
      "monthly_pass_holders": "Monthly pass holders",
      "one_way_buyers": "One-way ticket buyers",
      "weekend_riders": "Weekend riders",
      "occasional_riders": "Occasional riders / not sure what to do",
      "no_change": "No change",
      "cross_honored": "Cross-honored",
      "transfer": "Transfer",
      "walk_subway": "Walk/subway",
      "arrive": "Arrive",
      "choose_station": "Choose your station\u2026",
      "extra_mb_0": "Monday, October 12 runs the weekday cutover schedule.",
      "extra_mb_1": "For October and November, buy Hoboken monthly, weekly, or FLEXPASS tickets via Newark Broad St. They are valid to Penn Station NY on Oct 1\u201310 and Nov 15\u201330, and cross-honored from Hoboken on weekdays Oct 11\u2013Nov 14.",
      "extra_me_0": "Monday, October 12 runs the weekday cutover schedule.",
      "extra_me_1": "Weekend Hoboken connections to the Morristown Line are at Secaucus Junction instead of Newark Broad Street.",
      "extra_njcl_0": "Brielle Bridge work, Oct 11\u201325: no trains between Manasquan and Bay Head. Buses replace trains at Bay Head and Point Pleasant, with a rail connection at Manasquan.",
      "extra_nec_0": "NJ Transit added Secaucus\u2013Penn Station NY shuttle trips so Main, Bergen, Pascack Valley, and Port Jervis riders keep their New York connections.",
      "extra_rvl_0": "Saturday, November 7: buses replace trains between Cranford and Newark for Conrail track work.",
      "map_export_title": "Portal North Bridge cutover map",
      "map_export_phase": "Phase 2 \u00b7 Oct 11 \u2013 Nov 15, 2026 \u00b7 Single track Newark Penn\u2013Secaucus",
      "map_legend": "Legend",
      "map_old_portal": "Old Portal Bridge",
      "map_transfer_hub": "Transfer hub",
      "map_path_ferry_bus": "PATH / ferry / bus 126",
      "map_single_track": "Single-track zone",
      "map_export_footer": "Reroute NJ \u00b7 reroutenj.org \u00b7 Rail geometry from NJ Transit GTFS. Independent community tool.",
      "map_load_error": "The map could not load rail geometry. Refresh the page, or open this site over http (python3 -m http.server 8000).",
      "map_popup_portal": "Hackensack River, Kearny NJ<br>Single-track operations between Newark Penn and Secaucus during the Phase 2 cutover (Oct 11 \u2013 Nov 15, 2026).",
      "map_popup_old": "1910 swing span. Retired after the second track moves to Portal North Bridge.",
      "map_plan_commute": "Plan your commute",
      "map_loading_alert": "Map data is still loading. Try again in a moment.",
      "hub_hoboken": "NJ Transit, PATH, ferry, Bus 126",
      "hub_newark_penn": "NJ Transit, PATH, buses",
      "hub_secaucus": "NJ Transit transfer station",
      "hub_nyp": "NJ Transit, Amtrak, LIRR, subway",
      "hub_newark_broad": "Morris & Essex and Montclair-Boonton hub",
      "hub_path_33": "PATH from Hoboken",
      "hub_ferry_39": "NY Waterway from Hoboken",
      "hub_pabt": "Bus 126 from Hoboken",
      "hub_wtc": "PATH from Newark",
      "embed_png_msg": "Click the button below to export the info card as a PNG image.",
      "embed_pdf_msg": "Click the button below to export the info card as a PDF.",
      "embed_html_msg": "Click the button below to download a self-contained HTML file of the info card.",
      "embed_png_only": "PNG download is only available for info cards.",
      "embed_pdf_only": "PDF download is only available for info cards.",
      "embed_html_only": "HTML download is only available for info cards.",
      "embed_png_unavailable": "PNG export is not available. The card page may still be loading.",
      "embed_pdf_unavailable": "PDF export is not available. The card page may still be loading.",
      "embed_png_cors": "Unable to export PNG. This may be a cross-origin restriction when previewing locally.",
      "embed_pdf_cors": "Unable to export PDF. This may be a cross-origin restriction when previewing locally."
    },
    "compare": {
      "your_normal_commute": "Your normal commute",
      "min_total": "min total",
      "vs_normal": "vs normal",
      "fastest": "Fastest",
      "copy_summary": "Copy commute summary to clipboard",
      "copied": "Copied!"
    },
    "coverage": {
      "all_sources": "All sources",
      "all_categories": "All categories",
      "all_lines": "All lines",
      "all_directions": "All directions",
      "search_placeholder": "Search articles\u2026",
      "no_articles": "No articles match your filters.",
      "source_label": "Source",
      "category_label": "Category",
      "line_label": "Line",
      "direction_label": "Direction",
      "search_label": "Search",
      "last_updated": "Last updated:",
      "cat_news": "News",
      "cat_opinion": "Opinion",
      "cat_analysis": "Analysis",
      "cat_official": "Official",
      "cat_community": "Community",
      "dir_nj_nyc": "NJ to NYC",
      "dir_nyc_nj": "NYC to NJ",
      "dir_both": "Both directions",
      "sort_label": "Sort",
      "sort_newest": "Newest first",
      "sort_relevance": "Most relevant",
      "sort_oldest": "Oldest first",
      "showing": "Showing",
      "of": "of",
      "articles_count": "articles",
      "prev": "Previous",
      "next": "Next",
      "page": "Page",
      "page_of": "Page {current} of {total}",
      "go_prev": "Go to previous page",
      "go_next": "Go to next page",
      "pagination_label": "Article pagination"
    }
  };

  if (!window._T) {
    window._T = EN;
  }

  window.t = function (key) {
    if (!window._T) return key;
    var parts = key.split(".");
    var obj = window._T;
    for (var i = 0; i < parts.length; i++) {
      if (obj === undefined || obj === null) return key;
      obj = obj[parts[i]];
    }
    return obj !== undefined && obj !== null ? obj : key;
  };
})();
