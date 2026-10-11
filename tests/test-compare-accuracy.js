// Runtime regressions for comparison planning and cutover-day accuracy.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "js/compare.js"), "utf8");
var count = 0;
function check(name, fn) { fn(); count++; console.log("PASS " + name); }
function element() {
  var classes = {};
  return {
    innerHTML: "", children: [], attributes: {},
    classList: {
      add: function (name) { classes[name] = true; },
      remove: function (name) { delete classes[name]; },
      contains: function (name) { return !!classes[name]; },
      toggle: function (name, active) { if (active) classes[name] = true; else delete classes[name]; }
    },
    setAttribute: function (key, value) { this.attributes[key] = value; },
    getAttribute: function (key) { return this.attributes[key]; },
    querySelectorAll: function () { return this.children; },
    appendChild: function (child) { this.children.push(child); },
    addEventListener: function () {},
    scrollIntoView: function () {},
    focus: function () {}
  };
}
var nodes = {};
var fixedNow = "2026-10-11T14:00:00Z";
function TestDate(value) { return new Date(arguments.length ? value : fixedNow); }
var context = {
  Date: TestDate,
  document: {
    readyState: "loading",
    getElementById: function (id) { return nodes[id] || (nodes[id] = element()); },
    createElement: element,
    addEventListener: function () {}
  },
  esc: function (value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); },
  t: function (key) { var data = JSON.parse(fs.readFileSync(path.join(root, "translations/en.json"), "utf8")); return key.split(".").reduce(function (v, k) { return v && v[k]; }, data) || key; },
  navigator: {},
  setInterval: function () {},
  updateCountdown: function () {}
};
// Expose private functions only in this VM copy; no production test hooks.
source = source.replace('  if (document.readyState === "loading") {',
  '  this.compareTest = { lines: LINES, destinations: DESTINATIONS, brielle: hasBrielleReplacement, run: runComparison, selectLine: selectLine, hoboken: buildHobokenOptions, newark: buildNewarkOptions, share: buildShareText, set: function (lineId, stationId) { currentLineId = lineId; currentStation = LINES[lineId].stations.filter(function (s) { return s.id === stationId; })[0]; currentDest = DESTINATIONS[0]; } };\n' +
  '  if (document.readyState === "loading") {');
// The IIFE is strict, so export to an explicit global test target.
source = source.replace('this.compareTest =', 'testTarget.compareTest =');
context.testTarget = {};
vm.runInNewContext(source, context);
var api = context.testTarget.compareTest;
var shared = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "js/line-data.js"), "utf8"), shared);
check("every comparison station exists in the shared line catalog", function () {
  Object.keys(api.lines).forEach(function (lineId) {
    api.lines[lineId].stations.forEach(function (station) {
      assert(shared.LINE_DATA[lineId].stations.some(function (s) { return s.id === station.id && s.name === station.name && s.branch === station.branch; }), lineId + ": " + station.id);
    });
  });
});
check("comparison omits unsupported station timings instead of inventing them", function () {
  ["towaco", "mount-arlington", "east-orange", "brick-church", "mount-tabor", "avenel"].forEach(function (id) {
    assert(!Object.keys(api.lines).some(function (lineId) { return api.lines[lineId].stations.some(function (s) { return s.id === id; }); }), id);
  });
});
check("Brielle closure applies at New Jersey boundaries and to both affected stations", function () {
  ["bay-head", "point-pleasant"].forEach(function (id) {
    assert.strictEqual(api.brielle("north-jersey-coast", id, new Date("2026-10-11T03:59:59Z")), false);
    assert.strictEqual(api.brielle("north-jersey-coast", id, new Date("2026-10-11T04:00:00Z")), true);
    assert.strictEqual(api.brielle("north-jersey-coast", id, new Date("2026-10-26T03:59:59Z")), true);
    assert.strictEqual(api.brielle("north-jersey-coast", id, new Date("2026-10-26T04:00:00Z")), false);
  });
  assert.strictEqual(api.brielle("north-jersey-coast", "manasquan", new Date(fixedNow)), false);
  assert.strictEqual(api.brielle("northeast-corridor", "bay-head", new Date(fixedNow)), false);
});
check("Brielle advice replaces previously rendered timings and share controls", function () {
  api.set("northeast-corridor", "trenton"); api.run();
  assert(nodes["results-normal"].innerHTML.indexOf("normal-ref-time") !== -1);
  ["bay-head", "point-pleasant"].forEach(function (id) {
    api.set("north-jersey-coast", id); api.run();
    assert(nodes["results-list"].innerHTML.indexOf("Brielle Bridge work, Oct 11–25") !== -1);
    assert(nodes["results-list"].innerHTML.indexOf("https://www.njtransit.com/service-advisory/2177824") !== -1);
    assert(nodes["results-list"].innerHTML.includes("Asbury Park"));
    assert.strictEqual(nodes["results-normal"].innerHTML, "");
    assert(!nodes["results-list"].innerHTML.includes("result-total"));
    assert(!nodes["results-share"].innerHTML.includes('id="share-btn"'));
    assert.strictEqual(nodes.results.classList.contains("hidden"), false);
  });
});
check("ordinary comparisons resume when leaving an affected station", function () {
  api.set("north-jersey-coast", "manasquan"); api.run();
  assert(nodes["results-list"].innerHTML.indexOf("result-total") !== -1);
  assert(!nodes["results-list"].innerHTML.includes("Buses replace trains"));
});
check("RVL options exclude unsupported Newark bus and use current PATH fare", function () {
  api.set("raritan-valley", "cranford");
  var opts = api.newark(api.lines["raritan-valley"]);
  assert.strictEqual(opts.length, 2);
  assert(!opts.some(function (o) { return o.legs.some(function (l) { return l.mode === "bus"; }); }));
  assert(opts.some(function (o) { return o.cost === "$3.25 PATH fare (separate)"; }));
});
check("Hoboken options label cross-honoring as weekday-only", function () {
  api.set("montclair-boonton", "bay-street");
  api.hoboken(api.lines["montclair-boonton"]).forEach(function (o) { assert.strictEqual(o.cost, "Cross-honored weekdays only"); });
});
check("visible and copied results disclose weekday and estimate limits", function () {
  api.set("montclair-boonton", "bay-street"); api.run();
  assert(nodes["results-header"].innerHTML.includes("Weekday planning (Oct 11 – Nov 14)"));
  assert(nodes["results-header"].innerHTML.includes("Selected stations only"));
  assert(nodes["results-header"].innerHTML.includes("Weekend routes and cross-honoring differ"));
  var text = api.share(api.lines["montclair-boonton"], api.hoboken(api.lines["montclair-boonton"]), 42);
  assert(text.includes("weekday planning (Oct 11–Nov 14, 2026)"));
  assert(text.includes("not live schedules"));
  assert(text.includes("https://www.njtransit.com/portalcutover"));
});
check("changing lines clears stale destination styling and ARIA state", function () {
  var destination = element(); destination.classList.add("active"); destination.setAttribute("aria-pressed", "true");
  nodes["dest-grid"].children = [destination];
  api.selectLine("northeast-corridor");
  assert.strictEqual(destination.classList.contains("active"), false);
  assert.strictEqual(destination.getAttribute("aria-pressed"), "false");
  assert.strictEqual(nodes.results.classList.contains("hidden"), true);
});
console.log("\n" + count + " comparison accuracy checks passed.");
