// Service-notice colors must remain configurable without editing component rules.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var css = fs.readFileSync(path.join(__dirname, "../css/styles.css"), "utf8");
var root = css.slice(css.indexOf(":root {"), css.indexOf("\n}", css.indexOf(":root {")));
var notice = css.slice(css.indexOf("/* Service notice:"), css.indexOf(".tool-nav {"));
assert(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(notice), "Notice component rules must not hard-code theme colors");
["bg", "border", "ink", "inverse", "ring", "secondary", "hover-bg", "hover-text"].forEach(function (name) {
  assert(root.includes("--notice-" + name + ":"), "Missing root token: " + name);
  assert(notice.includes("var(--notice-" + name + ")"), "Unused notice token: " + name);
});
assert(css.includes('body[data-contrast="high"] .alert-banner.service-update { background: #fff; color: #000;'), "Explicit high-contrast override must remain independent of theme colors");
console.log("PASS service-notice theme tokens and high-contrast override");
