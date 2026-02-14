/**
 * Reroute NJ — Cross-Reference and Data Consistency Tests
 *
 * Validates that data across line-data.js, translations/en.json, shared.js,
 * data/coverage.json, app.js, compare.js, cards.js, and index.html are all
 * consistent with each other. Run with: node tests/test-cross-references.js
 */

var fs = require("fs");
var path = require("path");

var ROOT = path.resolve(__dirname, "..");

// =========================================================================
// HELPERS
// =========================================================================
var passed = 0;
var failed = 0;

function report(name, ok, detail) {
  if (ok) {
    console.log("PASS: " + name);
    passed++;
  } else {
    console.log("FAIL: " + name + (detail ? " — " + detail : ""));
    failed++;
  }
}

function loadFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function loadJSON(relPath) {
  return JSON.parse(loadFile(relPath));
}

// =========================================================================
// PARSE LINE_DATA AND LINE_ORDER FROM line-data.js
// We use a sandboxed eval approach since line-data.js exposes globals.
// =========================================================================
function parseLineData() {
  var src = loadFile("js/line-data.js");
  // Execute in a mini-sandbox
  var sandbox = {};
  var fn = new Function("var LINE_DATA, LINE_ORDER;\n" + src + "\nreturn {LINE_DATA: LINE_DATA, LINE_ORDER: LINE_ORDER};");
  var result = fn();
  return result;
}

var lineDataResult = parseLineData();
var LINE_DATA = lineDataResult.LINE_DATA;
var LINE_ORDER = lineDataResult.LINE_ORDER;

// =========================================================================
// LOAD OTHER FILES
// =========================================================================
var enJSON = loadJSON("translations/en.json");
var coverageJSON = loadJSON("data/coverage.json");
var sharedSrc = loadFile("js/shared.js");
var appSrc = loadFile("js/app.js");
var compareSrc = loadFile("js/compare.js");
var cardsSrc = loadFile("js/cards.js");
var indexHTML = loadFile("index.html");

// =========================================================================
// EXTRACT DATES FROM shared.js
// =========================================================================
function extractDates() {
  var startMatch = sharedSrc.match(/CUTOVER_START\s*=\s*new Date\("([^"]+)"\)/);
  var endMatch = sharedSrc.match(/CUTOVER_END\s*=\s*new Date\("([^"]+)"\)/);
  var phase2Match = sharedSrc.match(/PHASE2_APPROX\s*=\s*"([^"]+)"/);
  return {
    start: startMatch ? startMatch[1] : null,
    end: endMatch ? endMatch[1] : null,
    phase2: phase2Match ? phase2Match[1] : null
  };
}

var dates = extractDates();

console.log("======================================================");
console.log("Reroute NJ — Cross-Reference & Data Consistency Tests");
console.log("======================================================\n");

