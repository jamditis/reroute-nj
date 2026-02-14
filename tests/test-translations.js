/**
 * Translation Validation Test Suite for Reroute NJ
 *
 * Validates completeness and consistency across all 11 language files.
 * Run: node tests/test-translations.js
 */

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var TRANSLATIONS_DIR = path.join(__dirname, "..", "translations");
var LANGUAGES = ["en", "es", "zh", "tl", "ko", "pt", "gu", "hi", "it", "ar", "pl"];
var RTL_LANGUAGES = ["ar"];
var LTR_LANGUAGES = LANGUAGES.filter(function (l) { return RTL_LANGUAGES.indexOf(l) === -1; });

// Transit-specific numbers that must be preserved across translations
var TRANSIT_NUMBERS = ["133", "112", "109", "92"];

// HTML tags that commonly appear in translation values
var HTML_TAG_RE = /<(strong|a|code|em|br)\b[^>]*>/g;

// Proper nouns / technical terms that are legitimately identical across languages
var PROPER_NOUN_KEYS = [
  "meta.lang",
  "meta.dir",
  "index.nj_to_nyc",
  "index.nyc_to_nj",
  "index.alert_phase1",
  "index.stat_dates",
  "index.terminal_hudson_river",
  "index.terminal_ferry_dock",
  "index.timeline_title",
  "index.tl_phase2_title",
  "coverage.dir_nj_nyc",
  "coverage.dir_nyc_nj",
  "map.legend_title",
  "map.legend_portal_bridge",
  "map.legend_transfer_hub",
  "embed.cfg_tab_iframe",
  "embed.cfg_type_card",
  "embed.cfg_type_widget",
  "embed.cfg_tool_label",
  "embed.cfg_accent_label",
  "embed.cfg_preview_label",
  "embed.cfg_tab_png",
  "embed.cfg_tab_html",
  "card.date_range",
  "card.powered_by",
  "blog.title",
  "blog.heading",
  "common.nav_blog",
  "common.menu",
  "common.footer_disclaimer_map_tiles",
  "compare.min_total",
  "compare.vs_normal"
];

// Patterns that indicate a value is likely a proper noun or technical term
var PROPER_NOUN_PATTERNS = [
  /^Reroute NJ/,
  /^NJ Transit/,
  /^PATH/,
  /^Portal/,
  /^Hoboken/,
  /^Newark/,
  /^Secaucus/,
  /^Amtrak/,
  /^NEC/,
  /^PSNY/,
  /^NYC/,
  /^WTC/,
  /^Penn Station/,
  /^NY Waterway/,
  /^Bus 126/,
  /^Iframe$/,
  /^HTML$/,
  /^PNG$/,
  /^Midtown/,
  /^Manhattan/,
  /^GitHub/,
  /^MIT/,
  /^WordPress/,
  /^Squarespace/,
  /^Ghost/,
  /^Substack/,
  /^Netlify/,
  /^Vercel/,
  /^Phase [12]/,
  /^Timeline$/,
  /^Legend$/,
  /^Blog$/,
  /^Menu$/,
  /^Card$/,
  /^Widget$/,
  /^Tiles/,
  /^Powered by/,
  /^Feb\s/,
  /^Hudson River$/
];

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

var results = [];
var totalPass = 0;
var totalFail = 0;
var totalWarn = 0;

function pass(test, detail) {
  totalPass++;
  results.push({ status: "PASS", test: test, detail: detail || "" });
  console.log("  PASS  " + test + (detail ? " -- " + detail : ""));
}

function fail(test, detail) {
  totalFail++;
  results.push({ status: "FAIL", test: test, detail: detail || "" });
  console.log("  FAIL  " + test + (detail ? " -- " + detail : ""));
}

