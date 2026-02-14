/**
 * Comprehensive validation tests for data/coverage.json
 *
 * Validates structure, data integrity, cross-references, and consistency
 * of the curated news coverage feed used by Reroute NJ.
 *
 * Usage: node tests/test-coverage-json.js
 */

var fs = require("fs");
var path = require("path");

// ── Helpers ──────────────────────────────────────────────────────────

var passed = 0;
var failed = 0;
var results = [];

function pass(name, detail) {
  passed++;
  var msg = "PASS: " + name;
  if (detail) msg += " — " + detail;
  results.push(msg);
  console.log("\x1b[32m" + msg + "\x1b[0m");
}

function fail(name, detail) {
  failed++;
  var msg = "FAIL: " + name;
  if (detail) msg += " — " + detail;
  results.push(msg);
  console.log("\x1b[31m" + msg + "\x1b[0m");
}

// ── Load coverage.json ───────────────────────────────────────────────

var COVERAGE_PATH = path.join(__dirname, "..", "data", "coverage.json");
var raw;
var data;

// Test 1: JSON is valid and parseable
try {
  raw = fs.readFileSync(COVERAGE_PATH, "utf8");
  data = JSON.parse(raw);
  pass("1. JSON is valid and parseable", "Parsed " + raw.length + " bytes");
} catch (e) {
  fail("1. JSON is valid and parseable", e.message);
  console.log("\nCannot continue without valid JSON. Aborting.");
  process.exit(1);
}

// ── Extract valid LINE_DATA keys from line-data.js ───────────────────

var LINE_DATA_PATH = path.join(__dirname, "..", "js", "line-data.js");
var VALID_LINE_KEYS = [];

