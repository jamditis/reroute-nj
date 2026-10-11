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
