// Service notice disclosure, accessibility, and Eastern cutover boundaries.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "js/shared.js"), "utf8");
var css = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
var start = source.indexOf("    // Essential service changes stay visible");
var end = source.indexOf("    // Index previously had no H1.", start);
assert(start > 0 && end > start);
var block = source.slice(start, end);
var count = 0;
function check(name, fn) { fn(); count++; console.log("PASS " + name); }
function Node(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.className = ""; this.textContent = ""; this.events = {}; }
Node.prototype.addEventListener = function (event, handler) { this.events[event] = handler; };
Node.prototype.setAttribute = function (key, value) { this.attributes[key] = value; };
Node.prototype.appendChild = function (node) { this.children.push(node); node.parentNode = this; return node; };
Node.prototype.removeChild = function (node) { this.children.splice(this.children.indexOf(node), 1); node.parentNode = null; return node; };
Node.prototype.insertBefore = function (node, before) { var i = this.children.indexOf(before); this.children.splice(i < 0 ? this.children.length : i, 0, node); node.parentNode = this; };
Object.defineProperty(Node.prototype, "nextSibling", { get: function () { return this.parentNode && this.parentNode.children[this.parentNode.children.indexOf(this) + 1]; } });
Object.defineProperty(Node.prototype, "firstChild", { get: function () { return this.children[0]; } });
function find(node, predicate) { if (predicate(node)) return node; for (var i = 0; i < node.children.length; i++) { var result = find(node.children[i], predicate); if (result) return result; } return null; }
function run(time, translations, existing) {
  var body = new Node("body");
  var header = body.appendChild(new Node("header"));
  var main = body.appendChild(new Node("main"));
  var phase = main.appendChild(new Node("div"));
  var oldBanner = existing ? body.appendChild(new Node("div")) : null;
  if (oldBanner) { oldBanner.className = "alert-banner"; oldBanner.appendChild(new Node("details")); }
  var ctx = {
    Date: function () { return new Date(time); },
    CUTOVER_START: new Date("2026-10-11T00:00:00-04:00"),
    CUTOVER_END: new Date("2026-11-15T00:00:00-05:00"),
    header: header, phase: phase,
    window: { events: {}, addEventListener: function (name, handler) { this.events[name] = handler; } },
    t: function (key) { return translations && translations[key] || key; },
    document: { createElement: function (tag) { return new Node(tag); }, querySelector: function () { return find(body, function (node) { return node.className.indexOf("alert-banner") !== -1; }); } }
  };
  vm.runInNewContext(block, ctx);
  return { body: body, banner: ctx.banner, context: ctx, title: find(ctx.banner, function (node) { return node.id === "service-notice-title"; }) };
}
check("headline changes at Eastern midnight, not UTC midnight", function () {
  assert.strictEqual(run("2026-10-11T03:59:59Z").title.textContent, "Phase 2 starts October 11");
  assert.strictEqual(run("2026-10-11T04:00:00Z").title.textContent, "Phase 2 is underway");
  assert.strictEqual(run("2026-11-15T04:59:59Z").title.textContent, "Phase 2 is underway");
  assert.strictEqual(run("2026-11-15T05:00:00Z").title.textContent, "Check current service before traveling");
});
check("post-cutover text never automatically asserts completion", function () {
  var result = run("2026-11-15T05:00:00Z");
  var paragraph = find(result.banner, function (node) { return node.className === "service-notice-schedule"; });
  assert(paragraph.textContent.includes("depends on safety testing"));
  assert(!paragraph.textContent.includes("Temporary schedules begin"));
  assert(!find(result.banner, function (node) { return node.className === "service-notice-tickets"; }), "Temporary ticket rules must expire");
});
check("notice starts expanded with accessible disclosure and visible reminder", function () {
  var result = run("2026-10-11T14:00:00Z", null, true);
  assert(!find(result.banner, function (node) { return ["details", "summary"].indexOf(node.tagName) !== -1; }));
  var button = find(result.banner, function (node) { return node.tagName === "button"; });
  var details = find(result.banner, function (node) { return node.className === "service-notice-details"; });
  assert.strictEqual(button.type, "button");
  assert.strictEqual(button.attributes["aria-controls"], details.id);
  assert.strictEqual(button.attributes["aria-expanded"], "true");
  assert.strictEqual(details.hidden, false);
  assert.strictEqual(button.textContent, "Hide service details");
  assert.strictEqual(result.banner.attributes.role, "region");
  assert.strictEqual(result.banner.attributes["aria-labelledby"], result.title.id);
  assert.strictEqual(result.context.phase, null);
});
check("full pages without an old alert receive a notice after the header", function () {
  var result = run("2026-10-11T14:00:00Z");
  assert.strictEqual(result.body.children[0].tagName, "header");
  assert.strictEqual(result.body.children[1], result.banner);
  assert.strictEqual(result.body.children[2].tagName, "main");
  assert(source.includes("header.parentNode.insertBefore(banner, header.nextSibling)"));
});
check("translation content is inserted as text and official CTA is stable", function () {
  var result = run("2026-10-11T14:00:00Z", { "common.service_notice_active": "<translated title>" });
  assert.strictEqual(result.title.textContent, "<translated title>");
  assert.strictEqual(result.title.children.length, 0);
  var link = find(result.banner, function (node) { return node.tagName === "a"; });
  assert.strictEqual(link.href, "https://www.njtransit.com/portalcutover");
  assert.strictEqual(link.rel, "noopener");
});
check("notice essentials mention Sunday schedules, Monday diversions, weekends and tickets", function () {
  var result = run("2026-10-11T14:00:00Z");
  var paragraph = find(result.banner, function (node) { return node.className === "service-notice-schedule"; });
  ["Sunday, October 11", "Monday, October 12", "Weekend trains", "adjusted times"].forEach(function (text) { assert(paragraph.textContent.includes(text)); });
  assert(find(result.banner, function (node) { return node.className === "service-notice-tickets"; }).textContent.includes("One-way and round-trip"));
});
check("simplified, mobile, print, RTL-safe and high contrast treatments remain", function () {
  assert(css.includes('body[data-view="simplified"] .alert-banner.service-update { display: block !important; }'));
  assert(css.includes(".service-notice-link { grid-column: 2;"));
  assert(css.includes("min-height: 44px"));
  assert(css.includes(".service-notice { grid-template-columns: 26px minmax(0, 1fr)"));
  assert(css.includes('body[data-contrast="high"] .alert-banner.service-update'));
  assert(css.includes(".alert-banner.service-update { background: #fff; color: #000; border: 1px solid #000;"));
});
check("repeated toggle keeps title and official link visible and updates ARIA", function () {
  var result = run("2026-10-11T14:00:00Z");
  var button = find(result.banner, function (node) { return node.tagName === "button"; });
  var details = find(result.banner, function (node) { return node.className === "service-notice-details"; });
  var link = find(result.banner, function (node) { return node.tagName === "a"; });
  for (var i = 0; i < 3; i++) {
    button.events.click();
    assert.strictEqual(details.hidden, true);
    assert.strictEqual(button.attributes["aria-expanded"], "false");
    assert.strictEqual(button.textContent, "Show service details");
    assert.strictEqual(result.banner.attributes["data-expanded"], "false");
    assert.notStrictEqual(result.title.hidden, true);
    assert.notStrictEqual(link.hidden, true);
    assert.notStrictEqual(link.parentNode, details);
    button.events.click();
    assert.strictEqual(details.hidden, false);
    assert.strictEqual(button.attributes["aria-expanded"], "true");
  }
});
check("translated toggle labels are used in both states", function () {
  var result = run("2026-10-11T14:00:00Z", {
    "common.service_notice_collapse": "Ocultar detalles",
    "common.service_notice_expand": "Mostrar detalles"
  });
  var button = find(result.banner, function (node) { return node.tagName === "button"; });
  assert.strictEqual(button.textContent, "Ocultar detalles");
  button.events.click();
  assert.strictEqual(button.textContent, "Mostrar detalles");
});
check("print expands all details then restores the selected screen state", function () {
  var result = run("2026-10-11T14:00:00Z");
  var button = find(result.banner, function (node) { return node.tagName === "button"; });
  var details = find(result.banner, function (node) { return node.className === "service-notice-details"; });
  button.events.click();
  result.context.window.events.beforeprint();
  assert.strictEqual(details.hidden, false);
  assert.strictEqual(button.attributes["aria-expanded"], "true");
  result.context.window.events.afterprint();
  assert.strictEqual(details.hidden, true);
  assert.strictEqual(button.attributes["aria-expanded"], "false");
  assert(css.includes(".service-notice-details[hidden] { display: block !important; }"));
  assert(css.includes(".service-notice-marker, .service-notice-toggle { display: none; }"));
});
check("pulse is active-phase only, brief, and disabled for reduced motion and simplified view", function () {
  assert.strictEqual(run("2026-10-11T03:59:59Z").banner.attributes["data-phase"], "inactive");
  assert.strictEqual(run("2026-10-11T04:00:00Z").banner.attributes["data-phase"], "active");
  assert.strictEqual(run("2026-11-15T05:00:00Z").banner.attributes["data-phase"], "inactive");
  assert(css.includes('.service-update[data-phase="active"] .service-notice-marker { animation: service-marker-pulse 2.4s ease-in-out 2; }'));
  assert(css.includes('body[data-view="simplified"] .service-notice-marker { animation: none !important; }'));
  assert(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation: none !important/.test(css));
});
check("progressive enhancement does not duplicate controls and no-JS markup stays expanded", function () {
  var result = run("2026-10-11T14:00:00Z");
  vm.runInNewContext(block, result.context);
  var matches = [];
  function visit(node) { if (node.tagName === "button") matches.push(node); node.children.forEach(visit); }
  visit(result.context.banner);
  assert.strictEqual(matches.length, 1);
  assert(source.includes('if (main.getAttribute("data-wayfinding") === "ready") return;'));
  var index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  var fallback = index.slice(index.indexOf('<section class="alert-banner'), index.indexOf('<nav class="tool-nav'));
  assert(!fallback.includes("<button"));
  assert(!fallback.includes(" hidden"));
  assert(fallback.includes("service-notice-schedule"));
  assert(fallback.includes("service-notice-tickets"));
});
console.log("\n" + count + " service notice checks passed.");
