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
// =========================================================================
var CUTOVER_START = new Date("2026-02-15T00:00:00");
var CUTOVER_END = new Date("2026-03-15T00:00:00");
var PHASE2_APPROX = "Fall 2026";

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
      " " + t("common.remaining_phase1");
  } else {
    el.innerHTML =
      t("common.phase1_complete") + " &middot; " + t("common.phase2_expected") + " " + PHASE2_APPROX;
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
  var page = path.substring(path.lastIndexOf("/") + 1) || "index.html";
  var htmlLang = document.documentElement.lang || "en";

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
