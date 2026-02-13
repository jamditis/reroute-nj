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
    var previewUrl = url.replace(BASE_URL, "./");
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

    var url = getPreviewUrl();
    var filename = "reroutenj-card";
    if (state.lineId) {
      filename += "-" + state.lineId;
    }
    if (state.cardType === "station" && state.stationId) {
      filename += "-" + state.stationId;
    }
    filename += ".html";

    var html = '<!DOCTYPE html>\n' +
      '<html lang="en">\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <title>Reroute NJ - Info Card</title>\n' +
      '  <style>body{margin:0;display:flex;justify-content:center;padding:1rem;background:#f0f3f7;font-family:sans-serif;}</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '  <iframe src="' + esc(url) + '" width="480" height="' +
      (state.cardType === "summary" ? "500" : "400") +
      '" style="border:1px solid #d5dbe3;border-radius:8px;" title="Reroute NJ" loading="lazy" allowfullscreen></iframe>\n' +
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
