/**
 * Linguistic Validation Test Suite for Hindi (hi) and Gujarati (gu) translations
 *
 * Validates script correctness, transit terminology, formality, proper noun
 * handling, HTML entity preservation, number handling, and natural phrasing
 * for Hindi (Devanagari) and Gujarati (Gujarati script).
 *
 * Run: node tests/test-linguistic-hi-gu.js
 */

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var TRANSLATIONS_DIR = path.join(__dirname, "..", "translations");

// ---------------------------------------------------------------------------
// Unicode ranges for script detection
// ---------------------------------------------------------------------------

// Devanagari: U+0900 - U+097F (main block), U+A8E0 - U+A8FF (extended)
var DEVANAGARI_RE = /[\u0900-\u097F\uA8E0-\uA8FF]/;
var DEVANAGARI_CHAR_RE = /[\u0900-\u097F\uA8E0-\uA8FF]/g;

// Gujarati: U+0A80 - U+0AFF
var GUJARATI_RE = /[\u0A80-\u0AFF]/;
var GUJARATI_CHAR_RE = /[\u0A80-\u0AFF]/g;

// ---------------------------------------------------------------------------
// Transit terminology expectations
// ---------------------------------------------------------------------------

// Hindi transit terms (Devanagari): transliterations commonly used
var HINDI_TRANSIT_TERMS = {
  "train_terms": [
    "\u091F\u094D\u0930\u0947\u0928",         // ट्रेन (train)
    "\u0930\u0947\u0932\u0917\u093E\u0921\u093C\u0940" // रेलगाड़ी (train/railway)
  ],
  "station_terms": [
    "\u0938\u094D\u091F\u0947\u0936\u0928"    // स्टेशन (station)
  ]
};

// Gujarati transit terms (Gujarati script)
var GUJARATI_TRANSIT_TERMS = {
  "train_terms": [
    "\u0AA2\u0ACD\u0AB0\u0AC7\u0AA8",         // ટ્રેન (train) - note this won't match
    "\u0A9F\u0ACD\u0AB0\u0AC7\u0AA8"          // ટ્રેન (train) - correct
  ],
  "station_terms": [
    "\u0AB8\u0ACD\u0A9F\u0AC7\u0AB6\u0AA8"   // સ્ટેશન (station)
  ]
};

// Informal Hindi pronouns to flag (तू/तुझ/तेर forms - too informal for public info)
var HINDI_INFORMAL_PRONOUNS = [
  "\u0924\u0942 ",      // तू (space after to avoid false positives in words)
  "\u0924\u0941\u091D",  // तुझ
  "\u0924\u0947\u0930\u093E", // तेरा
  "\u0924\u0947\u0930\u0940", // तेरी
  "\u0924\u0947\u0930\u0947"  // तेरे
];

// Formal/respectful Hindi pronouns expected (आप forms)
var HINDI_FORMAL_PRONOUNS = [
  "\u0906\u092A",        // आप
  "\u0906\u092A\u0915\u093E",  // आपका
  "\u0906\u092A\u0915\u0940",  // आपकी
  "\u0906\u092A\u0915\u0947"   // आपके
];

// Station and line names that must stay in English (Latin script)
var ENGLISH_PROPER_NOUNS = [
  "Hoboken", "Newark", "Secaucus", "Penn Station", "PATH",
  "NJ Transit", "Amtrak", "Portal Bridge", "Portal North Bridge",
  "Montclair-Boonton", "Morris", "Essex", "Gladstone",
  "Northeast Corridor", "North Jersey Coast", "Raritan Valley",
  "Atlantic City", "Manhattan", "Midtown", "Hudson",
  "Hackensack", "Kearny", "PSNY", "WTC", "Port Authority",
  "NY Waterway", "Lincoln Tunnel", "Gateway Program",
  "Perth Amboy", "Woodbridge", "Morristown"
];

// HTML entities that must be preserved exactly
var HTML_ENTITIES = ["&copy;", "&mdash;", "&rarr;", "&hellip;", "&amp;", "&lt;", "&gt;"];

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
 * Strip HTML tags from a string.
 */
function stripHtml(str) {
  return str.replace(/<[^>]+>/g, "");
}

/**
 * Strip HTML entities from a string.
 */
function stripEntities(str) {
  return str.replace(/&[a-zA-Z]+;/g, "");
}

/**
 * Count characters in a specific Unicode script range.
 */
function countScriptChars(str, regex) {
  var matches = str.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Check if a string contains characters from a script.
 */
function hasScript(str, regex) {
  return regex.test(str);
}

/**
 * Extract the non-HTML, non-entity, non-Latin text for script analysis.
 * Strips HTML tags, entities, Latin chars, numbers, punctuation.
 */
function extractNativeText(str) {
  var cleaned = stripHtml(str);
  cleaned = stripEntities(cleaned);
  // Remove Latin chars, digits, common punctuation, whitespace
  cleaned = cleaned.replace(/[a-zA-Z0-9\s.,;:!?'"()\-\u2013\u2014\u2192\u2026@#$%^&*_+=\[\]{}<>\/\\|~`\u00B7\u00A9\u00AE]/g, "");
  return cleaned;
}

// Keys that are expected to remain in English or contain no translatable text
var SKIP_SCRIPT_CHECK_KEYS = [
  "meta.lang", "meta.dir", "meta.label",
  "index.nj_to_nyc", "index.nyc_to_nj",
  "index.terminal_hudson_river",
  "coverage.dir_nj_nyc", "coverage.dir_nyc_nj",
  "map.legend_portal_bridge",
  "embed.cfg_tab_iframe",
  "card.date_range",
  "card.powered_by"
];

// ---------------------------------------------------------------------------
// Load translations
// ---------------------------------------------------------------------------

var enData, hiData, guData;

try {
  enData = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, "en.json"), "utf8"));
} catch (e) {
  console.error("FATAL: Could not load en.json: " + e.message);
  process.exit(1);
}