function warn(test, detail) {
  totalWarn++;
  results.push({ status: "WARN", test: test, detail: detail || "" });
  console.log("  WARN  " + test + (detail ? " -- " + detail : ""));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flatten a nested object into dot-notation keys.
 * E.g. { meta: { lang: "en" } } => { "meta.lang": "en" }
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
 * Get nesting depth of an object.
 */
function getMaxDepth(obj, depth) {
  depth = depth || 0;
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return depth;
  var max = depth;
  Object.keys(obj).forEach(function (key) {
    var d = getMaxDepth(obj[key], depth + 1);
    if (d > max) max = d;
  });
  return max;
}

/**
 * Extract HTML tag names from a string, returning a sorted array.
 */
function extractHtmlTags(str) {
  var tags = [];
  var match;
  var re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  while ((match = re.exec(str)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return tags.sort();
}

/**
 * Check if a value looks like it contains mostly proper nouns / technical terms.
 */
function looksLikeProperNoun(value) {
  if (typeof value !== "string") return true;
  // Short values (3 chars or fewer) are often symbols, codes, or abbreviations
  if (value.length <= 3) return true;
  // Values that are just numbers
  if (/^\d+$/.test(value.trim())) return true;
  // Values that match known proper noun patterns
  for (var i = 0; i < PROPER_NOUN_PATTERNS.length; i++) {
    if (PROPER_NOUN_PATTERNS[i].test(value.trim())) return true;
  }
  // Values that are mostly HTML tags and proper nouns
  var stripped = value.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").trim();
  if (stripped.length <= 3) return true;
  return false;
}

/**
 * Check if a string contains relative URL paths.
 */
function extractRelativeUrls(str) {
  var urls = [];
  var re = /href="([^"]*?)"/g;
  var match;
  while ((match = re.exec(str)) !== null) {
    var url = match[1];
    // Skip absolute URLs, mailto:, and anchor-only links
    if (url.indexOf("http") === 0) continue;
    if (url.indexOf("mailto:") === 0) continue;
    if (url.indexOf("#") === 0) continue;
    urls.push(url);
  }
  return urls;
}

/**
 * Checks if a file is valid UTF-8 by reading it as a buffer and testing.
 */
function isValidUtf8(filePath) {
  var buf = fs.readFileSync(filePath);
  // Node's Buffer.toString('utf8') will replace invalid sequences.
  // Compare round-tripped buffer to original.
  var str = buf.toString("utf8");
  var roundTripped = Buffer.from(str, "utf8");
  if (buf.length !== roundTripped.length) return false;
  for (var i = 0; i < buf.length; i++) {
    if (buf[i] !== roundTripped[i]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Load translation files
// ---------------------------------------------------------------------------

var translations = {};
var rawData = {};
var flatTranslations = {};
var loadErrors = {};

LANGUAGES.forEach(function (lang) {
  var filePath = path.join(TRANSLATIONS_DIR, lang + ".json");
  try {
    var raw = fs.readFileSync(filePath, "utf8");
    rawData[lang] = raw;
    translations[lang] = JSON.parse(raw);
    flatTranslations[lang] = flattenObject(translations[lang]);
  } catch (e) {
    loadErrors[lang] = e.message;
  }
});

var enFlat = flatTranslations["en"] || {};
var enKeys = Object.keys(enFlat);

// ---------------------------------------------------------------------------
// TEST 1: All 11 language files exist and are valid JSON
// ---------------------------------------------------------------------------

console.log("\n--- Test 1: All language files exist and are valid JSON ---");

LANGUAGES.forEach(function (lang) {
  var filePath = path.join(TRANSLATIONS_DIR, lang + ".json");
  if (loadErrors[lang]) {
    fail("[" + lang + "] File exists and is valid JSON", loadErrors[lang]);
  } else if (!translations[lang]) {
    fail("[" + lang + "] File exists and is valid JSON", "File not found or empty");
  } else {
    pass("[" + lang + "] File exists and is valid JSON");
  }
});

// ---------------------------------------------------------------------------
// TEST 2: Every key in en.json exists in every other language (completeness)
// ---------------------------------------------------------------------------

console.log("\n--- Test 2: Completeness -- every en.json key exists in all languages ---");

LANGUAGES.forEach(function (lang) {
  if (lang === "en" || !flatTranslations[lang]) return;
  var missing = [];
  enKeys.forEach(function (key) {
    if (!(key in flatTranslations[lang])) {
      missing.push(key);
    }
  });
  if (missing.length === 0) {
    pass("[" + lang + "] All " + enKeys.length + " English keys present");
  } else {
    fail("[" + lang + "] Missing " + missing.length + " keys", missing.slice(0, 15).join(", ") + (missing.length > 15 ? " ..." : ""));
  }
});

// ---------------------------------------------------------------------------
// TEST 3: No extra keys in translated files that don't exist in en.json
// ---------------------------------------------------------------------------

console.log("\n--- Test 3: No extra keys in translated files ---");

LANGUAGES.forEach(function (lang) {
  if (lang === "en" || !flatTranslations[lang]) return;
  var extra = [];
  Object.keys(flatTranslations[lang]).forEach(function (key) {
    if (!(key in enFlat)) {
      extra.push(key);
    }
  });
  if (extra.length === 0) {
    pass("[" + lang + "] No extra keys");
  } else {
    fail("[" + lang + "] " + extra.length + " extra keys found", extra.slice(0, 15).join(", ") + (extra.length > 15 ? " ..." : ""));
  }
});

// ---------------------------------------------------------------------------
// TEST 4: No empty string values in any translation file
// ---------------------------------------------------------------------------

console.log("\n--- Test 4: No empty string values ---");

LANGUAGES.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var empties = [];
  Object.keys(flatTranslations[lang]).forEach(function (key) {
    var val = flatTranslations[lang][key];
    if (typeof val === "string" && val.trim() === "") {
      empties.push(key);
    }
  });
  if (empties.length === 0) {
    pass("[" + lang + "] No empty values");
  } else {
    fail("[" + lang + "] " + empties.length + " empty values", empties.join(", "));
  }
});

// ---------------------------------------------------------------------------
// TEST 5: meta.lang matches expected language code
// ---------------------------------------------------------------------------

console.log("\n--- Test 5: meta.lang matches expected language code ---");

LANGUAGES.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var actual = flatTranslations[lang]["meta.lang"];
  if (actual === lang) {
    pass("[" + lang + "] meta.lang = \"" + actual + "\"");
  } else {
    fail("[" + lang + "] meta.lang expected \"" + lang + "\" but got \"" + actual + "\"");
  }
});

