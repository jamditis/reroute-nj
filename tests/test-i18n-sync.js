#!/usr/bin/env node
/**
 * Reroute NJ -- i18n synchronization test suite
 *
 * Catches the recurring class of bugs where English translations break because:
 * 1. The hardcoded EN object in i18n.js drifts out of sync with translations/en.json
 * 2. Embed pages (widget.html) pre-empt i18n.js by setting window._T before it loads
 * 3. t() calls reference keys that don't exist in the EN object
 *
 * History:
 *   Feb 14-15: coverage.* keys missing from EN object -> raw keys on English pages
 *   Feb 16: widget.html set window._T = {} for English -> raw keys on embeds
 *
 * Run: node tests/test-i18n-sync.js
 */

"use strict";

var fs = require("fs");
var path = require("path");

// =========================================================================
// CONFIGURATION
// =========================================================================

var PROJECT_ROOT = path.join(__dirname, "..");
var JS_DIR = path.join(PROJECT_ROOT, "js");
var TRANSLATIONS_DIR = path.join(PROJECT_ROOT, "translations");
var I18N_FILE = path.join(JS_DIR, "i18n.js");
var WIDGET_FILE = path.join(PROJECT_ROOT, "widget.html");
var CARD_FILE = path.join(PROJECT_ROOT, "card.html");
var EN_JSON_FILE = path.join(TRANSLATIONS_DIR, "en.json");

// Sections from en.json that must be present in the hardcoded EN object.
// These are the sections used by runtime t() calls in JS files.
var RUNTIME_SECTIONS = ["common", "js", "compare", "coverage"];

// JS files that use t() calls and whose keys must exist in EN
var JS_FILES_WITH_T_CALLS = [
  "app.js",
  "compare.js",
  "coverage.js",
  "map.js",
  "shared.js"
];

// =========================================================================
// TEST INFRASTRUCTURE
// =========================================================================

var totalTests = 0;
var passCount = 0;
var failCount = 0;
var results = [];

function test(name, passed, detail) {
  totalTests++;
  if (passed) {
    passCount++;
    results.push({ name: name, status: "PASS", detail: detail || "" });
    console.log("  \x1b[32mPASS\x1b[0m  " + name);
  } else {
    failCount++;
    results.push({ name: name, status: "FAIL", detail: detail || "" });
    console.log("  \x1b[31mFAIL\x1b[0m  " + name + (detail ? " -- " + detail : ""));
  }
}

// =========================================================================
// HELPERS
// =========================================================================

/**
 * Flatten a nested object into dot-notation keys.
 */
function flattenObject(obj, prefix) {
  var out = {};
  prefix = prefix || "";
  Object.keys(obj).forEach(function (key) {
    var fullKey = prefix ? prefix + "." + key : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      var nested = flattenObject(obj[key], fullKey);
      Object.keys(nested).forEach(function (nk) {
        out[nk] = nested[nk];
      });
    } else {
      out[fullKey] = obj[key];
    }
  });
  return out;
}

/**
 * Extract the hardcoded EN object from i18n.js source code.
 * Parses the var EN = { ... }; block by tracking brace depth.
 */
function extractENObject(i18nSrc) {
  var startMarker = "var EN = {";
  var startIdx = i18nSrc.indexOf(startMarker);
  if (startIdx === -1) return null;

  var braceStart = i18nSrc.indexOf("{", startIdx);
  var depth = 0;
  var i = braceStart;
  var inString = false;
  var stringChar = null;

  for (; i < i18nSrc.length; i++) {
    var ch = i18nSrc[i];
    var prev = i > 0 ? i18nSrc[i - 1] : "";

    if (inString) {
      if (ch === stringChar && prev !== "\\") {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) break;
    }
  }

  var jsonLike = i18nSrc.substring(braceStart, i + 1);

  // Remove trailing commas for JSON.parse compatibility
  jsonLike = jsonLike.replace(/,\s*([\]}])/g, "$1");

  try {
    return JSON.parse(jsonLike);
  } catch (e) {
    console.error("Failed to parse EN object: " + e.message);
    return null;
  }
}