try {
  hiData = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, "hi.json"), "utf8"));
} catch (e) {
  console.error("FATAL: Could not load hi.json: " + e.message);
  process.exit(1);
}

try {
  guData = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, "gu.json"), "utf8"));
} catch (e) {
  console.error("FATAL: Could not load gu.json: " + e.message);
  process.exit(1);
}

var enFlat = flattenObject(enData);
var hiFlat = flattenObject(hiData);
var guFlat = flattenObject(guData);

// ===========================================================================
// TEST SUITE 1: Hindi uses Devanagari script
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 1: Hindi uses Devanagari script");
console.log("=".repeat(70));

(function () {
  var hiKeys = Object.keys(hiFlat);
  var keysWithDevanagari = 0;
  var keysWithoutDevanagari = [];
  var totalCheckable = 0;

  hiKeys.forEach(function (key) {
    if (SKIP_SCRIPT_CHECK_KEYS.indexOf(key) !== -1) return;
    var val = hiFlat[key];
    if (typeof val !== "string") return;

    var nativeText = extractNativeText(val);
    if (nativeText.length === 0) return; // No native script text expected (e.g. all English)

    totalCheckable++;
    if (hasScript(nativeText, DEVANAGARI_RE)) {
      keysWithDevanagari++;
    } else {
      keysWithoutDevanagari.push(key);
    }
  });

  if (keysWithDevanagari > 0 && keysWithoutDevanagari.length === 0) {
    pass("Hindi: All translatable values contain Devanagari script",
      keysWithDevanagari + "/" + totalCheckable + " keys verified");
  } else if (keysWithDevanagari > 0) {
    warn("Hindi: Most translatable values contain Devanagari script",
      keysWithoutDevanagari.length + " keys lack Devanagari: " +
      keysWithoutDevanagari.slice(0, 5).join(", ") +
      (keysWithoutDevanagari.length > 5 ? "..." : ""));
  } else {
    fail("Hindi: No Devanagari script detected in Hindi translation");
  }

  // Verify meta.nativeName is in Devanagari
  if (hiFlat["meta.nativeName"] && hasScript(hiFlat["meta.nativeName"], DEVANAGARI_RE)) {
    pass("Hindi: meta.nativeName contains Devanagari", hiFlat["meta.nativeName"]);
  } else {
    fail("Hindi: meta.nativeName does not contain Devanagari",
      "Found: " + (hiFlat["meta.nativeName"] || "(missing)"));
  }
})();

// ===========================================================================
// TEST SUITE 2: Gujarati uses Gujarati script
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 2: Gujarati uses Gujarati script");
console.log("=".repeat(70));

(function () {
  var guKeys = Object.keys(guFlat);
  var keysWithGujarati = 0;
  var keysWithoutGujarati = [];
  var totalCheckable = 0;

  guKeys.forEach(function (key) {
    if (SKIP_SCRIPT_CHECK_KEYS.indexOf(key) !== -1) return;
    var val = guFlat[key];
    if (typeof val !== "string") return;

    var nativeText = extractNativeText(val);
    if (nativeText.length === 0) return;

    totalCheckable++;
    if (hasScript(nativeText, GUJARATI_RE)) {
      keysWithGujarati++;
    } else {
      keysWithoutGujarati.push(key);
    }
  });

  if (keysWithGujarati > 0 && keysWithoutGujarati.length === 0) {
    pass("Gujarati: All translatable values contain Gujarati script",
      keysWithGujarati + "/" + totalCheckable + " keys verified");
  } else if (keysWithGujarati > 0) {
    warn("Gujarati: Most translatable values contain Gujarati script",
      keysWithoutGujarati.length + " keys lack Gujarati: " +
      keysWithoutGujarati.slice(0, 5).join(", ") +
      (keysWithoutGujarati.length > 5 ? "..." : ""));
  } else {
    fail("Gujarati: No Gujarati script detected in Gujarati translation");
  }

  // Verify meta.nativeName is in Gujarati script
  if (guFlat["meta.nativeName"] && hasScript(guFlat["meta.nativeName"], GUJARATI_RE)) {
    pass("Gujarati: meta.nativeName contains Gujarati script", guFlat["meta.nativeName"]);
  } else {
    fail("Gujarati: meta.nativeName does not contain Gujarati script",
      "Found: " + (guFlat["meta.nativeName"] || "(missing)"));
  }
})();

// ===========================================================================
// TEST SUITE 3: No script mixing (Devanagari in Gujarati or vice versa)
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 3: No script mixing between Hindi and Gujarati");
console.log("=".repeat(70));