// ---------------------------------------------------------------------------
// TEST 6: meta.dir is "rtl" for Arabic, "ltr" for all others
// ---------------------------------------------------------------------------

console.log("\n--- Test 6: meta.dir correct (rtl for Arabic, ltr for others) ---");

LANGUAGES.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var actual = flatTranslations[lang]["meta.dir"];
  var expected = RTL_LANGUAGES.indexOf(lang) !== -1 ? "rtl" : "ltr";
  if (actual === expected) {
    pass("[" + lang + "] meta.dir = \"" + actual + "\"");
  } else {
    fail("[" + lang + "] meta.dir expected \"" + expected + "\" but got \"" + actual + "\"");
  }
});

// ---------------------------------------------------------------------------
// TEST 7: meta.label and meta.nativeName are non-empty
// ---------------------------------------------------------------------------

console.log("\n--- Test 7: meta.label and meta.nativeName are non-empty ---");

LANGUAGES.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var label = flatTranslations[lang]["meta.label"];
  var nativeName = flatTranslations[lang]["meta.nativeName"];
  var issues = [];
  if (!label || (typeof label === "string" && label.trim() === "")) {
    issues.push("meta.label is empty");
  }
  if (!nativeName || (typeof nativeName === "string" && nativeName.trim() === "")) {
    issues.push("meta.nativeName is empty");
  }
  if (issues.length === 0) {
    pass("[" + lang + "] meta.label=\"" + label + "\", meta.nativeName=\"" + nativeName + "\"");
  } else {
    fail("[" + lang + "] " + issues.join("; "));
  }
});

// ---------------------------------------------------------------------------
// TEST 8: HTML tags preserved in translations
// ---------------------------------------------------------------------------

console.log("\n--- Test 8: HTML tags in English have corresponding tags in translations ---");

