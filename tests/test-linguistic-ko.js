/**
 * Korean Linguistic Validation Test Suite for Reroute NJ
 *
 * Validates Korean translations (ko.json) for:
 *   1. Appropriate formality level (해요체 polite form)
 *   2. Correct transit terminology
 *   3. Proper Korean grammar (particles, SOV order)
 *   4. Station/line names remain in English
 *   5. No Japanese text mixed in
 *   6. HTML entities preserved
 *   7. Natural Korean phrasing
 *
 * Context: Korean-speaking NJ Transit riders in Bergen County (Fort Lee,
 * Palisades Park, Leonia, Englewood Cliffs) and Edison/Middlesex areas.
 *
 * Run: node tests/test-linguistic-ko.js
 */

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Load translation files
// ---------------------------------------------------------------------------

var TRANSLATIONS_DIR = path.join(__dirname, "..", "translations");
var ko = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, "ko.json"), "utf8"));
var en = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, "en.json"), "utf8"));

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

var totalTests = 0;
var passedTests = 0;
var failedTests = 0;
var warnings = 0;
var results = [];

function pass(testName, detail) {
  totalTests++;
  passedTests++;
  results.push({ status: "PASS", test: testName, detail: detail || "" });
}

function fail(testName, detail) {
  totalTests++;
  failedTests++;
  results.push({ status: "FAIL", test: testName, detail: detail || "" });
}

function warn(testName, detail) {
  warnings++;
  results.push({ status: "WARN", test: testName, detail: detail || "" });
}

// Flatten nested JSON keys into dot-notation for iteration
function flattenKeys(obj, prefix) {
  var out = {};
  prefix = prefix || "";
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var fullKey = prefix ? prefix + "." + key : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      var nested = flattenKeys(obj[key], fullKey);
      for (var nk in nested) {
        if (nested.hasOwnProperty(nk)) out[nk] = nested[nk];
      }
    } else {
      out[fullKey] = obj[key];
    }
  }
  return out;
}

var koFlat = flattenKeys(ko);
var enFlat = flattenKeys(en);

// Strip HTML tags for linguistic analysis
function stripHTML(str) {
  return str.replace(/<[^>]+>/g, "");
}