/**
 * Extract all t("key") call arguments from a JS source file.
 * Returns an array of key strings (deduplicated).
 */
function extractTCalls(src) {
  var keys = [];
  var seen = {};
  // Match t("some.key") or t('some.key')
  var re = /\bt\(\s*["']([^"']+)["']\s*\)/g;
  var match;
  while ((match = re.exec(src)) !== null) {
    if (!seen[match[1]]) {
      seen[match[1]] = true;
      keys.push(match[1]);
    }
  }
  return keys;
}

// =========================================================================
// LOAD DATA
// =========================================================================

var i18nSrc = fs.readFileSync(I18N_FILE, "utf8");
var widgetSrc = fs.readFileSync(WIDGET_FILE, "utf8");
var enJson = JSON.parse(fs.readFileSync(EN_JSON_FILE, "utf8"));
var enJsonFlat = flattenObject(enJson);

var enObject = extractENObject(i18nSrc);
var enObjectFlat = enObject ? flattenObject(enObject) : {};

// =========================================================================
// TEST 1: EN object was successfully parsed from i18n.js
// =========================================================================

console.log("\n=== 1. i18n.js EN object can be parsed ===");

test("EN object extracted from i18n.js", enObject !== null,
  enObject ? Object.keys(enObjectFlat).length + " keys found" : "Could not parse EN object");

// =========================================================================
// TEST 2: All runtime sections from en.json exist in EN object
// =========================================================================

console.log("\n=== 2. EN object has all runtime-relevant sections ===");

if (enObject) {
  RUNTIME_SECTIONS.forEach(function (section) {
    var hasSection = enObject.hasOwnProperty(section) &&
      typeof enObject[section] === "object" &&
      Object.keys(enObject[section]).length > 0;
    test("EN object has '" + section + "' section", hasSection,
      hasSection
        ? Object.keys(enObject[section]).length + " keys"
        : "Section missing or empty");
  });
}

// =========================================================================
// TEST 3: Every key in EN object runtime sections matches en.json
// =========================================================================

console.log("\n=== 3. EN object values match en.json ===");

if (enObject) {
  RUNTIME_SECTIONS.forEach(function (section) {
    if (!enObject[section] || !enJson[section]) return;

    var mismatches = [];
    Object.keys(enObject[section]).forEach(function (key) {
      var enObjVal = enObject[section][key];
      var enJsonVal = enJson[section] ? enJson[section][key] : undefined;
      if (enJsonVal === undefined) {
        mismatches.push(section + "." + key + " (in EN but not en.json)");
      } else if (enObjVal !== enJsonVal) {
        mismatches.push(section + "." + key + " (values differ)");
      }
    });

    test("'" + section + "' values match en.json", mismatches.length === 0,
      mismatches.length > 0
        ? mismatches.length + " mismatches: " + mismatches.slice(0, 5).join(", ")
        : "");
  });
}

// =========================================================================
// TEST 4: Every t()-referenced key exists in the EN object
//         (catches the Feb 14-15 bug: keys used by JS but missing from EN)
//
//         Note: en.json contains template-only keys (titles, hero text,
//         meta descriptions) that are injected into HTML by generate-pages.py
//         and never accessed via t(). Those don't need to be in the EN object.
//         This test only validates keys that JS code actually calls t() with.
// =========================================================================

console.log("\n=== 4. t()-referenced keys all present in EN object ===");