(function () {
  // Check: Hindi values should NOT contain Gujarati script
  var hiKeysWithGujarati = [];
  Object.keys(hiFlat).forEach(function (key) {
    var val = hiFlat[key];
    if (typeof val !== "string") return;
    var nativeText = extractNativeText(val);
    if (hasScript(nativeText, GUJARATI_RE)) {
      hiKeysWithGujarati.push(key);
    }
  });

  if (hiKeysWithGujarati.length === 0) {
    pass("Hindi: No Gujarati script characters found in Hindi translations");
  } else {
    fail("Hindi: Gujarati script characters found in Hindi translations",
      hiKeysWithGujarati.length + " keys contaminated: " +
      hiKeysWithGujarati.slice(0, 5).join(", "));
  }

  // Check: Gujarati values should NOT contain Devanagari script
  var guKeysWithDevanagari = [];
  Object.keys(guFlat).forEach(function (key) {
    var val = guFlat[key];
    if (typeof val !== "string") return;
    var nativeText = extractNativeText(val);
    if (hasScript(nativeText, DEVANAGARI_RE)) {
      guKeysWithDevanagari.push(key);
    }
  });

  if (guKeysWithDevanagari.length === 0) {
    pass("Gujarati: No Devanagari script characters found in Gujarati translations");
  } else {
    fail("Gujarati: Devanagari script characters found in Gujarati translations",
      guKeysWithDevanagari.length + " keys contaminated: " +
      guKeysWithDevanagari.slice(0, 5).join(", "));
  }

  // Check script purity ratio for both languages
  var hiTotalNative = 0;
  var hiDevanagariCount = 0;
  Object.keys(hiFlat).forEach(function (key) {
    var val = hiFlat[key];
    if (typeof val !== "string") return;
    var nativeText = extractNativeText(val);
    hiDevanagariCount += countScriptChars(nativeText, DEVANAGARI_CHAR_RE);
    hiTotalNative += nativeText.length;
  });

  if (hiTotalNative > 0) {
    var hiPurity = ((hiDevanagariCount / hiTotalNative) * 100).toFixed(1);
    if (parseFloat(hiPurity) >= 95.0) {
      pass("Hindi: Script purity check", hiPurity + "% Devanagari among native characters");
    } else {
      warn("Hindi: Script purity below 95%", hiPurity + "% Devanagari");
    }
  }

  var guTotalNative = 0;
  var guGujaratiCount = 0;
  Object.keys(guFlat).forEach(function (key) {
    var val = guFlat[key];
    if (typeof val !== "string") return;
    var nativeText = extractNativeText(val);
    guGujaratiCount += countScriptChars(nativeText, GUJARATI_CHAR_RE);
    guTotalNative += nativeText.length;
  });

  if (guTotalNative > 0) {
    var guPurity = ((guGujaratiCount / guTotalNative) * 100).toFixed(1);
    if (parseFloat(guPurity) >= 95.0) {
      pass("Gujarati: Script purity check", guPurity + "% Gujarati among native characters");
    } else {
      warn("Gujarati: Script purity below 95%", guPurity + "% Gujarati");
    }
  }
})();

// ===========================================================================
// TEST SUITE 4: Key transit terms translated correctly
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 4: Key transit terms translated correctly");
console.log("=".repeat(70));

(function () {
  // Aggregate all Hindi values for term search
  var hiAllText = Object.keys(hiFlat).map(function (k) {
    return typeof hiFlat[k] === "string" ? hiFlat[k] : "";
  }).join(" ");

  var guAllText = Object.keys(guFlat).map(function (k) {
    return typeof guFlat[k] === "string" ? guFlat[k] : "";
  }).join(" ");

  // Hindi: Check for train term (ट्रेन or रेलगाड़ी)
  var hiHasTrainTerm = HINDI_TRANSIT_TERMS.train_terms.some(function (term) {
    return hiAllText.indexOf(term) !== -1;
  });
  if (hiHasTrainTerm) {
    pass("Hindi: Contains correct train terminology",
      "Found \u091F\u094D\u0930\u0947\u0928 (train) or \u0930\u0947\u0932\u0917\u093E\u0921\u093C\u0940 (railgaadi)");
  } else {
    fail("Hindi: Missing train terminology",
      "Expected \u091F\u094D\u0930\u0947\u0928 or \u0930\u0947\u0932\u0917\u093E\u0921\u093C\u0940");
  }

  // Hindi: Check for station term (स्टेशन)
  var hiHasStationTerm = HINDI_TRANSIT_TERMS.station_terms.some(function (term) {
    return hiAllText.indexOf(term) !== -1;
  });
  if (hiHasStationTerm) {
    pass("Hindi: Contains correct station terminology",
      "Found \u0938\u094D\u091F\u0947\u0936\u0928 (station)");
  } else {
    fail("Hindi: Missing station terminology",
      "Expected \u0938\u094D\u091F\u0947\u0936\u0928");
  }

  // Gujarati: Check for train term (ટ્રેન)
  var guHasTrainTerm = GUJARATI_TRANSIT_TERMS.train_terms.some(function (term) {
    return guAllText.indexOf(term) !== -1;
  });
  if (guHasTrainTerm) {
    pass("Gujarati: Contains correct train terminology",
      "Found \u0A9F\u0ACD\u0AB0\u0AC7\u0AA8 (train)");
  } else {
    fail("Gujarati: Missing train terminology",
      "Expected \u0A9F\u0ACD\u0AB0\u0AC7\u0AA8");
  }

  // Gujarati: Check for station term (સ્ટેશન)
  var guHasStationTerm = GUJARATI_TRANSIT_TERMS.station_terms.some(function (term) {
    return guAllText.indexOf(term) !== -1;
  });
  if (guHasStationTerm) {
    pass("Gujarati: Contains correct station terminology",
      "Found \u0AB8\u0ACD\u0A9F\u0AC7\u0AB6\u0AA8 (station)");
  } else {
    fail("Gujarati: Missing station terminology",
      "Expected \u0AB8\u0ACD\u0A9F\u0AC7\u0AB6\u0AA8");
  }

  // Check specific key translations for accuracy
  // Hindi: "your_station" should contain स्टेशन
  if (hiFlat["index.your_station"] && hiFlat["index.your_station"].indexOf("\u0938\u094D\u091F\u0947\u0936\u0928") !== -1) {
    pass("Hindi: index.your_station contains \u0938\u094D\u091F\u0947\u0936\u0928",
      hiFlat["index.your_station"]);
  } else {
    warn("Hindi: index.your_station may not contain station term",
      hiFlat["index.your_station"] || "(missing)");
  }

  // Gujarati: "your_station" should contain સ્ટેશન
  if (guFlat["index.your_station"] && guFlat["index.your_station"].indexOf("\u0AB8\u0ACD\u0A9F\u0AC7\u0AB6\u0AA8") !== -1) {
    pass("Gujarati: index.your_station contains \u0AB8\u0ACD\u0A9F\u0AC7\u0AB6\u0AA8",
      guFlat["index.your_station"]);
  } else {
    warn("Gujarati: index.your_station may not contain station term",
      guFlat["index.your_station"] || "(missing)");
  }

  // Check additional transit vocabulary (bus, ferry, schedule, etc.)
  var hiAdditionalTerms = {
    "\u092C\u0938": "bus (\u092C\u0938)",              // बस
    "\u092B\u0947\u0930\u0940": "ferry (\u092B\u0947\u0930\u0940)",  // फेरी
    "\u091F\u093F\u0915\u091F": "ticket (\u091F\u093F\u0915\u091F)", // टिकट
    "\u0938\u092E\u092F": "schedule/time (\u0938\u092E\u092F)"       // समय
  };

  Object.keys(hiAdditionalTerms).forEach(function (term) {
    if (hiAllText.indexOf(term) !== -1) {
      pass("Hindi: Contains transit term " + hiAdditionalTerms[term]);
    } else {
      warn("Hindi: Missing transit term " + hiAdditionalTerms[term]);
    }
  });

  var guAdditionalTerms = {
    "\u0AAC\u0AB8": "bus (\u0AAC\u0AB8)",                       // બસ
    "\u0AAB\u0AC7\u0AB0\u0AC0": "ferry (\u0AAB\u0AC7\u0AB0\u0AC0)", // ફેરી
    "\u0A9F\u0ABF\u0A95\u0ABF\u0A9F": "ticket (\u0A9F\u0ABF\u0A95\u0ABF\u0A9F)", // ટિકિટ
    "\u0AB8\u0AAE\u0AAF": "time (\u0AB8\u0AAE\u0AAF)"                // સમય
  };

  Object.keys(guAdditionalTerms).forEach(function (term) {
    if (guAllText.indexOf(term) !== -1) {
      pass("Gujarati: Contains transit term " + guAdditionalTerms[term]);
    } else {
      warn("Gujarati: Missing transit term " + guAdditionalTerms[term]);
    }
  });
})();

