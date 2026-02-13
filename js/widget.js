/**
 * Reroute NJ — Embeddable Widget Loader
 * Usage:
 *   <div class="reroutenj-embed" data-type="line-card" data-line="montclair-boonton"></div>
 *   <script src="https://reroutenj.org/js/widget.js" async></script>
 */
(function() {
  "use strict";

  var BASE_URL = "https://reroutenj.org/";

  var DEFAULTS = {
    "line-card":    { width: "480px", height: "400px" },
    "station-card": { width: "480px", height: "400px" },
    "summary-card": { width: "480px", height: "500px" },
    "line-guide":   { width: "100%",  height: "600px" },
    "compare":      { width: "100%",  height: "600px" },
    "coverage":     { width: "100%",  height: "500px" },
    "map":          { width: "100%",  height: "500px" },
    "tool":         { width: "100%",  height: "700px" }
  };

  var CARD_TYPES = {
    "line-card": true,
    "station-card": true,
    "summary-card": true
  };

  var WIDGET_TYPES = {
    "line-guide": true,
    "compare": true,
    "coverage": true,
    "map": true
  };

  var TOOL_PAGE_MAP = {
    "line-guide": "index.html",
    "compare": "compare.html",
    "coverage": "coverage.html",
    "map": "map.html"
  };

  function buildUrl(el) {
    var type = el.getAttribute("data-type") || "";
    var line = el.getAttribute("data-line") || "";
    var station = el.getAttribute("data-station") || "";
    var tool = el.getAttribute("data-tool") || "";
    var theme = el.getAttribute("data-theme") || "light";
    var accent = el.getAttribute("data-accent") || "";
    var cardType = el.getAttribute("data-card-type") || "";

    // Resolve generic "card" type using data-card-type
    if (type === "card" && cardType) {
      if (cardType === "line") { type = "line-card"; }
      else if (cardType === "station") { type = "station-card"; }
      else if (cardType === "summary") { type = "summary-card"; }
    }

    // Resolve generic "widget" type using data-tool
    if (type === "widget" && tool) {
      if (WIDGET_TYPES[tool]) {
        type = tool;
      }
    }

    var params = [];

    // Card types -> card.html
    if (CARD_TYPES[type]) {
      var subtype = type.replace("-card", "");
      params.push("type=" + encodeURIComponent(subtype));
      if (line) { params.push("line=" + encodeURIComponent(line)); }
      if (station) { params.push("station=" + encodeURIComponent(station)); }
      if (theme) { params.push("theme=" + encodeURIComponent(theme)); }
      if (accent) { params.push("accent=" + encodeURIComponent(accent)); }
      return BASE_URL + "card.html?" + params.join("&");
    }

    // Widget types -> widget.html
    if (WIDGET_TYPES[type]) {
      params.push("tool=" + encodeURIComponent(type));
      if (line) { params.push("line=" + encodeURIComponent(line)); }
      if (theme) { params.push("theme=" + encodeURIComponent(theme)); }
      if (accent) { params.push("accent=" + encodeURIComponent(accent)); }
      return BASE_URL + "widget.html?" + params.join("&");
    }

    // Full tool types -> existing pages with embed=true
    if (type === "tool" && tool) {
      var page = TOOL_PAGE_MAP[tool];
      if (page) {
        params.push("embed=true");
        if (line) { params.push("line=" + encodeURIComponent(line)); }
        if (theme) { params.push("theme=" + encodeURIComponent(theme)); }
        if (accent) { params.push("accent=" + encodeURIComponent(accent)); }
        return BASE_URL + page + "?" + params.join("&");
      }
    }

    return "";
  }

  function getDimensions(el) {
    var type = el.getAttribute("data-type") || "";
    var cardType = el.getAttribute("data-card-type") || "";
    var tool = el.getAttribute("data-tool") || "";

    // Resolve the effective type for dimension lookup
    var effectiveType = type;
    if (type === "card" && cardType) {
      effectiveType = cardType + "-card";
    } else if (type === "widget" && tool && WIDGET_TYPES[tool]) {
      effectiveType = tool;
    } else if (type === "tool") {
      effectiveType = "tool";
    }

    var defaults = DEFAULTS[effectiveType] || DEFAULTS["tool"];
    var width = el.getAttribute("data-width") || defaults.width;
    var height = el.getAttribute("data-height") || defaults.height;

    return { width: width, height: height };
  }

  function initEmbed(el) {
    // Skip if already initialized
    if (el.querySelector("iframe")) { return; }

    var url = buildUrl(el);
    if (!url) { return; }

    var dims = getDimensions(el);

    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.width = dims.width;
    iframe.height = dims.height;
    iframe.style.cssText = "border:1px solid #d5dbe3;border-radius:8px;";
    iframe.title = "Reroute NJ";
    iframe.loading = "lazy";
    iframe.allowFullscreen = true;
    iframe.setAttribute("allowfullscreen", "");

    el.appendChild(iframe);
  }

  function initAll() {
    var embeds = document.querySelectorAll(".reroutenj-embed");
    for (var i = 0; i < embeds.length; i++) {
      initEmbed(embeds[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
