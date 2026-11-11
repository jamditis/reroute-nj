// Preserve the distinction between an advance advisory and observed restoration.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}
var coverage = readJson("data/coverage.json");
var sources = readJson("data/sources.json");
var registry = readJson("data/source-registry.json");
var url = "https://www.njtransit.com/service-advisory/2063193";
var articles = coverage.articles.filter(function (article) { return article.url === url; });
assert.strictEqual(articles.length, 1, "Keep one canonical advisory item");
var article = articles[0];
assert.strictEqual(article.date, "2026-11-10", "Use publication date, not retrieval date");
assert.strictEqual(article.category, "official");
assert.deepStrictEqual(article.lines.slice().sort(), [
  "montclair-boonton", "morris-essex", "north-jersey-coast", "northeast-corridor"
].sort(), "Tag the restoration announcement and named delay-affected lines");
assert(article.excerpt.includes("NEC, North Jersey Coast and Morris & Essex"), "Do not extend the delay warning to every line");
assert(article.excerpt.includes("select weekends"), "Do not imply delays every day or every weekend");
assert(article.excerpt.includes("up to 20 minutes"), "Keep the published delay bound");
assert(article.excerpt.includes("Friday 10 p.m. to Monday 5 a.m."), "Keep the published weekend window");
assert(article.excerpt.includes("not confirmation that restoration has occurred"), "Do not report future service as restored");
var sourceId = "njtransit-november15-schedules-weekend-delays";
var claimId = "november15-schedules-weekend-delays";
assert.strictEqual(sources.sources[sourceId].url, url);
assert.strictEqual(sources.sources[sourceId].published, article.date);
assert(sources.sources[sourceId].supports.includes(claimId));
assert(sources.claims[claimId].sources.includes(sourceId));
assert(sources.claims[claimId].scope.includes("not live operating status"));
var entry = registry.entries.filter(function (item) {
  return item.id === "official-november15-schedules-weekend-delays";
})[0];
assert(entry && entry.urls.includes(url), "Register the exact advisory");
assert(entry.urls.includes("https://www.njtransit.com/schedules/printable"));
assert(entry.urls.includes("https://www.njtransit.com/travel-alerts-to?line=NEC&tab=Rail"), "Retain the publication-date evidence");
assert(entry.verificationNote.includes("No individual timetable audit"));
assert(readJson("translations/en.json").common.service_notice_after_details.includes("safety testing"), "Keep the post-cutover safety caveat");
console.log("PASS November 15 advance advisory, provenance and restoration limits");