// ===========================================================================
// TEST SUITE 5: Appropriate formality (Hindi: आप form, not तू)
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 5: Appropriate formality level");
console.log("=".repeat(70));

(function () {
  var hiAllText = Object.keys(hiFlat).map(function (k) {
    return typeof hiFlat[k] === "string" ? hiFlat[k] : "";
  }).join(" ");

  // Check for informal pronouns in Hindi
  var informalFound = [];
  HINDI_INFORMAL_PRONOUNS.forEach(function (pronoun) {
    if (hiAllText.indexOf(pronoun) !== -1) {
      informalFound.push(pronoun.trim());
    }
  });

  if (informalFound.length === 0) {
    pass("Hindi: No informal pronouns (\u0924\u0942/\u0924\u0941\u091D/\u0924\u0947\u0930) found",
      "Appropriate for public information context");
  } else {
    fail("Hindi: Informal pronouns found",
      "Found: " + informalFound.join(", ") + " -- should use \u0906\u092A forms for public info");
  }

  // Check that formal pronouns (आप forms) are present
  var formalFound = [];
  HINDI_FORMAL_PRONOUNS.forEach(function (pronoun) {
    if (hiAllText.indexOf(pronoun) !== -1) {
      formalFound.push(pronoun);
    }
  });

  if (formalFound.length > 0) {
    pass("Hindi: Formal pronouns (\u0906\u092A forms) found",
      "Found: " + formalFound.join(", "));
  } else {
    warn("Hindi: No formal \u0906\u092A pronouns detected",
      "Expected \u0906\u092A/\u0906\u092A\u0915\u093E/\u0906\u092A\u0915\u0940/\u0906\u092A\u0915\u0947 for respectful address");
  }

  // Gujarati formality: check for તમે/તમારું (polite) vs તું (informal)
  var guAllText = Object.keys(guFlat).map(function (k) {
    return typeof guFlat[k] === "string" ? guFlat[k] : "";
  }).join(" ");

  var guFormalPronouns = [
    "\u0AA4\u0AAE\u0AC7",          // તમે (you, polite)
    "\u0AA4\u0AAE\u0ABE\u0AB0",    // તમાર (your, polite stem)
  ];

  var guInformalPronoun = "\u0AA4\u0AC2 "; // તૂ  (informal, with space)

  var guHasInformal = guAllText.indexOf(guInformalPronoun) !== -1;
  var guFormalFound = guFormalPronouns.filter(function (p) {
    return guAllText.indexOf(p) !== -1;
  });

  if (!guHasInformal && guFormalFound.length > 0) {
    pass("Gujarati: Uses polite form (\u0AA4\u0AAE\u0AC7/\u0AA4\u0AAE\u0ABE\u0AB0\u0AC1\u0A82), no informal \u0AA4\u0AC2",
      "Appropriate for public information context");
  } else if (guHasInformal) {
    fail("Gujarati: Informal pronoun \u0AA4\u0AC2 found",
      "Should use \u0AA4\u0AAE\u0AC7 forms for public information");
  } else {
    warn("Gujarati: Could not verify formality level");
  }

  // Check verb forms - Hindi should use आप-conjugation (e.g., करें, देखें, चुनें)
  var hiRespectfulVerbs = [
    "\u091A\u0941\u0928\u0947\u0902",  // चुनें (choose, respectful)
    "\u0926\u0947\u0916\u0947\u0902",  // देखें (see, respectful)
    "\u0915\u0930\u0947\u0902",        // करें (do, respectful)
    "\u091C\u093E\u090F\u0902",        // जाएं (go, respectful)
  ];

  var hiRespectfulVerbCount = 0;
  hiRespectfulVerbs.forEach(function (verb) {
    if (hiAllText.indexOf(verb) !== -1) {
      hiRespectfulVerbCount++;
    }
  });

  if (hiRespectfulVerbCount >= 2) {
    pass("Hindi: Respectful verb conjugations found",
      hiRespectfulVerbCount + "/" + hiRespectfulVerbs.length + " \u0906\u092A-form verbs detected");
  } else {
    warn("Hindi: Few respectful verb conjugations found",
      hiRespectfulVerbCount + "/" + hiRespectfulVerbs.length + " detected");
  }
})();

