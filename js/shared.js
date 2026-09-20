// Reroute NJ — Shared utilities
// Loaded before page-specific scripts. Not wrapped in IIFE — these are
// intentional globals consumed by app.js, compare.js, and coverage.js.

// =========================================================================
// ACCESSIBILITY TOGGLES
// Restore saved state immediately to prevent flash of unstyled content.
// =========================================================================
(function restoreA11yState() {
  try {
    if (localStorage.getItem("rnj-contrast") === "high") {
      document.body.setAttribute("data-contrast", "high");
    }
    if (localStorage.getItem("rnj-view") === "simplified") {
      document.body.setAttribute("data-view", "simplified");
    }
  } catch (e) { /* localStorage unavailable */ }
})();

// =========================================================================
// DATES
// Phase 1: Feb 15 – Mar 15, 2026 (complete).
// Phase 2: Oct 11 – Nov 15, 2026 (current cutover). Official NJ Transit
// portalcutover page: new schedules Oct 11; regular schedules resume Nov 15
// subject to safety testing. Briefing: construction starts the evening of
// Oct 9; full normal service Nov 16.
// =========================================================================
var PHASE1_START = new Date("2026-02-15T00:00:00");
var PHASE1_END = new Date("2026-03-15T00:00:00");
var CUTOVER_START = new Date("2026-10-11T00:00:00");
var CUTOVER_END = new Date("2026-11-15T00:00:00");
var PHASE2_APPROX = "Oct 11 – Nov 15, 2026";

// =========================================================================
// XSS-SAFE HTML ESCAPE
// =========================================================================
function esc(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// =========================================================================
// HAMBURGER MENU
// Toggles the mobile nav open/closed. No-ops on desktop where button is hidden.
// =========================================================================
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.querySelector(".hamburger-btn");
    var nav = document.querySelector(".tool-nav");
    if (!btn || !nav) return;

    btn.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close menu when clicking a nav link (for same-page scenarios)
    var links = nav.querySelectorAll(".tool-nav-link");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function () {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
    }
  });
})();

// =========================================================================
// COUNTDOWN
// Looks up #countdown internally so each page just calls updateCountdown().
// Uses only safe, pre-defined HTML fragments (no user input in innerHTML).
// =========================================================================
function updateCountdown() {
  var el = document.getElementById("countdown");
  if (!el) return;
  var now = new Date();
  var msPerDay = 86400000;
  if (now < CUTOVER_START) {
    var days = Math.ceil((CUTOVER_START - now) / msPerDay);
    el.innerHTML =
      t("common.cutover_begins_in") + ' <span class="num">' +
      days +
      "</span> " +
      (days !== 1 ? t("common.days") : t("common.day"));
  } else if (now < CUTOVER_END) {
    var days2 = Math.ceil((CUTOVER_END - now) / msPerDay);
    el.innerHTML =
      '<span class="num">' +
      days2 +
      "</span> " +
      (days2 !== 1 ? t("common.days") : t("common.day")) +
      " " + t("common.remaining_phase2");
  } else {
    el.innerHTML = t("common.phase2_complete");
  }
}

// =========================================================================
// ACCESSIBILITY TOGGLE INITIALIZATION
// Call after DOM is ready. Wires up the high-contrast and simplified-view
// toggle buttons, syncs aria-pressed state with body data attributes,
// and persists choices to localStorage.
// =========================================================================
function initA11yToggles() {
  var contrastBtn = document.getElementById("toggle-contrast");
  var simplifiedBtn = document.getElementById("toggle-simplified");

  if (contrastBtn) {
    var isHigh = document.body.getAttribute("data-contrast") === "high";
    contrastBtn.setAttribute("aria-pressed", isHigh ? "true" : "false");

    contrastBtn.addEventListener("click", function () {
      var active = document.body.getAttribute("data-contrast") === "high";
      if (active) {
        document.body.removeAttribute("data-contrast");
        contrastBtn.setAttribute("aria-pressed", "false");
        try { localStorage.removeItem("rnj-contrast"); } catch (e) {}
      } else {
        document.body.setAttribute("data-contrast", "high");
        contrastBtn.setAttribute("aria-pressed", "true");
        try { localStorage.setItem("rnj-contrast", "high"); } catch (e) {}
      }
    });
  }

  if (simplifiedBtn) {
    var isSimplified = document.body.getAttribute("data-view") === "simplified";
    simplifiedBtn.setAttribute("aria-pressed", isSimplified ? "true" : "false");

    simplifiedBtn.addEventListener("click", function () {
      var active = document.body.getAttribute("data-view") === "simplified";
      if (active) {
        document.body.removeAttribute("data-view");
        simplifiedBtn.setAttribute("aria-pressed", "false");
        try { localStorage.removeItem("rnj-view"); } catch (e) {}
      } else {
        document.body.setAttribute("data-view", "simplified");
        simplifiedBtn.setAttribute("aria-pressed", "true");
        try { localStorage.setItem("rnj-view", "simplified"); } catch (e) {}
      }
    });
  }
}