LANGUAGES.forEach(function (lang) {
  if (lang === "en" || !flatTranslations[lang]) return;
  var mismatches = [];
  enKeys.forEach(function (key) {
    var enVal = enFlat[key];
    var trVal = flatTranslations[lang][key];
    if (typeof enVal !== "string" || typeof trVal !== "string") return;
    if (!HTML_TAG_RE.test(enVal)) return;
    // Reset regex
    HTML_TAG_RE.lastIndex = 0;

    var enTags = extractHtmlTags(enVal);
    var trTags = extractHtmlTags(trVal);

    if (enTags.length === 0) return;

    // Check that the same tag types appear (order may differ due to language structure)
    var enTagCounts = {};
    enTags.forEach(function (t) { enTagCounts[t] = (enTagCounts[t] || 0) + 1; });
    var trTagCounts = {};
    trTags.forEach(function (t) { trTagCounts[t] = (trTagCounts[t] || 0) + 1; });

    var tagMismatch = false;
    Object.keys(enTagCounts).forEach(function (tag) {
      if ((trTagCounts[tag] || 0) < enTagCounts[tag]) {
        tagMismatch = true;
      }
    });

    if (tagMismatch) {
      mismatches.push(key + " (en: " + enTags.join(",") + " | " + lang + ": " + trTags.join(",") + ")");
    }
  });

  if (mismatches.length === 0) {
    pass("[" + lang + "] All HTML tags preserved");
  } else {
    fail("[" + lang + "] " + mismatches.length + " keys with missing HTML tags", mismatches.slice(0, 10).join("; ") + (mismatches.length > 10 ? " ..." : ""));
  }
});

// ---------------------------------------------------------------------------
// TEST 9: Transit-specific numbers preserved
// ---------------------------------------------------------------------------

console.log("\n--- Test 9: Transit-specific numbers preserved (133, 112, 109, 92) ---");

LANGUAGES.forEach(function (lang) {
  if (lang === "en" || !flatTranslations[lang]) return;
  var issues = [];

  enKeys.forEach(function (key) {
    var enVal = enFlat[key];
    var trVal = flatTranslations[lang][key];
    if (typeof enVal !== "string" || typeof trVal !== "string") return;

    TRANSIT_NUMBERS.forEach(function (num) {
      if (enVal.indexOf(num) !== -1 && trVal.indexOf(num) === -1) {
        issues.push(key + " missing number " + num);
      }
    });
  });

  if (issues.length === 0) {
    pass("[" + lang + "] All transit numbers preserved");
  } else {
    fail("[" + lang + "] " + issues.length + " missing transit numbers", issues.join("; "));
  }
});

// ---------------------------------------------------------------------------
// TEST 10: Placeholder patterns (emoji, special chars) preserved
// ---------------------------------------------------------------------------

console.log("\n--- Test 10: Placeholder patterns and special characters preserved ---");

// Check HTML entities and arrow symbols
var SPECIAL_PATTERNS = [
  { name: "&mdash;", re: /&mdash;/g },
  { name: "&rarr;", re: /&rarr;/g },
  { name: "&hellip;", re: /&hellip;/g },
  { name: "&copy;", re: /&copy;/g },
  { name: "&amp;", re: /&amp;/g }
];

LANGUAGES.forEach(function (lang) {
  if (lang === "en" || !flatTranslations[lang]) return;
  var issues = [];

  enKeys.forEach(function (key) {
    var enVal = enFlat[key];
    var trVal = flatTranslations[lang][key];
    if (typeof enVal !== "string" || typeof trVal !== "string") return;

    SPECIAL_PATTERNS.forEach(function (pattern) {
      pattern.re.lastIndex = 0;
      var enMatches = (enVal.match(pattern.re) || []).length;
      pattern.re.lastIndex = 0;
      var trMatches = (trVal.match(pattern.re) || []).length;
      if (enMatches > 0 && trMatches === 0) {
        issues.push(key + " missing " + pattern.name);
      }
    });
  });

  if (issues.length === 0) {
    pass("[" + lang + "] Special characters/entities preserved");
  } else {
    // Some entities may be intentionally converted (e.g., &rarr; to a Unicode arrow)
    // so report as warnings for non-mdash entities, failures for structural ones
    var failures = issues.filter(function (i) { return i.indexOf("&mdash;") !== -1 || i.indexOf("&amp;") !== -1; });
    var warnings = issues.filter(function (i) { return i.indexOf("&mdash;") === -1 && i.indexOf("&amp;") === -1; });
    if (failures.length > 0) {
      fail("[" + lang + "] " + failures.length + " structural entity issues", failures.slice(0, 10).join("; "));
    }
    if (warnings.length > 0) {
      warn("[" + lang + "] " + warnings.length + " optional entity differences", warnings.slice(0, 10).join("; "));
    }
    if (failures.length === 0 && warnings.length === 0) {
      pass("[" + lang + "] Special characters/entities preserved");
    }
  }
});