// ===========================================================================
// TEST SUITE 6: Station/line names stay in English
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 6: Station and line names preserved in English");
console.log("=".repeat(70));

(function () {
  // Keys that specifically reference stations/lines and should contain English proper nouns
  var keysWithProperNouns = [
    "index.alert_details",
    "index.hoboken_terminal_title",
    "index.hoboken_terminal_desc",
    "index.path_step5",
    "index.secaucus_title",
    "index.secaucus_intro",
    "card.line_summary_montclair-boonton",
    "card.line_summary_morris-essex",
    "card.line_summary_northeast-corridor",
    "card.line_summary_north-jersey-coast",
    "card.line_summary_raritan-valley",
    "map.about_desc"
  ];

  var criticalNouns = ["Hoboken", "Newark", "Secaucus", "Penn Station", "PATH"];

  // Hindi
  keysWithProperNouns.forEach(function (key) {
    if (!hiFlat[key]) return;
    var missingNouns = [];
    criticalNouns.forEach(function (noun) {
      // Only check nouns that appear in the English version for this key
      if (enFlat[key] && enFlat[key].indexOf(noun) !== -1) {
        if (hiFlat[key].indexOf(noun) === -1) {
          missingNouns.push(noun);
        }
      }
    });

    if (missingNouns.length === 0) {
      pass("Hindi: " + key + " preserves English proper nouns");
    } else {
      fail("Hindi: " + key + " missing English proper nouns",
        "Missing: " + missingNouns.join(", "));
    }
  });

  // Gujarati
  keysWithProperNouns.forEach(function (key) {
    if (!guFlat[key]) return;
    var missingNouns = [];
    criticalNouns.forEach(function (noun) {
      if (enFlat[key] && enFlat[key].indexOf(noun) !== -1) {
        if (guFlat[key].indexOf(noun) === -1) {
          missingNouns.push(noun);
        }
      }
    });

    if (missingNouns.length === 0) {
      pass("Gujarati: " + key + " preserves English proper nouns");
    } else {
      fail("Gujarati: " + key + " missing English proper nouns",
        "Missing: " + missingNouns.join(", "));
    }
  });

  // Broad check: count how many of the critical proper nouns appear overall
  var hiAllText = Object.values(hiFlat).filter(function (v) { return typeof v === "string"; }).join(" ");
  var guAllText = Object.values(guFlat).filter(function (v) { return typeof v === "string"; }).join(" ");

  var hiNounCount = 0;
  var guNounCount = 0;
  ENGLISH_PROPER_NOUNS.forEach(function (noun) {
    if (hiAllText.indexOf(noun) !== -1) hiNounCount++;
    if (guAllText.indexOf(noun) !== -1) guNounCount++;
  });

  if (hiNounCount >= 15) {
    pass("Hindi: Broad proper noun preservation",
      hiNounCount + "/" + ENGLISH_PROPER_NOUNS.length + " English proper nouns found across all keys");
  } else {
    warn("Hindi: Low proper noun count",
      hiNounCount + "/" + ENGLISH_PROPER_NOUNS.length + " English proper nouns found");
  }

  if (guNounCount >= 15) {
    pass("Gujarati: Broad proper noun preservation",
      guNounCount + "/" + ENGLISH_PROPER_NOUNS.length + " English proper nouns found across all keys");
  } else {
    warn("Gujarati: Low proper noun count",
      guNounCount + "/" + ENGLISH_PROPER_NOUNS.length + " English proper nouns found");
  }
})();

// ===========================================================================
// TEST SUITE 7: HTML entities preserved
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 7: HTML entities preserved");
console.log("=".repeat(70));