// =========================================================================
// LANGUAGE SELECTOR
// =========================================================================
function initLangSelector() {
  var sel = document.getElementById("lang-select");
  if (!sel) return;

  var path = window.location.pathname;
  // Strip leading slash and any language prefix (e.g. "/es/blog/foo.html" → "blog/foo.html")
  var parts = path.replace(/^\//, "").split("/");
  var htmlLang = document.documentElement.lang || "en";
  // If first segment is a language code (2-letter, not "js"/"css"/"img"), strip it
  var langCodes = ["es","zh","tl","ko","pt","gu","hi","it","ar","pl"];
  if (langCodes.indexOf(parts[0]) !== -1) {
    parts = parts.slice(1);
  }
  var page = parts.join("/") || "index.html";

  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === htmlLang) {
      sel.selectedIndex = i;
      break;
    }
  }

  sel.addEventListener("change", function () {
    var lang = this.value;
    if (lang === "en") {
      window.location.href = "/" + page;
    } else {
      window.location.href = "/" + lang + "/" + page;
    }
  });
}

// =========================================================================
// EMBED MODE
// When ?embed=true is in the URL, hides site chrome and shows attribution.
// =========================================================================
function initEmbedMode() {
  if (window.location.search.indexOf("embed=true") === -1) return;
  document.body.classList.add("embed-mode");
  var hide = document.querySelectorAll(".header, .tool-nav, .seo-summary, .footer");
  for (var i = 0; i < hide.length; i++) {
    hide[i].style.display = "none";
  }
  var bar = document.createElement("div");
  bar.className = "embed-attribution";
  // Safe: static string with no user input
  bar.innerHTML = 'Powered by <a href="https://reroutenj.org" target="_blank" rel="noopener">Reroute NJ</a>';
  document.body.appendChild(bar);
}

// =========================================================================
// FILE DOWNLOADS (PNG / PDF)
// Canvas PNG via toBlob. PDF is a one-page wrapper around a JPEG of the
// same canvas — no libraries. Used by info cards and the map export.
// =========================================================================
function downloadBlob(blob, filename) {
  if (!blob) return;
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 250);
}

function exportCanvasPng(canvas, filename) {
  canvas.toBlob(function (blob) {
    downloadBlob(blob, filename);
  }, "image/png");
}

