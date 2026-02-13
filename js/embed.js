// Reroute NJ — Embed Page Configurator
// Three-step visual configurator: pick type, configure, preview + output.

(function () {
  "use strict";

  var BASE_URL = "https://reroutenj.org/";

  // =========================================================================
  // STATE
  // =========================================================================
  var state = {
    embedType: "",       // "card", "widget", "tool"
    cardType: "line",    // "line", "station", "summary"
    toolType: "line-guide", // "line-guide", "compare", "coverage", "map"
    lineId: "",
    stationId: "",
    theme: "light",
    accentColor: "#e87722"
  };

  // =========================================================================
  // DOM REFS
  // =========================================================================
  var $step1 = document.getElementById("cfg-step-1");
  var $step2 = document.getElementById("cfg-step-2");
  var $step3 = document.getElementById("cfg-step-3");

  var $typeCards = document.querySelectorAll(".cfg-type-card");

  var $fieldCardType = document.getElementById("cfg-field-card-type");
  var $fieldToolType = document.getElementById("cfg-field-tool-type");
  var $fieldLine = document.getElementById("cfg-field-line");
  var $fieldStation = document.getElementById("cfg-field-station");
  var $fieldTheme = document.getElementById("cfg-field-theme");
  var $fieldAccent = document.getElementById("cfg-field-accent");

  var $cardType = document.getElementById("cfg-card-type");
  var $toolType = document.getElementById("cfg-tool-type");
  var $line = document.getElementById("cfg-line");
  var $station = document.getElementById("cfg-station");
  var $theme = document.getElementById("cfg-theme");
  var $accent = document.getElementById("cfg-accent");
  var $accentValue = document.getElementById("cfg-accent-value");

  var $iframe = document.getElementById("cfg-iframe");
  var $codeIframe = document.getElementById("cfg-code-iframe");
  var $codeScript = document.getElementById("cfg-code-script");
  var $pngMsg = document.getElementById("cfg-png-msg");
  var $htmlMsg = document.getElementById("cfg-html-msg");
  var $downloadPng = document.getElementById("cfg-download-png");
  var $downloadHtml = document.getElementById("cfg-download-html");

  // =========================================================================
  // TOOL MAP — maps tool IDs to HTML page names
  // =========================================================================
  var TOOL_PAGES = {
    "line-guide": "index.html",
    "compare": "compare.html",
    "coverage": "coverage.html",
    "map": "map.html"
  };

  // =========================================================================
  // POPULATE LINE DROPDOWN
  // =========================================================================
  function populateLines() {
    if (typeof LINE_ORDER === "undefined" || typeof LINE_DATA === "undefined") return;
    for (var i = 0; i < LINE_ORDER.length; i++) {
      var id = LINE_ORDER[i];
      var line = LINE_DATA[id];
      if (!line) continue;
      var opt = document.createElement("option");
      opt.value = id;
      opt.textContent = line.name;
      $line.appendChild(opt);
    }
  }

  // =========================================================================
  // POPULATE STATION DROPDOWN
  // =========================================================================
  function populateStations(lineId) {
    // Clear existing options
    while ($station.options.length > 1) {
      $station.removeChild($station.options[1]);
    }
    state.stationId = "";
    $station.selectedIndex = 0;

    if (!lineId || typeof LINE_DATA === "undefined" || !LINE_DATA[lineId]) return;

    var stations = LINE_DATA[lineId].stations;
    for (var i = 0; i < stations.length; i++) {
      var opt = document.createElement("option");
      opt.value = stations[i].id;
      opt.textContent = stations[i].name;
      $station.appendChild(opt);
    }
  }

  // =========================================================================
  // URL BUILDING
  // =========================================================================
  function getPreviewUrl() {
    var type = state.embedType;
    var params;

    if (type === "card") {
      params = "type=" + encodeURIComponent(state.cardType);
      if (state.lineId) {
        params += "&line=" + encodeURIComponent(state.lineId);
      }
      if (state.cardType === "station" && state.stationId) {
        params += "&station=" + encodeURIComponent(state.stationId);
      }
      params += "&theme=" + encodeURIComponent(state.theme);
      params += "&accent=" + encodeURIComponent(state.accentColor);
      return BASE_URL + "card.html?" + params;
    }

    if (type === "widget") {
      params = "tool=" + encodeURIComponent(state.toolType);
      if (state.lineId) {
        params += "&line=" + encodeURIComponent(state.lineId);
      }
      params += "&theme=" + encodeURIComponent(state.theme);
      params += "&accent=" + encodeURIComponent(state.accentColor);
      return BASE_URL + "widget.html?" + params;
    }

    if (type === "tool") {
      var page = TOOL_PAGES[state.toolType] || "index.html";
      return BASE_URL + page + "?embed=true";
    }

    return BASE_URL;
  }

  // =========================================================================
  // IFRAME DIMENSIONS
  // =========================================================================
  function getDefaultDimensions() {
    var type = state.embedType;
    if (type === "card") {
      var h = (state.cardType === "summary") ? "500" : "400";
      return { width: "480", height: h };
    }
    if (type === "widget") {
      return { width: "100%", height: "600" };
    }
    // full tool
    return { width: "100%", height: "700" };
  }

  // =========================================================================
  // CODE GENERATION
  // =========================================================================
  function getIframeCode() {
    var url = getPreviewUrl();
    var dims = getDefaultDimensions();
    var w = dims.width;
    var h = dims.height;
    var widthAttr = w.indexOf("%") !== -1 ? w : w;
    var code = '<iframe src="' + esc(url) + '" ' +
      'width="' + esc(widthAttr) + '" height="' + esc(h) + '" ' +
      'style="border:1px solid #d5dbe3;border-radius:8px;" ' +
      'title="Reroute NJ" loading="lazy" ' +
      'allowfullscreen></iframe>';
    return code;
  }

  function getScriptTagCode() {
    var attrs = 'data-type="' + esc(state.embedType) + '"';

    if (state.embedType === "card") {
      attrs += ' data-card-type="' + esc(state.cardType) + '"';
      if (state.lineId) {
        attrs += ' data-line="' + esc(state.lineId) + '"';
      }
      if (state.cardType === "station" && state.stationId) {
        attrs += ' data-station="' + esc(state.stationId) + '"';
      }
      attrs += ' data-theme="' + esc(state.theme) + '"';
      attrs += ' data-accent="' + esc(state.accentColor) + '"';
    } else if (state.embedType === "widget") {
      attrs += ' data-tool="' + esc(state.toolType) + '"';
      if (state.lineId) {
        attrs += ' data-line="' + esc(state.lineId) + '"';
      }
      attrs += ' data-theme="' + esc(state.theme) + '"';
      attrs += ' data-accent="' + esc(state.accentColor) + '"';
    } else if (state.embedType === "tool") {
      attrs += ' data-tool="' + esc(state.toolType) + '"';
    }

    var code = '<div class="reroutenj-embed" ' + attrs + '></div>\n' +
      '<script src="https://reroutenj.org/js/widget.js" async></' + 'script>';
    return code;
  }

  // =========================================================================
  // STEP VISIBILITY
  // =========================================================================
  function showStep(num) {
    if (num >= 2) {
      $step2.classList.remove("hidden");
    } else {
      $step2.classList.add("hidden");
    }
    if (num >= 3) {
      $step3.classList.remove("hidden");
    } else {
      $step3.classList.add("hidden");
    }
  }

  // =========================================================================
  // FIELD VISIBILITY — shows/hides fields based on embed type & card type
  // =========================================================================
  function updateFormFields() {
    var type = state.embedType;

    // Card type field: only for cards
    toggleField($fieldCardType, type === "card");
    // Tool type field: for widget and tool
    toggleField($fieldToolType, type === "widget" || type === "tool");
    // Line picker: for cards (unless summary) and widgets
    var showLine = (type === "card" && state.cardType !== "summary") ||
                   (type === "widget");
    toggleField($fieldLine, showLine);
    // Station picker: only for card type=station
    toggleField($fieldStation, type === "card" && state.cardType === "station");
    // Theme: for cards and widgets
    toggleField($fieldTheme, type === "card" || type === "widget");
    // Accent: for cards and widgets
    toggleField($fieldAccent, type === "card" || type === "widget");
  }

  function toggleField(el, show) {
    if (show) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }

  // =========================================================================
  // CHECK IF CONFIG IS VALID (enough to show Step 3)
  // =========================================================================
  function isConfigValid() {
    var type = state.embedType;
    if (!type) return false;

    if (type === "card") {
      if (state.cardType === "summary") return true;
      if (!state.lineId) return false;
      if (state.cardType === "station" && !state.stationId) return false;
      return true;
    }

    if (type === "widget") {
      return true; // tool type has a default, line is optional
    }

    if (type === "tool") {
      return true; // tool type has a default
    }

    return false;
  }

  // =========================================================================
  // UPDATE PREVIEW + CODE
  // =========================================================================
  function updateOutput() {
    if (!isConfigValid()) {
      showStep(2);
      return;
    }

    showStep(3);

    // Update iframe preview
    var url = getPreviewUrl();
    // Use relative URL for preview when on same origin
    // BASE_PATH is injected by the translation system (e.g. "../" for /es/ pages)
    var base = window.BASE_PATH || "./";
    var previewUrl = url.replace(BASE_URL, base);
    if ($iframe.getAttribute("src") !== previewUrl) {
      $iframe.setAttribute("src", previewUrl);
    }

    // Size the iframe container
    var dims = getDefaultDimensions();
    $iframe.style.width = dims.width.indexOf("%") !== -1 ? dims.width : dims.width + "px";
    $iframe.style.height = dims.height + "px";

    // Update code blocks
    $codeIframe.textContent = getIframeCode();
    $codeScript.textContent = getScriptTagCode();

    // Update download availability
    var isCard = state.embedType === "card";
    if (isCard) {
      $pngMsg.textContent = "Click the button below to export the info card as a PNG image.";
      $downloadPng.classList.remove("hidden");
      $htmlMsg.textContent = "Click the button below to download a self-contained HTML file of the info card.";
      $downloadHtml.classList.remove("hidden");
    } else {
      $pngMsg.textContent = "PNG download is only available for info cards.";
      $downloadPng.classList.add("hidden");
      $htmlMsg.textContent = "HTML download is only available for info cards.";
      $downloadHtml.classList.add("hidden");
    }
  }

  // =========================================================================
  // TAB SWITCHING
  // =========================================================================
  function initTabs() {
    var tabs = document.querySelectorAll(".cfg-tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function () {
        var tabId = this.getAttribute("data-tab");
        // Deactivate all tabs and panels
        var allTabs = document.querySelectorAll(".cfg-tab");
        var allPanels = document.querySelectorAll(".cfg-panel");
        for (var j = 0; j < allTabs.length; j++) {
          allTabs[j].classList.remove("active");
          allTabs[j].setAttribute("aria-selected", "false");
        }
        for (var k = 0; k < allPanels.length; k++) {
          allPanels[k].classList.add("hidden");
          allPanels[k].classList.remove("active");
        }
        // Activate selected
        this.classList.add("active");
        this.setAttribute("aria-selected", "true");
        var panel = document.getElementById("cfg-panel-" + tabId);
        if (panel) {
          panel.classList.remove("hidden");
          panel.classList.add("active");
        }
      });
    }
  }

  // =========================================================================
  // COPY TO CLIPBOARD
  // =========================================================================
  function initCopyButtons() {
    setupCopy("cfg-copy-iframe", "cfg-code-iframe", "cfg-copied-iframe");
    setupCopy("cfg-copy-script", "cfg-code-script", "cfg-copied-script");
  }

  function setupCopy(btnId, codeId, confirmId) {
    var btn = document.getElementById(btnId);
    var codeEl = document.getElementById(codeId);
    var confirmEl = document.getElementById(confirmId);
    if (!btn || !codeEl) return;

    btn.addEventListener("click", function () {
      var text = codeEl.textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          showCopied(confirmEl);
        });
      } else {
        // Fallback for older browsers
        var area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand("copy");
          showCopied(confirmEl);
        } catch (e) { /* silent */ }
        document.body.removeChild(area);
      }
    });
  }

  function showCopied(el) {
    if (!el) return;
    el.classList.remove("hidden");
    setTimeout(function () {
      el.classList.add("hidden");
    }, 2000);
  }

  // =========================================================================
  // PNG DOWNLOAD
  // =========================================================================
  function downloadPng() {
    if (state.embedType !== "card") return;
    try {
      var iframeWin = $iframe.contentWindow;
      if (iframeWin && typeof iframeWin.exportCardAsPng === "function") {
        iframeWin.exportCardAsPng();
      } else {
        alert("PNG export is not available. The card page may still be loading.");
      }
    } catch (e) {
      alert("Unable to export PNG. This may be a cross-origin restriction when previewing locally.");
    }
  }

  // =========================================================================
  // HTML DOWNLOAD
  // =========================================================================
  function downloadHtml() {
    if (state.embedType !== "card") return;

    var filename = "reroutenj-card";
    if (state.lineId) {
      filename += "-" + state.lineId;
    }
    if (state.cardType === "station" && state.stationId) {
      filename += "-" + state.stationId;
    }
    filename += ".html";

    // Build trimmed LINE_DATA — only the selected line (or all for summary)
    var dataObj = {};
    var orderArr = [];
    if (state.cardType === "summary" || !state.lineId) {
      for (var i = 0; i < LINE_ORDER.length; i++) {
        var lid = LINE_ORDER[i];
        if (LINE_DATA[lid]) {
          dataObj[lid] = LINE_DATA[lid];
          orderArr.push(lid);
        }
      }
    } else {
      if (LINE_DATA[state.lineId]) {
        dataObj[state.lineId] = LINE_DATA[state.lineId];
        orderArr.push(state.lineId);
      }
    }

    var bodyClass = state.theme === "dark" ? ' class="theme-dark"' : "";

    // Self-contained HTML with all CSS, data, and rendering logic inlined
    var html = '<!DOCTYPE html>\n' +
      '<html lang="en">\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>Reroute NJ \u2014 Info card</title>\n' +
      '  <style>\n' +
      '    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8f9fb; color: #1a2332; line-height: 1.5; padding: 12px; }\n' +
      '    body.theme-dark { background: #1a2332; color: #e8ecf1; }\n' +
      '    .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; max-width: 480px; margin: 0 auto; }\n' +
      '    .theme-dark .card { background: #243044; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }\n' +
      '    .card-color-bar { height: 6px; }\n' +
      '    .card-body { padding: 16px 20px; }\n' +
      '    .card-line-name { font-size: 1.15rem; font-weight: 700; margin-bottom: 4px; }\n' +
      '    .card-station-name { font-size: 1.3rem; font-weight: 700; margin-bottom: 2px; }\n' +
      '    .card-line-context { font-size: 0.8rem; color: #73849a; margin-bottom: 8px; }\n' +
      '    .theme-dark .card-line-context { color: #9eaab8; }\n' +
      '    .card-badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 10px; }\n' +
      '    .badge-severe { background: #fde8e8; color: #c41e1e; }\n' +
      '    .badge-moderate { background: #fff3cd; color: #856404; }\n' +
      '    .theme-dark .badge-severe { background: #4a1c1c; color: #f87171; }\n' +
      '    .theme-dark .badge-moderate { background: #4a3c0a; color: #fbbf24; }\n' +
      '    .card-summary { font-size: 0.85rem; color: #4a5568; margin-bottom: 12px; line-height: 1.55; }\n' +
      '    .theme-dark .card-summary { color: #b0bec5; }\n' +
      '    .card-stats { display: flex; gap: 16px; margin-bottom: 12px; }\n' +
      '    .card-stat { text-align: center; flex: 1; }\n' +
      '    .card-stat-value { font-size: 1.4rem; font-weight: 700; }\n' +
      '    .card-stat-label { font-size: 0.7rem; color: #73849a; text-transform: uppercase; letter-spacing: 0.04em; }\n' +
      '    .theme-dark .card-stat-label { color: #9eaab8; }\n' +
      '    .card-alternatives { margin-bottom: 12px; }\n' +
      '    .card-alternatives h4 { font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: #4a5568; }\n' +
      '    .theme-dark .card-alternatives h4 { color: #9eaab8; }\n' +
      '    .card-alt-item { font-size: 0.8rem; padding: 4px 0; border-bottom: 1px solid #f0f2f5; }\n' +
      '    .card-alt-item:last-child { border-bottom: none; }\n' +
      '    .theme-dark .card-alt-item { border-bottom-color: #2d3e54; }\n' +
      '    .card-dates { font-size: 0.75rem; color: #73849a; margin-bottom: 12px; }\n' +
      '    .theme-dark .card-dates { color: #9eaab8; }\n' +
      '    .card-cta { display: inline-block; padding: 8px 16px; background: #e87722; color: #fff; text-decoration: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }\n' +
      '    .card-cta:hover { background: #d06a1e; }\n' +
      '    .summary-grid { display: grid; gap: 8px; }\n' +
      '    .summary-line { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #f8f9fb; border-radius: 8px; }\n' +
      '    .theme-dark .summary-line { background: #1a2332; }\n' +
      '    .summary-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }\n' +
      '    .summary-line-name { font-size: 0.85rem; font-weight: 600; flex: 1; }\n' +
      '    .summary-impact { font-size: 0.7rem; padding: 2px 8px; border-radius: 100px; font-weight: 600; }\n' +
      '    .summary-severe { background: #fde8e8; color: #c41e1e; }\n' +
      '    .summary-moderate { background: #fff3cd; color: #856404; }\n' +
      '    .theme-dark .summary-severe { background: #4a1c1c; color: #f87171; }\n' +
      '    .theme-dark .summary-moderate { background: #4a3c0a; color: #fbbf24; }\n' +
      '    .summary-trains { font-size: 0.75rem; color: #73849a; white-space: nowrap; }\n' +
      '    .theme-dark .summary-trains { color: #9eaab8; }\n' +
      '  </style>\n' +
      '</head>\n' +
      '<body' + bodyClass + '>\n' +
      '  <div id="card-root"></div>\n' +
      '  <div style="text-align:center;padding:8px 0;font-size:0.7rem;color:#9eaab8;">Powered by <a href="https://reroutenj.org" target="_blank" rel="noopener" style="color:#9eaab8;text-decoration:none;">Reroute NJ</a></div>\n' +
      '  <script>\n' +
      '    var LINE_DATA = ' + JSON.stringify(dataObj) + ';\n' +
      '    var LINE_ORDER = ' + JSON.stringify(orderArr) + ';\n' +
      '\n' +
      '    function esc(str) {\n' +
      '      var div = document.createElement("div");\n' +
      '      div.textContent = String(str);\n' +
      '      return div.innerHTML;\n' +
      '    }\n' +
      '\n' +
      '    var IMPACT_LABELS = {\n' +
      '      "hoboken-diversion": "Diverted to Hoboken",\n' +
      '      "reduced-service": "Reduced service",\n' +
      '      "newark-termination": "Terminates at Newark"\n' +
      '    };\n' +
      '\n' +
      '    var ALTERNATIVES = {\n' +
      '      "hoboken-diversion": [\n' +
      '        "PATH from Hoboken to 33rd St (~25 min)",\n' +
      '        "NY Waterway ferry to W. 39th St (~15 min)",\n' +
      '        "Bus 126 to Port Authority (~40 min)"\n' +
      '      ],\n' +
      '      "reduced-service": [\n' +
      '        "Expect longer wait times between trains",\n' +
      '        "Consider off-peak travel if flexible",\n' +
      '        "Check NJ Transit app for real-time status"\n' +
      '      ],\n' +
      '      "newark-termination": [\n' +
      '        "Transfer to NEC at Newark Penn for PSNY",\n' +
      '        "PATH from Newark to WTC (~25 min)",\n' +
      '        "Consider driving to Newark Penn directly"\n' +
      '      ]\n' +
      '    };\n' +
      '\n' +
      '    function renderLineCard(lineId) {\n' +
      '      var line = LINE_DATA[lineId];\n' +
      '      if (!line) return renderSummaryCard();\n' +
      '      var barColor = line.color;\n' +
      '      var badgeClass = line.impactLevel === "severe" ? "badge-severe" : "badge-moderate";\n' +
      '      var alts = ALTERNATIVES[line.impactType] || [];\n' +
      '      var altHtml = "";\n' +
      '      for (var i = 0; i < alts.length; i++) {\n' +
      '        altHtml += \'<div class="card-alt-item">\' + esc(alts[i]) + "<\\/div>";\n' +
      '      }\n' +
      '      var statsHtml = "";\n' +
      '      if (typeof line.trainsBefore === "number") {\n' +
      '        statsHtml = \'<div class="card-stats">\' +\n' +
      '          \'<div class="card-stat"><div class="card-stat-value">\' + esc(String(line.trainsBefore)) + \'<\\/div><div class="card-stat-label">Trains before<\\/div><\\/div>\' +\n' +
      '          \'<div class="card-stat"><div class="card-stat-value">\' + esc(String(line.trainsAfter)) + \'<\\/div><div class="card-stat-label">Trains during<\\/div><\\/div>\' +\n' +
      '          "<\\/div>";\n' +
      '      } else {\n' +
      '        statsHtml = \'<div class="card-stats">\' +\n' +
      '          \'<div class="card-stat"><div class="card-stat-value" style="font-size:0.9rem;">\' + esc(String(line.trainsBefore)) + \'<\\/div><div class="card-stat-label">Before<\\/div><\\/div>\' +\n' +
      '          \'<div class="card-stat"><div class="card-stat-value" style="font-size:0.9rem;">\' + esc(String(line.trainsAfter)) + \'<\\/div><div class="card-stat-label">During<\\/div><\\/div>\' +\n' +
      '          "<\\/div>";\n' +
      '      }\n' +
      '      return \'<div class="card">\' +\n' +
      '        \'<div class="card-color-bar" style="background:\' + esc(barColor) + \';"><\\/div>\' +\n' +
      '        \'<div class="card-body">\' +\n' +
      '          \'<div class="card-line-name">\' + esc(line.name) + "<\\/div>" +\n' +
      '          \'<span class="card-badge \' + badgeClass + \'">\' + esc(IMPACT_LABELS[line.impactType] || line.impactType) + "<\\/span>" +\n' +
      '          \'<div class="card-summary">\' + esc(line.summary) + "<\\/div>" +\n' +
      '          statsHtml +\n' +
      '          \'<div class="card-alternatives"><h4>Your alternatives<\\/h4>\' + altHtml + "<\\/div>" +\n' +
      '          \'<div class="card-dates">Feb 15 \\u2013 Mar 15, 2026<\\/div>\' +\n' +
      '          \'<a class="card-cta" href="https://reroutenj.org/?line=\' + esc(lineId) + \'" target="_blank" rel="noopener">Plan your commute<\\/a>\' +\n' +
      '        "<\\/div><\\/div>";\n' +
      '    }\n' +
      '\n' +
      '    function renderStationCard(lineId, stationId) {\n' +
      '      var line = LINE_DATA[lineId];\n' +
      '      if (!line) return renderSummaryCard();\n' +
      '      var station = null;\n' +
      '      for (var i = 0; i < line.stations.length; i++) {\n' +
      '        if (line.stations[i].id === stationId) {\n' +
      '          station = line.stations[i];\n' +
      '          break;\n' +
      '        }\n' +
      '      }\n' +
      '      if (!station) return renderLineCard(lineId);\n' +
      '      var barColor = line.color;\n' +
      '      var badgeClass = line.impactLevel === "severe" ? "badge-severe" : "badge-moderate";\n' +
      '      var alts = ALTERNATIVES[line.impactType] || [];\n' +
      '      var altHtml = "";\n' +
      '      for (var j = 0; j < alts.length; j++) {\n' +
      '        altHtml += \'<div class="card-alt-item">\' + esc(alts[j]) + "<\\/div>";\n' +
      '      }\n' +
      '      return \'<div class="card">\' +\n' +
      '        \'<div class="card-color-bar" style="background:\' + esc(barColor) + \';"><\\/div>\' +\n' +
      '        \'<div class="card-body">\' +\n' +
      '          \'<div class="card-station-name">\' + esc(station.name) + "<\\/div>" +\n' +
      '          \'<div class="card-line-context">\' + esc(line.name) + " \\u00B7 Zone " + esc(String(station.zone)) + "<\\/div>" +\n' +
      '          \'<span class="card-badge \' + badgeClass + \'">\' + esc(IMPACT_LABELS[line.impactType] || line.impactType) + "<\\/span>" +\n' +
      '          \'<div class="card-summary">\' + esc(line.summary) + "<\\/div>" +\n' +
      '          \'<div class="card-alternatives"><h4>Your alternatives<\\/h4>\' + altHtml + "<\\/div>" +\n' +
      '          \'<div class="card-dates">Feb 15 \\u2013 Mar 15, 2026<\\/div>\' +\n' +
      '          \'<a class="card-cta" href="https://reroutenj.org/?line=\' + esc(lineId) + \'&station=\' + esc(stationId) + \'" target="_blank" rel="noopener">Full details<\\/a>\' +\n' +
      '        "<\\/div><\\/div>";\n' +
      '    }\n' +
      '\n' +
      '    function renderSummaryCard() {\n' +
      '      var html = \'<div class="card"><div class="card-body">\' +\n' +
      '        \'<div class="card-line-name">Portal Bridge cutover<\\/div>\' +\n' +
      '        \'<div class="card-summary">Five NJ Transit lines affected from Feb 15 \\u2013 Mar 15, 2026. Service reduced while the new Portal North Bridge is connected.<\\/div>\' +\n' +
      '        \'<div class="summary-grid">\';\n' +
      '      for (var i = 0; i < LINE_ORDER.length; i++) {\n' +
      '        var id = LINE_ORDER[i];\n' +
      '        var line = LINE_DATA[id];\n' +
      '        var impactClass = line.impactLevel === "severe" ? "summary-severe" : "summary-moderate";\n' +
      '        var trainInfo = typeof line.trainsBefore === "number"\n' +
      '          ? esc(String(line.trainsBefore)) + " \\u2192 " + esc(String(line.trainsAfter))\n' +
      '          : "Suspended";\n' +
      '        html += \'<div class="summary-line">\' +\n' +
      '          \'<span class="summary-dot" style="background:\' + esc(line.color) + \';"><\\/span>\' +\n' +
      '          \'<span class="summary-line-name">\' + esc(line.shortName) + "<\\/span>" +\n' +
      '          \'<span class="summary-impact \' + impactClass + \'">\' + esc(IMPACT_LABELS[line.impactType] || "") + "<\\/span>" +\n' +
      '          \'<span class="summary-trains">\' + trainInfo + "<\\/span>" +\n' +
      '          "<\\/div>";\n' +
      '      }\n' +
      '      html += \'<\\/div>\' +\n' +
      '        \'<div class="card-dates" style="margin-top:12px;">Feb 15 \\u2013 Mar 15, 2026<\\/div>\' +\n' +
      '        \'<a class="card-cta" href="https://reroutenj.org" target="_blank" rel="noopener">Plan your commute<\\/a>\' +\n' +
      '        "<\\/div><\\/div>";\n' +
      '      return html;\n' +
      '    }\n' +
      '\n' +
      '    var cardType = ' + JSON.stringify(state.cardType) + ';\n' +
      '    var lineId = ' + JSON.stringify(state.lineId || null) + ';\n' +
      '    var stationId = ' + JSON.stringify(state.stationId || null) + ';\n' +
      '    var root = document.getElementById("card-root");\n' +
      '    var rendered;\n' +
      '    if (cardType === "line" && lineId) {\n' +
      '      rendered = renderLineCard(lineId);\n' +
      '    } else if (cardType === "station" && lineId && stationId) {\n' +
      '      rendered = renderStationCard(lineId, stationId);\n' +
      '    } else {\n' +
      '      rendered = renderSummaryCard();\n' +
      '    }\n' +
      '    root.innerHTML = rendered;\n' +
      '  </' + 'script>\n' +
      '</body>\n' +
      '</html>';

    var blob = new Blob([html], { type: "text/html" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================
  function initTypeCards() {
    for (var i = 0; i < $typeCards.length; i++) {
      $typeCards[i].addEventListener("click", function () {
        var type = this.getAttribute("data-type");
        state.embedType = type;

        // Visual active state
        for (var j = 0; j < $typeCards.length; j++) {
          $typeCards[j].classList.remove("active");
        }
        this.classList.add("active");

        // Show step 2
        updateFormFields();
        showStep(2);

        // Auto-advance to step 3 if config is already valid
        if (isConfigValid()) {
          updateOutput();
        } else {
          showStep(2);
        }

        // Scroll step 2 into view
        $step2.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function initFormListeners() {
    $cardType.addEventListener("change", function () {
      state.cardType = this.value;
      updateFormFields();
      // Reset station when switching away from station type
      if (state.cardType !== "station") {
        state.stationId = "";
      }
      updateOutput();
    });

    $toolType.addEventListener("change", function () {
      state.toolType = this.value;
      updateOutput();
    });

    $line.addEventListener("change", function () {
      state.lineId = this.value;
      populateStations(state.lineId);
      updateOutput();
    });

    $station.addEventListener("change", function () {
      state.stationId = this.value;
      updateOutput();
    });

    $theme.addEventListener("change", function () {
      state.theme = this.value;
      updateOutput();
    });

    $accent.addEventListener("input", function () {
      state.accentColor = this.value;
      $accentValue.textContent = this.value;
      updateOutput();
    });

    $downloadPng.addEventListener("click", downloadPng);
    $downloadHtml.addEventListener("click", downloadHtml);
  }

  // =========================================================================
  // INIT
  // =========================================================================
  function init() {
    populateLines();
    initTypeCards();
    initFormListeners();
    initTabs();
    initCopyButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