try {
  var lineDataSrc = fs.readFileSync(LINE_DATA_PATH, "utf8");
  // Match top-level keys like "montclair-boonton": {
  var keyRegex = /^\s*"([a-z-]+)":\s*\{/gm;
  var match;
  while ((match = keyRegex.exec(lineDataSrc)) !== null) {
    // Only include keys that look like line identifiers (contain a hyphen or known names)
    if (lineDataSrc.indexOf('name:') > -1) {
      VALID_LINE_KEYS.push(match[1]);
    }
  }
  // Filter to only actual line keys (the top-level ones that have impactType)
  VALID_LINE_KEYS = VALID_LINE_KEYS.filter(function(key) {
    // Check that this key appears as a direct property of LINE_DATA
    // by verifying it appears before an impactType definition
    var keyPos = lineDataSrc.indexOf('"' + key + '":');
    var nextImpact = lineDataSrc.indexOf("impactType:", keyPos);
    var nextTopKey = lineDataSrc.indexOf('"\n', keyPos + key.length + 3);
    return nextImpact > keyPos && nextImpact < keyPos + 1000;
  });
} catch (e) {
  console.log("WARNING: Could not read line-data.js — line cross-reference tests will use fallback keys");
  VALID_LINE_KEYS = [
    "montclair-boonton",
    "morris-essex",
    "northeast-corridor",
    "north-jersey-coast",
    "raritan-valley"
  ];
}

console.log("\nValid LINE_DATA keys: " + VALID_LINE_KEYS.join(", ") + "\n");

// ── Validation constants ─────────────────────────────────────────────

var VALID_CATEGORIES = ["official", "news", "analysis", "opinion", "community"];
var VALID_DIRECTIONS = ["both", "nj-to-nyc", "nyc-to-nj"];
var ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
var MIN_DATE = new Date("2025-01-01");
var MAX_DATE = new Date("2026-12-31");

// ── Test 2: Has lastUpdated field with valid ISO 8601 date ───────────

if (data.lastUpdated) {
  var luDate = new Date(data.lastUpdated);
  if (isNaN(luDate.getTime())) {
    fail("2. lastUpdated is valid ISO 8601", "Value '" + data.lastUpdated + "' is not a valid date");
  } else {
    pass("2. lastUpdated is valid ISO 8601", data.lastUpdated);
  }
} else {
  fail("2. lastUpdated is valid ISO 8601", "Field is missing");
}

// ── Test 3: Has articles array with > 0 entries ──────────────────────

if (Array.isArray(data.articles) && data.articles.length > 0) {
  pass("3. articles array with > 0 entries", data.articles.length + " articles found");
} else {
  fail("3. articles array with > 0 entries", "Missing or empty");
  console.log("\nCannot continue without articles. Aborting.");
  process.exit(1);
}

var articles = data.articles;

// ── Test 4: Each article has ALL required fields ─────────────────────

var REQUIRED_FIELDS = ["id", "title", "url", "source", "date", "category", "excerpt", "lines", "direction"];
var missingFields = [];

articles.forEach(function(article, i) {
  REQUIRED_FIELDS.forEach(function(field) {
    if (!(field in article)) {
      missingFields.push("Article #" + (i + 1) + " ('" + (article.id || "unknown") + "') missing '" + field + "'");
    }
  });
});

if (missingFields.length === 0) {
  pass("4. All articles have required fields", "All " + articles.length + " articles have: " + REQUIRED_FIELDS.join(", "));
} else {
  fail("4. All articles have required fields", missingFields.length + " missing field(s):\n    " + missingFields.join("\n    "));
}

// ── Test 5: Article IDs are unique ───────────────────────────────────

var idSet = {};
var dupeIds = [];

articles.forEach(function(article) {
  if (idSet[article.id]) {
    dupeIds.push(article.id);
  }
  idSet[article.id] = true;
});

if (dupeIds.length === 0) {
  pass("5. Article IDs are unique", articles.length + " unique IDs");
} else {
  fail("5. Article IDs are unique", "Duplicate IDs: " + dupeIds.join(", "));
}

// ── Test 6: Article URLs are valid (start with https://) ─────────────

var badUrls = [];

articles.forEach(function(article) {
  if (typeof article.url !== "string" || !article.url.startsWith("https://")) {
    badUrls.push(article.id + " → " + article.url);
  }
});

if (badUrls.length === 0) {
  pass("6. All URLs start with https://", articles.length + " valid URLs");
} else {
  fail("6. All URLs start with https://", badUrls.length + " invalid URL(s):\n    " + badUrls.join("\n    "));
}

// ── Test 7: Article dates are valid ISO 8601 (YYYY-MM-DD) ───────────

var badDates = [];

articles.forEach(function(article) {
  if (typeof article.date !== "string" || !ISO_DATE_REGEX.test(article.date)) {
    badDates.push(article.id + " → " + article.date);
  } else {
    var d = new Date(article.date + "T00:00:00Z");
    if (isNaN(d.getTime())) {
      badDates.push(article.id + " → " + article.date + " (invalid date)");
    }
  }
});

if (badDates.length === 0) {
  pass("7. All dates are valid YYYY-MM-DD", articles.length + " valid dates");
} else {
  fail("7. All dates are valid YYYY-MM-DD", badDates.length + " invalid date(s):\n    " + badDates.join("\n    "));
}

// ── Test 8: Article dates are chronologically reasonable ─────────────

var outOfRange = [];

articles.forEach(function(article) {
  if (ISO_DATE_REGEX.test(article.date)) {
    var d = new Date(article.date + "T00:00:00Z");
    if (d < MIN_DATE || d > MAX_DATE) {
      outOfRange.push(article.id + " → " + article.date);
    }
  }
});

if (outOfRange.length === 0) {
  pass("8. All dates between 2025-01-01 and 2026-12-31", "All " + articles.length + " articles in range");
} else {
  fail("8. All dates between 2025-01-01 and 2026-12-31", outOfRange.length + " out of range:\n    " + outOfRange.join("\n    "));
}

// ── Test 9: Categories are valid ─────────────────────────────────────

var badCategories = [];

articles.forEach(function(article) {
  if (VALID_CATEGORIES.indexOf(article.category) === -1) {
    badCategories.push(article.id + " → '" + article.category + "'");
  }
});

if (badCategories.length === 0) {
  pass("9. All categories are valid", "Allowed: " + VALID_CATEGORIES.join(", "));
} else {
  fail("9. All categories are valid", badCategories.length + " invalid:\n    " + badCategories.join("\n    "));
}

// ── Test 10: Directions are valid ────────────────────────────────────

var badDirections = [];

articles.forEach(function(article) {
  if (VALID_DIRECTIONS.indexOf(article.direction) === -1) {
    badDirections.push(article.id + " → '" + article.direction + "'");
  }
});

if (badDirections.length === 0) {
  pass("10. All directions are valid", "Allowed: " + VALID_DIRECTIONS.join(", "));
} else {
  fail("10. All directions are valid", badDirections.length + " invalid:\n    " + badDirections.join("\n    "));
}

// ── Test 11: Lines arrays contain valid values ───────────────────────

var badLines = [];

articles.forEach(function(article) {
  if (!Array.isArray(article.lines)) {
    badLines.push(article.id + " → lines is not an array");
    return;
  }
  article.lines.forEach(function(line) {
    if (line !== "all" && VALID_LINE_KEYS.indexOf(line) === -1) {
      badLines.push(article.id + " → invalid line '" + line + "'");
    }
  });
});

if (badLines.length === 0) {
  pass("11. All lines values are valid", "Valid keys: 'all', " + VALID_LINE_KEYS.join(", "));
} else {
  fail("11. All lines values are valid", badLines.length + " invalid:\n    " + badLines.join("\n    "));
}

// ── Test 12: If lines contains "all", it is the only entry ───────────

var allPlusOther = [];

articles.forEach(function(article) {
  if (Array.isArray(article.lines) && article.lines.indexOf("all") !== -1 && article.lines.length > 1) {
    allPlusOther.push(article.id + " → lines has 'all' plus " + (article.lines.length - 1) + " other value(s): [" + article.lines.join(", ") + "]");
  }
});

if (allPlusOther.length === 0) {
  pass("12. 'all' in lines is sole entry when present", "No mixed 'all' + specific lines");
} else {
  fail("12. 'all' in lines is sole entry when present", allPlusOther.length + " violation(s):\n    " + allPlusOther.join("\n    "));
}

// ── Test 13: Excerpts are non-empty, reasonable length ───────────────

var badExcerpts = [];

articles.forEach(function(article) {
  if (typeof article.excerpt !== "string") {
    badExcerpts.push(article.id + " → excerpt is not a string");
  } else if (article.excerpt.length < 50) {
    badExcerpts.push(article.id + " → excerpt too short (" + article.excerpt.length + " chars, min 50)");
  } else if (article.excerpt.length > 1000) {
    badExcerpts.push(article.id + " → excerpt too long (" + article.excerpt.length + " chars, max 1000)");
  }
});

if (badExcerpts.length === 0) {
  pass("13. All excerpts are 50-1000 chars", "Lengths range from " +
    Math.min.apply(null, articles.map(function(a) { return a.excerpt.length; })) + " to " +
    Math.max.apply(null, articles.map(function(a) { return a.excerpt.length; })) + " chars");
} else {
  fail("13. All excerpts are 50-1000 chars", badExcerpts.length + " issue(s):\n    " + badExcerpts.join("\n    "));
}

// ── Test 14: Titles are non-empty strings ────────────────────────────

var badTitles = [];

articles.forEach(function(article) {
  if (typeof article.title !== "string" || article.title.trim().length === 0) {
    badTitles.push(article.id + " → empty or non-string title");
  }
});

if (badTitles.length === 0) {
  pass("14. All titles are non-empty strings", articles.length + " titles validated");
} else {
  fail("14. All titles are non-empty strings", badTitles.length + " issue(s):\n    " + badTitles.join("\n    "));
}

// ── Test 15: No duplicate URLs ───────────────────────────────────────

var urlSet = {};
var dupeUrls = [];

articles.forEach(function(article) {
  if (urlSet[article.url]) {
    dupeUrls.push(article.url + " (in '" + urlSet[article.url] + "' and '" + article.id + "')");
  }
  urlSet[article.url] = article.id;
});

if (dupeUrls.length === 0) {
  pass("15. No duplicate URLs", articles.length + " unique URLs");
} else {
  fail("15. No duplicate URLs", dupeUrls.length + " duplicate(s):\n    " + dupeUrls.join("\n    "));
}

// ── Test 16: Articles are sorted by date ─────────────────────────────

var sortedNewest = true;
var sortedOldest = true;

for (var i = 1; i < articles.length; i++) {
  var prev = articles[i - 1].date;
  var curr = articles[i].date;
  if (prev < curr) sortedNewest = false;
  if (prev > curr) sortedOldest = false;
}

if (sortedNewest) {
  pass("16. Articles sorted by date", "Sorted newest-first (descending)");
} else if (sortedOldest) {
  pass("16. Articles sorted by date", "Sorted oldest-first (ascending)");
} else {
  // Determine the detected order and show where it breaks
  var breaks = [];
  for (var j = 1; j < articles.length; j++) {
    var p = articles[j - 1].date;
    var c = articles[j].date;
    if (p < c) {
      breaks.push("  #" + j + " " + articles[j - 1].id + " (" + p + ") < #" + (j + 1) + " " + articles[j].id + " (" + c + ")");
    }
  }
  fail("16. Articles sorted by date", "Not consistently sorted. Breaks from newest-first:\n" + breaks.join("\n"));
}

// ── Test 17: lastUpdated not in the future relative to latest article ─

var latestArticleDate = articles.reduce(function(latest, article) {
  return article.date > latest ? article.date : latest;
}, "0000-00-00");

var lastUpdatedDateStr = data.lastUpdated.substring(0, 10);

if (lastUpdatedDateStr < latestArticleDate) {
  fail("17. lastUpdated >= latest article date",
    "lastUpdated (" + lastUpdatedDateStr + ") is before latest article (" + latestArticleDate + ")");
} else {
  pass("17. lastUpdated >= latest article date",
    "lastUpdated=" + lastUpdatedDateStr + ", latest article=" + latestArticleDate);
}

// ── Test 18: Source names are consistent ─────────────────────────────

var sourceMap = {};
var sourceIssues = [];

articles.forEach(function(article) {
  var normalized = article.source.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!sourceMap[normalized]) {
    sourceMap[normalized] = { name: article.source, ids: [] };
  } else if (sourceMap[normalized].name !== article.source) {
    sourceIssues.push(
      "Inconsistent: '" + sourceMap[normalized].name + "' vs '" + article.source +
      "' (in " + article.id + ")"
    );
  }
  sourceMap[normalized].ids.push(article.id);
});