function exportCanvasPdf(canvas, filename) {
  var dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  var comma = dataUrl.indexOf(",");
  if (comma < 0) return;
  var binary = atob(dataUrl.slice(comma + 1));
  var jpeg = new Uint8Array(binary.length);
  var i;
  for (i = 0; i < binary.length; i++) {
    jpeg[i] = binary.charCodeAt(i);
  }

  var imgW = canvas.width;
  var imgH = canvas.height;
  var margin = 36;
  var maxW = 720;
  var maxH = 540;
  var scale = Math.min(maxW / imgW, maxH / imgH);
  var drawW = Math.round(imgW * scale);
  var drawH = Math.round(imgH * scale);
  var pageW = drawW + margin * 2;
  var pageH = drawH + margin * 2;
  var x = margin;
  var y = margin;

  function ascii(str) {
    var out = new Uint8Array(str.length);
    for (var j = 0; j < str.length; j++) {
      out[j] = str.charCodeAt(j) & 0xff;
    }
    return out;
  }

  function concat(parts) {
    var n = 0;
    var p;
    for (p = 0; p < parts.length; p++) n += parts[p].length;
    var out = new Uint8Array(n);
    var o = 0;
    for (p = 0; p < parts.length; p++) {
      out.set(parts[p], o);
      o += parts[p].length;
    }
    return out;
  }

  var objects = [];
  objects[1] = ascii("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects[2] = ascii("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects[3] = ascii(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
      pageW +
      " " +
      pageH +
      "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
  );
  objects[4] = concat([
    ascii(
      "4 0 obj\n<< /Type /XObject /Subtype /Image /Width " +
        imgW +
        " /Height " +
        imgH +
        " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
        jpeg.length +
        " >>\nstream\n"
    ),
    jpeg,
    ascii("\nendstream\nendobj\n"),
  ]);
  var content =
    "q\n" + drawW + " 0 0 " + drawH + " " + x + " " + y + " cm\n/Im0 Do\nQ\n";
  objects[5] = ascii(
    "5 0 obj\n<< /Length " + content.length + " >>\nstream\n" + content + "endstream\nendobj\n"
  );

  var header = ascii("%PDF-1.4\n%\x80\x80\x80\x80\n");
  var bodyParts = [header];
  var offsets = [0];
  var offset = header.length;
  for (i = 1; i <= 5; i++) {
    offsets[i] = offset;
    bodyParts.push(objects[i]);
    offset += objects[i].length;
  }
  var xrefPos = offset;
  var xref = "xref\n0 6\n0000000000 65535 f \n";
  for (i = 1; i <= 5; i++) {
    var loc = String(offsets[i]);
    while (loc.length < 10) loc = "0" + loc;
    xref += loc + " 00000 n \n";
  }
  var trailer =
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF\n";
  var pdf = concat(bodyParts.concat([ascii(xref), ascii(trailer)]));
  downloadBlob(new Blob([pdf], { type: "application/pdf" }), filename);
}

// =========================================================================
// WAYFINDING LAYOUT
// Progressive enhancement only: keep existing IDs, listeners, translated text,
// and source order. No transit data or route-calculation logic lives here.
// =========================================================================
(function () {
  "use strict";

  // Capture the translated placeholder before app.js replaces the badge with
  // the active line name. All templates load shared.js after the page markup.
  var initialBadge = document.getElementById("line-badge");
  var initialLineLabel = initialBadge ? initialBadge.textContent : "";

  function initWayfinding() {
    var main = document.getElementById("main-content");
    var header = document.querySelector(".header");
    if (!main || !header || document.body.classList.contains("embed-mode")) return;
    if (main.getAttribute("data-wayfinding") === "ready") return;
    main.setAttribute("data-wayfinding", "ready");

    var current = document.querySelector('.tool-nav-link[aria-current="page"]');
    var summary = main.querySelector(".seo-summary");
    var phase = main.querySelector(".phase-banner");
    var hero = main.querySelector(".compare-hero, .coverage-hero, .embed-hero");

    function responsiveDisclosure(details) {
      if (!window.matchMedia) { details.open = true; return; }
      var wide = window.matchMedia("(min-width: 769px)");
      var wasOpen;
      function syncDisclosure() { details.open = wide.matches; }
      window.addEventListener("beforeprint", function () {
        wasOpen = details.open;
        details.open = true;
      });
      window.addEventListener("afterprint", function () {
        if (typeof wasOpen === "boolean") details.open = wasOpen;
      });
      syncDisclosure();
      if (wide.addEventListener) wide.addEventListener("change", syncDisclosure);
      else if (wide.addListener) wide.addListener(syncDisclosure);
    }

    // Keep the full service notice available without making phone users scroll
    // past it on every visit. Labels come from the existing translated HTML.
    var alert = document.querySelector(".alert-banner .container");
    var alertTitle = alert && alert.querySelector("strong");
    if (alert && alertTitle) {
      var notice = document.createElement("details");
      notice.className = "service-notice";
      var noticeTitle = document.createElement("summary");
      noticeTitle.appendChild(alertTitle);
      var noticeBody = document.createElement("div");
      while (alert.firstChild) noticeBody.appendChild(alert.firstChild);
      notice.appendChild(noticeTitle);
      notice.appendChild(noticeBody);
      alert.appendChild(notice);
      responsiveDisclosure(notice);
      // The line guide repeats this same phase notice in the page body.
      if (phase) { phase.parentNode.removeChild(phase); phase = null; }
    }

    // Index previously had no H1. Reuse its translated navigation label.
    if (summary || hero) {
      var intro = document.createElement("div");
      intro.className = "site-intro";
      var copy = document.createElement("div");
      copy.className = "site-intro-copy";
      main.insertBefore(intro, main.firstChild);
      intro.appendChild(copy);
      if (hero) {
        copy.appendChild(hero);
      } else if (!main.querySelector("h1") && current) {
        var title = document.createElement("h1");
        title.textContent = current.textContent;
        copy.appendChild(title);
      }
      if (summary) {
        var contextTitle = main.querySelector(".cutover-summary h3");
        if (!hero && contextTitle) {
          var context = document.createElement("details");
          context.className = "intro-context";
          var contextLabel = document.createElement("summary");
          contextLabel.textContent = contextTitle.textContent;
          context.appendChild(contextLabel);
          context.appendChild(summary);
          copy.appendChild(context);
          responsiveDisclosure(context);
        } else {
          copy.appendChild(summary);
        }
      }
      if (phase) intro.appendChild(phase);
    }

    var controls = main.querySelector(".control-panel");
    var tabs = main.querySelector(".tool-tabs");
    if (controls && tabs) {
      var workspace = document.createElement("div");
      workspace.className = "journey-workspace";
      main.insertBefore(workspace, controls);
      workspace.appendChild(controls);
      var answers = document.createElement("div");
      answers.className = "journey-answers";
      workspace.appendChild(answers);
      answers.appendChild(tabs);
      var panels = main.querySelectorAll(".tool-panel");
      for (var i = 0; i < panels.length; i++) answers.appendChild(panels[i]);

      var lineNav = controls.querySelector(".line-nav");
      if (lineNav && lineNav.getAttribute("aria-label")) {
        var label = document.createElement("h2");
        label.className = "control-title";
        label.textContent = initialLineLabel || lineNav.getAttribute("aria-label");
        label.id = "line-selection-heading";
        lineNav.setAttribute("aria-labelledby", label.id);
        lineNav.parentNode.insertBefore(label, lineNav);
      }

      // The original label points to a nonexistent select. The direction
      // buttons already have a labelled group; retain the visible label.
      var directionLabel = controls.querySelector('label[for="direction-select"]');
      if (directionLabel) {
        var directionText = document.createElement("p");
        directionText.className = "direction-label";
        directionText.textContent = directionLabel.textContent;
        directionLabel.parentNode.replaceChild(directionText, directionLabel);
      }

      // Long reference sections remain on the page, with direct jump links.
      var sections = main.querySelectorAll(".info-section[id]");
      var jumps = document.createElement("nav");
      jumps.className = "page-jumps";
      if (current) jumps.setAttribute("aria-label", current.textContent);
      for (var j = 0; j < sections.length; j++) {
        var heading = sections[j].querySelector("h2");
        if (!heading) continue;
        var link = document.createElement("a");
        link.setAttribute("href", "#" + sections[j].id);
        link.textContent = heading.textContent;
        jumps.appendChild(link);
      }
      if (jumps.firstChild) main.insertBefore(jumps, workspace.nextSibling);
    }

    var steps = main.querySelectorAll(".input-step");
    if (steps.length) {
      var inputs = document.createElement("div");
      inputs.className = "compare-inputs";
      main.insertBefore(inputs, steps[0]);
      for (var k = 0; k < steps.length; k++) inputs.appendChild(steps[k]);
    }

    // Mobile navigation has an explicit target and a predictable Escape key.
    var nav = document.querySelector(".tool-nav");
    var menu = nav && nav.querySelector(".container");
    var toggle = nav && nav.querySelector(".hamburger-btn");
    if (menu && toggle) {
      menu.id = "site-tool-links";
      toggle.setAttribute("aria-controls", menu.id);
      nav.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && nav.classList.contains("open")) {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWayfinding);
  } else {
    initWayfinding();
  }
})();