// Strip HTML entities for linguistic analysis
function stripEntities(str) {
  return str.replace(/&[a-zA-Z]+;/g, "").replace(/&#[0-9]+;/g, "");
}

// Check if a string contains Korean characters (Hangul)
function containsKorean(str) {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/.test(str);
}

// Check if a string contains Japanese-specific characters (Hiragana, Katakana, or CJK in Kanji context)
function containsJapanese(str) {
  // Hiragana: U+3040-U+309F, Katakana: U+30A0-U+30FF
  return /[\u3040-\u309F\u30A0-\u30FF]/.test(str);
}

// Check if a string contains Chinese-only characters (no Korean/Japanese context indicators)
function containsChinese(str) {
  return /[\u4E00-\u9FFF]/.test(str);
}

// ---------------------------------------------------------------------------
// Keys that are metadata, English-only identifiers, or structural
// ---------------------------------------------------------------------------

var SKIP_KEYS = [
  "meta.lang", "meta.dir", "meta.label", "meta.nativeName",
  "card.powered_by"
];

// Keys that are expected to be very short / single words where analysis is limited
var SHORT_KEYS = [
  "common.days", "common.day", "common.menu",
  "compare.fastest", "compare.copied",
  "coverage.cat_news", "coverage.cat_opinion", "coverage.cat_analysis",
  "coverage.cat_official", "coverage.cat_community",
  "card.before", "card.during", "card.zone", "card.suspended",
  "js.zone", "js.no_change", "js.transfer", "js.arrive",
  "embed.cfg_copied", "map.filter_all"
];

// NJ Transit line names that MUST stay in English
var ENGLISH_LINE_NAMES = [
  "Montclair-Boonton",
  "Morris & Essex",
  "Northeast Corridor",
  "North Jersey Coast",
  "Raritan Valley",
  "Gladstone",
  "Morristown",
  "Atlantic City",
  "Midtown Direct"
];

// Station / place names that MUST stay in English
var ENGLISH_PLACE_NAMES = [
  "Newark Penn",
  "Secaucus Junction",
  "Secaucus",
  "Hoboken",
  "Penn Station",
  "Port Authority",
  "Manhattan",
  "Hackensack River",
  "Hudson",
  "PATH",
  "NY Waterway",
  "Kearny",
  "Portal Bridge",
  "Portal North Bridge",
  "NJ Transit",
  "Amtrak",
  "PSNY",
  "WTC",
  "Perth Amboy",
  "Woodbridge",
  "Lincoln Tunnel",
  "Gateway Program",
  "Northeast Corridor"
];

// ---------------------------------------------------------------------------
// TEST 1: Formality Level (해요체 polite form)
// ---------------------------------------------------------------------------

console.log("\n=== TEST 1: Formality Level (해요체 / 합쇼체 polite form) ===\n");

// Casual/반말 verb endings to flag — these should NOT appear
// Common 반말 endings: ~해, ~야, ~지, ~어/아 (without 요)
// We look at the END of sentences (before period or end of string)
var casualEndings = [
  // 반말 imperative: ~해, ~해라
  /[가-힣]해(?:\s*[.!]?\s*$)/,
  /[가-힣]해라(?:\s*[.!]?\s*$)/,
  // 반말 declarative: plain ~다 form at end (but not inside compound words)
  // Note: ~합니다 and ~입니다 are 합쇼체 formal polite, which is fine
];

// Polite endings to look for (해요체 or 합쇼체)
var politeEndingPatterns = [
  /요[.!?]?\s*$/,       // 해요체 ending: ~요
  /니다[.!?]?\s*$/,     // 합쇼체 ending: ~합니다, ~입니다, ~됩니다
  /시오[.!?]?\s*$/,     // Formal imperative: ~하십시오
  /세요[.!?]?\s*$/,     // Polite imperative: ~하세요, ~보세요
  /십시오[.!?]?\s*$/,   // Very formal imperative
  /드립니다[.!?]?\s*$/, // Humble-polite: ~드립니다
];

// Keys with user-facing sentences that should end politely
var sentenceKeys = [];
for (var key in koFlat) {
  if (!koFlat.hasOwnProperty(key)) continue;
  if (SKIP_KEYS.indexOf(key) !== -1) continue;
  if (SHORT_KEYS.indexOf(key) !== -1) continue;
  var val = koFlat[key];
  if (typeof val !== "string") continue;
  var stripped = stripHTML(stripEntities(val)).trim();
  // Only check strings that contain Korean and are sentence-length
  if (containsKorean(stripped) && stripped.length > 15) {
    sentenceKeys.push(key);
  }
}

var formalityIssues = [];
var formalityChecked = 0;

sentenceKeys.forEach(function (key) {
  var val = koFlat[key];
  var stripped = stripHTML(stripEntities(val)).trim();

  // Check for clear 반말 (casual) sentence endings
  // ~해 alone at end, ~야 at end (but not within words), ~지 at end
  // We specifically check if a sentence ends with casual conjugation
  if (/[^하]해\s*[.!?]?\s*$/.test(stripped) && !/하세요/.test(stripped) && !/해요/.test(stripped)) {
    formalityIssues.push({
      key: key,
      value: stripped.slice(-30),
      issue: "Possible casual 반말 ending: ~해"
    });
  }
  formalityChecked++;
});

if (formalityIssues.length === 0) {
  pass(
    "Formality: No casual 반말 endings detected",
    "Checked " + formalityChecked + " sentence-length Korean strings"
  );
} else {
  formalityIssues.forEach(function (issue) {
    fail("Formality: " + issue.key, issue.issue + " — \"..." + issue.value + "\"");
  });
}

// Positive check: verify polite endings are present in key user-facing sentences
var politeSentences = [
  "index.select_line_station",
  "index.cutover_summary_desc",
  "compare.hero_desc",
  "map.hero_desc",
  "embed.hero_desc",
  "index.hoboken_terminal_desc",
  "coverage.hero_desc",
  "meta.index_description",
  "meta.compare_description"
];

var politeCount = 0;
politeSentences.forEach(function (key) {
  var val = koFlat[key];
  if (!val) return;
  var stripped = stripHTML(stripEntities(val)).trim();
  var isPolite = politeEndingPatterns.some(function (pat) {
    return pat.test(stripped);
  });
  if (isPolite) {
    politeCount++;
  } else {
    // Check if it ends with a noun phrase (acceptable for titles/taglines)
    // or is otherwise not a full sentence requiring polite ending
    warn(
      "Formality check: " + key,
      "Does not end with standard polite form. Ending: \"..." + stripped.slice(-20) + "\""
    );
  }
});

if (politeCount >= Math.floor(politeSentences.length * 0.7)) {
  pass(
    "Formality: Majority of key sentences use polite endings",
    politeCount + "/" + politeSentences.length + " key sentences end with polite forms (요/니다/세요)"
  );
} else {
  fail(
    "Formality: Too few polite endings",
    "Only " + politeCount + "/" + politeSentences.length + " key sentences end with polite forms"
  );
}

// ---------------------------------------------------------------------------
// TEST 2: Key transit terms translated correctly
// ---------------------------------------------------------------------------

console.log("\n=== TEST 2: Transit Terminology ===\n");

// Expected Korean transit terms and the English originals
var transitTerms = {
  "train": { korean: ["열차", "기차"], context: "General train reference" },
  "station": { korean: ["역"], context: "Transit station" },
  "commute": { korean: ["통근"], context: "Daily commute" },
  "schedule": { korean: ["시간표", "운행표"], context: "Train schedule/timetable" },
  "transfer": { korean: ["환승"], context: "Transit transfer" },
  "delay": { korean: ["지연"], context: "Train delay" },
  "route": { korean: ["경로", "노선"], context: "Transit route" },
  "line": { korean: ["노선"], context: "Transit line" },
  "ticket": { korean: ["승차권"], context: "Transit ticket/fare" },
  "pass": { korean: ["정기권"], context: "Monthly pass" },
  "ferry": { korean: ["페리"], context: "Ferry service" },
  "bus": { korean: ["버스"], context: "Bus service" },
  "platform": { korean: ["플랫폼"], context: "Train platform" },
  "service reduction": { korean: ["운행 감소"], context: "Reduced service" },
  "single-track": { korean: ["단선"], context: "Single-track operation" }
};

// Keys where specific English terms appear and Korean equivalents should be used
var termMappingChecks = [
  {
    english_term: "train",
    expected_korean: ["열차", "기차"],
    sample_keys: [
      "index.path_step5",
      "index.ferry_step1",
      "card.trains_before",
      "card.trains_during"
    ]
  },
  {
    english_term: "station",
    expected_korean: ["역"],
    sample_keys: [
      "index.your_station",
      "index.choose_station",
      "embed.cfg_station_label"
    ]
  },
  {
    english_term: "commute",
    expected_korean: ["통근"],
    sample_keys: [
      "compare.title",
      "compare.tagline",
      "index.morning_commute",
      "index.evening_commute"
    ]
  },
  {
    english_term: "schedule",
    expected_korean: ["시간표", "운행표"],
    sample_keys: [
      "index.res_schedules_title",
      "js.schedule_changes"
    ]
  },
  {
    english_term: "transfer",
    expected_korean: ["환승"],
    sample_keys: [
      "map.filter_transfer_hubs",
      "map.legend_transfer_hub",
      "js.transfer"
    ]
  }
];

termMappingChecks.forEach(function (check) {
  var allCorrect = true;
  var details = [];

  check.sample_keys.forEach(function (key) {
    var koVal = koFlat[key];
    if (!koVal) {
      details.push(key + " — KEY MISSING");
      allCorrect = false;
      return;
    }
    var found = check.expected_korean.some(function (term) {
      return koVal.indexOf(term) !== -1;
    });
    if (found) {
      details.push(key + " — OK (contains " + check.expected_korean.filter(function (t) { return koVal.indexOf(t) !== -1; }).join("/") + ")");
    } else {
      details.push(key + " — expected one of [" + check.expected_korean.join(", ") + "] but got: \"" + koVal + "\"");
      allCorrect = false;
    }
  });

  if (allCorrect) {
    pass(
      "Transit term '" + check.english_term + "' correctly translated",
      details.join("; ")
    );
  } else {
    fail(
      "Transit term '" + check.english_term + "' translation issue",
      details.join("; ")
    );
  }
});

// Comprehensive check: scan ALL Korean values for correct use of transit terms
var termFrequency = {};
for (var term in transitTerms) {
  if (!transitTerms.hasOwnProperty(term)) continue;
  termFrequency[term] = 0;
  transitTerms[term].korean.forEach(function (koreanTerm) {
    for (var key in koFlat) {
      if (typeof koFlat[key] === "string" && koFlat[key].indexOf(koreanTerm) !== -1) {
        termFrequency[term]++;
      }
    }
  });
}

var missingTerms = [];
for (var term in termFrequency) {
  if (termFrequency[term] === 0) {
    missingTerms.push(term + " (" + transitTerms[term].korean.join("/") + ")");
  }
}

if (missingTerms.length === 0) {
  pass(
    "All expected transit terms appear in Korean translations",
    Object.keys(termFrequency).map(function (t) { return t + ":" + termFrequency[t]; }).join(", ")
  );
} else {
  fail(
    "Some transit terms never appear in Korean translations",
    "Missing: " + missingTerms.join(", ")
  );
}

// ---------------------------------------------------------------------------
// TEST 3: Korean grammar checks (particles, SOV patterns)
// ---------------------------------------------------------------------------

console.log("\n=== TEST 3: Korean Grammar ===\n");

// Check for common Korean particles — a well-translated Korean text will use them
var particles = [
  { particle: "을", name: "object marker (을, after consonant)" },
  { particle: "를", name: "object marker (를, after vowel)" },
  { particle: "은", name: "topic marker (은, after consonant)" },
  { particle: "는", name: "topic marker (는, after vowel)" },
  { particle: "이", name: "subject marker (이, after consonant)" },
  { particle: "가", name: "subject marker (가, after vowel)" },
  { particle: "에서", name: "location marker (에서, from/at)" },
  { particle: "에", name: "direction/time marker (에)" },
  { particle: "으로", name: "direction marker (으로, by means of)" },
  { particle: "로", name: "direction marker (로, by means of)" },
  { particle: "와", name: "conjunction (와, with/and after vowel)" },
  { particle: "과", name: "conjunction (과, with/and after consonant)" }
];

// Collect all Korean text for particle analysis
var allKoreanText = "";
for (var key in koFlat) {
  if (typeof koFlat[key] === "string" && containsKorean(koFlat[key])) {
    allKoreanText += " " + stripHTML(koFlat[key]);
  }
}

var particlesFound = [];
var particlesMissing = [];

particles.forEach(function (p) {
  if (allKoreanText.indexOf(p.particle) !== -1) {
    particlesFound.push(p.particle + " (" + p.name + ")");
  } else {
    particlesMissing.push(p.particle + " (" + p.name + ")");
  }
});

if (particlesFound.length >= 8) {
  pass(
    "Korean particles: Good variety of particles found",
    particlesFound.length + "/12 particles detected: " + particlesFound.slice(0, 6).join(", ") + "..."
  );
} else {
  fail(
    "Korean particles: Insufficient particle variety",
    "Only " + particlesFound.length + "/12 found. Missing: " + particlesMissing.join(", ")
  );
}

// Check for topic/subject marking consistency
// In Korean, subject/topic markers should appear regularly
var topicSubjectCount = 0;
var topicSubjectPattern = /[가-힣][은는이가]/g;
var matches = allKoreanText.match(topicSubjectPattern);
topicSubjectCount = matches ? matches.length : 0;

if (topicSubjectCount >= 20) {
  pass(
    "Korean grammar: Adequate topic/subject marking",
    topicSubjectCount + " instances of topic/subject markers found"
  );
} else {
  fail(
    "Korean grammar: Low topic/subject marker frequency",
    "Only " + topicSubjectCount + " instances found (expected 20+)"
  );
}

// Check for proper verb endings (Korean verbs end sentences — SOV order)
// Korean sentences should end with verbs/adjectives, not nouns (mostly)
var koreanSentences = allKoreanText.split(/[.!?]\s+/).filter(function (s) {
  return containsKorean(s) && s.trim().length > 10;
});

var verbEndingCount = 0;
var nounEndingCount = 0;
// Common Korean sentence-final verb/adjective patterns
var verbEndingPattern = /(?:다|요|세요|니다|시오|습니다|됩니다)\s*$/;

koreanSentences.forEach(function (sentence) {
  var trimmed = sentence.trim();
  if (verbEndingPattern.test(trimmed)) {
    verbEndingCount++;
  } else {
    nounEndingCount++;
  }
});

var verbEndingRatio = koreanSentences.length > 0
  ? (verbEndingCount / koreanSentences.length * 100).toFixed(1)
  : 0;

if (parseFloat(verbEndingRatio) >= 40) {
  pass(
    "Korean SOV order: Good verb-final sentence structure",
    verbEndingCount + "/" + koreanSentences.length + " sentences (" + verbEndingRatio + "%) end with verb/adjective forms"
  );
} else {
  warn(
    "Korean SOV order: Low verb-final ratio",
    verbEndingCount + "/" + koreanSentences.length + " sentences (" + verbEndingRatio + "%) end with verb forms. Some may be noun phrases or titles."
  );
}

// ---------------------------------------------------------------------------
// TEST 4: Station names and line names stay in English
// ---------------------------------------------------------------------------

console.log("\n=== TEST 4: English Proper Nouns Preserved ===\n");

// Check that English line names are preserved verbatim in Korean translations
// that reference them
var lineNameIssues = [];

ENGLISH_LINE_NAMES.forEach(function (lineName) {
  // Find English keys that contain this line name
  for (var key in enFlat) {
    if (typeof enFlat[key] !== "string") continue;
    if (enFlat[key].indexOf(lineName) === -1) continue;
    // Check corresponding Korean key
    var koVal = koFlat[key];
    if (!koVal) continue;
    if (koVal.indexOf(lineName) === -1) {
      // Check if the line name was translated to Korean (which it shouldn't be)
      lineNameIssues.push({
        key: key,
        lineName: lineName,
        koValue: koVal.substring(0, 80)
      });
    }
  }
});

if (lineNameIssues.length === 0) {
  pass(
    "Line names preserved in English",
    "All NJ Transit line names remain in English across translations"
  );
} else {
  lineNameIssues.forEach(function (issue) {
    fail(
      "Line name '" + issue.lineName + "' may be missing in " + issue.key,
      "Korean value: \"" + issue.koValue + "...\""
    );
  });
}

// Check that key place names are preserved
var placeNameChecks = [
  { name: "Hoboken", keys: ["index.hoboken_terminal_title", "card.impact_hoboken_diversion", "index.path_step5"] },
  { name: "PATH", keys: ["index.path_title", "index.terminal_path_entrance", "card.alt_hoboken_1"] },
  { name: "Newark", keys: ["card.impact_newark_termination", "card.alt_newark_1"] },
  { name: "Secaucus", keys: ["index.secaucus_title"] },
  { name: "Port Authority", keys: ["index.bus_title", "card.alt_hoboken_3"] },
  { name: "NJ Transit", keys: ["common.footer_disclaimer"] },
  { name: "Portal Bridge", keys: ["map.hero_title", "map.about_title"] }
];

var placeNameIssues = [];
placeNameChecks.forEach(function (check) {
  check.keys.forEach(function (key) {
    var koVal = koFlat[key];
    if (!koVal) return;
    if (koVal.indexOf(check.name) === -1) {
      placeNameIssues.push(check.name + " missing in " + key + " — got: \"" + koVal.substring(0, 60) + "\"");
    }
  });
});

if (placeNameIssues.length === 0) {
  pass(
    "Place names preserved in English",
    "Key place names (Hoboken, PATH, Newark, Secaucus, etc.) remain in English"
  );
} else {
  placeNameIssues.forEach(function (issue) {
    fail("Place name issue", issue);
  });
}

// Check that Korean translations did NOT translate station/line names into Korean
// Look for common Korean words that might replace English proper nouns
var koreanizedNames = [
  { korean: "호보큰", english: "Hoboken", desc: "Hoboken transliterated to Korean" },
  { korean: "뉴어크", english: "Newark", desc: "Newark transliterated to Korean" },
  { korean: "시코커스", english: "Secaucus", desc: "Secaucus transliterated to Korean" },
  { korean: "맨해튼", english: "Manhattan", desc: "Manhattan transliterated to Korean — should use English" },
  { korean: "뉴욕", english: "New York", desc: "New York transliterated (acceptable in context but check)" }
];

var transliterationIssues = [];
koreanizedNames.forEach(function (check) {
  for (var key in koFlat) {
    if (typeof koFlat[key] === "string" && koFlat[key].indexOf(check.korean) !== -1) {
      transliterationIssues.push({
        key: key,
        korean: check.korean,
        english: check.english,
        desc: check.desc
      });
    }
  }
});

if (transliterationIssues.length === 0) {
  pass(
    "No Korean transliterations of English place names",
    "Station and place names use original English, not Korean transliterations"
  );
} else {
  transliterationIssues.forEach(function (issue) {
    warn(
      "Transliteration found: " + issue.korean + " (" + issue.english + ") in " + issue.key,
      issue.desc
    );
  });
}

// ---------------------------------------------------------------------------
// TEST 5: No Japanese text mixed in
// ---------------------------------------------------------------------------

console.log("\n=== TEST 5: No Japanese Text Mixed In ===\n");

var japaneseIssues = [];

for (var key in koFlat) {
  if (typeof koFlat[key] !== "string") continue;
  if (containsJapanese(koFlat[key])) {
    japaneseIssues.push({
      key: key,
      value: koFlat[key].substring(0, 80),
      chars: koFlat[key].match(/[\u3040-\u309F\u30A0-\u30FF]+/g)
    });
  }
}

if (japaneseIssues.length === 0) {
  pass(
    "No Japanese characters (Hiragana/Katakana) found in Korean translations",
    "Checked all " + Object.keys(koFlat).length + " keys"
  );
} else {
  japaneseIssues.forEach(function (issue) {
    fail(
      "Japanese text found in " + issue.key,
      "Characters: " + (issue.chars ? issue.chars.join(", ") : "unknown") + " — Value: \"" + issue.value + "\""
    );
  });
}

// Also check for Chinese characters that might be Japanese Kanji used incorrectly
// In Korean, some Hanja (Chinese characters) are acceptable but rare in modern text
var hanjaCount = 0;
for (var key in koFlat) {
  if (typeof koFlat[key] === "string" && containsChinese(koFlat[key])) {
    hanjaCount++;
    // Only warn, not fail — some Hanja use is acceptable in formal Korean
    warn(
      "Hanja/Chinese characters in " + key,
      "Modern Korean rarely uses Hanja. Value: \"" + koFlat[key].substring(0, 60) + "\""
    );
  }
}

if (hanjaCount === 0) {
  pass(
    "No Hanja/Chinese characters in Korean translations",
    "Modern Korean (Hangul only) used consistently"
  );
}

// ---------------------------------------------------------------------------
// TEST 6: HTML entities preserved
// ---------------------------------------------------------------------------

console.log("\n=== TEST 6: HTML Entities Preserved ===\n");

// Check that HTML entities in English source are preserved in Korean
var entityPattern = /&[a-zA-Z]+;|&#[0-9]+;/g;
var entityIssues = [];
var entityChecked = 0;

for (var key in enFlat) {
  if (typeof enFlat[key] !== "string") continue;
  var enEntities = enFlat[key].match(entityPattern);
  if (!enEntities || enEntities.length === 0) continue;

  var koVal = koFlat[key];
  if (!koVal) continue;
  entityChecked++;

  var koEntities = koVal.match(entityPattern) || [];

  enEntities.forEach(function (entity) {
    // &copy; is special — in the Korean file the same or equivalent should appear
    if (koEntities.indexOf(entity) === -1) {
      // Check if it was converted to the actual character (e.g., &mdash; → —)
      // This is acceptable in some cases
      var entityChar = {
        "&mdash;": "\u2014",
        "&ndash;": "\u2013",
        "&hellip;": "\u2026",
        "&rarr;": "\u2192",
        "&larr;": "\u2190",
        "&copy;": "\u00A9",
        "&amp;": "&"
      };
      var actualChar = entityChar[entity];
      if (actualChar && koVal.indexOf(actualChar) !== -1) {
        // Entity was replaced with its character equivalent — warning only
        // (generator uses str.replace so entities should match exactly)
      } else {
        entityIssues.push({
          key: key,
          entity: entity,
          enValue: enFlat[key].substring(0, 60),
          koValue: koVal.substring(0, 60)
        });
      }
    }
  });
}

if (entityIssues.length === 0) {
  pass(
    "HTML entities preserved in Korean translations",
    "Checked " + entityChecked + " keys with HTML entities"
  );
} else {
  entityIssues.forEach(function (issue) {
    fail(
      "HTML entity " + issue.entity + " missing in " + issue.key,
      "EN: \"" + issue.enValue + "...\" | KO: \"" + issue.koValue + "...\""
    );
  });
}

// Check that HTML tags are preserved
var tagPattern = /<(strong|a|code|em|br)\b[^>]*>/g;
var tagIssues = [];
var tagChecked = 0;

for (var key in enFlat) {
  if (typeof enFlat[key] !== "string") continue;
  var enTags = enFlat[key].match(tagPattern);
  if (!enTags || enTags.length === 0) continue;

  var koVal = koFlat[key];
  if (!koVal) continue;
  tagChecked++;

  var koTags = koVal.match(tagPattern) || [];

  // Check that the same types of tags exist (not necessarily identical attributes)
  var enTagTypes = enTags.map(function (t) { return t.match(/<([a-z]+)/)[1]; }).sort();
  var koTagTypes = koTags.map(function (t) { return t.match(/<([a-z]+)/)[1]; }).sort();

  if (enTagTypes.join(",") !== koTagTypes.join(",")) {
    tagIssues.push({
      key: key,
      enTags: enTagTypes.join(", "),
      koTags: koTagTypes.join(", ")
    });
  }
}

if (tagIssues.length === 0) {
  pass(
    "HTML tags preserved in Korean translations",
    "Checked " + tagChecked + " keys with HTML tags — tag types match"
  );
} else {
  var tagIssueCount = tagIssues.length;
  if (tagIssueCount <= 3) {
    tagIssues.forEach(function (issue) {
      warn(
        "HTML tag mismatch in " + issue.key,
        "EN tags: [" + issue.enTags + "] vs KO tags: [" + issue.koTags + "]"
      );
    });
  } else {
    fail(
      "HTML tags not consistently preserved",
      tagIssueCount + " keys have mismatched HTML tag types"
    );
  }
}

// ---------------------------------------------------------------------------
// TEST 7: Natural Korean phrasing (not word-for-word translation)
// ---------------------------------------------------------------------------

console.log("\n=== TEST 7: Natural Korean Phrasing ===\n");

// Check 1: Korean text should have higher ratio of Korean characters to Latin
// A word-for-word translation might leave too many English words untranslated
var koreanCharCount = 0;
var latinCharCount = 0;
var totalAnalyzed = 0;

for (var key in koFlat) {
  if (typeof koFlat[key] !== "string") continue;
  if (SKIP_KEYS.indexOf(key) !== -1) continue;
  var val = koFlat[key];
  if (!containsKorean(val)) continue;

  var stripped = stripHTML(stripEntities(val));
  totalAnalyzed++;

  for (var i = 0; i < stripped.length; i++) {
    var code = stripped.charCodeAt(i);
    // Hangul syllables: AC00-D7AF, Jamo: 1100-11FF, Compat Jamo: 3130-318F
    if ((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F)) {
      koreanCharCount++;
    } else if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) {
      latinCharCount++;
    }
  }
}

