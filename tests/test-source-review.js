// The homepage reports a documented, scoped review, never a live-data guarantee.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var languages = ["en", "ar", "es", "gu", "hi", "it", "ko", "pl", "pt", "tl", "zh"];
var reviewDate = "2026-10-11";
var reviewPath = "docs/reviews/cutover-audit-" + reviewDate + ".md";
var reviewUrl = "https://github.com/jamditis/reroute-nj/blob/main/" + reviewPath;
var review = fs.readFileSync(path.join(root, reviewPath), "utf8");
var english = JSON.parse(fs.readFileSync(path.join(root, "translations/en.json"), "utf8")).index;

assert(review.indexOf("# Cutover-day review · October 11, 2026") === 0, "Review date must have documentary evidence");
assert(review.includes("review of core cutover guidance"), "Review must describe its scope");
assert(review.includes("not a certification of every individual train departure or live operating condition"), "Review must preserve its limits");
assert(english.sources_review.includes("Core Phase 2 guidance"), "Scope the homepage claim to core guidance");
assert(english.sources_review.includes(">October 11, 2026</time>"), "Visible date must match the dated review");
assert(english.sources_review_limits.includes("not live service information or verification of every train departure"), "Do not imply live or exhaustive verification");
assert(english.sources_review_limits.includes("Official changes may take time"), "Disclose possible update delays");

function paragraph(html, id) {
  var pattern = new RegExp('<p\\b[^>]*\\bid="' + id + '"[^>]*>([\\s\\S]*?)</p>', "g");
  var matches = Array.from(html.matchAll(pattern));
  assert.strictEqual(matches.length, 1, "Exactly one " + id + " paragraph");
  return matches[0][1];
}

languages.forEach(function (lang) {
  var strings = JSON.parse(fs.readFileSync(path.join(root, "translations", lang + ".json"), "utf8")).index;
  var pagePath = lang === "en" ? "index.html" : lang + "/index.html";
  var html = fs.readFileSync(path.join(root, pagePath), "utf8");
  var note = paragraph(html, "source-review");
  var limits = paragraph(html, "source-review-limits");
  var section = html.match(/<section\b[^>]*id="sources"[^>]*>([\s\S]*?)<\/section>/);

  assert(section, pagePath + " has a sources section");
  assert(section[1].includes("<h2>" + strings.sources_title + "</h2>"), pagePath + " has its localized heading");
  assert.strictEqual(note, strings.sources_review, pagePath + " matches the review dictionary");
  assert.strictEqual(limits, strings.sources_review_limits, pagePath + " matches the caveat dictionary");
  assert(note.includes('datetime="' + reviewDate + '"'), pagePath + " uses the documented review date");
  assert(note.includes('href="' + reviewUrl + '"'), pagePath + " links the review evidence");
  assert(limits.includes('href="https://www.njtransit.com/portalcutover"'), pagePath + " links official schedules");
  assert(limits.includes('href="https://www.njtransit.com/travel-alerts-to"'), pagePath + " links official alerts");
  assert(!/\{(?:date|review|schedules|alerts)\}/.test(note + limits), pagePath + " has no unresolved placeholders");
  assert(!/24|Data was last verified|September 20, 2026|verify all information|Every data point/.test(section[1]), pagePath + " has no blanket or 24-hour guarantee");
  if (lang !== "en") {
    assert.notStrictEqual(note, english.sources_review, lang + " review is translated");
    assert.notStrictEqual(limits, english.sources_review_limits, lang + " caveat is translated");
  }
  console.log("PASS scoped source review, evidence and localized caveats: " + pagePath);
});