if (enObject) {
  // Collect all t() keys grouped by section
  var tKeysBySection = {};
  JS_FILES_WITH_T_CALLS.forEach(function (filename) {
    var filePath = path.join(JS_DIR, filename);
    var src = fs.readFileSync(filePath, "utf8");
    extractTCalls(src).forEach(function (key) {
      var parts = key.split(".");
      if (parts.length >= 2) {
        var section = parts[0];
        if (!tKeysBySection[section]) tKeysBySection[section] = {};
        tKeysBySection[section][key] = true;
      }
    });
  });

  RUNTIME_SECTIONS.forEach(function (section) {
    var sectionKeys = tKeysBySection[section] || {};
    var used = Object.keys(sectionKeys);
    if (used.length === 0) {
      test("'" + section + "' t() keys in EN object", true, "No t() calls for this section");
      return;
    }

    var missing = used.filter(function (key) {
      return !enObjectFlat.hasOwnProperty(key);
    });

    test("'" + section + "' t() keys in EN object (" + used.length + " used)", missing.length === 0,
      missing.length > 0
        ? missing.length + " MISSING from EN: " + missing.join(", ")
        : "");
  });
}

// =========================================================================
// TEST 5: Every t() call in JS files references a valid key
// =========================================================================

console.log("\n=== 5. All t() calls reference valid EN keys ===");

JS_FILES_WITH_T_CALLS.forEach(function (filename) {
  var filePath = path.join(JS_DIR, filename);
  var src = fs.readFileSync(filePath, "utf8");
  var tKeys = extractTCalls(src);

  if (tKeys.length === 0) {
    test(filename + " t() calls reference valid keys", true, "No t() calls found");
    return;
  }

  var missing = [];
  tKeys.forEach(function (key) {
    if (!enObjectFlat.hasOwnProperty(key)) {
      missing.push(key);
    }
  });

  test(filename + " t() calls reference valid keys (" + tKeys.length + " calls)", missing.length === 0,
    missing.length > 0
      ? missing.length + " keys not in EN: " + missing.join(", ")
      : "");
});

// =========================================================================
// TEST 6: t() call keys also exist in en.json
// =========================================================================

console.log("\n=== 6. All t() call keys exist in en.json ===");

var allTKeys = [];
JS_FILES_WITH_T_CALLS.forEach(function (filename) {
  var filePath = path.join(JS_DIR, filename);
  var src = fs.readFileSync(filePath, "utf8");
  extractTCalls(src).forEach(function (key) {
    if (allTKeys.indexOf(key) === -1) allTKeys.push(key);
  });
});

var missingFromJson = allTKeys.filter(function (key) {
  return !enJsonFlat.hasOwnProperty(key);
});

test("All " + allTKeys.length + " unique t() keys exist in en.json", missingFromJson.length === 0,
  missingFromJson.length > 0
    ? "Missing: " + missingFromJson.join(", ")
    : "");

// =========================================================================
// TEST 7: i18n.js fallback mechanism is intact
// =========================================================================

console.log("\n=== 7. i18n.js fallback mechanism ===");