// ---------------------------------------------------------------------------
// TEST 11: URL references in translations point to valid relative paths
// ---------------------------------------------------------------------------

console.log("\n--- Test 11: Relative URL references point to valid paths ---");

var PROJECT_ROOT = path.join(__dirname, "..");

LANGUAGES.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var brokenUrls = [];

  Object.keys(flatTranslations[lang]).forEach(function (key) {
    var val = flatTranslations[lang][key];
    if (typeof val !== "string") return;
    var urls = extractRelativeUrls(val);
    urls.forEach(function (url) {
      // Strip any query params or anchors
      var cleanUrl = url.split("?")[0].split("#")[0];
      if (!cleanUrl) return;

      // Relative URLs in translations could be relative to:
      // - project root (for en.json)
      // - the {lang}/ directory (for translated pages where ../ is used)
      var fromRoot = path.join(PROJECT_ROOT, cleanUrl);
      var fromLangDir = path.join(PROJECT_ROOT, lang, cleanUrl);
      // Also try resolving ../ from lang dir
      var fromLangParent = path.join(PROJECT_ROOT, lang, cleanUrl);
      if (cleanUrl.indexOf("../") === 0) {
        fromLangParent = path.join(PROJECT_ROOT, lang, cleanUrl);
      }

      var exists = fs.existsSync(fromRoot) || fs.existsSync(fromLangDir) || fs.existsSync(fromLangParent);
      if (!exists) {
        brokenUrls.push(key + " -> " + url);
      }
    });
  });

  if (brokenUrls.length === 0) {
    pass("[" + lang + "] All relative URLs resolve to existing files");
  } else {
    // Relative URLs like ../index.html from translated pages are expected patterns
    // They work when served from {lang}/ directory; just warn if they don't resolve from root
    warn("[" + lang + "] " + brokenUrls.length + " relative URLs could not be verified from project root", brokenUrls.slice(0, 10).join("; "));
  }
});

// ---------------------------------------------------------------------------
// TEST 12: Key structure depth is consistent across all files
// ---------------------------------------------------------------------------

console.log("\n--- Test 12: Key structure depth consistent across files ---");

var enDepth = getMaxDepth(translations["en"]);
var depthIssues = [];

LANGUAGES.forEach(function (lang) {
  if (lang === "en" || !translations[lang]) return;
  var langDepth = getMaxDepth(translations[lang]);
  if (langDepth !== enDepth) {
    depthIssues.push(lang + " (depth " + langDepth + " vs en depth " + enDepth + ")");
  }
});

if (depthIssues.length === 0) {
  pass("All files have consistent nesting depth (" + enDepth + " levels)");
} else {
  fail("Inconsistent nesting depth: " + depthIssues.join(", "));
}

// Also verify top-level section keys match
console.log("");
var enSections = Object.keys(translations["en"]).sort();

LANGUAGES.forEach(function (lang) {
  if (lang === "en" || !translations[lang]) return;
  var langSections = Object.keys(translations[lang]).sort();
  var missingSections = enSections.filter(function (s) { return langSections.indexOf(s) === -1; });
  var extraSections = langSections.filter(function (s) { return enSections.indexOf(s) === -1; });
  if (missingSections.length === 0 && extraSections.length === 0) {
    pass("[" + lang + "] Top-level sections match English (" + enSections.join(", ") + ")");
  } else {
    var detail = "";
    if (missingSections.length > 0) detail += "missing: " + missingSections.join(", ");
    if (extraSections.length > 0) detail += (detail ? "; " : "") + "extra: " + extraSections.join(", ");
    fail("[" + lang + "] Top-level section mismatch", detail);
  }
});

// ---------------------------------------------------------------------------
// TEST 13: Translation values not identical to English (untranslated check)
// ---------------------------------------------------------------------------

console.log("\n--- Test 13: Check for potentially untranslated values ---");