if (sourceIssues.length === 0) {
  var uniqueSources = Object.keys(sourceMap).length;
  pass("18. Source names are consistent", uniqueSources + " unique sources, no case/punctuation variations");
} else {
  fail("18. Source names are consistent", sourceIssues.length + " inconsistency(ies):\n    " + sourceIssues.join("\n    "));
}

// ── Test 19: Author field exists (can be null) ───────────────────────

var missingAuthor = [];

articles.forEach(function(article) {
  if (!("author" in article)) {
    missingAuthor.push(article.id);
  }
});

if (missingAuthor.length === 0) {
  var withAuthor = articles.filter(function(a) { return a.author !== null; }).length;
  var withNull = articles.filter(function(a) { return a.author === null; }).length;
  pass("19. Author field exists on all articles", withAuthor + " with author, " + withNull + " with null");
} else {
  fail("19. Author field exists on all articles", missingAuthor.length + " missing:\n    " + missingAuthor.join("\n    "));
}

// ── Test 20: No articles reference nonexistent lines ─────────────────

var phantomLines = [];

articles.forEach(function(article) {
  if (!Array.isArray(article.lines)) return;
  article.lines.forEach(function(line) {
    if (line !== "all" && VALID_LINE_KEYS.indexOf(line) === -1) {
      phantomLines.push(article.id + " → '" + line + "'");
    }
  });
});

if (phantomLines.length === 0) {
  pass("20. No references to nonexistent LINE_DATA keys", "All line references valid against line-data.js");
} else {
  fail("20. No references to nonexistent LINE_DATA keys", phantomLines.length + " phantom line(s):\n    " + phantomLines.join("\n    "));
}

// ── Summary ──────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log("SUMMARY: " + passed + " passed, " + failed + " failed out of " + (passed + failed) + " tests");
console.log("=".repeat(60));

if (failed > 0) {
  console.log("\nFailed tests:");
  results.forEach(function(r) {
    if (r.startsWith("FAIL")) {
      console.log("  " + r);
    }
  });
  process.exit(1);
} else {
  console.log("\nAll tests passed!");
  process.exit(0);
}