var koreanRatio = koreanCharCount + latinCharCount > 0
  ? (koreanCharCount / (koreanCharCount + latinCharCount) * 100).toFixed(1)
  : 0;

// For a transit tool with many English proper nouns, 50%+ Korean is reasonable
if (parseFloat(koreanRatio) >= 45) {
  pass(
    "Korean character ratio is healthy",
    koreanCharCount + " Korean chars vs " + latinCharCount + " Latin chars (" + koreanRatio + "% Korean) across " + totalAnalyzed + " values"
  );
} else {
  fail(
    "Korean character ratio too low — possible untranslated content",
    koreanCharCount + " Korean vs " + latinCharCount + " Latin (" + koreanRatio + "% Korean)"
  );
}

// Check 2: Look for unnaturally translated patterns
// Word-for-word translations often produce unnatural Korean, such as:
// - Subject before possessive (English order) instead of Korean order
// - Excessive use of 의 (possessive marker) where natural Korean would restructure

var possessiveCount = 0;
var possessivePattern = /의\s/g;
var possessiveMatches = allKoreanText.match(possessivePattern);
possessiveCount = possessiveMatches ? possessiveMatches.length : 0;

// Count total Korean sentences to get ratio
var sentenceCount = koreanSentences.length;
var possessiveRatio = sentenceCount > 0 ? (possessiveCount / sentenceCount).toFixed(2) : 0;

