// Keep cutover planning links and their narrowly scoped ferry evidence together.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var url = "https://www.nywaterway.com/AdvisoryDetails.aspx?aid=910";
var sourceId = "nywaterway-special-njt-schedule";
var articleId = "nywaterway-special-njt-schedule-2026-10-13";
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
var evidence = JSON.parse(read("data/sources.json"));
var registry = JSON.parse(read("data/source-registry.json"));
var coverage = JSON.parse(read("data/coverage.json"));
var article = coverage.articles.filter(function (item) { return item.id === articleId; });

assert.strictEqual(article.length, 1, "One official special-schedule coverage item");
article = article[0];
assert.strictEqual(article.url, url);
assert.strictEqual(article.date, "2026-10-13", "Use publication, not effective or discovery date");
assert.strictEqual(article.category, "official");
assert.strictEqual(article.direction, "both");
assert.deepStrictEqual(article.lines, ["montclair-boonton", "morris-essex"]);
assert(/October 12–November 13/.test(article.excerpt));
assert(/Monday\/Friday/.test(article.excerpt) && /Tuesday–Thursday/.test(article.excerpt));
assert(!/\d+:\d+|\d+\s*(?:AM|PM)/.test(article.excerpt), "Do not transcribe ambiguous individual times");
assert.strictEqual(evidence.sources[sourceId].url, url);
assert.strictEqual(evidence.sources[sourceId].published, article.date);
assert.deepStrictEqual(evidence.claims["ferry-service-window"].sources, [sourceId]);
assert(/AM\/PM typo/.test(evidence.claims["ferry-service-window"].note));
assert(/does not verify trip duration, fares, rail-ticket eligibility or real-time service/.test(evidence.claims["ferry-service-window"].note));
assert.strictEqual(evidence.sources["nywaterway-schedules"].url, "https://www.nywaterway.com/Hoboken-NJTT-MidtownRoute.aspx", "Preserve baseline duration provenance");
var entry = registry.entries.filter(function (item) { return item.id === "official-nywaterway-cutover-schedule"; });
assert.strictEqual(entry.length, 1);
assert(entry[0].urls.includes(url));
assert(entry[0].urls.some(function (item) { return item.endsWith("/HNJTRailSch.jpg"); }));
assert(/drop-off only/.test(entry[0].verificationNote));

["en", "ar", "es", "gu", "hi", "it", "ko", "pl", "pt", "tl", "zh"].forEach(function (lang) {
  var file = lang === "en" ? "index.html" : lang + "/index.html";
  var html = read(file);
  assert(html.includes('href="' + url + '" target="_blank" rel="noopener" class="resource-link"'), file + " links the special schedule");
  assert(html.includes('href="https://www.nywaterway.com/Hoboken-NJTT-MidtownRoute.aspx"'), file + " retains baseline travel-time citation");
});
["js/app.js", "js/compare.js"].forEach(function (file) {
  assert(read(file).includes('href="' + url + '"'), file + " planning footer links the special schedule");
});

// Exercise the actual feed filter and renderer without production test hooks.
var nodes = {};
var context = {
  window: {},
  document: {
    readyState: "loading",
    getElementById: function (id) { return nodes[id] || (nodes[id] = { value: "" }); },
    addEventListener: function () {}
  },
  esc: function (value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
};
var source = read("js/coverage.js").replace('  if (document.readyState === "loading") {',
  '  window.ferryTest = { set: function (items) { articles = items; }, filter: getFiltered, card: renderCard };\n  if (document.readyState === "loading") {');
vm.runInNewContext(source, context);
var api = context.window.ferryTest;
api.set(coverage.articles);
nodes["filter-source"].value = "NY Waterway";
nodes["filter-category"].value = "official";
nodes["filter-search"].value = "Monday/Friday";
["montclair-boonton", "morris-essex"].forEach(function (line) {
  nodes["filter-line"].value = line;
  ["", "nj-to-nyc", "nyc-to-nj"].forEach(function (direction) {
    nodes["filter-direction"].value = direction;
    assert.strictEqual(api.filter().length, 1, line + " " + direction);
    assert.strictEqual(api.filter()[0].id, articleId);
  });
});
["northeast-corridor", "north-jersey-coast", "raritan-valley"].forEach(function (line) {
  nodes["filter-line"].value = line;
  assert.strictEqual(api.filter().length, 0, "Exclude unrelated line " + line);
});
var card = api.card(article);
assert(card.includes('href="' + url + '"'));
assert(card.includes("Oct 13, 2026"));
assert(card.includes("Both directions"));
assert(card.includes("drop-off-only"));
console.log("PASS special ferry evidence, 11 homepage links, planning links and actual coverage filter/render behavior");