(function () {
  // Find all keys in English that contain HTML entities and verify Hindi/Gujarati
  // have the same entities
  var enKeysWithEntities = {};

  Object.keys(enFlat).forEach(function (key) {
    var val = enFlat[key];
    if (typeof val !== "string") return;
    var entities = [];
    HTML_ENTITIES.forEach(function (entity) {
      if (val.indexOf(entity) !== -1) {
        entities.push(entity);
      }
    });
    if (entities.length > 0) {
      enKeysWithEntities[key] = entities;
    }
  });

  var hiEntityIssues = [];
  var guEntityIssues = [];

  Object.keys(enKeysWithEntities).forEach(function (key) {
    var entities = enKeysWithEntities[key];

    // Check Hindi
    if (hiFlat[key]) {
      entities.forEach(function (entity) {
        if (hiFlat[key].indexOf(entity) === -1) {
          hiEntityIssues.push(key + " missing " + entity);
        }
      });
    }

    // Check Gujarati
    if (guFlat[key]) {
      entities.forEach(function (entity) {
        if (guFlat[key].indexOf(entity) === -1) {
          guEntityIssues.push(key + " missing " + entity);
        }
      });
    }
  });

  if (hiEntityIssues.length === 0) {
    pass("Hindi: All HTML entities preserved from English source",
      Object.keys(enKeysWithEntities).length + " keys with entities checked");
  } else {
    warn("Hindi: Some HTML entities missing",
      hiEntityIssues.length + " issues: " + hiEntityIssues.slice(0, 3).join("; ") +
      (hiEntityIssues.length > 3 ? "..." : ""));
  }

  if (guEntityIssues.length === 0) {
    pass("Gujarati: All HTML entities preserved from English source",
      Object.keys(enKeysWithEntities).length + " keys with entities checked");
  } else {
    warn("Gujarati: Some HTML entities missing",
      guEntityIssues.length + " issues: " + guEntityIssues.slice(0, 3).join("; ") +
      (guEntityIssues.length > 3 ? "..." : ""));
  }

  // Check HTML tag structure preservation
  var htmlTagRe = /<(strong|a|code|em|br)\b[^>]*>/g;
  var hiTagIssues = [];
  var guTagIssues = [];

  Object.keys(enFlat).forEach(function (key) {
    var enVal = enFlat[key];
    if (typeof enVal !== "string") return;

    var enTags = (enVal.match(htmlTagRe) || []).length;
    if (enTags === 0) return;

    if (hiFlat[key]) {
      var hiTags = (hiFlat[key].match(htmlTagRe) || []).length;
      if (hiTags !== enTags) {
        hiTagIssues.push(key + " (en=" + enTags + " hi=" + hiTags + ")");
      }
    }

    if (guFlat[key]) {
      var guTags = (guFlat[key].match(htmlTagRe) || []).length;
      if (guTags !== enTags) {
        guTagIssues.push(key + " (en=" + enTags + " gu=" + guTags + ")");
      }
    }
  });

  if (hiTagIssues.length === 0) {
    pass("Hindi: HTML tag count matches English source for all keys");
  } else {
    warn("Hindi: HTML tag count mismatch in some keys",
      hiTagIssues.slice(0, 5).join("; "));
  }

  if (guTagIssues.length === 0) {
    pass("Gujarati: HTML tag count matches English source for all keys");
  } else {
    warn("Gujarati: HTML tag count mismatch in some keys",
      guTagIssues.slice(0, 5).join("; "));
  }
})();

// ===========================================================================
// TEST SUITE 8: Numbers handled correctly
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 8: Numbers handled correctly");
console.log("=".repeat(70));

(function () {
  // Critical transit numbers that must be preserved
  var criticalNumbers = [
    { num: "50", context: "50% service reduction", keys: ["index.alert_details", "index.secaucus_intro"] },
    { num: "133", context: "trains before NEC", keys: ["card.line_summary_northeast-corridor"] },
    { num: "112", context: "trains during NEC", keys: ["card.line_summary_northeast-corridor"] },
    { num: "109", context: "trains before NJC", keys: ["card.line_summary_north-jersey-coast"] },
    { num: "92", context: "trains during NJC", keys: ["card.line_summary_north-jersey-coast"] },
    { num: "126", context: "Bus 126", keys: ["index.bus_title", "index.bus_step5"] },
    { num: "1910", context: "old bridge year", keys: ["map.old_bridge_item1"] },
    { num: "33", context: "33rd Street", keys: ["index.path_title"] }
  ];

  // Devanagari digits: ० १ २ ३ ४ ५ ६ ७ ८ ९ (U+0966-096F)
  // Gujarati digits: ૦ ૧ ૨ ૩ ૪ ૫ ૬ ૭ ૮ ૯ (U+0AE6-0AEF)

  function toDevanagariDigits(str) {
    return str.replace(/[0-9]/g, function (d) {
      return String.fromCharCode(0x0966 + parseInt(d));
    });
  }

  function toGujaratiDigits(str) {
    return str.replace(/[0-9]/g, function (d) {
      return String.fromCharCode(0x0AE6 + parseInt(d));
    });
  }

  var hiNumberIssues = [];
  var guNumberIssues = [];

  criticalNumbers.forEach(function (item) {
    item.keys.forEach(function (key) {
      // Check Hindi
      if (hiFlat[key]) {
        var hasWestern = hiFlat[key].indexOf(item.num) !== -1;
        var hasDevanagari = hiFlat[key].indexOf(toDevanagariDigits(item.num)) !== -1;
        if (hasWestern || hasDevanagari) {
          pass("Hindi: " + key + " preserves number " + item.num,
            item.context + (hasDevanagari ? " (Devanagari digits)" : " (Western digits)"));
        } else {
          hiNumberIssues.push(key + " missing " + item.num);
          fail("Hindi: " + key + " missing number " + item.num, item.context);
        }
      }

      // Check Gujarati
      if (guFlat[key]) {
        var hasWesternGu = guFlat[key].indexOf(item.num) !== -1;
        var hasGujarati = guFlat[key].indexOf(toGujaratiDigits(item.num)) !== -1;
        if (hasWesternGu || hasGujarati) {
          pass("Gujarati: " + key + " preserves number " + item.num,
            item.context + (hasGujarati ? " (Gujarati digits)" : " (Western digits)"));
        } else {
          guNumberIssues.push(key + " missing " + item.num);
          fail("Gujarati: " + key + " missing number " + item.num, item.context);
        }
      }
    });
  });

  // Check that "4" (weeks) appears in some form
  var hiHas4Weeks = (hiFlat["index.stat_4_weeks"] || "").match(/4|\u096A/) !== null;
  var guHas4Weeks = (guFlat["index.stat_4_weeks"] || "").match(/4|\u0AEA/) !== null;

  if (hiHas4Weeks) {
    pass("Hindi: stat_4_weeks contains number 4", hiFlat["index.stat_4_weeks"]);
  } else {
    fail("Hindi: stat_4_weeks missing number 4", hiFlat["index.stat_4_weeks"] || "(missing)");
  }

  if (guHas4Weeks) {
    pass("Gujarati: stat_4_weeks contains number 4", guFlat["index.stat_4_weeks"]);
  } else {
    fail("Gujarati: stat_4_weeks missing number 4", guFlat["index.stat_4_weeks"] || "(missing)");
  }

  // Check digit system consistency within each language
  var hiWesternDigitKeys = 0;
  var hiDevanagariDigitKeys = 0;
  Object.keys(hiFlat).forEach(function (key) {
    var val = hiFlat[key];
    if (typeof val !== "string") return;
    if (/[0-9]/.test(val)) hiWesternDigitKeys++;
    if (/[\u0966-\u096F]/.test(val)) hiDevanagariDigitKeys++;
  });

  if (hiWesternDigitKeys > 0 && hiDevanagariDigitKeys === 0) {
    pass("Hindi: Consistent digit system",
      "Uses Western (Arabic) numerals consistently (" + hiWesternDigitKeys + " keys)");
  } else if (hiDevanagariDigitKeys > 0 && hiWesternDigitKeys === 0) {
    pass("Hindi: Consistent digit system",
      "Uses Devanagari numerals consistently (" + hiDevanagariDigitKeys + " keys)");
  } else if (hiWesternDigitKeys > 0 && hiDevanagariDigitKeys > 0) {
    warn("Hindi: Mixed digit systems",
      hiWesternDigitKeys + " keys with Western digits, " +
      hiDevanagariDigitKeys + " keys with Devanagari digits");
  }

  var guWesternDigitKeys = 0;
  var guGujaratiDigitKeys = 0;
  Object.keys(guFlat).forEach(function (key) {
    var val = guFlat[key];
    if (typeof val !== "string") return;
    if (/[0-9]/.test(val)) guWesternDigitKeys++;
    if (/[\u0AE6-\u0AEF]/.test(val)) guGujaratiDigitKeys++;
  });

  if (guWesternDigitKeys > 0 && guGujaratiDigitKeys === 0) {
    pass("Gujarati: Consistent digit system",
      "Uses Western (Arabic) numerals consistently (" + guWesternDigitKeys + " keys)");
  } else if (guGujaratiDigitKeys > 0 && guWesternDigitKeys === 0) {
    pass("Gujarati: Consistent digit system",
      "Uses Gujarati numerals consistently (" + guGujaratiDigitKeys + " keys)");
  } else if (guWesternDigitKeys > 0 && guGujaratiDigitKeys > 0) {
    warn("Gujarati: Mixed digit systems",
      guWesternDigitKeys + " keys with Western digits, " +
      guGujaratiDigitKeys + " keys with Gujarati digits");
  }
})();