if (parseFloat(possessiveRatio) <= 3.0) {
  pass(
    "Natural possessive usage",
    possessiveCount + " uses of 의 across " + sentenceCount + " sentences (ratio: " + possessiveRatio + ") — not over-relying on possessive marker"
  );
} else {
  warn(
    "Possible over-use of possessive 의",
    possessiveCount + " uses across " + sentenceCount + " sentences (ratio: " + possessiveRatio + "). Natural Korean often restructures to avoid excessive 의."
  );
}

// Check 3: Verify translations are not identical to English
// (excluding keys that are supposed to be the same)
var identicalKeys = [];
var properNounKeys = [
  "meta.lang", "meta.dir", "meta.label",
  "card.powered_by", "blog.title"
];

for (var key in enFlat) {
  if (typeof enFlat[key] !== "string") continue;
  if (typeof koFlat[key] !== "string") continue;
  if (properNounKeys.indexOf(key) !== -1) continue;
  // Skip if the English value is a short technical term
  if (enFlat[key].length <= 3) continue;
  if (enFlat[key] === koFlat[key]) {
    identicalKeys.push(key);
  }
}

if (identicalKeys.length <= 5) {
  pass(
    "Translations are differentiated from English",
    identicalKeys.length + " keys identical to English: " + (identicalKeys.length > 0 ? identicalKeys.join(", ") : "none")
  );
} else {
  fail(
    "Too many untranslated keys",
    identicalKeys.length + " keys identical to English: " + identicalKeys.slice(0, 10).join(", ") + (identicalKeys.length > 10 ? "..." : "")
  );
}

