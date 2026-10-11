// New Jersey dates must not depend on a reader's timezone or assert completion.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "js/shared.js"), "utf8");
source = source.slice(source.indexOf("var PHASE1_START"), source.indexOf("// ACCESSIBILITY TOGGLE INITIALIZATION"));
var translations = JSON.parse(fs.readFileSync(path.join(root, "translations/en.json"), "utf8"));
var now, output = { innerHTML: "" };
function Clock(value) { return new Date(arguments.length ? value : now); }
Clock.UTC = Date.UTC;
var context = {
  Date: Clock, Intl: Intl,
  document: { addEventListener: function () {}, getElementById: function () { return output; } },
  t: function (key) { return translations.common[key.split(".")[1]]; }
};
vm.runInNewContext(source, context);
function check(time, pattern) {
  now = time;
  context.updateCountdown();
  assert(pattern.test(output.innerHTML), time + ": " + output.innerHTML);
  console.log("PASS New Jersey countdown " + time);
}
check("2026-10-11T03:59:59Z", /begins in.*1/);
check("2026-10-11T04:00:00Z", /35.*remaining in Phase 2/);
check("2026-11-01T03:59:59Z", /15.*remaining/);
check("2026-11-01T04:00:00Z", /14.*remaining/);
check("2026-11-01T06:30:00Z", /14.*remaining/);
check("2026-11-15T04:59:59Z", /1.*remaining/);
check("2026-11-15T05:00:00Z", /Planned cutover end/);
assert(!/Phase 2 complete/.test(output.innerHTML), "A calendar deadline cannot confirm service restoration");
["app.js", "compare.js"].forEach(function (file) {
  var content = fs.readFileSync(path.join(root, "js", file), "utf8");
  assert(!content.includes("$2.75"), file + " must not retain outdated PATH fare");
  assert(content.includes("$3.25"), file + " must use current PATH fare");
});
console.log("PASS current PATH fare in guide and comparison");

// Run without Intl, without formatToParts, and with a throwing implementation.
var intlVariants = [
  { name: "Intl absent", value: undefined },
  { name: "DateTimeFormat absent", value: {} },
  { name: "formatToParts absent", value: { DateTimeFormat: function () { return {}; } } },
  { name: "timezone rejected", value: { DateTimeFormat: function () { throw new Error("unsupported timezone"); } } },
  { name: "formatToParts throws", value: { DateTimeFormat: function () { return { formatToParts: function () { throw new Error("incomplete implementation"); } }; } } },
  { name: "formatToParts incomplete", value: { DateTimeFormat: function () { return { formatToParts: function () { return []; } }; } } }
];
var fallbackDates = [
  "2026-01-01T04:59:59Z", "2026-01-01T05:00:00Z",
  "2026-03-08T04:59:59Z", "2026-03-08T05:00:00Z",
  "2026-03-08T06:59:59Z", "2026-03-08T07:00:00Z",
  "2026-03-09T03:59:59Z", "2026-03-09T04:00:00Z",
  "2026-10-11T03:59:59Z", "2026-10-11T04:00:00Z",
  "2026-11-01T05:59:59Z", "2026-11-01T06:00:00Z",
  "2026-11-02T04:59:59Z", "2026-11-02T05:00:00Z",
  "2026-11-15T04:59:59Z", "2026-11-15T05:00:00Z",
  "2027-03-14T07:00:00Z", "2027-11-07T06:00:00Z"
];
context.Intl = Intl;
var expectedDays = fallbackDates.map(function (date) { return context.cutoverCalendarDay(new Date(date)); });
intlVariants.forEach(function (variant) {
  context.Intl = variant.value;
  fallbackDates.forEach(function (date, index) {
    assert.strictEqual(context.cutoverCalendarDay(new Date(date)), expectedDays[index], variant.name + " at " + date);
  });
  now = "2026-10-11T04:00:00Z";
  context.updateCountdown();
  assert(/35.*remaining/.test(output.innerHTML), variant.name + " must not interrupt page initialization");
  console.log("PASS Eastern calendar fallback: " + variant.name);
});
