// Runtime coverage for service notices in cards and self-contained downloads.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var checks = 0;
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function escaped(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function environment(lang, translations, start) {
  var nodes = {};
  var context = {
    location: { search: "?lang=" + lang },
    _T: translations,
    setTimeout: function () {},
    Blob: function (parts) { this.text = parts.join(""); },
    URL: { createObjectURL: function (blob) { context.download = blob.text; return "blob:test"; }, revokeObjectURL: function () {} },
    esc: escaped,
    document: {
      readyState: start ? "complete" : "loading",
      documentElement: { lang: lang },
      body: { classList: { add: function () {} }, appendChild: function () {}, removeChild: function () {} },
      addEventListener: function () {},
      querySelectorAll: function () { return []; },
      getElementById: function (id) { return nodes[id] || (nodes[id] = {}); },
      createElement: function (tag) {
        if (tag === "canvas") {
          var canvas = { draws: [] };
          var ctx = {
            font: "14px sans-serif",
            measureText: function (text) {
              var fontSize = parseFloat(this.font.match(/([0-9]+)px/)[1]);
              return { width: Array.from(text).reduce(function (width, ch) { return width + fontSize * (/[^\x00-\x7f]/.test(ch) ? 1 : 0.56); }, 0) };
            },
            fillText: function (text, x, y) { canvas.draws.push({ text: text, x: x, y: y, width: this.measureText(text).width, align: this.textAlign || "left" }); }
          };
          ["beginPath", "moveTo", "arcTo", "closePath", "fill", "fillRect", "lineTo", "stroke", "arc"].forEach(function (name) { ctx[name] = function () {}; });
          canvas.getContext = function () { return ctx; };
          return canvas;
        }
        var element = { click: function () {} };
        Object.defineProperty(element, "textContent", { set: function (value) { this.innerHTML = escaped(value); } });
        return element;
      }
    },
    XMLHttpRequest: function () {
      this.open = function () {};
      this.send = function () { this.status = 200; this.responseText = JSON.stringify(translations); this.onload(); };
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read("js/line-data.js"), context);
  return context;
}
var prefixes = { "montclair-boonton": "mb", "morris-essex": "me", "northeast-corridor": "nec", "north-jersey-coast": "njcl", "raritan-valley": "rvl" };
var locales = ["en", "ar", "es", "gu", "hi", "it", "ko", "pl", "pt", "tl", "zh"];
locales.forEach(function (lang) {
  var translations = JSON.parse(read("translations/" + lang + ".json"));
  var ctx = environment(lang, translations, true);
  if (lang !== "en") ctx._T = undefined; // Exercise the asynchronous translation loader.
  vm.runInContext(read("js/cards.js"), ctx);
  ctx.LINE_ORDER.forEach(function (id) {
    var line = ctx.LINE_DATA[id];
    var expected = line.extraNotes.map(function (note, index) { return translations.js["extra_" + prefixes[id] + "_" + index] || note; });
    ["line", "station"].forEach(function (type) {
      var stationId = line.stations[line.stations.length - 1].id;
      var html = type === "line" ? ctx.renderLineCard(id) : ctx.renderStationCard(id, stationId);
      expected.forEach(function (note) { assert(html.indexOf(escaped(note)) !== -1, lang + " " + id + " " + type + " HTML notice"); });
      ["light", "dark"].forEach(function (theme) {
        var canvas = ctx.renderCardToCanvas(type, id, stationId, theme);
        var drawn = canvas.draws.map(function (draw) { return draw.text; }).join("").replace(/\s/g, "");
        expected.forEach(function (note) { assert(drawn.indexOf(note.replace(/\s/g, "")) !== -1, lang + " " + id + " " + type + " PNG notice"); });
        canvas.draws.forEach(function (draw) {
          assert(draw.y <= canvas.height - 10, lang + " " + id + " PNG text clipped vertically: " + draw.text);
          if (draw.align === "left" && draw.x === 24) {
            assert(draw.width <= canvas.width - 48, lang + " " + id + " PNG text clipped horizontally: " + draw.text);
          }
        });
        var dates = canvas.draws.filter(function (draw) { return draw.text === translations.card.date_range; })[0];
        assert(dates && dates.y < canvas.height - 30, "Footer must not overlap dates");
        checks++;
      });
    });
  });
  ["bay-head", "point-pleasant"].forEach(function (stationId) {
    var html = ctx.renderStationCard("north-jersey-coast", stationId);
    assert(html.indexOf('class="card-station-name"') !== -1, "Station ID must resolve, not silently fall back to a line card");
    assert(html.indexOf(escaped(translations.js.extra_njcl_0)) !== -1, lang + " " + stationId + " notice");
    var canvas = ctx.renderCardToCanvas("station", "north-jersey-coast", stationId, "light");
    var text = canvas.draws.map(function (draw) { return draw.text; }).join("").replace(/\s/g, "");
    assert(text.indexOf(translations.js.extra_njcl_0.replace(/\s/g, "")) !== -1, lang + " " + stationId + " PNG notice");
    assert(canvas.draws[0].text === (stationId === "bay-head" ? "Bay Head" : "Point Pleasant Beach"), "PNG station must resolve");
  });
  var embed = environment(lang, translations, false);
  var source = read("js/embed.js").replace("  function init() {", "  window.testEmbed = { state: state, downloadHtml: downloadHtml, getScriptTagCode: getScriptTagCode, getDefaultDimensions: getDefaultDimensions };\n  function init() {");
  vm.runInContext(source, embed);
  var original = JSON.stringify(embed.LINE_DATA);
  ["line", "station"].forEach(function (type) {
    ["bay-head", "point-pleasant"].forEach(function (stationId) {
      var state = embed.testEmbed.state;
      state.embedType = "card"; state.cardType = type; state.lineId = "north-jersey-coast"; state.stationId = stationId;
      embed.testEmbed.downloadHtml();
      assert.strictEqual(JSON.stringify(embed.LINE_DATA), original, "Export must not mutate LINE_DATA");
      var exported = environment(lang, {}, false);
      var inline = embed.download.match(/<script>\n([\s\S]*?)<\/script>/);
      assert(inline, "Self-contained script exists");
      vm.runInContext(inline[1], exported);
      assert(exported.document.getElementById("card-root").innerHTML.indexOf(escaped(translations.js.extra_njcl_0)) !== -1, lang + " downloaded " + type + " notice");
      if (type === "station") assert(exported.document.getElementById("card-root").innerHTML.indexOf('class="card-station-name"') !== -1, "Exported station must resolve");
      assert(Number(embed.testEmbed.getDefaultDimensions().height) > 620, "Embed height includes notices");
      assert(/data-height="\d+px"/.test(embed.testEmbed.getScriptTagCode()), "Script embeds preserve notice height");
      checks++;
    });
  });
  console.log("PASS " + lang + " line/station HTML, canvas bounds, and self-contained notices");
});
var ctx = environment("en", {}, true);
vm.runInContext(read("js/cards.js"), ctx);
var malicious = '</script><img src=x onerror="alert(1)"> & accessible transfer';
ctx.LINE_DATA["north-jersey-coast"].extraNotes = [malicious];
assert(ctx.renderLineCard("north-jersey-coast").indexOf(escaped(malicious)) !== -1, "Missing translation falls back to escaped source");
ctx.LINE_DATA["north-jersey-coast"].extraNotes = [Array(301).join("无空格通知")];
var canvas = ctx.renderCardToCanvas("line", "north-jersey-coast", null, "light");
assert(canvas.height > 1000, "Canvas grows for long translated notice");
canvas.draws.forEach(function (draw) { if (draw.align === "left" && draw.x === 24) assert(draw.width <= 552); });
var embed = environment("en", { js: { extra_njcl_0: malicious } }, false);
vm.runInContext(read("js/embed.js").replace("  function init() {", "  window.testEmbed = { state: state, downloadHtml: downloadHtml };\n  function init() {"), embed);
embed.testEmbed.state.embedType = "card";
embed.testEmbed.state.cardType = "line";
embed.testEmbed.state.lineId = "north-jersey-coast";
embed.testEmbed.downloadHtml();
assert.strictEqual((embed.download.match(/<\/script>/g) || []).length, 1, "Notice cannot terminate exported script element");
var exported = environment("en", {}, false);
vm.runInContext(embed.download.match(/<script>\n([\s\S]*?)<\/script>/)[1], exported);
assert(exported.document.getElementById("card-root").innerHTML.indexOf(escaped(malicious)) !== -1, "Export escapes notice during HTML rendering");
console.log("PASS fallback, script escaping, and long unbroken notice wrapping");
console.log("\n" + checks + " card export cases passed.");