// Check 4: Verify key user-facing strings are properly translated (not English)
var criticalKeys = [
  "common.skip_to_main",
  "common.high_contrast",
  "common.simplified_view",
  "common.nav_line_guide",
  "common.nav_commute_comparison",
  "index.title",
  "index.tagline",
  "index.your_station",
  "index.choose_station",
  "compare.hero_title",
  "coverage.hero_title",
  "map.hero_title",
  "embed.hero_title"
];

var untranslatedCritical = [];
criticalKeys.forEach(function (key) {
  var koVal = koFlat[key];
  var enVal = enFlat[key];
  if (!koVal) {
    untranslatedCritical.push(key + " (MISSING)");
    return;
  }
  if (koVal === enVal) {
    untranslatedCritical.push(key + " (identical to English)");
    return;
  }
  if (!containsKorean(koVal)) {
    untranslatedCritical.push(key + " (no Korean characters: \"" + koVal + "\")");
  }
});

if (untranslatedCritical.length === 0) {
  pass(
    "All critical UI strings are translated to Korean",
    "Checked " + criticalKeys.length + " critical keys"
  );
} else {
  fail(
    "Critical strings not properly translated",
    untranslatedCritical.join("; ")
  );
}

// Check 5: Look for common unnatural patterns in Korean translations
// English "X of Y" often poorly translated as "Y의 X" when Korean restructures differently
var unnaturalPatterns = [
  { pattern: /있는 것/, name: "있는 것 (overly literal 'thing that exists')", threshold: 3 },
  { pattern: /하는 것/, name: "하는 것 (overly literal 'thing that does')", threshold: 5 },
];

