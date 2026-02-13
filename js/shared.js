// Reroute NJ — Shared utilities
// Loaded before page-specific scripts. Not wrapped in IIFE — these are
// intentional globals consumed by app.js, compare.js, and coverage.js.

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
      'Cutover begins in <span class="num">' +
      days +
      "</span> day" +
      (days !== 1 ? "s" : "");
  } else if (now < CUTOVER_END) {
    var days2 = Math.ceil((CUTOVER_END - now) / msPerDay);
    el.innerHTML =
      '<span class="num">' +
      days2 +
      "</span> day" +
      (days2 !== 1 ? "s" : "") +
      " remaining in Phase 1";
  } else {
    el.innerHTML =
      "Phase 1 complete &middot; Phase 2 expected " + PHASE2_APPROX;
  }
}