// Must use: if (!window._T) { window._T = EN; }
// An empty {} is truthy and would bypass this guard.
var hasFallback = /if\s*\(\s*!window\._T\s*\)\s*\{?\s*\n?\s*window\._T\s*=\s*EN/.test(i18nSrc);
test("i18n.js has !window._T fallback to EN", hasFallback,
  hasFallback ? "" : "Expected: if (!window._T) { window._T = EN; }");

// =========================================================================
// TEST 8: widget.html does NOT set window._T for English
//         (catches the Feb 16 bug)
// =========================================================================

console.log("\n=== 8. widget.html English translation path ===");

// The English branch must NOT set window._T to anything truthy
var englishBranchRe = /if\s*\(\s*!lang\s*\|\|\s*lang\s*===?\s*["']en["']\s*\)\s*\{([^}]*)\}/;
var englishMatch = widgetSrc.match(englishBranchRe);

if (englishMatch) {
  var englishBlock = englishMatch[1];
  var setsTWindow = /window\._T\s*=/.test(englishBlock);
  test("widget.html does NOT set window._T in English path", !setsTWindow,
    setsTWindow
      ? "English path sets window._T (blocks i18n.js EN fallback)"
      : "Correctly leaves window._T unset for i18n.js");
} else {
  test("widget.html has English language branch", false,
    "Could not find if (!lang || lang === 'en') block");
}

// =========================================================================
// TEST 9: widget.html XHR error paths don't block EN fallback
// =========================================================================

console.log("\n=== 9. widget.html error fallback paths ===");

// onerror handler must not set window._T = {}
var onerrorRe = /xhr\.onerror\s*=\s*function\s*\(\)\s*\{([^}]*)\}/;
var onerrorMatch = widgetSrc.match(onerrorRe);

if (onerrorMatch) {
  var onerrorBlock = onerrorMatch[1];
  var onerrorSetsTWindow = /window\._T\s*=\s*\{\}/.test(onerrorBlock);
  test("widget.html onerror does NOT set window._T = {}", !onerrorSetsTWindow,
    onerrorSetsTWindow
      ? "onerror sets window._T = {} (blocks EN fallback)"
      : "");
} else {
  test("widget.html has xhr.onerror handler", false,
    "Could not find xhr.onerror handler");
}

// catch blocks must not set window._T = {}
var catchRe = /catch\s*\(\s*e\s*\)\s*\{([^}]*)\}/g;
var catchMatch;
var catchSetsTWindow = false;
while ((catchMatch = catchRe.exec(widgetSrc)) !== null) {
  if (/window\._T\s*=\s*\{\}/.test(catchMatch[1])) {
    catchSetsTWindow = true;
    break;
  }
}
test("widget.html catch blocks don't set window._T = {}", !catchSetsTWindow,
  catchSetsTWindow
    ? "catch block sets window._T = {} (blocks EN fallback)"
    : "");

// =========================================================================
// TEST 10: widget.html loads i18n.js inside fetchTranslations callback
// =========================================================================

console.log("\n=== 10. widget.html script load order ===");

var loadOrderRe = /fetchTranslations\s*\(\s*function\s*\(\)\s*\{[\s\S]*?loadScript\(\s*["']js\/i18n\.js["']/;
var hasCorrectOrder = loadOrderRe.test(widgetSrc);
test("widget.html loads i18n.js inside fetchTranslations callback", hasCorrectOrder,
  hasCorrectOrder ? "" : "i18n.js must load after fetchTranslations resolves");

// =========================================================================
// TEST 11: widget.html script dependency chains
// =========================================================================

console.log("\n=== 11. widget.html script dependency chains ===");

// line-guide: i18n -> shared -> line-data -> app
var lineGuideChain = /loadScript\(\s*["']js\/i18n\.js["'][\s\S]*?loadScript\(\s*["']js\/shared\.js["'][\s\S]*?loadScript\(\s*["']js\/line-data\.js["'][\s\S]*?loadScript\(\s*["']js\/app\.js["']/;
test("line-guide: i18n -> shared -> line-data -> app", lineGuideChain.test(widgetSrc), "");

// compare: i18n -> shared -> compare
var compareChain = /loadScript\(\s*["']js\/i18n\.js["'][\s\S]*?loadScript\(\s*["']js\/shared\.js["'][\s\S]*?loadScript\(\s*["']js\/compare\.js["']/;
test("compare: i18n -> shared -> compare", compareChain.test(widgetSrc), "");

// coverage: i18n -> shared -> coverage
var coverageChain = /loadScript\(\s*["']js\/i18n\.js["'][\s\S]*?loadScript\(\s*["']js\/shared\.js["'][\s\S]*?loadScript\(\s*["']js\/coverage\.js["']/;
test("coverage: i18n -> shared -> coverage", coverageChain.test(widgetSrc), "");

// =========================================================================
// TEST 12: Translated pages inject window._T with runtime sections
// =========================================================================

console.log("\n=== 12. Translated pages include runtime sections ===");

var translatedDirs = ["es", "zh", "ko"];
translatedDirs.forEach(function (lang) {
  var indexPath = path.join(PROJECT_ROOT, lang, "index.html");
  if (!fs.existsSync(indexPath)) {
    test("[" + lang + "] index.html exists", false, "File not found");
    return;
  }

  var html = fs.readFileSync(indexPath, "utf8");

  var tWindowMatch = html.match(/window\._T\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!tWindowMatch) {
    test("[" + lang + "] index.html injects window._T", false, "window._T assignment not found");
    return;
  }

  var injectedT;
  try {
    injectedT = JSON.parse(tWindowMatch[1]);
  } catch (e) {
    test("[" + lang + "] index.html window._T is valid JSON", false, e.message);
    return;
  }

  var missingSections = RUNTIME_SECTIONS.filter(function (section) {
    return !injectedT[section] || Object.keys(injectedT[section]).length === 0;
  });

  test("[" + lang + "] index.html has runtime sections in _T", missingSections.length === 0,
    missingSections.length > 0
      ? "Missing: " + missingSections.join(", ")
      : RUNTIME_SECTIONS.join(", ") + " present");
});

// =========================================================================
// TEST 13: English index.html does NOT inject window._T
// =========================================================================

console.log("\n=== 13. English index.html relies on i18n.js fallback ===");

var enIndexPath = path.join(PROJECT_ROOT, "index.html");
var enIndexHtml = fs.readFileSync(enIndexPath, "utf8");
var enIndexHasWindowT = /window\._T\s*=/.test(enIndexHtml);
test("English index.html does NOT set window._T", !enIndexHasWindowT,
  enIndexHasWindowT
    ? "Sets window._T (should rely on i18n.js EN fallback)"
    : "Relies on i18n.js to set window._T = EN");

// =========================================================================
// TEST 14: card.html uses its own translation handling (not i18n.js)
// =========================================================================

console.log("\n=== 14. card.html translation handling ===");

var cardSrc = fs.readFileSync(CARD_FILE, "utf8");
var cardLoadsI18n = /i18n\.js/.test(cardSrc);
test("card.html does not load i18n.js", !cardLoadsI18n,
  cardLoadsI18n ? "Loads i18n.js (should use cards.js)" : "Uses cards.js");

var cardLoadsCards = /cards\.js/.test(cardSrc);
test("card.html loads cards.js", cardLoadsCards, "");

// =========================================================================
// TEST 15: EN object covers all t()-used keys per section
//          (en.json may have more keys for template-only use; that's fine)
// =========================================================================

console.log("\n=== 15. EN coverage of t()-used keys per section ===");

if (enObject) {
  // Re-collect t() keys by section for this test
  var tUsedBySection = {};
  JS_FILES_WITH_T_CALLS.forEach(function (filename) {
    var filePath = path.join(JS_DIR, filename);
    var src = fs.readFileSync(filePath, "utf8");
    extractTCalls(src).forEach(function (key) {
      var parts = key.split(".");
      if (parts.length >= 2) {
        var section = parts[0];
        if (!tUsedBySection[section]) tUsedBySection[section] = [];
        if (tUsedBySection[section].indexOf(key) === -1) {
          tUsedBySection[section].push(key);
        }
      }
    });
  });

  RUNTIME_SECTIONS.forEach(function (section) {
    var used = tUsedBySection[section] || [];
    var enObjCount = enObject[section] ? Object.keys(enObject[section]).length : 0;
    var coverageOk = enObjCount >= used.length;
    test("'" + section + "' EN has " + enObjCount + " keys (>= " + used.length + " t()-used)",
      coverageOk,
      !coverageOk
        ? "EN has fewer keys (" + enObjCount + ") than t() calls need (" + used.length + ")"
        : "");
  });
}

// =========================================================================
// SUMMARY
// =========================================================================

console.log("\n" + "=".repeat(60));
console.log("  Reroute NJ -- i18n synchronization tests");
console.log("=".repeat(60));
console.log("  Total: " + totalTests + "  |  \x1b[32mPassed: " + passCount + "\x1b[0m  |  " +
  (failCount > 0 ? "\x1b[31m" : "\x1b[32m") + "Failed: " + failCount + "\x1b[0m");
console.log("=".repeat(60));

if (failCount > 0) {
  console.log("\nFailed tests:");
  results.forEach(function (r) {
    if (r.status === "FAIL") {
      console.log("  - " + r.name + (r.detail ? ": " + r.detail : ""));
    }
  });
}

console.log("");
process.exit(failCount > 0 ? 1 : 0);
