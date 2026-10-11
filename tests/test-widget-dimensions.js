// Legacy script-tag embeds must leave room for translated operational notices.
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "js/widget.js"), "utf8");
var count = 0;
function render(attrs) {
  var iframe;
  var el = {
    getAttribute: function (name) { return attrs[name] || null; },
    querySelector: function () { return iframe || null; },
    appendChild: function (child) { iframe = child; }
  };
  var context = { document: {
    readyState: "complete",
    querySelectorAll: function () { return [el]; },
    createElement: function (tag) {
      assert.strictEqual(tag, "iframe");
      return { style: {}, setAttribute: function () {} };
    }
  } };
  vm.runInNewContext(source, context);
  assert(iframe, "Loader creates the requested iframe");
  return iframe;
}
var locales = ["en", "ar", "es", "gu", "hi", "it", "ko", "pl", "pt", "tl", "zh"];
locales.forEach(function (lang) {
  var translations = JSON.parse(fs.readFileSync(path.join(root, "translations", lang + ".json"), "utf8"));
  var estimates = {};
  Object.keys(translations.js).forEach(function (key) {
    if (!/^extra_[a-z]+_\d+$/.test(key)) return;
    var prefix = key.split("_")[1];
    // Match embed.js: 620px base + translated notice lines and paragraph gap.
    estimates[prefix] = (estimates[prefix] || 620) + Math.ceil(translations.js[key].length / 42) * 24 + 12;
  });
  ["line", "station", "summary"].forEach(function (type) {
    [false, true].forEach(function (generic) {
      var attrs = { "data-type": generic ? "card" : type + "-card", "data-line": "north-jersey-coast", "data-station": "point-pleasant", "data-lang": lang };
      if (generic) attrs["data-card-type"] = type;
      var frame = render(attrs);
      assert.strictEqual(frame.height, type === "summary" ? "500px" : "960px", lang + " " + type + " default");
      assert.strictEqual(frame.width, "480px");
      assert(frame.src.indexOf("card.html?type=" + type) !== -1);
      assert(frame.src.indexOf("lang=" + lang) !== -1);
      if (type !== "summary") {
        Object.keys(estimates).forEach(function (prefix) {
          assert(parseInt(frame.height, 10) >= estimates[prefix], lang + " " + prefix + " notices need a larger loader default");
        });
      }
      attrs["data-height"] = "1234px";
      attrs["data-width"] = "100%";
      frame = render(attrs);
      assert.strictEqual(frame.height, "1234px", "Explicit height must override the fallback");
      assert.strictEqual(frame.width, "100%", "Explicit width must be preserved");
      attrs["data-height"] = "400";
      assert.strictEqual(render(attrs).height, "400", "Do not override intentionally smaller numeric heights");
      count++;
    });
  });
});
["line-guide", "compare", "coverage", "map"].forEach(function (type) {
  [false, true].forEach(function (generic) {
    var attrs = { "data-type": generic ? "widget" : type, "data-tool": type };
    assert.strictEqual(render(attrs).height, type === "coverage" || type === "map" ? "500px" : "600px");
    count++;
  });
});
assert.strictEqual(render({ "data-type": "tool", "data-tool": "line-guide" }).height, "700px");
console.log("PASS " + count + " loader dimension cases across 11 locales; explicit dimensions and non-card defaults preserved.");
