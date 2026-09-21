// Reroute NJ — production brand asset and palette regression checks.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var css = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
var card = fs.readFileSync(path.join(root, "card.html"), "utf8");
var count = 0;
function check(name, fn) { fn(); count++; console.log("PASS " + name); }
function read(name) { return fs.readFileSync(path.join(root, name), "utf8"); }
["logo.svg", "logo-mono.svg", "logo-reverse.svg", "logo-lockup.svg", "favicon.svg", "og-image.svg"].forEach(function (name) {
  check(name + " is a named, script-free vector", function () {
    var svg = read("img/" + name);
    assert(/viewBox="[^"]+"/.test(svg));
    assert(svg.indexOf('<title id="title">Reroute NJ</title>') !== -1);
    assert(!/<(?:script|foreignObject|image)\b/i.test(svg));
    assert(!/\bon\w+\s*=|(?:href|src)\s*=/i.test(svg));
    assert(svg.length < 4096);
  });
});
check("monochrome and reverse icons preserve the original geometry", function () {
  function paths(name) { return read("img/" + name).match(/ d="[^"]+"/g); }
  assert.deepStrictEqual(paths("logo.svg"), paths("logo-mono.svg"));
  assert.deepStrictEqual(paths("logo.svg"), paths("logo-reverse.svg"));
  assert(!/#F76919|#B51F70|#0755B8/.test(read("img/logo-mono.svg")));
});
check("favicon has a stable light plate and simplified small-size geometry", function () {
  var favicon = read("img/favicon.svg");
  assert(favicon.indexOf('viewBox="0 0 64 64"') !== -1);
  assert(favicon.indexOf('fill="#fff"') !== -1);
  assert.strictEqual((favicon.match(/<path /g) || []).length, 3);
});
check("masthead uses the actual local SVG, not the retired skewed border", function () {
  assert(css.indexOf('url("../img/logo.svg")') !== -1);
  assert(css.indexOf('url("../img/logo-mono.svg")') !== -1);
  assert(css.indexOf("skewY(-12deg)") === -1);
  assert(css.indexOf('body[data-contrast="high"] .header-inner::after') !== -1);
  assert(css.indexOf('body[data-view="simplified"] .header-inner::after') === -1);
  assert(css.indexOf('@media (max-width: 360px)') !== -1);
});
check("primary actions use brand blue; vivid orange is a separate identity token", function () {
  var tokens = css.match(/:root\s*\{([^}]+)\}/)[1];
  assert(tokens.indexOf("--primary: #0755b8;") !== -1);
  assert(tokens.indexOf("--brand-ink: #071b38;") !== -1);
  assert(tokens.indexOf("--brand-orange: #f76919;") !== -1);
  assert(tokens.indexOf("--brand-magenta: #b51f70;") !== -1);
  assert(tokens.indexOf("--accent: #a3480b;") !== -1);
});
check("branding does not redefine official line color tokens", function () {
  assert(!/--line-[a-z-]+\s*:/.test(css));
  var foundation = read("css/foundation.css");
  ["--line-montclair-boonton: #E66859", "--line-morris-essex: #08A652", "--line-northeast-corridor: #DD3439", "--line-north-jersey-coast: #03A3DF", "--line-raritan-valley: #F2A537"].forEach(function (token) { assert(foundation.indexOf(token) !== -1); });
});
check("self-contained card logos match their canonical SVG files exactly", function () {
  var images = card.match(/data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/g);
  assert(images && images.length === 2);
  ["logo.svg", "logo-reverse.svg"].forEach(function (name, index) {
    var actual = Buffer.from(images[index].split(",")[1], "base64").toString("utf8");
    assert.strictEqual(actual, read("img/" + name));
  });
});
check("standalone cards need no remote stylesheet or image", function () {
  assert(!/<link[^>]+rel="stylesheet"/.test(card));
  var styles = card.match(/<style>([\s\S]*?)<\/style>/)[1];
  var urls = styles.match(/url\([^)]+\)/g) || [];
  assert.strictEqual(urls.length, 2);
  urls.forEach(function (url) { assert(url.indexOf("data:image/svg+xml;base64,") !== -1); });
  assert(card.indexOf("@media (forced-colors: active)") !== -1);
  assert(card.indexOf("body.theme-dark") !== -1);
});
check("dark summary rows use a light print background", function () {
  var printRule = card.split("\n").filter(function (line) { return line.indexOf("@media print") !== -1; })[0];
  assert(printRule);
  assert(printRule.indexOf(".theme-dark .summary-line { background: #fff; }") !== -1);
});
check("social raster keeps the previously fixed 1200 by 630 dimensions", function () {
  var png = fs.readFileSync(path.join(root, "img/og-image.png"));
  assert.strictEqual(png.subarray(1, 4).toString(), "PNG");
  assert.strictEqual(png.readUInt32BE(16), 1200);
  assert.strictEqual(png.readUInt32BE(20), 630);
});
check("logo lockup and social image identify this as an independent guide", function () {
  assert(read("img/logo-lockup.svg").indexOf("Independent commuter guide") !== -1);
  assert(read("img/og-image.svg").indexOf("Independent commuter guide") !== -1);
  assert(/not affiliated/i.test(read("index.html")));
});
console.log("\n" + count + " transit branding checks passed.");
