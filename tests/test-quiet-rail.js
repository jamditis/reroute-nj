// Reroute NJ — independent rail identity and interface contracts.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
var css = read("css/styles.css");
var shared = read("js/shared.js");
var rail = shared.split("// QUIET RAIL INTERFACE")[1];
var count = 0;
function check(name, fn) { fn(); count++; console.log("PASS " + name); }
check("new interface is isolated and idempotent", function () {
  assert(rail);
  assert(rail.indexOf('getAttribute("data-rail-interface") === "ready"') !== -1);
  assert(rail.indexOf('document.body.classList.contains("embed-mode")') !== -1);
});
check("agency-style color bands are absent from brand assets and tokens", function () {
  ["logo.svg", "logo-mono.svg", "logo-reverse.svg", "logo-lockup.svg", "favicon.svg", "og-image.svg"].forEach(function (name) {
    assert(!/#(?:F76919|B51F70|0755B8)/i.test(read("img/" + name)), name);
  });
  assert(!/--brand-(?:orange|magenta|blue)\b/.test(css));
  assert(css.indexOf('.header::after, .header-inner::after { content: none; display: none; }') !== -1);
});
check("master is a compact train and track mark, not the prior ribbon R", function () {
  var logo = read("img/logo.svg");
  assert(logo.indexOf('viewBox="0 0 64 68"') !== -1);
  assert(logo.indexOf('fill-rule="evenodd"') !== -1);
  assert.strictEqual((logo.match(/<path /g) || []).length, 3);
});
check("native line select delegates to existing application events", function () {
  assert(rail.indexOf('select.id = "trip-line-select"') !== -1);
  assert(rail.indexOf('if (button) button.click()') !== -1);
  assert(rail.indexOf('LINE_ORDER.forEach') !== -1);
  assert(!/LINE_DATA\[[^\]]+\]\s*=/.test(rail));
});
check("station must be selected before moving to results", function () {
  assert(rail.indexOf('station.required = true') !== -1);
  assert(rail.indexOf('if (!station.value)') !== -1);
  assert(rail.indexOf('station.reportValidity()') !== -1);
  assert(rail.indexOf('answers.focus({ preventScroll: true })') !== -1);
});
check("the result action respects reduced motion", function () {
  assert(rail.indexOf('prefers-reduced-motion: reduce') !== -1);
  assert(rail.indexOf('behavior: reduce ? "auto" : "smooth"') !== -1);
});
check("new interface creates text safely without HTML injection", function () {
  assert(!/\.innerHTML\s*=/.test(rail));
  assert(rail.indexOf('node.textContent = text') !== -1);
});
check("header independence uses the existing localized disclaimer", function () {
  assert(rail.indexOf('t("common.footer_disclaimer")') !== -1);
  assert(rail.indexOf('header.appendChild(note)') !== -1);
});
check("hero title is present in every canonical locale", function () {
  ["en", "ar", "es", "gu", "hi", "it", "ko", "pl", "pt", "tl", "zh"].forEach(function (lang) {
    var data = JSON.parse(read("translations/" + lang + ".json"));
    assert(data.compare.hero_title, lang);
    assert(data.common.footer_disclaimer, lang);
  });
  assert(read("js/i18n.js").indexOf('"hero_title": "How does your commute change?"') !== -1);
});
check("decorative art cannot be mistaken for accessible route instructions", function () {
  assert(rail.indexOf('visual.setAttribute("aria-hidden", "true")') !== -1);
  assert(rail.indexOf('image.alt = ""') !== -1);
  assert(!/real-time info|smoother ride|save this station/i.test(rail));
});
check("background context is retained rather than discarded", function () {
  assert(rail.indexOf('if (context) main.appendChild(context)') !== -1);
  assert(css.indexOf('.rail-guide > .intro-context > summary') !== -1);
});
check("shortcuts reuse real localized links, not mock destinations", function () {
  assert(rail.indexOf('link.href = original.href') !== -1);
  assert(rail.indexOf('original.textContent') !== -1);
});
check("asset size and layout reserve are explicit", function () {
  assert(fs.statSync(path.join(root, "img/rail-platform.webp")).size < 25000);
  assert(rail.indexOf('image.width = 258') !== -1);
  assert(rail.indexOf('image.height = 607') !== -1);
});
check("assistive and print modes do not need the illustration", function () {
  assert(css.indexOf('body[data-view="simplified"] .rail-visual') !== -1);
  assert(css.indexOf('@media (forced-colors: active) { .rail-visual { display: none; }') !== -1);
  assert(css.indexOf('.rail-visual, .quick-tools, .plan-submit { display: none !important; }') !== -1);
});
check("zero-build and local CSS composition are retained", function () {
  assert.strictEqual((css.match(/@import/g) || []).length, 1);
  assert(css.indexOf('@import url("foundation.css")') !== -1);
  assert(!fs.existsSync(path.join(root, "package.json")));
});
console.log("\n" + count + " independent rail checks passed.");