// ===========================================================================
// TEST SUITE 9: Natural phrasing for public information context
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("TEST SUITE 9: Natural phrasing for public information context");
console.log("=".repeat(70));

(function () {
  // Check that translations are not just transliterations of English
  // A purely transliterated string would have very few native script characters
  // relative to its length
  var hiLowQualityKeys = [];
  var guLowQualityKeys = [];

  Object.keys(enFlat).forEach(function (key) {
    if (SKIP_SCRIPT_CHECK_KEYS.indexOf(key) !== -1) return;
    var enVal = enFlat[key];
    if (typeof enVal !== "string" || enVal.length < 20) return;

    // Hindi
    if (hiFlat[key]) {
      var hiVal = hiFlat[key];
      // If the Hindi value is identical to English, that's a problem
      if (hiVal === enVal) {
        hiLowQualityKeys.push(key + " (identical to English)");
      }
    }

    // Gujarati
    if (guFlat[key]) {
      var guVal = guFlat[key];
      if (guVal === enVal) {
        guLowQualityKeys.push(key + " (identical to English)");
      }
    }
  });

  if (hiLowQualityKeys.length === 0) {
    pass("Hindi: No untranslated English strings found",
      "All translatable strings have been translated");
  } else {
    fail("Hindi: Some strings appear untranslated",
      hiLowQualityKeys.length + " keys: " + hiLowQualityKeys.slice(0, 3).join("; "));
  }

  if (guLowQualityKeys.length === 0) {
    pass("Gujarati: No untranslated English strings found",
      "All translatable strings have been translated");
  } else {
    fail("Gujarati: Some strings appear untranslated",
      guLowQualityKeys.length + " keys: " + guLowQualityKeys.slice(0, 3).join("; "));
  }

  // Check translation length ratio (translations shouldn't be vastly shorter than English)
  // Hindi/Gujarati text is typically similar in length or slightly longer than English
  var hiTooShort = [];
  var guTooShort = [];

  Object.keys(enFlat).forEach(function (key) {
    if (SKIP_SCRIPT_CHECK_KEYS.indexOf(key) !== -1) return;
    var enVal = enFlat[key];
    if (typeof enVal !== "string" || enVal.length < 30) return;
    var enLen = stripHtml(enVal).length;

    if (hiFlat[key]) {
      var hiLen = stripHtml(hiFlat[key]).length;
      // If translation is less than 30% of English length, likely truncated or missing
      if (hiLen < enLen * 0.3) {
        hiTooShort.push(key + " (en=" + enLen + " hi=" + hiLen + ")");
      }
    }

    if (guFlat[key]) {
      var guLen = stripHtml(guFlat[key]).length;
      if (guLen < enLen * 0.3) {
        guTooShort.push(key + " (en=" + enLen + " gu=" + guLen + ")");
      }
    }
  });

  if (hiTooShort.length === 0) {
    pass("Hindi: Translation length ratios reasonable",
      "No suspiciously short translations found");
  } else {
    warn("Hindi: Some translations appear suspiciously short",
      hiTooShort.slice(0, 5).join("; "));
  }

  if (guTooShort.length === 0) {
    pass("Gujarati: Translation length ratios reasonable",
      "No suspiciously short translations found");
  } else {
    warn("Gujarati: Some translations appear suspiciously short",
      guTooShort.slice(0, 5).join("; "));
  }

  // Check postposition usage (natural Hindi uses postpositions like में, से, को, पर, के, की, का)
  var hiPostpositions = [
    "\u092E\u0947\u0902",   // में (in)
    "\u0938\u0947",         // से (from)
    "\u0915\u094B",         // को (to)
    "\u092A\u0930",         // पर (on)
    "\u0915\u0947",         // के (of, possessive)
    "\u0915\u0940",         // की (of, feminine)
    "\u0915\u093E"          // का (of, masculine)
  ];

  var hiAllText = Object.values(hiFlat).filter(function (v) { return typeof v === "string"; }).join(" ");
  var hiPostpositionCount = 0;
  hiPostpositions.forEach(function (pp) {
    if (hiAllText.indexOf(pp) !== -1) hiPostpositionCount++;
  });

  if (hiPostpositionCount >= 5) {
    pass("Hindi: Natural postposition usage detected",
      hiPostpositionCount + "/" + hiPostpositions.length + " common postpositions found");
  } else {
    warn("Hindi: Low postposition count",
      hiPostpositionCount + "/" + hiPostpositions.length +
      " -- may indicate unnatural phrasing");
  }

  // Gujarati postpositions/suffixes (માં, થી, ને, પર, નો, ની, નું)
  var guPostpositions = [
    "\u0AAE\u0ABE\u0A82",   // માં (in)
    "\u0AA5\u0AC0",         // થી (from)
    "\u0AA8\u0AC7",         // ને (to)
    "\u0AAA\u0AB0",         // પર (on)
    "\u0AA8\u0ACB",         // નો (of, masc)
    "\u0AA8\u0AC0",         // ની (of, fem)
    "\u0AA8\u0AC1\u0A82"    // નું (of, neut)
  ];

  var guAllText = Object.values(guFlat).filter(function (v) { return typeof v === "string"; }).join(" ");
  var guPostpositionCount = 0;
  guPostpositions.forEach(function (pp) {
    if (guAllText.indexOf(pp) !== -1) guPostpositionCount++;
  });

  if (guPostpositionCount >= 5) {
    pass("Gujarati: Natural postposition usage detected",
      guPostpositionCount + "/" + guPostpositions.length + " common postpositions found");
  } else {
    warn("Gujarati: Low postposition count",
      guPostpositionCount + "/" + guPostpositions.length +
      " -- may indicate unnatural phrasing");
  }

  // Check that common CTA phrases are naturally phrased
  var hiCTAPhrases = {
    "blog_post.cta": "\u0905\u092A\u0928\u0940 \u092F\u093E\u0924\u094D\u0930\u093E", // अपनी यात्रा (your journey/commute)
    "index.compare_callout_btn": "\u0924\u0941\u0932\u0928\u093E",  // तुलना (comparison)
    "blog.read_more": "\u092A\u0922\u093C\u0947\u0902"             // पढ़ें (read)
  };

  Object.keys(hiCTAPhrases).forEach(function (key) {
    if (hiFlat[key] && hiFlat[key].indexOf(hiCTAPhrases[key]) !== -1) {
      pass("Hindi: " + key + " uses natural CTA phrasing",
        "Contains '" + hiCTAPhrases[key] + "'");
    } else if (hiFlat[key]) {
      // Not a failure, just informational
      pass("Hindi: " + key + " has CTA translation", hiFlat[key]);
    }
  });

  var guCTAPhrases = {
    "blog_post.cta": "\u0AAE\u0AC1\u0AB8\u0ABE\u0AAB\u0AB0\u0AC0", // મુસાફરી (travel/commute)
    "blog.read_more": "\u0AB5\u0ABE\u0A82\u0A9A\u0ACB"              // વાંચો (read)
  };

  Object.keys(guCTAPhrases).forEach(function (key) {
    if (guFlat[key] && guFlat[key].indexOf(guCTAPhrases[key]) !== -1) {
      pass("Gujarati: " + key + " uses natural CTA phrasing",
        "Contains '" + guCTAPhrases[key] + "'");
    } else if (guFlat[key]) {
      pass("Gujarati: " + key + " has CTA translation", guFlat[key]);
    }
  });
})();

// ===========================================================================
// Summary
// ===========================================================================

console.log("\n" + "=".repeat(70));
console.log("SUMMARY: Hindi & Gujarati Linguistic Validation");
console.log("=".repeat(70));
console.log("  PASS: " + totalPass);
console.log("  FAIL: " + totalFail);
console.log("  WARN: " + totalWarn);
console.log("  TOTAL: " + (totalPass + totalFail + totalWarn));
console.log("=".repeat(70));

if (totalFail > 0) {
  console.log("\nFailed tests:");
  results.forEach(function (r) {
    if (r.status === "FAIL") {
      console.log("  - " + r.test + (r.detail ? ": " + r.detail : ""));
    }
  });
}

if (totalWarn > 0) {
  console.log("\nWarnings:");
  results.forEach(function (r) {
    if (r.status === "WARN") {
      console.log("  - " + r.test + (r.detail ? ": " + r.detail : ""));
    }
  });
}

console.log("");
process.exit(totalFail > 0 ? 1 : 0);
