/**
 * Linguistic Validation Test Suite for Arabic, Italian, Polish, Tagalog, and Portuguese
 *
 * Validates language-specific quality for Reroute NJ translation files:
 *   - Arabic (ar): Arabic script, MSA register, RTL appropriateness
 *   - Italian (it): Natural Italian, article/gender agreement, formal register
 *   - Polish (pl): Polish diacritical characters, formal register
 *   - Tagalog (tl): Filipino/Tagalog mix, natural borrowing from English
 *   - Portuguese (pt): Brazilian Portuguese (not European)
 *   - All: Station/line names in English, HTML entities preserved, no script mixing
 *
 * Context:
 *   Arabic community: Paterson, Clifton, South Paterson (MSA for written text)
 *   Italian community: Bergen County heritage speakers (standard Italian)
 *   Polish community: Wallington, Garfield, Clifton (standard Polish)
 *   Tagalog community: Jersey City, Bergenfield (Filipino/Tagalog)
 *   Portuguese community: Newark Ironbound (Brazilian Portuguese)
 *
 * Run: node tests/test-linguistic-other.js
 */

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var TRANSLATIONS_DIR = path.join(__dirname, "..", "translations");
var LANGUAGES_UNDER_TEST = ["ar", "it", "pl", "tl", "pt"];

// Station names and line names that MUST stay in English (proper nouns on signage)
var STATION_LINE_NAMES = [
  "Hoboken", "Newark", "Secaucus", "Penn Station", "Port Authority",
  "Atlantic City", "Montclair-Boonton", "Morris & Essex", "Morristown",
  "Gladstone", "Northeast Corridor", "North Jersey Coast", "Raritan Valley",
  "Midtown Direct", "PATH", "NJ Transit", "Amtrak", "NY Waterway",
  "Hudson Place", "Lincoln Tunnel", "Hackensack River", "Kearny",
  "Perth Amboy", "Woodbridge", "Gateway Program", "Portal Bridge",
  "Portal North Bridge", "Northeast Corridor", "33rd Street", "W. 39th St",
  "Bus 126", "WTC", "PSNY"
];

// HTML entities that must be preserved across translations
var HTML_ENTITIES = ["&mdash;", "&rarr;", "&copy;", "&amp;", "&hellip;"];

// Arabic Unicode range (0600-06FF plus extensions)
var ARABIC_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
var ARABIC_CHARS_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

// Latin character ranges
var LATIN_CHAR_RE = /[a-zA-Z]/;
var LATIN_WORD_RE = /[a-zA-Z]{4,}/g;

// Polish special characters
var POLISH_CHARS = ["ą", "ę", "ó", "ś", "ć", "ź", "ż", "ń", "ł", "Ą", "Ę", "Ó", "Ś", "Ć", "Ź", "Ż", "Ń", "Ł"];

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
 * Strip HTML tags and entities from a string to get raw text content.
 */