unnaturalPatterns.forEach(function (check) {
  var patternMatches = allKoreanText.match(new RegExp(check.pattern.source, "g"));
  var count = patternMatches ? patternMatches.length : 0;
  if (count <= check.threshold) {
    pass(
      "Natural phrasing: " + check.name,
      count + " occurrences (threshold: " + check.threshold + ")"
    );
  } else {
    warn(
      "Possibly unnatural: " + check.name,
      count + " occurrences (threshold: " + check.threshold + ") — may indicate word-for-word translation"
    );
  }
});

// ---------------------------------------------------------------------------
// ADDITIONAL: Check for consistent terminology within Korean translations
// ---------------------------------------------------------------------------

console.log("\n=== ADDITIONAL: Internal Terminology Consistency ===\n");

// The same English concept should be translated consistently throughout
var consistencyChecks = [
  {
    concept: "cutover",
    expectedKorean: "전환",
    description: "Portal Bridge cutover"
  },
  {
    concept: "embed",
    expectedKorean: "삽입",
    alternates: ["임베드"],
    description: "Embed functionality"
  },
  {
    concept: "configurator",
    expectedKorean: "구성 도구",
    alternates: ["설정 도구"],
    description: "Embed configurator"
  }
];

consistencyChecks.forEach(function (check) {
  var primaryCount = 0;
  var alternateCount = 0;
  var allTerms = [check.expectedKorean].concat(check.alternates || []);

  for (var key in koFlat) {
    if (typeof koFlat[key] !== "string") continue;
    if (koFlat[key].indexOf(check.expectedKorean) !== -1) {
      primaryCount++;
    }
    if (check.alternates) {
      check.alternates.forEach(function (alt) {
        if (koFlat[key].indexOf(alt) !== -1) {
          alternateCount++;
        }
      });
    }
  }

  if (primaryCount > 0 && alternateCount === 0) {
    pass(
      "Consistent term for '" + check.concept + "'",
      "\"" + check.expectedKorean + "\" used " + primaryCount + " times, no alternates"
    );
  } else if (primaryCount > 0 && alternateCount > 0) {
    warn(
      "Mixed terms for '" + check.concept + "'",
      "\"" + check.expectedKorean + "\" used " + primaryCount + " times, alternates (" + (check.alternates || []).join(", ") + ") used " + alternateCount + " times"
    );
  } else if (primaryCount === 0 && alternateCount > 0) {
    warn(
      "Unexpected term for '" + check.concept + "'",
      "Expected \"" + check.expectedKorean + "\" but only found alternates (" + (check.alternates || []).join(", ") + ") " + alternateCount + " times"
    );
  } else {
    warn(
      "Term '" + check.concept + "' not found",
      "Neither \"" + check.expectedKorean + "\" nor alternates found in translations"
    );
  }
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(70));
console.log("KOREAN LINGUISTIC VALIDATION REPORT");
console.log("=".repeat(70) + "\n");

results.forEach(function (r) {
  var prefix = r.status === "PASS" ? "[PASS]"
    : r.status === "FAIL" ? "[FAIL]"
    : "[WARN]";
  console.log(prefix + " " + r.test);
  if (r.detail) {
    console.log("       " + r.detail);
  }
});

console.log("\n" + "-".repeat(70));
console.log("Total: " + totalTests + " tests | Passed: " + passedTests + " | Failed: " + failedTests + " | Warnings: " + warnings);
console.log("-".repeat(70));

if (failedTests > 0) {
  console.log("\nRESULT: " + failedTests + " test(s) FAILED\n");
  process.exit(1);
} else {
  console.log("\nRESULT: All tests PASSED" + (warnings > 0 ? " (" + warnings + " warnings)" : "") + "\n");
  process.exit(0);
}
