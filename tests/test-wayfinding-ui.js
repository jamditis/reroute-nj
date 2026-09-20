// Regression checks for the composed, zero-build wayfinding design system.
"use strict";
var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var readStyles = require("./read-styles");
var root = path.resolve(__dirname, "..");
var css = readStyles(path.join(root, "css/styles.css"));
var theme = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
var shared = fs.readFileSync(path.join(root, "js/shared.js"), "utf8");
var count = 0;
function check(name, fn) { fn(); count++; console.log("PASS " + name); }
function luminance(hex) {
  var channels = hex.slice(1).match(/../g).map(function (c) {
    var n = parseInt(c, 16) / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  var x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
var tokens = {};
theme.match(/:root\s*\{([^}]+)\}/)[1].replace(/(--[\w-]+):\s*(#[0-9a-f]{6})/g, function (_, key, color) { tokens[key] = color; return _; });
["--text", "--text-light", "--text-muted", "--primary", "--primary-light", "--accent-dark"].forEach(function (key) {
  ["--bg", "--card-bg"].forEach(function (surface) {
    check(key + " on " + surface + " meets AA", function () { assert(contrast(tokens[key], tokens[surface]) >= 4.5); });
  });
});
[["--warning", "--warning-bg"], ["--danger", "--danger-bg"], ["--success", "--success-bg"]].forEach(function (pair) {
  check(pair.join(" on ") + " meets AA", function () { assert(contrast(tokens[pair[0]], tokens[pair[1]]) >= 4.5); });
});
check("primary buttons meet AA", function () { assert(contrast("#ffffff", tokens["--primary"]) >= 4.5); });
check("foundation selectors remain in the composed cascade", function () {
  [".station-sign", ".embed-mode", ".map-zone", ".before-after", ".coverage-pagination", ".cfg-output-layout"].forEach(function (s) { assert(css.indexOf(s) !== -1, s); });
});
check("all primary workspaces have explicit styles", function () {
  [".journey-workspace", ".journey-answers", ".compare-inputs", ".coverage-filters", ".cfg-form", ".blog-body", ".page-jumps"].forEach(function (s) { assert(theme.indexOf(s) !== -1, s); });
});
check("responsive, RTL, print, and assistive modes are explicit", function () {
  ["max-width: 768px", "max-width: 480px", 'dir="rtl"', 'data-contrast="high"', 'data-view="simplified"', "prefers-reduced-motion: reduce", "forced-colors: active", "@media print"].forEach(function (s) { assert(theme.indexOf(s) !== -1, s); });
});
check("selected lines have a non-color indicator", function () { assert(theme.indexOf('.line-btn[data-line].active::after') !== -1); });
check("coverage dates are visible", function () { assert(/\.coverage-date\s*\{\s*display:\s*block/.test(theme)); });
check("layout keeps existing nodes instead of reparsing HTML", function () {
  var layout = shared.split("// WAYFINDING LAYOUT")[1];
  assert(layout); assert(!/\.innerHTML\s*=/.test(layout));
  assert(layout.indexOf("appendChild(controls)") !== -1);
  assert(layout.indexOf("appendChild(panels[i])") !== -1);
});
check("enhancement skips standalone and embedded renderers", function () {
  assert(shared.indexOf('!main || !header || document.body.classList.contains("embed-mode")') !== -1);
});
check("layout is idempotent", function () { assert(shared.indexOf('getAttribute("data-wayfinding") === "ready"') !== -1); });
check("line heading preserves the translated HTML placeholder", function () { assert(shared.indexOf("initialBadge ? initialBadge.textContent") !== -1); });
check("all locales already contain the line heading translation", function () {
  ["en", "ar", "es", "gu", "hi", "it", "ko", "pl", "pt", "tl", "zh"].forEach(function (lang) {
    var data = JSON.parse(fs.readFileSync(path.join(root, "translations", lang + ".json"), "utf8"));
    assert(data.index.line_badge_default, lang);
  });
});
check("mobile menu supports Escape and an explicit controlled element", function () {
  assert(shared.indexOf('event.key === "Escape"') !== -1);
  assert(shared.indexOf('toggle.setAttribute("aria-controls", menu.id)') !== -1);
});
check("CSS loader rejects missing, cyclic, and remote imports", function () {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), "rnj-css-"));
  try {
    var file = path.join(dir, "test.css");
    fs.writeFileSync(file, '@import url("missing.css");');
    assert.throws(function () { readStyles(file); }, /ENOENT/);
    fs.writeFileSync(file, '@import url("test.css");');
    assert.throws(function () { readStyles(file); }, /Circular/);
    fs.writeFileSync(file, '@import url("https://example.com/style.css");');
    assert.throws(function () { readStyles(file); }, /External/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
console.log("\n" + count + " wayfinding checks passed.");