LANGUAGES.forEach(function (lang) {
  if (lang === "en" || !flatTranslations[lang]) return;
  var identical = [];
  var checked = 0;

  enKeys.forEach(function (key) {
    var enVal = enFlat[key];
    var trVal = flatTranslations[lang][key];
    if (typeof enVal !== "string" || typeof trVal !== "string") return;
    if (enVal !== trVal) return;

    checked++;

    // Skip keys that are expected to be identical
    if (PROPER_NOUN_KEYS.indexOf(key) !== -1) return;

    // Skip values that look like proper nouns or technical terms
    if (looksLikeProperNoun(enVal)) return;

    // Skip keys that contain only HTML/URLs
    var stripped = enVal.replace(/<[^>]+>/g, "").replace(/https?:\/\/[^\s"<]+/g, "").trim();
    if (stripped.length <= 3) return;

    // Skip values that are predominantly code or technical markup
    if (enVal.indexOf("<code>") !== -1 && stripped.replace(/[^a-zA-Z]/g, "").length < 10) return;

    identical.push(key);
  });

  if (identical.length === 0) {
    pass("[" + lang + "] No suspected untranslated values");
  } else if (identical.length <= 5) {
    // A small number may be acceptable (brand names, technical terms, etc.)
    warn("[" + lang + "] " + identical.length + " values identical to English (may be intentional)", identical.join(", "));
  } else {
    fail("[" + lang + "] " + identical.length + " values identical to English (likely untranslated)", identical.slice(0, 15).join(", ") + (identical.length > 15 ? " ..." : ""));
  }
});

// ---------------------------------------------------------------------------
// TEST 14: Arabic translations don't contain unexpected LTR markers
// ---------------------------------------------------------------------------

console.log("\n--- Test 14: Arabic translations -- no accidental LTR markers ---");

if (flatTranslations["ar"]) {
  var ltrIssues = [];
  // Unicode LTR marks: U+200E (LTR mark), U+202A (LTR embedding), U+202D (LTR override)
  var LTR_MARKERS = ["\u200E", "\u202A", "\u202D"];

  Object.keys(flatTranslations["ar"]).forEach(function (key) {
    var val = flatTranslations["ar"][key];
    if (typeof val !== "string") return;

    LTR_MARKERS.forEach(function (marker) {
      if (val.indexOf(marker) !== -1) {
        var charCode = marker.charCodeAt(0).toString(16).toUpperCase();
        ltrIssues.push(key + " contains U+" + ("0000" + charCode).slice(-4));
      }
    });
  });

  if (ltrIssues.length === 0) {
    pass("[ar] No accidental LTR markers found");
  } else {
    fail("[ar] " + ltrIssues.length + " values contain LTR markers", ltrIssues.join("; "));
  }
} else {
  fail("[ar] Could not test -- Arabic file failed to load");
}

// ---------------------------------------------------------------------------
// TEST 15: Character encoding is valid UTF-8
// ---------------------------------------------------------------------------

console.log("\n--- Test 15: Valid UTF-8 encoding ---");

LANGUAGES.forEach(function (lang) {
  var filePath = path.join(TRANSLATIONS_DIR, lang + ".json");
  try {
    if (isValidUtf8(filePath)) {
      pass("[" + lang + "] Valid UTF-8 encoding");
    } else {
      fail("[" + lang + "] Invalid UTF-8 sequences detected");
    }
  } catch (e) {
    fail("[" + lang + "] Could not check encoding: " + e.message);
  }
});

// ---------------------------------------------------------------------------
// BONUS: Key count summary
// ---------------------------------------------------------------------------

console.log("\n--- Key count summary ---");
LANGUAGES.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var count = Object.keys(flatTranslations[lang]).length;
  var diff = count - enKeys.length;
  var diffStr = diff === 0 ? "exact match" : (diff > 0 ? "+" + diff + " extra" : diff + " missing");
  console.log("  [" + lang + "] " + count + " keys (" + diffStr + " vs en's " + enKeys.length + ")");
});

// ---------------------------------------------------------------------------
// Final summary
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(60));
console.log("SUMMARY");
console.log("=".repeat(60));
console.log("  Total PASS: " + totalPass);
console.log("  Total FAIL: " + totalFail);
console.log("  Total WARN: " + totalWarn);
console.log("  Total checks: " + (totalPass + totalFail + totalWarn));
console.log("=".repeat(60));

if (totalFail === 0) {
  console.log("\n  All tests passed!" + (totalWarn > 0 ? " (" + totalWarn + " warnings to review)" : ""));
} else {
  console.log("\n  " + totalFail + " test(s) FAILED. Review the output above for details.");
}

console.log("");
process.exit(totalFail > 0 ? 1 : 0);
