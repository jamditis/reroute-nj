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
      "phase1_complete": "Phase 1 complete",
      "phase2_expected": "Phase 2 expected"
    },
    "js": {
      "major_changes": "MAJOR CHANGES",
      "schedule_changes": "SCHEDULE CHANGES",
      "before_normal": "Before (normal service)",
      "during_cutover": "During cutover (weekdays, Feb 15 \u2013 Mar 15)",
      "during_cutover_short": "During cutover (Feb 15 \u2013 Mar 15)",
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
      "choose_station": "Choose your station\u2026"
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
      "showing": "Showing",
      "of": "of",
      "articles_count": "articles",
      "prev": "Previous",
      "next": "Next",
      "page": "Page",
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