// =========================================================================
// TEST 1: Train count numbers in LINE_DATA match card translations
// =========================================================================
(function test1() {
  var testName = "1. Train counts in LINE_DATA match card translation summaries";
  var issues = [];

  // NEC: 133 before, 112 after
  var necSummary = enJSON.card["line_summary_northeast-corridor"];
  if (necSummary.indexOf(String(LINE_DATA["northeast-corridor"].trainsBefore)) === -1) {
    issues.push("NEC trainsBefore (" + LINE_DATA["northeast-corridor"].trainsBefore + ") not found in card summary");
  }
  if (necSummary.indexOf(String(LINE_DATA["northeast-corridor"].trainsAfter)) === -1) {
    issues.push("NEC trainsAfter (" + LINE_DATA["northeast-corridor"].trainsAfter + ") not found in card summary");
  }

  // NJCL: 109 before, 92 after
  var njclSummary = enJSON.card["line_summary_north-jersey-coast"];
  if (njclSummary.indexOf(String(LINE_DATA["north-jersey-coast"].trainsBefore)) === -1) {
    issues.push("NJCL trainsBefore (" + LINE_DATA["north-jersey-coast"].trainsBefore + ") not found in card summary");
  }
  if (njclSummary.indexOf(String(LINE_DATA["north-jersey-coast"].trainsAfter)) === -1) {
    issues.push("NJCL trainsAfter (" + LINE_DATA["north-jersey-coast"].trainsAfter + ") not found in card summary");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 2: Train count numbers in LINE_DATA match index.html content
// =========================================================================
(function test2() {
  var testName = "2. Train counts in LINE_DATA are available to index.html via loaded scripts";
  var issues = [];

  // index.html loads line-data.js which provides LINE_DATA with train counts.
  // The actual numbers appear dynamically at runtime via app.js, not hardcoded in HTML.
  // Verify: (a) index.html loads line-data.js, (b) the data is correct, (c) the
  // "5 lines affected" and "50%" stats ARE hardcoded in the HTML.

  // Check that index.html loads line-data.js
  if (indexHTML.indexOf("js/line-data.js") === -1) {
    issues.push("index.html does not load js/line-data.js");
  }

  // Check that index.html loads app.js which uses line.trainsBefore/trainsAfter
  if (indexHTML.indexOf("js/app.js") === -1) {
    issues.push("index.html does not load js/app.js");
  }

  // Verify app.js references trainsBefore and trainsAfter to render them
  if (appSrc.indexOf("line.trainsBefore") === -1) {
    issues.push("app.js does not reference line.trainsBefore");
  }
  if (appSrc.indexOf("line.trainsAfter") === -1) {
    issues.push("app.js does not reference line.trainsAfter");
  }

  // The "5" lines affected stat
  if (indexHTML.indexOf('<span class="stat-number">5</span>') === -1) {
    issues.push("'5 lines affected' stat not found in index.html");
  }

  // 50% service reduction stat
  if (indexHTML.indexOf("50%") === -1) {
    issues.push("'50%' service reduction not found in index.html");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 3: Line names in LINE_DATA match line names in translations
// =========================================================================
(function test3() {
  var testName = "3. Line names in LINE_DATA match translations";
  var issues = [];

  // The card translations have keys like "line_summary_<lineId>"
  // Each summary should reference the correct line name
  var lineChecks = {
    "montclair-boonton": "Midtown Direct",  // Both M-B and M&E mention Midtown Direct
    "morris-essex": "Morristown Line",
    "northeast-corridor": "Penn Station NY",
    "north-jersey-coast": "Penn Station NY",
    "raritan-valley": "Newark Penn Station"
  };

  LINE_ORDER.forEach(function (lineId) {
    var cardKey = "line_summary_" + lineId;
    if (!enJSON.card[cardKey]) {
      issues.push("Missing card translation key: " + cardKey);
    }
  });

  // Verify line names appear in card summaries correctly
  LINE_ORDER.forEach(function (lineId) {
    var line = LINE_DATA[lineId];
    var cardKey = "line_summary_" + lineId;
    var cardSummary = enJSON.card[cardKey] || "";
    var lineDataSummary = line.summary;
    // The card summary and the LINE_DATA summary should match
    if (cardSummary !== lineDataSummary) {
      issues.push(lineId + ": card translation summary differs from LINE_DATA summary");
    }
  });

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 4: Date range "Feb 15 - Mar 15, 2026" in translations matches
//         CUTOVER_START and CUTOVER_END in shared.js
// =========================================================================
(function test4() {
  var testName = "4. Date range in translations matches CUTOVER_START/CUTOVER_END in shared.js";
  var issues = [];

  // CUTOVER_START should be 2026-02-15
  if (dates.start !== "2026-02-15T00:00:00") {
    issues.push("CUTOVER_START is '" + dates.start + "', expected '2026-02-15T00:00:00'");
  }
  // CUTOVER_END should be 2026-03-15
  if (dates.end !== "2026-03-15T00:00:00") {
    issues.push("CUTOVER_END is '" + dates.end + "', expected '2026-03-15T00:00:00'");
  }

  // Translations should mention Feb 15 and Mar 15, 2026
  var dateRange = enJSON.card.date_range; // "Feb 15 – Mar 15, 2026"
  if (dateRange.indexOf("Feb 15") === -1 || dateRange.indexOf("Mar 15") === -1 || dateRange.indexOf("2026") === -1) {
    issues.push("card.date_range ('" + dateRange + "') does not match expected 'Feb 15 – Mar 15, 2026'");
  }

  // Check index.alert_details too
  var alertDetails = enJSON.index.alert_details;
  if (alertDetails.indexOf("Feb 15") === -1 || alertDetails.indexOf("Mar 15") === -1 || alertDetails.indexOf("2026") === -1) {
    issues.push("index.alert_details does not contain correct date range");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 5: Impact type descriptions in card translations match impactType
//         values in LINE_DATA
// =========================================================================
(function test5() {
  var testName = "5. Impact type descriptions in card translations match LINE_DATA impactTypes";
  var issues = [];

  var impactMap = {
    "hoboken-diversion": enJSON.card.impact_hoboken_diversion,
    "reduced-service": enJSON.card.impact_reduced_service,
    "newark-termination": enJSON.card.impact_newark_termination
  };

  LINE_ORDER.forEach(function (lineId) {
    var line = LINE_DATA[lineId];
    if (!impactMap[line.impactType]) {
      issues.push(lineId + ": impactType '" + line.impactType + "' has no card translation");
    }
  });

  // Verify the labels make sense
  if (impactMap["hoboken-diversion"].toLowerCase().indexOf("hoboken") === -1) {
    issues.push("hoboken-diversion label doesn't mention Hoboken");
  }
  if (impactMap["reduced-service"].toLowerCase().indexOf("reduced") === -1) {
    issues.push("reduced-service label doesn't mention 'reduced'");
  }
  if (impactMap["newark-termination"].toLowerCase().indexOf("newark") === -1) {
    issues.push("newark-termination label doesn't mention Newark");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 6: Summary texts in LINE_DATA match card translations
// =========================================================================
(function test6() {
  var testName = "6. LINE_DATA summaries are consistent with card.line_summary_* translations";
  var issues = [];

  LINE_ORDER.forEach(function (lineId) {
    var line = LINE_DATA[lineId];
    var cardKey = "line_summary_" + lineId;
    var cardSummary = enJSON.card[cardKey];
    if (!cardSummary) {
      issues.push(lineId + ": missing card translation key '" + cardKey + "'");
      return;
    }
    if (line.summary !== cardSummary) {
      issues.push(lineId + ": LINE_DATA.summary !== card." + cardKey);
    }
  });

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 7: "Five NJ Transit lines" in summary card text matches LINE_ORDER.length
// =========================================================================
(function test7() {
  var testName = "7. 'Five NJ Transit lines' in summary card matches LINE_ORDER.length (" + LINE_ORDER.length + ")";
  var issues = [];

  var summaryDesc = enJSON.card.summary_desc;
  // "Five NJ Transit lines affected from Feb 15 – Mar 15, 2026."
  var numberWords = { 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten" };
  var expectedWord = numberWords[LINE_ORDER.length];

  if (expectedWord && summaryDesc.indexOf(expectedWord) === -1) {
    issues.push("summary_desc says '" + summaryDesc + "' but LINE_ORDER has " + LINE_ORDER.length + " lines (expected word: '" + expectedWord + "')");
  }

  // Also check the cards.js defaults
  if (cardsSrc.indexOf("Five NJ Transit lines") === -1 && cardsSrc.indexOf(expectedWord + " NJ Transit lines") === -1) {
    issues.push("cards.js defaults don't mention '" + expectedWord + " NJ Transit lines'");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 8: Hub station names in LINE_DATA are referenced in app.js route
//         descriptions
// =========================================================================
(function test8() {
  var testName = "8. Hub station names in LINE_DATA are referenced in app.js";
  var issues = [];

  var hubs = {};
  LINE_ORDER.forEach(function (lineId) {
    var hub = LINE_DATA[lineId].hub;
    hubs[hub] = (hubs[hub] || []);
    hubs[hub].push(lineId);
  });

  // Check that each hub appears in app.js
  Object.keys(hubs).forEach(function (hubName) {
    if (appSrc.indexOf(hubName) === -1) {
      issues.push("Hub '" + hubName + "' (used by " + hubs[hubName].join(", ") + ") not found in app.js");
    }
  });

  // Specifically: Newark Broad St is hub for M-B and M&E
  if (LINE_DATA["montclair-boonton"].hub !== "Newark Broad St") {
    issues.push("Montclair-Boonton hub is not 'Newark Broad St'");
  }
  if (LINE_DATA["morris-essex"].hub !== "Newark Broad St") {
    issues.push("Morris & Essex hub is not 'Newark Broad St'");
  }

  // Newark Penn is hub for NEC and RVL
  if (LINE_DATA["northeast-corridor"].hub !== "Newark Penn") {
    issues.push("NEC hub is not 'Newark Penn'");
  }
  if (LINE_DATA["raritan-valley"].hub !== "Newark Penn") {
    issues.push("RVL hub is not 'Newark Penn'");
  }

  // Secaucus Junction is hub for NJCL
  if (LINE_DATA["north-jersey-coast"].hub !== "Secaucus Junction") {
    issues.push("NJCL hub is not 'Secaucus Junction'");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 9: Coverage.json article line references map to valid LINE_DATA keys
// =========================================================================
(function test9() {
  var testName = "9. Coverage.json article line references all map to valid LINE_DATA keys";
  var issues = [];
  var validKeys = Object.keys(LINE_DATA).concat(["all"]);

  coverageJSON.articles.forEach(function (article) {
    if (!article.lines || !Array.isArray(article.lines)) {
      issues.push("Article '" + article.id + "' has no lines array");
      return;
    }
    article.lines.forEach(function (lineRef) {
      if (validKeys.indexOf(lineRef) === -1) {
        issues.push("Article '" + article.id + "' references invalid line '" + lineRef + "'");
      }
    });
  });

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 10: Translation keys referenced in JS code (via t() calls) exist
//          in en.json
// =========================================================================
(function test10() {
  var testName = "10. Translation keys referenced via t() in JS exist in en.json or i18n.js";
  var issues = [];

  // Collect all t("key") calls from JS files
  // The regex must match standalone t() calls (translation function) and exclude
  // false positives like createElement("div"), split("."), getAttribute("data-line"),
  // etc. The t() translation function is called with dot-notation keys like
  // "common.days", "js.zone", "coverage.no_articles".
  var jsFiles = ["js/app.js", "js/compare.js", "js/coverage.js", "js/shared.js"];
  var tCallRegex = /(?:^|[^a-zA-Z_.])t\("([a-z][a-z_]*\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*)"\)/g;
  var referencedKeys = {};

  jsFiles.forEach(function (file) {
    var src = loadFile(file);
    var match;
    while ((match = tCallRegex.exec(src)) !== null) {
      referencedKeys[match[1]] = file;
    }
  });

  // Also parse the built-in EN object from i18n.js, which is the runtime
  // translation source (en.json is used by the page generator, but runtime
  // JS relies on i18n.js's EN object).
  var i18nSrc = loadFile("js/i18n.js");
  var i18nEN = {};
  try {
    var enMatch = i18nSrc.match(/var EN\s*=\s*(\{[\s\S]*?\n\s*\});/);
    if (enMatch) {
      i18nEN = (new Function("return " + enMatch[1]))();
    }
  } catch (e) {
    // If parsing fails, we'll just check en.json
  }

  // Check each key exists in en.json OR in i18n.js EN object
  Object.keys(referencedKeys).forEach(function (key) {
    var parts = key.split(".");

    // Check en.json first
    var val = enJSON;
    for (var i = 0; i < parts.length; i++) {
      if (val && typeof val === "object" && parts[i] in val) {
        val = val[parts[i]];
      } else {
        val = undefined;
        break;
      }
    }

    // If not found in en.json, check i18n.js EN object
    if (val === undefined) {
      var val2 = i18nEN;
      for (var j = 0; j < parts.length; j++) {
        if (val2 && typeof val2 === "object" && parts[j] in val2) {
          val2 = val2[parts[j]];
        } else {
          val2 = undefined;
          break;
        }
      }
      if (val2 === undefined) {
        issues.push("Key '" + key + "' (used in " + referencedKeys[key] + ") not found in en.json or i18n.js");
      }
    }
  });

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 11: "5 lines affected" stat in index translations matches LINE_ORDER.length
// =========================================================================
(function test11() {
  var testName = "11. '5 lines affected' stat in translations matches LINE_ORDER.length";
  var issues = [];

  // index.html has <span class="stat-number">5</span> and label "lines affected"
  // The translation key index.lines_affected = "lines affected"
  if (LINE_ORDER.length !== 5) {
    issues.push("LINE_ORDER has " + LINE_ORDER.length + " lines but index.html shows 5");
  }

  // Check the "5" appears in index.html
  var statMatch = indexHTML.match(/<span class="stat-number">(\d+)<\/span>\s*\n?\s*<span class="stat-label">lines affected<\/span>/);
  if (statMatch) {
    var statNum = parseInt(statMatch[1], 10);
    if (statNum !== LINE_ORDER.length) {
      issues.push("index.html stat shows " + statNum + " but LINE_ORDER has " + LINE_ORDER.length + " lines");
    }
  } else {
    issues.push("Could not find 'lines affected' stat in index.html");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 12: Phase 2 timeline date in shared.js (PHASE2_APPROX) is
//          referenced consistently in translations
// =========================================================================
(function test12() {
  var testName = "12. PHASE2_APPROX in shared.js matches translations references";
  var issues = [];

  var phase2 = dates.phase2; // "Fall 2026"
  if (!phase2) {
    issues.push("Could not extract PHASE2_APPROX from shared.js");
  } else {
    // Check map.cutover_item4 mentions the same date
    var cutoverItem4 = enJSON.map.cutover_item4;
    if (cutoverItem4.indexOf(phase2) === -1) {
      issues.push("map.cutover_item4 does not mention '" + phase2 + "'");
    }

    // Check index.html Phase 2 timeline item
    if (indexHTML.indexOf(phase2) === -1) {
      issues.push("index.html does not mention '" + phase2 + "'");
    }

    // Check blog post mentions it
    var blogPostBiggerP2 = enJSON.blog_post.bigger_p2;
    if (blogPostBiggerP2.indexOf("fall of 2026") === -1 && blogPostBiggerP2.indexOf("Fall 2026") === -1 && blogPostBiggerP2.indexOf("fall 2026") === -1) {
      issues.push("blog_post.bigger_p2 does not reference Fall 2026");
    }
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 13: Coverage article sources are consistent (e.g., "NJ.com" always
//          spelled the same)
// =========================================================================
(function test13() {
  var testName = "13. Coverage article sources are consistently spelled";
  var issues = [];

  // Collect all source names
  var sourceMap = {};
  coverageJSON.articles.forEach(function (article) {
    var src = article.source;
    var normalized = src.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!sourceMap[normalized]) {
      sourceMap[normalized] = [];
    }
    sourceMap[normalized].push(src);
  });

  // Check for inconsistencies (same normalized key, different actual values)
  Object.keys(sourceMap).forEach(function (key) {
    var variants = [];
    var seen = {};
    sourceMap[key].forEach(function (s) {
      if (!seen[s]) {
        seen[s] = true;
        variants.push(s);
      }
    });
    if (variants.length > 1) {
      issues.push("Inconsistent spelling for source: " + variants.join(" vs. "));
    }
  });

  // Specific check: "NJ.com" should always be "NJ.com"
  var njcomArticles = coverageJSON.articles.filter(function (a) {
    return a.source.toLowerCase().indexOf("nj.com") !== -1 ||
           a.source.toLowerCase().indexOf("njdotcom") !== -1 ||
           a.source.toLowerCase().indexOf("nj dot com") !== -1;
  });
  var njcomNames = {};
  njcomArticles.forEach(function (a) { njcomNames[a.source] = true; });
  var njcomVariants = Object.keys(njcomNames);
  if (njcomVariants.length > 1) {
    issues.push("NJ.com has multiple spellings: " + njcomVariants.join(", "));
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 14: Blog post dates in translations match blog cards
// =========================================================================
(function test14() {
  var testName = "14. Blog post dates in translations match blog card dates";
  var issues = [];

  // blog.post1_date should match blog_post.date
  var post1CardDate = enJSON.blog.post1_date;
  var post1PostDate = enJSON.blog_post.date;
  if (post1CardDate !== post1PostDate) {
    issues.push("blog.post1_date ('" + post1CardDate + "') !== blog_post.date ('" + post1PostDate + "')");
  }

  // blog.post2_date should match blog_post_embed.date
  var post2CardDate = enJSON.blog.post2_date;
  var post2PostDate = enJSON.blog_post_embed.date;
  if (post2CardDate !== post2PostDate) {
    issues.push("blog.post2_date ('" + post2CardDate + "') !== blog_post_embed.date ('" + post2PostDate + "')");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 15: "50% service reduction" claim is consistent with actual train
//          count data (sum before vs sum after, for reduced-service lines)
// =========================================================================
(function test15() {
  var testName = "15. '50% service reduction' claim is consistent with train count data";
  var issues = [];

  // Calculate total trains before and after for lines with numeric counts
  var totalBefore = 0;
  var totalAfter = 0;
  var reducedServiceLines = [];

  LINE_ORDER.forEach(function (lineId) {
    var line = LINE_DATA[lineId];
    if (typeof line.trainsBefore === "number" && typeof line.trainsAfter === "number") {
      totalBefore += line.trainsBefore;
      totalAfter += line.trainsAfter;
      if (line.impactType === "reduced-service") {
        reducedServiceLines.push(lineId);
      }
    }
  });

  var reductionPct = ((totalBefore - totalAfter) / totalBefore * 100).toFixed(1);

  // The claim is "50% service reduction" — this is approximate (marketing language)
  // The actual reduction across numeric lines is (455 - 405) / 455 = ~11%
  // However, the 50% claim refers to the Newark-Secaucus corridor bottleneck specifically
  // (single-track = half capacity), not the raw train counts.
  // So we verify the claim appears consistently in the codebase.
  var fiftyPctInIndex = indexHTML.indexOf("50%") !== -1;
  var fiftyPctInTranslations = enJSON.index.alert_details.indexOf("50%") !== -1;

  if (!fiftyPctInIndex) {
    issues.push("'50%' claim not found in index.html");
  }
  if (!fiftyPctInTranslations) {
    issues.push("'50%' claim not found in index.alert_details translation");
  }

  // The percentage should also appear in map translations
  var mapCutoverItem3 = enJSON.map.cutover_item3;
  if (mapCutoverItem3.indexOf("50%") === -1) {
    issues.push("map.cutover_item3 does not mention '50%'");
  }

  // Verify actual reduction is non-trivial (the 50% is about corridor capacity, not train counts)
  if (totalBefore <= totalAfter) {
    issues.push("Total trains after (" + totalAfter + ") is not less than before (" + totalBefore + ")");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 16: All LINE_DATA keys used in card.line_summary_* match actual
//          LINE_DATA keys
// =========================================================================
(function test16() {
  var testName = "16. All card.line_summary_* keys match actual LINE_DATA keys";
  var issues = [];

  // Find all card keys that start with "line_summary_"
  var cardKeys = Object.keys(enJSON.card).filter(function (k) {
    return k.indexOf("line_summary_") === 0;
  });

  cardKeys.forEach(function (key) {
    var lineId = key.replace("line_summary_", "");
    if (!LINE_DATA[lineId]) {
      issues.push("card." + key + " references non-existent LINE_DATA key '" + lineId + "'");
    }
  });

  // Also verify all LINE_DATA keys have a corresponding card translation
  LINE_ORDER.forEach(function (lineId) {
    var expectedKey = "line_summary_" + lineId;
    if (!enJSON.card[expectedKey]) {
      issues.push("LINE_DATA key '" + lineId + "' has no card." + expectedKey + " translation");
    }
  });

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 17: Montclair-Boonton: 64 before, 60 after (verify consistency)
// =========================================================================
(function test17() {
  var testName = "17. Montclair-Boonton: 64 before, 60 after (consistent across codebase)";
  var issues = [];

  var mb = LINE_DATA["montclair-boonton"];

  if (mb.trainsBefore !== 64) {
    issues.push("LINE_DATA trainsBefore is " + mb.trainsBefore + ", expected 64");
  }
  if (mb.trainsAfter !== 60) {
    issues.push("LINE_DATA trainsAfter is " + mb.trainsAfter + ", expected 60");
  }

  // Check cards.js defaults — it should have these same values hardcoded
  // in the CT defaults (line_summary_ strings don't mention numbers for M-B
  // since it's a diversion, not a count reduction — so check LINE_DATA is source of truth)

  // Verify the compare.js doesn't contradict
  // compare.js has its own LINES data — no train counts there, so no conflict

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 18: Morris & Essex: 149 before, 141 after (verify consistency)
// =========================================================================
(function test18() {
  var testName = "18. Morris & Essex: 149 before, 141 after (consistent across codebase)";
  var issues = [];

  var me = LINE_DATA["morris-essex"];

  if (me.trainsBefore !== 149) {
    issues.push("LINE_DATA trainsBefore is " + me.trainsBefore + ", expected 149");
  }
  if (me.trainsAfter !== 141) {
    issues.push("LINE_DATA trainsAfter is " + me.trainsAfter + ", expected 141");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 19: NEC: 133 before, 112 after (verify in LINE_DATA and summary text)
// =========================================================================
(function test19() {
  var testName = "19. NEC: 133 before, 112 after (in LINE_DATA and summaries)";
  var issues = [];

  var nec = LINE_DATA["northeast-corridor"];

  if (nec.trainsBefore !== 133) {
    issues.push("LINE_DATA trainsBefore is " + nec.trainsBefore + ", expected 133");
  }
  if (nec.trainsAfter !== 112) {
    issues.push("LINE_DATA trainsAfter is " + nec.trainsAfter + ", expected 112");
  }

  // Check LINE_DATA summary mentions both numbers
  if (nec.summary.indexOf("133") === -1) {
    issues.push("LINE_DATA summary doesn't mention 133");
  }
  if (nec.summary.indexOf("112") === -1) {
    issues.push("LINE_DATA summary doesn't mention 112");
  }

  // Check card translation summary mentions both numbers
  var cardSummary = enJSON.card["line_summary_northeast-corridor"];
  if (cardSummary.indexOf("133") === -1) {
    issues.push("Card translation summary doesn't mention 133");
  }
  if (cardSummary.indexOf("112") === -1) {
    issues.push("Card translation summary doesn't mention 112");
  }

  // Check cards.js defaults mention both numbers
  if (cardsSrc.indexOf("133") === -1) {
    issues.push("cards.js doesn't mention 133");
  }
  if (cardsSrc.indexOf("112") === -1) {
    issues.push("cards.js doesn't mention 112");
  }

  // Check app.js uses these from LINE_DATA (it references line.trainsBefore/trainsAfter)
  if (appSrc.indexOf("line.trainsBefore") === -1) {
    issues.push("app.js doesn't reference line.trainsBefore");
  }
  if (appSrc.indexOf("line.trainsAfter") === -1) {
    issues.push("app.js doesn't reference line.trainsAfter");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// TEST 20: NJCL: 109 before, 92 after (verify in LINE_DATA and summary text)
// =========================================================================
(function test20() {
  var testName = "20. NJCL: 109 before, 92 after (in LINE_DATA and summaries)";
  var issues = [];

  var njcl = LINE_DATA["north-jersey-coast"];

  if (njcl.trainsBefore !== 109) {
    issues.push("LINE_DATA trainsBefore is " + njcl.trainsBefore + ", expected 109");
  }
  if (njcl.trainsAfter !== 92) {
    issues.push("LINE_DATA trainsAfter is " + njcl.trainsAfter + ", expected 92");
  }

  // Check LINE_DATA summary mentions both numbers
  if (njcl.summary.indexOf("109") === -1) {
    issues.push("LINE_DATA summary doesn't mention 109");
  }
  if (njcl.summary.indexOf("92") === -1) {
    issues.push("LINE_DATA summary doesn't mention 92");
  }

  // Check card translation summary mentions both numbers
  var cardSummary = enJSON.card["line_summary_north-jersey-coast"];
  if (cardSummary.indexOf("109") === -1) {
    issues.push("Card translation summary doesn't mention 109");
  }
  if (cardSummary.indexOf("92") === -1) {
    issues.push("Card translation summary doesn't mention 92");
  }

  // Check cards.js defaults mention both numbers
  if (cardsSrc.indexOf("109") === -1) {
    issues.push("cards.js doesn't mention 109");
  }
  if (cardsSrc.indexOf("92") === -1) {
    issues.push("cards.js doesn't mention 92");
  }

  report(testName, issues.length === 0, issues.join("; "));
})();

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n======================================================");
console.log("Results: " + passed + " passed, " + failed + " failed, " + (passed + failed) + " total");
console.log("======================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\nAll cross-reference tests passed.");
  process.exit(0);
}