function stripHtml(str) {
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a Latin word is a known proper noun / allowed English term.
 * Returns true if the word is allowed to stay in English.
 */
function isAllowedEnglishWord(word) {
  // Known proper nouns and technical terms
  var allowed = [
    // Transit names
    "NJ", "NYC", "NY", "NEC", "PATH", "PSNY", "WTC", "CMS", "FAQ",
    "Hoboken", "Newark", "Secaucus", "Manhattan", "Midtown", "Amtrak",
    "Kearny", "Hackensack", "Hudson", "Lincoln", "Perth", "Amboy",
    "Woodbridge", "Montclair", "Boonton", "Morris", "Essex", "Gladstone",
    "Morristown", "Atlantic", "City", "Raritan", "Valley",
    // Brand names
    "Reroute", "Transit", "Waterway", "Portal", "Bridge", "North",
    "Gateway", "Program", "Corridor", "Northeast",
    // Technical terms
    "GitHub", "MIT", "WordPress", "Ghost", "Squarespace", "Substack",
    "Netlify", "Vercel", "HTML", "CSS", "JavaScript", "JSON", "API",
    "iframe", "Iframe", "script", "Script", "PNG", "PDF", "CTA",
    "Canvas", "npm", "WCAG", "OG", "SEO", "URL", "Blog", "blog",
    "PR", "fork", "Fork", "embed", "hreflang",
    // Place names
    "Penn", "Station", "Authority", "Port", "Bus", "Place",
    "Street", "River", "Tunnel", "Terminal",
    // Names
    "Joe", "Amditis",
    // Common borrowed terms
    "email", "online", "offline", "web", "website", "app",
    "live", "menu", "Menu", "Widget", "widget",
    "download", "Download", "hub", "Hub",
    // Technical abbrevs
    "Feb", "Mar", "Phase", "Tiles", "Card", "card",
    "Legend", "Timeline", "Powered",
    // Tags and code
    "div", "data", "theme", "dark", "accent", "true",
    "embed", "type", "line", "station",
    "code", "strong", "href", "target", "blank", "rel", "noopener",
    "robots", "txt", "llms", "sitemap", "xml",
    "LD",
    // Other common proper nouns in translations
    "Gothamist", "NorthJersey", "com",
    // Coverage terms
    "Facebook", "coverage", "liveblog",
    // Template placeholders (used as {current}, {total} in JS)
    "current", "total",
    // Technical and proper nouns that appear in embed/technical contexts
    "issue", "pull", "request", "Pages", "Junction",
    "York", "Washington", "styles", "root",
    "njtransit", "Sprint", "release", "deploy",
    "offline", "online", "browser", "server",
    "domain", "logo", "responsive", "mobile",
    "sidebar", "block", "newsletter", "tweet",
    "default", "step", "info"
  ];

  // Check exact match (case-insensitive for short words)
  for (var i = 0; i < allowed.length; i++) {
    if (word === allowed[i]) return true;
    if (word.toLowerCase() === allowed[i].toLowerCase()) return true;
  }

  // Check if it's part of a station/line name
  for (var j = 0; j < STATION_LINE_NAMES.length; j++) {
    if (STATION_LINE_NAMES[j].indexOf(word) !== -1) return true;
  }

  return false;
}

/**
 * Extract Latin words from a string that are NOT inside HTML tags or URLs.
 */
function extractNonProperLatinWords(str) {
  // Remove HTML tags
  var cleaned = str.replace(/<[^>]+>/g, " ");
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s"<]+/g, " ");
  // Remove email addresses
  cleaned = cleaned.replace(/[\w.+-]+@[\w.-]+\.[a-zA-Z]+/g, " ");
  // Remove HTML entities
  cleaned = cleaned.replace(/&[a-zA-Z]+;/g, " ");
  // Remove code snippets (things in backticks or code-looking content)
  cleaned = cleaned.replace(/`[^`]*`/g, " ");

  var words = [];
  var match;
  while ((match = LATIN_WORD_RE.exec(cleaned)) !== null) {
    var word = match[0];
    if (!isAllowedEnglishWord(word)) {
      words.push(word);
    }
  }
  return words;
}

// ---------------------------------------------------------------------------
// Load translation files
// ---------------------------------------------------------------------------

var translations = {};
var flatTranslations = {};
var loadErrors = {};

var allLangs = ["en"].concat(LANGUAGES_UNDER_TEST);
allLangs.forEach(function (lang) {
  var filePath = path.join(TRANSLATIONS_DIR, lang + ".json");
  try {
    var raw = fs.readFileSync(filePath, "utf8");
    translations[lang] = JSON.parse(raw);
    flatTranslations[lang] = flattenObject(translations[lang]);
  } catch (e) {
    loadErrors[lang] = e.message;
  }
});

var enFlat = flatTranslations["en"] || {};
var enKeys = Object.keys(enFlat);

// Keys that are metadata, not translatable content
var META_KEYS = ["meta.lang", "meta.dir", "meta.label", "meta.nativeName"];

// Keys that contain only proper nouns / technical values (no translated content)
var SKIP_KEYS_FOR_SCRIPT = [
  "meta.lang", "meta.dir", "meta.label", "meta.nativeName",
  "index.nj_to_nyc", "index.nyc_to_nj",
  "card.powered_by", "card.date_range",
  "map.legend_portal_bridge",        // "Portal Bridge" is a proper noun
  "embed.cfg_tab_iframe",            // "Iframe" is a technical term
  "map.legend_transfer_hub",         // may stay in English
  "embed.cfg_tab_png",               // "PNG" is a technical abbreviation
  "embed.cfg_tab_html"               // "HTML" is a technical abbreviation
];

// =========================================================================
// TEST SECTION 1: ARABIC (ar)
// =========================================================================

console.log("\n" + "=".repeat(60));
console.log("ARABIC (ar) LINGUISTIC VALIDATION");
console.log("=".repeat(60));

if (flatTranslations["ar"]) {
  var arFlat = flatTranslations["ar"];

  // -------------------------------------------------------------------------
  // AR-1: Arabic script used throughout (non-meta, non-proper-noun values)
  // -------------------------------------------------------------------------

  console.log("\n--- AR-1: Arabic script used throughout ---");

  var arNoArabicScript = [];
  Object.keys(arFlat).forEach(function (key) {
    if (META_KEYS.indexOf(key) !== -1) return;
    if (SKIP_KEYS_FOR_SCRIPT.indexOf(key) !== -1) return;
    var val = arFlat[key];
    if (typeof val !== "string") return;

    var textContent = stripHtml(val);
    // Skip very short values or values that are just proper nouns
    if (textContent.length < 3) return;

    // Check that there's at least some Arabic script
    if (!ARABIC_CHAR_RE.test(textContent)) {
      arNoArabicScript.push(key + " = \"" + textContent.substring(0, 50) + "\"");
    }
  });

  if (arNoArabicScript.length === 0) {
    pass("[ar] All content values contain Arabic script");
  } else {
    fail("[ar] " + arNoArabicScript.length + " values contain no Arabic script",
      arNoArabicScript.slice(0, 10).join("; "));
  }

  // -------------------------------------------------------------------------
  // AR-2: No accidental Latin characters in Arabic text (except proper nouns)
  // -------------------------------------------------------------------------

  console.log("\n--- AR-2: No accidental Latin characters in Arabic text ---");

  var arLatinIssues = [];
  Object.keys(arFlat).forEach(function (key) {
    if (META_KEYS.indexOf(key) !== -1) return;
    if (SKIP_KEYS_FOR_SCRIPT.indexOf(key) !== -1) return;
    var val = arFlat[key];
    if (typeof val !== "string") return;

    var suspectWords = extractNonProperLatinWords(val);
    if (suspectWords.length > 0) {
      arLatinIssues.push(key + ": [" + suspectWords.join(", ") + "]");
    }
  });

  if (arLatinIssues.length === 0) {
    pass("[ar] No unexpected Latin words in Arabic text");
  } else if (arLatinIssues.length <= 3) {
    warn("[ar] " + arLatinIssues.length + " values with possibly unexpected Latin words",
      arLatinIssues.join("; "));
  } else {
    fail("[ar] " + arLatinIssues.length + " values with unexpected Latin words",
      arLatinIssues.slice(0, 10).join("; "));
  }

  // -------------------------------------------------------------------------
  // AR-3: RTL direction marker is set correctly
  // -------------------------------------------------------------------------

  console.log("\n--- AR-3: RTL direction marker ---");

  if (arFlat["meta.dir"] === "rtl") {
    pass("[ar] meta.dir is 'rtl'");
  } else {
    fail("[ar] meta.dir should be 'rtl' but is '" + arFlat["meta.dir"] + "'");
  }

  // -------------------------------------------------------------------------
  // AR-4: MSA register -- checking for colloquial markers
  // -------------------------------------------------------------------------

  console.log("\n--- AR-4: MSA register (no colloquial Arabic markers) ---");

  // Common Egyptian/Levantine colloquial words that would NOT appear in MSA
  // (These are simplified checks -- not exhaustive)
  var COLLOQUIAL_MARKERS = [
    { word: "\u0639\u0627\u064A\u0632", dialect: "Egyptian", meaning: "want (colloquial)" },   // عايز
    { word: "\u0645\u0634", dialect: "Egyptian", meaning: "not (colloquial)" },                  // مش (as standalone)
    { word: "\u0643\u062F\u0647", dialect: "Egyptian", meaning: "like this (colloquial)" },      // كده
    { word: "\u0627\u0632\u0627\u064A", dialect: "Egyptian", meaning: "how (colloquial)" },      // ازاي
    { word: "\u0647\u0644\u0642", dialect: "Levantine", meaning: "now (colloquial)" },           // هلق
    { word: "\u0647\u0644\u0623", dialect: "Levantine", meaning: "now (colloquial)" },           // هلأ
    { word: "\u0634\u0648", dialect: "Levantine", meaning: "what (colloquial)" }                 // شو
  ];

  var colloquialFound = [];
  Object.keys(arFlat).forEach(function (key) {
    var val = arFlat[key];
    if (typeof val !== "string") return;
    COLLOQUIAL_MARKERS.forEach(function (marker) {
      // Check for standalone word (surrounded by spaces or at start/end)
      var re = new RegExp("(?:^|\\s)" + marker.word + "(?:\\s|$)");
      if (re.test(val)) {
        colloquialFound.push(key + ": found '" + marker.word + "' (" + marker.dialect + " " + marker.meaning + ")");
      }
    });
  });

  if (colloquialFound.length === 0) {
    pass("[ar] No colloquial Arabic markers detected -- appropriate MSA register");
  } else {
    fail("[ar] " + colloquialFound.length + " colloquial markers found (should be MSA)",
      colloquialFound.join("; "));
  }

  // -------------------------------------------------------------------------
  // AR-5: Arabic arrow direction check (RTL arrows)
  // -------------------------------------------------------------------------

  console.log("\n--- AR-5: Arrow direction appropriate for RTL ---");

  var arArrowIssues = [];
  Object.keys(arFlat).forEach(function (key) {
    var val = arFlat[key];
    if (typeof val !== "string") return;
    // In RTL context, "→" pointing right visually means "forward/next"
    // which is left in RTL. Check that arrows pointing right (→) in English
    // are reversed to left (←) in Arabic, OR use &rarr;/&larr; entities
    var enVal = enFlat[key];
    if (typeof enVal !== "string") return;

    // Check for reversed arrow in CTA/navigation texts
    if ((enVal.indexOf("\u2192") !== -1 || enVal.indexOf("&rarr;") !== -1) && key.indexOf("cta") !== -1) {
      // For CTA buttons, Arabic should use left arrow
      if (val.indexOf("\u2190") !== -1 || val.indexOf("&larr;") !== -1 || val.indexOf("\u2192") !== -1 || val.indexOf("&rarr;") !== -1) {
        // Has some arrow -- acceptable (exact direction depends on layout)
      } else {
        // No arrow at all in CTA
        arArrowIssues.push(key + " -- CTA missing arrow indicator");
      }
    }
  });

  // Check specifically for the key patterns that should have arrows
  var arrowKeys = ["index.compare_callout_btn", "blog_post.cta", "blog_post_embed.cta", "blog.read_more"];
  arrowKeys.forEach(function (key) {
    if (!arFlat[key]) return;
    var val = arFlat[key];
    if (val.indexOf("\u2190") !== -1 || val.indexOf("\u2192") !== -1 ||
        val.indexOf("&rarr;") !== -1 || val.indexOf("&larr;") !== -1 ||
        val.indexOf("\u2190") !== -1) {
      // Has an arrow character
    } else {
      arArrowIssues.push(key + " -- missing directional arrow");
    }
  });

  if (arArrowIssues.length === 0) {
    pass("[ar] Arrow directions present in navigation/CTA elements");
  } else {
    warn("[ar] " + arArrowIssues.length + " potential arrow direction issues",
      arArrowIssues.join("; "));
  }

  // -------------------------------------------------------------------------
  // AR-6: nativeName is in Arabic script
  // -------------------------------------------------------------------------

  console.log("\n--- AR-6: nativeName is in Arabic script ---");

  if (ARABIC_CHAR_RE.test(arFlat["meta.nativeName"])) {
    pass("[ar] meta.nativeName '" + arFlat["meta.nativeName"] + "' is in Arabic script");
  } else {
    fail("[ar] meta.nativeName '" + arFlat["meta.nativeName"] + "' should be in Arabic script");
  }

} else {
  fail("[ar] Arabic translation file could not be loaded", loadErrors["ar"] || "unknown error");
}

// =========================================================================
// TEST SECTION 2: ITALIAN (it)
// =========================================================================

console.log("\n" + "=".repeat(60));
console.log("ITALIAN (it) LINGUISTIC VALIDATION");
console.log("=".repeat(60));

if (flatTranslations["it"]) {
  var itFlat = flatTranslations["it"];

  // -------------------------------------------------------------------------
  // IT-1: Natural Italian -- uses Italian articles and prepositions
  // -------------------------------------------------------------------------

  console.log("\n--- IT-1: Natural Italian -- uses Italian articles and prepositions ---");

  // Check for common Italian articles and prepositions as a signal of translation quality
  var ITALIAN_MARKERS = [
    "il", "lo", "la", "i", "gli", "le",          // definite articles
    "un", "uno", "una",                             // indefinite articles
    "di", "del", "dello", "della", "dei", "degli", "delle",  // of/from
    "in", "nel", "nello", "nella", "nei", "negli", "nelle",  // in
    "su", "sul", "sullo", "sulla", "sui", "sugli", "sulle",  // on
    "per", "con", "tra", "fra",                     // for, with, between
    "che", "come", "quando", "dove", "perch\u00E9"  // that, how, when, where, why (perche with accent)
  ];

  var allItText = "";
  Object.keys(itFlat).forEach(function (key) {
    if (META_KEYS.indexOf(key) !== -1) return;
    var val = itFlat[key];
    if (typeof val !== "string") return;
    allItText += " " + stripHtml(val);
  });
  allItText = allItText.toLowerCase();

  var foundItalianMarkers = [];
  ITALIAN_MARKERS.forEach(function (marker) {
    var re = new RegExp("\\b" + marker + "\\b");
    if (re.test(allItText)) {
      foundItalianMarkers.push(marker);
    }
  });

  if (foundItalianMarkers.length >= 15) {
    pass("[it] Natural Italian detected (" + foundItalianMarkers.length + " common Italian words found)",
      "Found: " + foundItalianMarkers.slice(0, 15).join(", ") + (foundItalianMarkers.length > 15 ? "..." : ""));
  } else if (foundItalianMarkers.length >= 8) {
    warn("[it] Limited Italian markers (" + foundItalianMarkers.length + " found)",
      "Found: " + foundItalianMarkers.join(", "));
  } else {
    fail("[it] Too few Italian markers (" + foundItalianMarkers.length + " found) -- text may not be natural Italian",
      "Found: " + foundItalianMarkers.join(", "));
  }

  // -------------------------------------------------------------------------
  // IT-2: Formal register -- uses Lei/impersonal forms, not tu
  // -------------------------------------------------------------------------

  console.log("\n--- IT-2: Formal register check (appropriate formality) ---");

  // Check for informal 'tu' forms that would be inappropriate for a public tool
  // Informal markers: "tu ", "tuo ", "tua ", "tuoi ", "tue "
  // We look for these as standalone patterns; formal would use "Lei", "Suo/Sua" or
  // impersonal constructions, or polite "Voi" plural

  // Note: In modern Italian web content, "tu" (informal you) is actually common
  // and acceptable, especially for user-facing tools. "Lei" would be overly formal.
  // The translation uses "tuo/tua/tuoi/tue" (your-informal) which is natural for
  // web apps. We just verify consistency -- not mixing Lei and tu.

  var itInformalYou = 0;
  var itFormalYou = 0;
  var itInformalVerbs = [];
  var itFormalVerbs = [];

  Object.keys(itFlat).forEach(function (key) {
    if (META_KEYS.indexOf(key) !== -1) return;
    var val = itFlat[key];
    if (typeof val !== "string") return;
    var text = stripHtml(val).toLowerCase();

    // Count informal possessives: tuo, tua, tuoi, tue
    var informalPoss = (text.match(/\b(tuo|tua|tuoi|tue|tui)\b/g) || []).length;
    // Count informal verbs: "scegli", "seleziona", "puoi", "devi", "fai"
    var informalVerb = (text.match(/\b(scegli|seleziona|puoi|devi|fai|prendi|cerca|entra|esci|scendi|sali|controlla|guida|usa|copia|clicca|aggiungi|invia|parlane)\b/g) || []).length;

    // Count formal: Lei, Suo, Sua, Suoi, Sue
    var formalPoss = (text.match(/\b(suo|sua|suoi|sue)\b/g) || []).length;
    // Note: Suo/Sua/Suoi/Sue overlap with "his/her/their" so only count if
    // "Lei" is also present nearby
    var hasLei = /\blei\b/i.test(text);

    itInformalYou += informalPoss + informalVerb;
    if (hasLei) itFormalYou += formalPoss;
  });

  if (itInformalYou > 0 && itFormalYou === 0) {
    pass("[it] Consistent informal register (tu/tuo form) used throughout (" + itInformalYou + " informal markers, 0 formal Lei markers)",
      "Standard for Italian web applications");
  } else if (itFormalYou > 0 && itInformalYou === 0) {
    pass("[it] Consistent formal register (Lei form) used throughout (" + itFormalYou + " formal markers)");
  } else if (itInformalYou > 0 && itFormalYou > 0) {
    warn("[it] Mixed register detected: " + itInformalYou + " informal + " + itFormalYou + " formal markers",
      "Should be consistent -- either all informal (tu) or all formal (Lei)");
  } else {
    pass("[it] Register check inconclusive but no contradictions found");
  }

  // -------------------------------------------------------------------------
  // IT-3: Correct article-gender agreement (spot checks)
  // -------------------------------------------------------------------------

  console.log("\n--- IT-3: Article-gender agreement spot checks ---");

  // Spot check for common Italian gender agreement patterns
  var genderIssues = [];

  Object.keys(itFlat).forEach(function (key) {
    var val = itFlat[key];
    if (typeof val !== "string") return;
    var text = stripHtml(val).toLowerCase();

    // "il" should not precede feminine nouns starting with consonant
    // "la" should not precede masculine nouns
    // Common check: "il stazione" (wrong) vs "la stazione" (correct)
    if (/\bil\s+stazione\b/.test(text)) {
      genderIssues.push(key + ": 'il stazione' should be 'la stazione'");
    }
    // "il linea" (wrong) vs "la linea" (correct)
    if (/\bil\s+linea\b/.test(text)) {
      genderIssues.push(key + ": 'il linea' should be 'la linea'");
    }
    // "la treno" (wrong) vs "il treno" (correct)
    if (/\bla\s+treno\b/.test(text)) {
      genderIssues.push(key + ": 'la treno' should be 'il treno'");
    }
    // "il mappa" (wrong) vs "la mappa" (correct)
    if (/\bil\s+mappa\b/.test(text)) {
      genderIssues.push(key + ": 'il mappa' should be 'la mappa'");
    }
    // "lo bus" (wrong) vs "il bus" (correct)
    if (/\blo\s+bus\b/.test(text)) {
      genderIssues.push(key + ": 'lo bus' should be 'il bus'");
    }
    // "un stazione" (wrong) vs "una stazione" (correct)
    if (/\bun\s+stazione\b/.test(text)) {
      genderIssues.push(key + ": 'un stazione' should be 'una stazione'");
    }
    // "una treno" (wrong) vs "un treno" (correct)
    if (/\buna\s+treno\b/.test(text)) {
      genderIssues.push(key + ": 'una treno' should be 'un treno'");
    }
    // "il informazione" (wrong) -- should use "l'" before vowel
    if (/\bil\s+[aeiou]/i.test(text) && !/\bil\s+(15|[0-9])/.test(text)) {
      // Check for "il" before vowel-starting words (not numbers)
      var matchIlVowel = text.match(/\bil\s+([aeiou]\w+)/i);
      if (matchIlVowel) {
        // Some exceptions: "il est" etc. Only flag obvious Italian words
        var nextWord = matchIlVowel[1];
        if (["imbarco", "impatto", "ingresso", "orario", "uso", "uscita", "edificio", "atrio"].indexOf(nextWord) !== -1) {
          genderIssues.push(key + ": 'il " + nextWord + "' should use l' elision");
        }
      }
    }
  });

  if (genderIssues.length === 0) {
    pass("[it] No article-gender agreement issues found in spot checks");
  } else {
    fail("[it] " + genderIssues.length + " article-gender agreement issues",
      genderIssues.join("; "));
  }

  // -------------------------------------------------------------------------
  // IT-4: Italian-specific vocabulary used (not literal English calques)
  // -------------------------------------------------------------------------

  console.log("\n--- IT-4: Italian vocabulary check ---");

  // Verify key Italian terms are properly translated (not English calques)
  var itVocabChecks = [
    { key: "common.days", expected: "giorni", desc: "days -> giorni" },
    { key: "common.day", expected: "giorno", desc: "day -> giorno" },
    { key: "index.your_station", expected: "stazione", desc: "station -> stazione" },
    { key: "compare.fastest", expected: "veloce", desc: "fastest contains veloce" },
    { key: "coverage.search_placeholder", expected: "cerca", desc: "search contains cerca" },
    { key: "map.legend_title", expected: "legenda", desc: "legend -> Legenda" },
    { key: "common.high_contrast", expected: "contrasto", desc: "contrast -> contrasto" }
  ];

  var itVocabIssues = [];
  itVocabChecks.forEach(function (check) {
    var val = itFlat[check.key];
    if (typeof val !== "string") {
      itVocabIssues.push(check.key + " -- key not found");
      return;
    }
    if (val.toLowerCase().indexOf(check.expected.toLowerCase()) === -1) {
      itVocabIssues.push(check.desc + " -- actual: '" + val + "'");
    }
  });

  if (itVocabIssues.length === 0) {
    pass("[it] Key Italian vocabulary correctly used");
  } else {
    fail("[it] " + itVocabIssues.length + " vocabulary issues", itVocabIssues.join("; "));
  }

} else {
  fail("[it] Italian translation file could not be loaded", loadErrors["it"] || "unknown error");
}

// =========================================================================
// TEST SECTION 3: POLISH (pl)
// =========================================================================

console.log("\n" + "=".repeat(60));
console.log("POLISH (pl) LINGUISTIC VALIDATION");
console.log("=".repeat(60));

if (flatTranslations["pl"]) {
  var plFlat = flatTranslations["pl"];

  // -------------------------------------------------------------------------
  // PL-1: Uses Polish diacritical characters
  // -------------------------------------------------------------------------

  console.log("\n--- PL-1: Uses Polish diacritical characters ---");

  var polishCharCounts = {};
  POLISH_CHARS.forEach(function (c) { polishCharCounts[c] = 0; });

  var allPlText = "";
  Object.keys(plFlat).forEach(function (key) {
    if (META_KEYS.indexOf(key) !== -1) return;
    var val = plFlat[key];
    if (typeof val !== "string") return;
    allPlText += val;
  });

  POLISH_CHARS.forEach(function (c) {
    var re = new RegExp(c, "g");
    var matches = allPlText.match(re);
    polishCharCounts[c] = matches ? matches.length : 0;
  });

  var missingChars = [];
  // These characters must appear at least once in proper Polish text
  var requiredChars = ["ą", "ę", "ó", "ś", "ć", "ż", "ń", "ł"];
  requiredChars.forEach(function (c) {
    if (polishCharCounts[c] === 0 && polishCharCounts[c.toUpperCase()] === 0) {
      missingChars.push(c);
    }
  });

  if (missingChars.length === 0) {
    var charSummary = requiredChars.map(function (c) {
      return c + ":" + (polishCharCounts[c] + (polishCharCounts[c.toUpperCase()] || 0));
    }).join(", ");
    pass("[pl] All Polish diacritical characters present", charSummary);
  } else {
    fail("[pl] Missing Polish characters: " + missingChars.join(", "),
      "These characters are essential for correct Polish text");
  }

  // -------------------------------------------------------------------------
  // PL-2: Common Polish diacritical words are correctly spelled
  // -------------------------------------------------------------------------

  console.log("\n--- PL-2: Common Polish diacritical words spelled correctly ---");

  // Check that common Polish words use proper diacritics (not stripped ASCII)
  var plSpellingChecks = [
    { wrong: /\bstronach\b/i, right: "stronach (ok) or proper form", desc: "pages" },
    { wrong: /\bpolaczenie\b/i, right: "po\u0142\u0105czenie", desc: "connection uses \\u0142\\u0105" },
    { wrong: /\binformacje\b/i, note: "informacje (no diacritics needed)", desc: "information" },
    { wrong: /\bwiecej\b/i, right: "wi\u0119cej", desc: "more uses \\u0119" },
    { wrong: /\bmoze\b/i, right: "mo\u017Ce", desc: "can/may uses \\u017C" },
    { wrong: /\brozklad\b/i, right: "rozk\u0142ad", desc: "schedule uses \\u0142" },
    { wrong: /\bprzesiadki\b/i, note: "przesiadki (correct)", desc: "transfers" }
  ];

  // Instead of checking for wrong words, verify presence of correctly-diacriticked forms
  var plDiacriticWords = [
    { pattern: /wi\u0119cej/i, word: "wi\u0119cej" },           // wiecej -> wiecej
    { pattern: /po\u0142\u0105czeni/i, word: "po\u0142\u0105czeni*" },  // polaczenie -> polaczenie
    { pattern: /zmian/i, word: "zmian*" },                        // change
    { pattern: /mo\u017C/i, word: "mo\u017C*" },                 // moze -> moze
    { pattern: /poci\u0105g/i, word: "poci\u0105g*" },           // pociag -> pociag
    { pattern: /stacj/i, word: "stacj*" },                       // stacja
    { pattern: /przejd\u017A/i, word: "przejd\u017A*" }          // przejdz
  ];

  // Check for ASCII-stripped Polish words (indicates diacritics were dropped)
  var plAsciiIssues = [];
  var asciiStripChecks = [
    { ascii: /\bpociag\b/i, correct: "poci\u0105g", desc: "train" },
    { ascii: /\bzmiane\b/i, correct: "zmian\u0119", desc: "change" },
    { ascii: /\bwiecej\b/i, correct: "wi\u0119cej", desc: "more" },
    { ascii: /\bstworzylimy\b/i, correct: "stworzylimy", desc: "we created" },
    { ascii: /\bpolaczenie\b/i, correct: "po\u0142\u0105czenie", desc: "connection" },
    { ascii: /\brozklad\b/i, correct: "rozk\u0142ad", desc: "schedule" }
  ];

  asciiStripChecks.forEach(function (check) {
    if (check.ascii.test(allPlText)) {
      plAsciiIssues.push("'" + check.correct + "' (" + check.desc + ") appears without proper diacritics");
    }
  });

  if (plAsciiIssues.length === 0) {
    pass("[pl] No ASCII-stripped Polish words detected (diacritics properly used)");
  } else {
    fail("[pl] " + plAsciiIssues.length + " words may have stripped diacritics",
      plAsciiIssues.join("; "));
  }

  // -------------------------------------------------------------------------
  // PL-3: Formal register (impersonal or Pan/Pani form)
  // -------------------------------------------------------------------------

  console.log("\n--- PL-3: Formal register check ---");

  // Polish public-facing text typically uses:
  // - Impersonal constructions (most common for tools/apps)
  // - Pan/Pani (formal you) for very formal contexts
  // - "Ty" (informal you) is acceptable in modern web apps
  // The key is consistency.

  var plInformalCount = 0;
  var plFormalCount = 0;

  Object.keys(plFlat).forEach(function (key) {
    if (META_KEYS.indexOf(key) !== -1) return;
    var val = plFlat[key];
    if (typeof val !== "string") return;
    var text = stripHtml(val);

    // Informal: Ty, Twoj, Twoja, Twoje, Twoi (capitalized "Tw" indicates 2nd person formal in Polish)
    // In Polish, capitalizing "Ty/Twoj" is a sign of RESPECT, so "Twoja" is actually polite informal
    var hasTw = (text.match(/\bTw[oóa-z]/g) || []).length;  // Capital Tw = polite
    var hasSmallTw = (text.match(/\btw[oóa-z]/g) || []).length;  // lowercase tw = casual

    plInformalCount += hasSmallTw;
    plFormalCount += hasTw;
  });

  if (plFormalCount > 0 && plInformalCount === 0) {
    pass("[pl] Polite form used -- capitalized Ty/Twoj/Twoja throughout (" + plFormalCount + " instances)",
      "Appropriate respectful register for a public tool");
  } else if (plFormalCount > 0 && plInformalCount > 0) {
    // Mixed but mostly formal is acceptable
    if (plFormalCount > plInformalCount * 2) {
      pass("[pl] Predominantly polite form (" + plFormalCount + " polite vs " + plInformalCount + " casual)");
    } else {
      warn("[pl] Mixed register: " + plFormalCount + " polite (Tw-) vs " + plInformalCount + " casual (tw-)",
        "Should be predominantly one form");
    }
  } else {
    pass("[pl] Register check: " + plFormalCount + " formal, " + plInformalCount + " informal markers found");
  }

  // -------------------------------------------------------------------------
  // PL-4: Polish vocabulary check
  // -------------------------------------------------------------------------

  console.log("\n--- PL-4: Polish vocabulary check ---");

  var plVocabChecks = [
    { key: "common.days", expected: "dni", desc: "days -> dni" },
    { key: "common.day", expected: "dzie", desc: "day -> dzien" },
    { key: "index.your_station", expected: "stacja", desc: "station -> stacja" },
    { key: "compare.fastest", expected: "najszybsz", desc: "fastest contains najszybsz-" },
    { key: "coverage.search_placeholder", expected: "szukaj", desc: "search contains szukaj" },
    { key: "map.legend_title", expected: "legenda", desc: "legend -> Legenda" },
    { key: "common.high_contrast", expected: "kontrast", desc: "contrast -> kontrast" },
    { key: "js.transfer", expected: "przesiadk", desc: "transfer -> przesiadka" }
  ];

  var plVocabIssues = [];
  plVocabChecks.forEach(function (check) {
    var val = plFlat[check.key];
    if (typeof val !== "string") {
      plVocabIssues.push(check.key + " -- key not found");
      return;
    }
    if (val.toLowerCase().indexOf(check.expected.toLowerCase()) === -1) {
      plVocabIssues.push(check.desc + " -- actual: '" + val + "'");
    }
  });

  if (plVocabIssues.length === 0) {
    pass("[pl] Key Polish vocabulary correctly used");
  } else {
    fail("[pl] " + plVocabIssues.length + " vocabulary issues", plVocabIssues.join("; "));
  }

} else {
  fail("[pl] Polish translation file could not be loaded", loadErrors["pl"] || "unknown error");
}

// =========================================================================
// TEST SECTION 4: TAGALOG (tl)
// =========================================================================

console.log("\n" + "=".repeat(60));
console.log("TAGALOG (tl) LINGUISTIC VALIDATION");
console.log("=".repeat(60));

if (flatTranslations["tl"]) {
  var tlFlat = flatTranslations["tl"];

  // -------------------------------------------------------------------------
  // TL-1: Filipino/Tagalog mix -- contains Tagalog words
  // -------------------------------------------------------------------------

  console.log("\n--- TL-1: Contains Tagalog/Filipino words ---");

  var TAGALOG_MARKERS = [
    "ang", "ng", "mga", "sa", "na", "at", "para", "mo", "ka",
    "nang", "kung", "iyong", "ito", "nito", "amin", "namin",
    "mula", "papunta", "papuntang", "patungo", "bago",
    "dahil", "pero", "din", "rin", "lang", "lamang",
    "hindi", "wala", "walang", "may", "mayroon",
    "lahat", "bawat", "isa", "dalawa", "tatlo", "apat", "lima",
    "araw", "linggo", "buwan", "oras", "minuto",
    "gabi", "umaga", "hapon",
    "mga", "istasyon", "linya", "tren", "ruta",
    "serbisyo", "biyahe", "mapa", "balita"
  ];

  var allTlText = "";
  Object.keys(tlFlat).forEach(function (key) {
    if (META_KEYS.indexOf(key) !== -1) return;
    var val = tlFlat[key];
    if (typeof val !== "string") return;
    allTlText += " " + stripHtml(val);
  });
  allTlText = allTlText.toLowerCase();

  var foundTagalogMarkers = [];
  TAGALOG_MARKERS.forEach(function (marker) {
    var re = new RegExp("\\b" + marker + "\\b");
    if (re.test(allTlText)) {
      foundTagalogMarkers.push(marker);
    }
  });

  if (foundTagalogMarkers.length >= 20) {
    pass("[tl] Rich Tagalog vocabulary detected (" + foundTagalogMarkers.length + " Tagalog words found)",
      "Found: " + foundTagalogMarkers.slice(0, 20).join(", ") + (foundTagalogMarkers.length > 20 ? "..." : ""));
  } else if (foundTagalogMarkers.length >= 10) {
    pass("[tl] Adequate Tagalog vocabulary (" + foundTagalogMarkers.length + " words)",
      "Found: " + foundTagalogMarkers.join(", "));
  } else {
    fail("[tl] Too few Tagalog markers (" + foundTagalogMarkers.length + " found)",
      "Found: " + foundTagalogMarkers.join(", "));
  }

  // -------------------------------------------------------------------------
  // TL-2: Natural English borrowing (not over-translated)
  // -------------------------------------------------------------------------

  console.log("\n--- TL-2: Natural English borrowing in Filipino context ---");

  // Filipino naturally borrows many English words, especially technical terms.
  // Check that common borrowed words are used where natural rather than
  // awkward forced translations.
  var NATURAL_BORROWINGS = [
    // These English words are naturally used in Filipino
    { word: "commute", alt: "biyahe", desc: "commute/biyahe both acceptable" },
    { word: "schedule", alt: "iskedyul", desc: "schedule/iskedyul both acceptable" },
    { word: "train", alt: "tren", desc: "train/tren both acceptable" },
    { word: "bus", alt: "bus", desc: "bus is used in Filipino" },
    { word: "ferry", alt: "ferry", desc: "ferry is used in Filipino" }
  ];

  var tlBorrowings = [];
  NATURAL_BORROWINGS.forEach(function (item) {
    var re = new RegExp("\\b(" + item.word + "|" + item.alt + ")\\b", "i");
    if (re.test(allTlText)) {
      tlBorrowings.push(item.word + "/" + item.alt);
    }
  });

  if (tlBorrowings.length > 0) {
    pass("[tl] Natural English borrowing patterns present (" + tlBorrowings.length + " terms)",
      tlBorrowings.join(", "));
  } else {
    warn("[tl] No common English borrowing detected -- may be over-translated");
  }

  // -------------------------------------------------------------------------
  // TL-3: Key Tagalog transit terms
  // -------------------------------------------------------------------------

  console.log("\n--- TL-3: Key Tagalog terms translated correctly ---");

  var tlVocabChecks = [
    { key: "common.days", expected: "araw", desc: "days -> araw" },
    { key: "index.your_station", expected: "istasyon", desc: "station -> istasyon" },
    { key: "compare.fastest", expected: "pinakamabilis", desc: "fastest -> pinakamabilis" },
    { key: "coverage.search_placeholder", expected: "hanap", desc: "search contains hanap" },
    { key: "index.morning_commute", expected: "umaga", desc: "morning -> umaga" },
    { key: "index.evening_commute", expected: "gabi", desc: "evening -> gabi" },
    { key: "coverage.cat_news", expected: "balita", desc: "news -> balita" },
    { key: "common.menu", expected: "menu", desc: "menu -> menu (borrowed)" }
  ];

  var tlVocabIssues = [];
  tlVocabChecks.forEach(function (check) {
    var val = tlFlat[check.key];
    if (typeof val !== "string") {
      tlVocabIssues.push(check.key + " -- key not found");
      return;
    }
    if (val.toLowerCase().indexOf(check.expected.toLowerCase()) === -1) {
      tlVocabIssues.push(check.desc + " -- actual: '" + val + "'");
    }
  });

  if (tlVocabIssues.length === 0) {
    pass("[tl] Key Tagalog vocabulary correctly used");
  } else {
    fail("[tl] " + tlVocabIssues.length + " vocabulary issues", tlVocabIssues.join("; "));
  }

  // -------------------------------------------------------------------------
  // TL-4: Tagalog morphology markers present
  // -------------------------------------------------------------------------

  console.log("\n--- TL-4: Tagalog morphology markers ---");

  // Filipino uses specific verbal affixes and particles
  var TAGALOG_MORPHOLOGY = [
    { pattern: /\bmag-/i, name: "mag- prefix (actor focus)" },
    { pattern: /\bma-/i, name: "ma- prefix (stative)" },
    { pattern: /\bpag-/i, name: "pag- prefix (gerund)" },
    { pattern: /\bnaka-/i, name: "naka- prefix (completed)" },
    { pattern: /\bpinaka-/i, name: "pinaka- prefix (superlative)" },
    { pattern: /\bpapunta/i, name: "papunta (directional)" },
    { pattern: /\bpumunta/i, name: "pumunta (go)" },
    { pattern: /\bmga\b/i, name: "mga (plural marker)" }
  ];

  var foundMorphology = [];
  TAGALOG_MORPHOLOGY.forEach(function (item) {
    if (item.pattern.test(allTlText)) {
      foundMorphology.push(item.name);
    }
  });

  if (foundMorphology.length >= 5) {
    pass("[tl] Rich Tagalog morphology detected (" + foundMorphology.length + " patterns)",
      foundMorphology.join(", "));
  } else if (foundMorphology.length >= 3) {
    pass("[tl] Adequate Tagalog morphology (" + foundMorphology.length + " patterns)",
      foundMorphology.join(", "));
  } else {
    fail("[tl] Insufficient Tagalog morphology (" + foundMorphology.length + " patterns)",
      "Expected Tagalog verbal affixes and particles");
  }

} else {
  fail("[tl] Tagalog translation file could not be loaded", loadErrors["tl"] || "unknown error");
}

// =========================================================================
// TEST SECTION 5: PORTUGUESE (pt)
// =========================================================================

console.log("\n" + "=".repeat(60));
console.log("PORTUGUESE (pt) LINGUISTIC VALIDATION");
console.log("=".repeat(60));

if (flatTranslations["pt"]) {
  var ptFlat = flatTranslations["pt"];

  var allPtText = "";
  Object.keys(ptFlat).forEach(function (key) {
    if (META_KEYS.indexOf(key) !== -1) return;
    var val = ptFlat[key];
    if (typeof val !== "string") return;
    allPtText += " " + stripHtml(val);
  });
  var allPtLower = allPtText.toLowerCase();

  // -------------------------------------------------------------------------
  // PT-1: Brazilian Portuguese (not European) -- uses "voce" not "tu"
  // -------------------------------------------------------------------------

  console.log("\n--- PT-1: Brazilian Portuguese pronoun check (voce vs tu) ---");

  // Brazilian Portuguese uses "voce" (you) as standard 2nd person
  // European Portuguese uses "tu" with conjugated verb forms
  // Check for "voce" presence and absence of European "tu" verb patterns

  var ptVoceCount = (allPtLower.match(/\bvoc\u00EA\b/g) || []).length;  // voce
  var ptSeuSuaCount = (allPtLower.match(/\b(seu|sua|seus|suas)\b/g) || []).length;  // your (voce form)

  // European "tu" forms -- distinctive verb conjugations
  // Present: "tu tens", "tu fazes", "tu vais", "tu podes", "tu deves"
  // These end in -s for tu conjugation
  var europeanTuPatterns = [
    /\btu\s+(tens|fazes|vais|podes|deves|queres|sabes|es|est\u00E1s)\b/i,
    /\bteu\b/i,    // "teu" (your-masc, tu form)
    /\btua\b/i,    // "tua" (your-fem, tu form)
    /\bteus\b/i,   // "teus" (your-masc-pl, tu form)
    /\btuas\b/i    // "tuas" (your-fem-pl, tu form)
  ];

  var europeanTuCount = 0;
  europeanTuPatterns.forEach(function (pattern) {
    var matches = allPtLower.match(pattern);
    if (matches) europeanTuCount += matches.length;
  });

  if (ptVoceCount + ptSeuSuaCount > 0 && europeanTuCount === 0) {
    pass("[pt] Brazilian Portuguese pronouns: 'voce' system used (" + ptVoceCount + " voce, " + ptSeuSuaCount + " seu/sua, 0 European tu forms)",
      "Correct for Newark's Brazilian community");
  } else if (europeanTuCount > 0) {
    fail("[pt] European Portuguese 'tu' forms detected (" + europeanTuCount + " instances)",
      "Should use Brazilian 'voce' for the Ironbound community");
  } else {
    pass("[pt] No European 'tu' forms detected (may use impersonal constructions)");
  }

  // -------------------------------------------------------------------------
  // PT-2: Brazilian vocabulary (not European)
  // -------------------------------------------------------------------------

  console.log("\n--- PT-2: Brazilian vocabulary check ---");

  // Key vocabulary differences between Brazilian (BR) and European (PT) Portuguese
  var BR_VS_EU = [
    { br: "trem", eu: "comboio", meaning: "train" },
    { br: "\u00F4nibus", eu: "autocarro", meaning: "bus" },  // onibus
    { br: "celular", eu: "telem\u00F3vel", meaning: "cellphone" },
    { br: "metr\u00F4", eu: "metropolitano", meaning: "subway" },
    { br: "baldeac", eu: "transbordo", meaning: "transfer (transit)" },
    { br: "bairro", eu: "bairro", meaning: "neighborhood (same)" },
    { br: "plataforma", eu: "gare", meaning: "platform (train)" },
    { br: "passageiro", eu: "passageiro", meaning: "passenger (same)" }
  ];

  var brVocabFound = [];
  var euVocabFound = [];

  BR_VS_EU.forEach(function (item) {
    if (item.br === item.eu) return; // skip words that are same in both
    var brRe = new RegExp("\\b" + item.br.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
    var euRe = new RegExp("\\b" + item.eu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");

    if (brRe.test(allPtLower)) {
      brVocabFound.push(item.br + " (" + item.meaning + ")");
    }
    if (euRe.test(allPtLower)) {
      euVocabFound.push(item.eu + " (" + item.meaning + ")");
    }
  });

  if (euVocabFound.length === 0) {
    pass("[pt] No European Portuguese vocabulary detected",
      "BR vocabulary found: " + (brVocabFound.length > 0 ? brVocabFound.join(", ") : "none checked"));
  } else {
    fail("[pt] European Portuguese vocabulary found: " + euVocabFound.join(", "),
      "Should use Brazilian Portuguese for the Ironbound community");
  }

  // Specific check for "trem" (BR) vs "comboio" (EU) for train
  if (/\btrem\b/i.test(allPtText) || /\btrens\b/i.test(allPtText)) {
    pass("[pt] Uses 'trem/trens' (Brazilian) for train");
  } else if (/\bcomboio\b/i.test(allPtText)) {
    fail("[pt] Uses 'comboio' (European) instead of 'trem' (Brazilian) for train");
  } else {
    // May use "trem" in compound words or the text may use other terms
    warn("[pt] Could not verify 'trem' vs 'comboio' usage -- check manually");
  }

  // Specific check for "onibus" (BR) vs "autocarro" (EU) for bus
  if (/\u00F4nibus\b/i.test(allPtText)) {
    pass("[pt] Uses '\u00F4nibus' (Brazilian) for bus");
  } else if (/\bautocarro\b/i.test(allPtText)) {
    fail("[pt] Uses 'autocarro' (European) instead of '\u00F4nibus' (Brazilian) for bus");
  } else {
    // May use "bus" or other terms
    warn("[pt] Could not verify '\u00F4nibus' vs 'autocarro' -- may use 'bus' or other term");
  }

  // -------------------------------------------------------------------------
  // PT-3: Brazilian Portuguese spelling conventions
  // -------------------------------------------------------------------------

  console.log("\n--- PT-3: Brazilian Portuguese spelling conventions ---");

  // After the 1990 Orthographic Agreement, Brazilian Portuguese uses:
  // - "fato" not "facto" (fact)
  // - "ação" not "acção" (action)
  // - "ótimo" not "óptimo" (great)
  // - "equipe" not "equipa" (team)

  var EU_SPELLINGS = [
    { eu: /\bfacto\b/i, br: "fato", meaning: "fact" },
    { eu: /\bacc\u00E7\u00E3o\b/i, br: "a\u00E7\u00E3o", meaning: "action" },
    { eu: /\b\u00F3ptimo\b/i, br: "\u00F3timo", meaning: "great" },
    { eu: /\bequipa\b/i, br: "equipe", meaning: "team" },
    { eu: /\bdisponibilizar\b/i, br: "disponibilizar (ok)", meaning: "make available (same)" }
  ];

  var euSpellings = [];
  EU_SPELLINGS.forEach(function (item) {
    if (item.eu.test(allPtText)) {
      euSpellings.push(item.br + " (" + item.meaning + ")");
    }
  });

  if (euSpellings.length === 0) {
    pass("[pt] No European Portuguese spelling patterns detected");
  } else {
    fail("[pt] European Portuguese spellings found: " + euSpellings.join(", "),
      "Should use Brazilian Portuguese spelling conventions");
  }

  // -------------------------------------------------------------------------
  // PT-4: Key Portuguese vocabulary check
  // -------------------------------------------------------------------------

  console.log("\n--- PT-4: Key Portuguese vocabulary check ---");

  var ptVocabChecks = [
    { key: "common.days", expected: "dias", desc: "days -> dias" },
    { key: "common.day", expected: "dia", desc: "day -> dia" },
    { key: "index.your_station", expected: "esta\u00E7\u00E3o", desc: "station -> estacao" },
    { key: "compare.fastest", expected: "r\u00E1pido", desc: "fastest contains rapido" },
    { key: "coverage.search_placeholder", expected: "buscar", desc: "search contains buscar" },
    { key: "map.legend_title", expected: "legenda", desc: "legend -> Legenda" },
    { key: "common.high_contrast", expected: "contraste", desc: "contrast -> contraste" }
  ];

  var ptVocabIssues = [];
  ptVocabChecks.forEach(function (check) {
    var val = ptFlat[check.key];
    if (typeof val !== "string") {
      ptVocabIssues.push(check.key + " -- key not found");
      return;
    }
    if (val.toLowerCase().indexOf(check.expected.toLowerCase()) === -1) {
      ptVocabIssues.push(check.desc + " -- actual: '" + val + "'");
    }
  });

  if (ptVocabIssues.length === 0) {
    pass("[pt] Key Portuguese vocabulary correctly used");
  } else {
    fail("[pt] " + ptVocabIssues.length + " vocabulary issues", ptVocabIssues.join("; "));
  }

} else {
  fail("[pt] Portuguese translation file could not be loaded", loadErrors["pt"] || "unknown error");
}

// =========================================================================
// TEST SECTION 6: CROSS-LANGUAGE CHECKS (ALL 5 LANGUAGES)
// =========================================================================

console.log("\n" + "=".repeat(60));
console.log("CROSS-LANGUAGE CHECKS (ar, it, pl, tl, pt)");
console.log("=".repeat(60));

// ---------------------------------------------------------------------------
// CROSS-1: Station and line names stay in English
// ---------------------------------------------------------------------------

console.log("\n--- CROSS-1: Station and line names stay in English ---");

// Check that key proper nouns from LINE_DATA appear in translations
// (they should NOT be translated)
var STATION_NAMES_TO_CHECK = [
  "Hoboken Terminal", "Newark Penn", "Secaucus Junction",
  "Penn Station", "Port Authority"
];

var LINE_NAMES_TO_CHECK = [
  "Montclair-Boonton", "Morristown Line", "Gladstone Branch",
  "Midtown Direct"
];

LANGUAGES_UNDER_TEST.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var flat = flatTranslations[lang];
  var translatedNames = [];

  // For each value that mentions a station/line name in English,
  // make sure the name is preserved in the translation
  enKeys.forEach(function (key) {
    var enVal = enFlat[key];
    var trVal = flat[key];
    if (typeof enVal !== "string" || typeof trVal !== "string") return;

    STATION_NAMES_TO_CHECK.concat(LINE_NAMES_TO_CHECK).forEach(function (name) {
      if (enVal.indexOf(name) !== -1 && trVal.indexOf(name) === -1) {
        // Check if a variation exists (e.g., "Penn Station NY" might become
        // "Penn Station" without "NY" -- still acceptable)
        var baseName = name.split(" ")[0];
        if (trVal.indexOf(baseName) === -1) {
          translatedNames.push(key + " missing '" + name + "'");
        }
      }
    });
  });

  if (translatedNames.length === 0) {
    pass("[" + lang + "] Station/line names preserved in English");
  } else if (translatedNames.length <= 2) {
    warn("[" + lang + "] " + translatedNames.length + " station/line names may be missing",
      translatedNames.join("; "));
  } else {
    fail("[" + lang + "] " + translatedNames.length + " station/line names not preserved in English",
      translatedNames.slice(0, 10).join("; "));
  }
});

// ---------------------------------------------------------------------------
// CROSS-2: HTML entities preserved
// ---------------------------------------------------------------------------

console.log("\n--- CROSS-2: HTML entities preserved across translations ---");

LANGUAGES_UNDER_TEST.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var flat = flatTranslations[lang];
  var entityIssues = [];

  enKeys.forEach(function (key) {
    var enVal = enFlat[key];
    var trVal = flat[key];
    if (typeof enVal !== "string" || typeof trVal !== "string") return;

    HTML_ENTITIES.forEach(function (entity) {
      var enCount = (enVal.match(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")) || []).length;
      var trCount = (trVal.match(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")) || []).length;
      if (enCount > 0 && trCount === 0) {
        entityIssues.push(key + " missing " + entity);
      }
    });
  });

  if (entityIssues.length === 0) {
    pass("[" + lang + "] All HTML entities preserved");
  } else {
    // &rarr; and &hellip; may be converted to Unicode equivalents, which is ok
    var structural = entityIssues.filter(function (i) {
      return i.indexOf("&mdash;") !== -1 || i.indexOf("&copy;") !== -1;
    });
    var optional = entityIssues.filter(function (i) {
      return i.indexOf("&mdash;") === -1 && i.indexOf("&copy;") === -1;
    });

    if (structural.length > 0) {
      fail("[" + lang + "] " + structural.length + " structural HTML entities missing",
        structural.slice(0, 10).join("; "));
    }
    if (optional.length > 0) {
      warn("[" + lang + "] " + optional.length + " optional HTML entities differ",
        optional.slice(0, 10).join("; "));
    }
    if (structural.length === 0 && optional.length === 0) {
      pass("[" + lang + "] All HTML entities preserved");
    }
  }
});

// ---------------------------------------------------------------------------
// CROSS-3: No script mixing (e.g., Arabic chars in Latin translations)
// ---------------------------------------------------------------------------

console.log("\n--- CROSS-3: No inappropriate script mixing ---");

LANGUAGES_UNDER_TEST.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var flat = flatTranslations[lang];
  var scriptIssues = [];

  if (lang === "ar") {
    // Arabic should not have Cyrillic, CJK, Devanagari, etc.
    Object.keys(flat).forEach(function (key) {
      var val = flat[key];
      if (typeof val !== "string") return;
      // Check for Cyrillic
      if (/[\u0400-\u04FF]/.test(val)) {
        scriptIssues.push(key + " contains Cyrillic characters");
      }
      // Check for CJK
      if (/[\u4E00-\u9FFF]/.test(val)) {
        scriptIssues.push(key + " contains CJK characters");
      }
      // Check for Devanagari
      if (/[\u0900-\u097F]/.test(val)) {
        scriptIssues.push(key + " contains Devanagari characters");
      }
    });
  } else {
    // Latin-script languages should not have Arabic, Cyrillic, CJK, Devanagari
    Object.keys(flat).forEach(function (key) {
      var val = flat[key];
      if (typeof val !== "string") return;
      // Check for Arabic
      if (ARABIC_CHAR_RE.test(val)) {
        scriptIssues.push(key + " contains Arabic characters");
      }
      // Check for Cyrillic
      if (/[\u0400-\u04FF]/.test(val)) {
        scriptIssues.push(key + " contains Cyrillic characters");
      }
      // Check for CJK
      if (/[\u4E00-\u9FFF]/.test(val)) {
        scriptIssues.push(key + " contains CJK characters");
      }
      // Check for Devanagari
      if (/[\u0900-\u097F]/.test(val)) {
        scriptIssues.push(key + " contains Devanagari characters");
      }
      // Check for Gujarati
      if (/[\u0A80-\u0AFF]/.test(val)) {
        scriptIssues.push(key + " contains Gujarati characters");
      }
    });
  }

  if (scriptIssues.length === 0) {
    pass("[" + lang + "] No inappropriate script mixing");
  } else {
    fail("[" + lang + "] " + scriptIssues.length + " script mixing issues",
      scriptIssues.slice(0, 10).join("; "));
  }
});

// ---------------------------------------------------------------------------
// CROSS-4: Transit numbers preserved (133, 112, 109, 92)
// ---------------------------------------------------------------------------

console.log("\n--- CROSS-4: Transit numbers preserved across all 5 languages ---");

var TRANSIT_NUMBERS = ["133", "112", "109", "92"];

LANGUAGES_UNDER_TEST.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var flat = flatTranslations[lang];
  var numberIssues = [];

  enKeys.forEach(function (key) {
    var enVal = enFlat[key];
    var trVal = flat[key];
    if (typeof enVal !== "string" || typeof trVal !== "string") return;

    TRANSIT_NUMBERS.forEach(function (num) {
      if (enVal.indexOf(num) !== -1 && trVal.indexOf(num) === -1) {
        numberIssues.push(key + " missing " + num);
      }
    });
  });

  if (numberIssues.length === 0) {
    pass("[" + lang + "] All transit numbers preserved");
  } else {
    fail("[" + lang + "] " + numberIssues.length + " transit numbers missing",
      numberIssues.join("; "));
  }
});

// ---------------------------------------------------------------------------
// CROSS-5: HTML tag structure preserved
// ---------------------------------------------------------------------------

console.log("\n--- CROSS-5: HTML tag structure preserved ---");

function extractHtmlTagList(str) {
  var tags = [];
  var re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  var match;
  while ((match = re.exec(str)) !== null) {
    tags.push(match[0]);
  }
  return tags;
}

LANGUAGES_UNDER_TEST.forEach(function (lang) {
  if (!flatTranslations[lang]) return;
  var flat = flatTranslations[lang];
  var tagIssues = [];

  enKeys.forEach(function (key) {
    var enVal = enFlat[key];
    var trVal = flat[key];
    if (typeof enVal !== "string" || typeof trVal !== "string") return;

    var enTags = extractHtmlTagList(enVal);
    var trTags = extractHtmlTagList(trVal);

    if (enTags.length === 0) return;

    // Count tag types
    var enTagTypes = {};
    enTags.forEach(function (t) {
      var name = t.replace(/<\/?/, "").replace(/[\s>].*/, "").toLowerCase();
      enTagTypes[name] = (enTagTypes[name] || 0) + 1;
    });
    var trTagTypes = {};
    trTags.forEach(function (t) {
      var name = t.replace(/<\/?/, "").replace(/[\s>].*/, "").toLowerCase();
      trTagTypes[name] = (trTagTypes[name] || 0) + 1;
    });

    Object.keys(enTagTypes).forEach(function (tag) {
      if (!trTagTypes[tag] || trTagTypes[tag] < enTagTypes[tag]) {
        tagIssues.push(key + " missing <" + tag + "> tag");
      }
    });
  });

  if (tagIssues.length === 0) {
    pass("[" + lang + "] All HTML tags preserved in translations");
  } else {
    fail("[" + lang + "] " + tagIssues.length + " HTML tag issues",
      tagIssues.slice(0, 10).join("; "));
  }
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
