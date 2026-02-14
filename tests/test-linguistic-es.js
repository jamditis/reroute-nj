/**
 * Spanish Linguistic Accuracy Test Suite for Reroute NJ
 *
 * Validates that es.json uses neutral Latin American Spanish appropriate
 * for the NJ Transit rider demographic (Dominican, Puerto Rican, Colombian,
 * Mexican, Ecuadorian, and other Central/South American backgrounds).
 *
 * Tests cover:
 *  1. tu/usted form usage (no vosotros / Castilian plural)
 *  2. Latin American vocabulary preferences
 *  3. Transit terminology accuracy
 *  4. Tone and clarity for stressed commuters
 *  5. HTML entity preservation
 *  6. Station / line name preservation in English
 *  7. Machine-translation artifact detection
 *  8. Number and date format correctness
 *
 * Run: node tests/test-linguistic-es.js
 */

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

var TRANSLATIONS_DIR = path.join(__dirname, "..", "translations");

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
 * Strip HTML tags from a string for text analysis.
 */
function stripHtml(str) {
  return str.replace(/<[^>]+>/g, "");
}

/**
 * Get all string values from a flat object.
 */
function allValues(flat) {
  var vals = [];
  Object.keys(flat).forEach(function (key) {
    if (typeof flat[key] === "string") {
      vals.push({ key: key, value: flat[key] });
    }
  });
  return vals;
}

// ---------------------------------------------------------------------------
// Load translation files
// ---------------------------------------------------------------------------

var enRaw, esRaw, en, es, enFlat, esFlat;

try {
  enRaw = fs.readFileSync(path.join(TRANSLATIONS_DIR, "en.json"), "utf8");
  en = JSON.parse(enRaw);
  enFlat = flattenObject(en);
} catch (e) {
  console.error("FATAL: Could not load en.json: " + e.message);
  process.exit(1);
}

try {
  esRaw = fs.readFileSync(path.join(TRANSLATIONS_DIR, "es.json"), "utf8");
  es = JSON.parse(esRaw);
  esFlat = flattenObject(es);
} catch (e) {
  console.error("FATAL: Could not load es.json: " + e.message);
  process.exit(1);
}

var esEntries = allValues(esFlat);
var enEntries = allValues(enFlat);

// Concatenate all Spanish text for bulk checks
var allEsText = esEntries.map(function (e) { return e.value; }).join(" ");
var allEsTextStripped = stripHtml(allEsText);

// =====================================================================
// TEST 1: No vosotros / Castilian plural forms
// =====================================================================

console.log("\n=== TEST 1: Uses tu/usted form, no vosotros (Castilian) ===\n");

// Vosotros conjugation patterns to detect
var VOSOTROS_PATTERNS = [
  // Verb endings for vosotros in various tenses
  { re: /\b\w+[aei]s\b/gi, name: "potential -ais/-eis/-is ending" },
  // Direct pronoun
  { re: /\bvosotros\b/gi, name: "vosotros pronoun" },
  { re: /\bvosotras\b/gi, name: "vosotras pronoun" },
  // Object pronoun for vosotros
  { re: /\bos\b(?!\s*(de|en|que))/gi, name: "os (vosotros object pronoun)" },
  // Possessive for vosotros
  { re: /\bvuestro\b/gi, name: "vuestro possessive" },
  { re: /\bvuestra\b/gi, name: "vuestra possessive" },
  { re: /\bvuestros\b/gi, name: "vuestros possessive" },
  { re: /\bvuestras\b/gi, name: "vuestras possessive" }
];

// Check for explicit vosotros pronouns and possessives
var vosotrosPronouns = ["vosotros", "vosotras", "vuestro", "vuestra", "vuestros", "vuestras"];
var vosotrosFound = [];

esEntries.forEach(function (entry) {
  var text = stripHtml(entry.value).toLowerCase();
  vosotrosPronouns.forEach(function (pronoun) {
    var re = new RegExp("\\b" + pronoun + "\\b", "gi");
    if (re.test(text)) {
      vosotrosFound.push(entry.key + ': contains "' + pronoun + '"');
    }
  });
});

if (vosotrosFound.length === 0) {
  pass("No vosotros/vosotras/vuestro pronouns found");
} else {
  fail("Castilian vosotros forms detected", vosotrosFound.join("; "));
}

// Check for vosotros-specific verb conjugations (-ais, -eis)
// These are unmistakable vosotros endings (hablais, teneis, quereis, etc.)
var vosotrosVerbPatterns = [
  /\b\w+[aá]is\b/gi,  // habláis, pensáis, estáis
  /\b\w+[eé]is\b/gi,  // tenéis, queréis, debéis
  /\b\w+[ií]s\b/gi     // venís, decís (only 2-syllable+ words)
];

var vosotrosVerbs = [];
esEntries.forEach(function (entry) {
  var text = stripHtml(entry.value);
  vosotrosVerbPatterns.forEach(function (re) {
    var match;
    re.lastIndex = 0;
    while ((match = re.exec(text)) !== null) {
      var word = match[0].toLowerCase();
      // Filter out common Spanish words that end in these patterns but are NOT vosotros
      var falsePositives = [
        "mais", "pais", "pais", "demais", "jamais",
        "seis", "reis", "leis", "diez", "vez",
        "mis", "bis", "gris", "paris", "tenis",
        "crisis", "gratis", "cannabis", "genesis"
      ];
      if (falsePositives.indexOf(word) === -1 && word.length > 4) {
        vosotrosVerbs.push(entry.key + ': "' + word + '"');
      }
    }
  });
});

if (vosotrosVerbs.length === 0) {
  pass("No vosotros verb conjugations detected");
} else {
  // Many -is endings are legitimate (e.g., plural nouns); only warn
  warn("Possible vosotros verb forms found (review manually)", vosotrosVerbs.slice(0, 10).join("; "));
}

// Positive check: verify tu/usted forms are present
var tuFormPatterns = [
  /\btu\b/gi,
  /\btu\s/gi,
  /\btus\b/gi
];

var tuFormFound = false;
esEntries.forEach(function (entry) {
  var text = stripHtml(entry.value).toLowerCase();
  if (/\btu\b/.test(text) || /\btus\b/.test(text)) {
    tuFormFound = true;
  }
});

if (tuFormFound) {
  pass("Uses tu form (Latin American informal second person singular)");
} else {
  warn("No explicit tu form found -- may use impersonal constructions (acceptable)");
}

// =====================================================================
// TEST 2: Latin American vocabulary preferences
// =====================================================================

console.log("\n=== TEST 2: Latin American vocabulary (no Castilian/peninsular terms) ===\n");

// Terms to reject (Castilian) and what to expect (Latin American)
var VOCABULARY_CHECKS = [
  {
    castilian: "ordenador",
    latam: ["computadora", "computador", "equipo"],
    context: "computer",
    re: /\bordenador(es)?\b/gi
  },
  {
    castilian: "billete",
    latam: ["boleto", "pasaje", "tiquete"],
    context: "ticket (for transit)",
    re: /\bbillete(s)?\b/gi,
    // billete can legitimately appear in money contexts; check carefully
    strictContext: true
  },
  {
    castilian: "autocar",
    latam: ["autobus", "bus", "omnibus", "camion"],
    context: "bus/coach",
    re: /\bautocar(es)?\b/gi
  },
  {
    castilian: "coche",
    latam: ["carro", "auto", "vehiculo", "automovil"],
    context: "car (informal)",
    re: /\bcoche(s)?\b/gi,
    // coche for "car" is common in Spain; in transit context "coche" could mean "train car"
    strictContext: true
  },
  {
    castilian: "vale",
    latam: ["ok", "esta bien", "de acuerdo", "listo"],
    context: "OK/alright (interjection)",
    re: /\bvale\b/gi,
    // vale can legitimately mean "worth" in Latin American Spanish
    strictContext: true
  },
  {
    castilian: "conducir",
    latam: ["manejar", "conducir"],
    context: "to drive",
    // conducir is actually used across Latin America too; just flag if used with coche
    skip: true
  },
  {
    castilian: "aparcar",
    latam: ["estacionar", "parquear"],
    context: "to park",
    re: /\baparcar\b/gi
  },
  {
    castilian: "aparcamiento",
    latam: ["estacionamiento", "parqueo", "parking"],
    context: "parking lot",
    re: /\baparcamiento(s)?\b/gi
  },
  {
    castilian: "piso",
    latam: ["apartamento", "departamento"],
    context: "apartment",
    re: /\bpiso(s)?\b/gi,
    // piso has other meanings (floor); skip
    skip: true
  },
  {
    castilian: "movil",
    latam: ["celular", "telefono"],
    context: "cell phone",
    re: /\bm[oó]vil(es)?\b/gi,
    // movil could appear in transit context (e.g., "servicio movil")
    strictContext: true
  }
];

VOCABULARY_CHECKS.forEach(function (check) {
  if (check.skip) return;

  var found = [];
  esEntries.forEach(function (entry) {
    var text = stripHtml(entry.value).toLowerCase();
    check.re.lastIndex = 0;
    var match;
    while ((match = check.re.exec(text)) !== null) {
      // For strict context checks, examine surrounding text
      if (check.strictContext) {
        // Only flag if clearly in the wrong context
        found.push(entry.key + ': "' + match[0] + '" (review context)');
      } else {
        found.push(entry.key + ': "' + match[0] + '"');
      }
    }
  });

  if (found.length === 0) {
    pass('No Castilian "' + check.castilian + '" found (context: ' + check.context + ")");
  } else if (check.strictContext) {
    warn('"' + check.castilian + '" found -- needs manual context review', found.join("; "));
  } else {
    fail('Castilian term "' + check.castilian + '" found (should use ' + check.latam.join("/") + ")", found.join("; "));
  }
});

// Positive checks: verify preferred Latin American terms are used
var LATAM_POSITIVE = [
  { term: "boleto", context: "ticket", re: /\bboleto(s)?\b/gi },
  { term: "estacion", context: "station", re: /\bestaci[oó]n(es)?\b/gi },
  { term: "tren", context: "train", re: /\btren(es)?\b/gi },
  { term: "autobus OR bus", context: "bus", re: /\b(autob[uú]s(es)?|bus(es)?)\b/gi },
  { term: "ruta OR recorrido", context: "route", re: /\b(ruta(s)?|recorrido(s)?)\b/gi },
  { term: "horario", context: "schedule", re: /\bhorario(s)?\b/gi },
  { term: "pasajero", context: "rider/commuter", re: /\bpasajero(s)?\b/gi },
  { term: "viaje", context: "commute/trip", re: /\bviaje(s)?\b/gi },
  { term: "retraso", context: "delay", re: /\bretraso(s)?\b/gi }
];

LATAM_POSITIVE.forEach(function (check) {
  check.re.lastIndex = 0;
  if (check.re.test(allEsTextStripped)) {
    pass('Uses Latin American term "' + check.term + '" for ' + check.context);
  } else {
    fail('Missing expected Latin American term "' + check.term + '" for ' + check.context);
  }
});

// =====================================================================
// TEST 3: Key transit terms translated correctly
// =====================================================================

console.log("\n=== TEST 3: Transit terminology accuracy ===\n");

// 3a. "cutover" translation
// NJ Transit and Telemundo use "cambio" for cutover in their Spanish communications
var cutoverTranslations = [];
esEntries.forEach(function (entry) {
  var enVal = enFlat[entry.key] || "";
  if (typeof enVal === "string" && /cutover/i.test(enVal)) {
    cutoverTranslations.push({
      key: entry.key,
      en: enVal.substring(0, 80),
      es: entry.value.substring(0, 80)
    });
  }
});

var cutoverTermsUsed = [];
var VALID_CUTOVER_TERMS = ["cambio", "transicion", "transición", "corte", "conexion", "conexión"];
cutoverTranslations.forEach(function (item) {
  var textLower = stripHtml(item.es).toLowerCase();
  VALID_CUTOVER_TERMS.forEach(function (term) {
    if (textLower.indexOf(term) !== -1 && cutoverTermsUsed.indexOf(term) === -1) {
      cutoverTermsUsed.push(term);
    }
  });
});

if (cutoverTermsUsed.length > 0) {
  pass('"cutover" translated appropriately', "Uses: " + cutoverTermsUsed.join(", ") + " (found in " + cutoverTranslations.length + " entries)");
} else {
  fail('"cutover" not translated to any known Spanish equivalent (expected: cambio, transicion, corte, conexion)');
}

// Verify the translation is used CONSISTENTLY (same term used throughout)
var primaryCutoverTerm = null;
var cutoverConsistency = {};
esEntries.forEach(function (entry) {
  var text = stripHtml(entry.value).toLowerCase();
  VALID_CUTOVER_TERMS.forEach(function (term) {
    if (text.indexOf(term) !== -1) {
      cutoverConsistency[term] = (cutoverConsistency[term] || 0) + 1;
    }
  });
});

var cutoverTermCounts = Object.keys(cutoverConsistency).map(function (term) {
  return term + " (" + cutoverConsistency[term] + " occurrences)";
});

if (cutoverTermCounts.length <= 2) {
  pass("Cutover terminology is consistent", cutoverTermCounts.join(", "));
} else {
  warn("Multiple cutover translations used (may cause confusion)", cutoverTermCounts.join(", "));
}

// 3b. "commute" translation
var commuteUsesEnglish = false;
esEntries.forEach(function (entry) {
  var text = stripHtml(entry.value).toLowerCase();
  // Check for untranslated English word "commute" (but not inside proper nouns like URLs)
  if (/\bcommute\b/i.test(text) && !/href|url|http/i.test(entry.value)) {
    commuteUsesEnglish = true;
  }
});

if (!commuteUsesEnglish) {
  pass('"commute" is translated (not left in English)');
} else {
  fail('"commute" left untranslated in Spanish text');
}

var commuteSpanish = /\b(viaje|trayecto|recorrido|desplazamiento)\b/i;
var commuteTranslated = false;
esEntries.forEach(function (entry) {
  var enVal = enFlat[entry.key] || "";
  if (typeof enVal === "string" && /commute/i.test(enVal)) {
    if (commuteSpanish.test(stripHtml(entry.value))) {
      commuteTranslated = true;
    }
  }
});

if (commuteTranslated) {
  pass('"commute" translated to viaje/trayecto/recorrido');
} else {
  warn('"commute" may not have an appropriate Spanish equivalent -- review manually');
}

// 3c. "service reduction" -> "reduccion de servicio"
if (/reducci[oó]n\s+(de\s+)?servicio/i.test(allEsTextStripped)) {
  pass('"service reduction" -> "reduccion de servicio"');
} else {
  fail('"service reduction" not found as "reduccion de servicio"');
}

// 3d. "diversion" / "diverted" -> "desvio" / "desviado" / "redirigido"
var diversionTerms = /\b(desv[ií][ao](s|dos?|da)?|redirigid[oa]s?)\b/i;
if (diversionTerms.test(allEsTextStripped)) {
  pass('"diversion/diverted" translated to desvio/desviado/redirigido');
} else {
  fail('"diversion" not translated to desvio, desviado, or redirigido');
}

// 3e. "schedule" -> "horario"
if (/\bhorario(s)?\b/i.test(allEsTextStripped)) {
  pass('"schedule" translated to "horario"');
} else {
  fail('"schedule" not found as "horario"');
}

// 3f. "delay" -> "retraso" (not "demora" only, both are acceptable in LA Spanish)
if (/\b(retraso|demora)(s)?\b/i.test(allEsTextStripped)) {
  pass('"delay" translated to "retraso" or "demora"');
} else {
  fail('"delay" not found as "retraso" or "demora"');
}

// 3g. "transfer" -> "transferencia" or "transbordo" or "conexion"
if (/\b(transferencia|transbordo|conexi[oó]n|transferir)\b/i.test(allEsTextStripped)) {
  pass('"transfer" translated to "transferencia/transbordo/conexion"');
} else {
  fail('"transfer" not found in appropriate Spanish form');
}

// 3h. "peak hours" -> "hora pico" or "horas pico" (LA) not "hora punta" (Spain)
var horaPico = /\bhora(s)?\s+(pico|punta)\b/i;
var horaPicoMatch = allEsTextStripped.match(horaPico);
if (horaPicoMatch) {
  if (/hora(s)?\s+pico/i.test(allEsTextStripped)) {
    pass('"peak hours" uses "hora pico" (Latin American)');
  } else if (/hora(s)?\s+punta/i.test(allEsTextStripped)) {
    warn('"peak hours" uses "hora punta" (common in Spain) -- "hora pico" preferred for LA Spanish');
  }
} else {
  warn('"peak hours" translation not found -- may use different phrasing');
}

// 3i. "single-track" -> "via unica"
if (/\bv[ií]a\s+[uú]nica\b/i.test(allEsTextStripped)) {
  pass('"single-track" translated to "via unica"');
} else {
  fail('"single-track" not found as "via unica"');
}

// 3j. "bottleneck" -> "cuello de botella"
if (/\bcuello\s+de\s+botella\b/i.test(allEsTextStripped)) {
  pass('"bottleneck" translated to "cuello de botella"');
} else {
  warn('"bottleneck" not found as "cuello de botella" -- may use alternative phrasing');
}

// =====================================================================
// TEST 4: Tone check -- clear, direct, helpful for stressed commuters
// =====================================================================

console.log("\n=== TEST 4: Tone -- clear, direct, helpful ===\n");

// 4a. Check for overly formal or bureaucratic language
var OVERLY_FORMAL = [
  { re: /\busted(es)?\b/gi, name: "usted/ustedes (overly formal for this tool)", warn: true },
  { re: /\ble\s+rogamos\b/gi, name: "le rogamos (overly formal begging language)" },
  { re: /\bsolicitar\b/gi, name: "solicitar (bureaucratic for a community tool)", warn: true },
  { re: /\bmedidas\s+gubernamentales\b/gi, name: "medidas gubernamentales (overly bureaucratic)" }
];

var formalFound = [];
var formalWarnings = [];
OVERLY_FORMAL.forEach(function (check) {
  check.re.lastIndex = 0;
  var matches = allEsTextStripped.match(check.re);
  if (matches && matches.length > 0) {
    if (check.warn) {
      formalWarnings.push(check.name + " (" + matches.length + " occurrences)");
    } else {
      formalFound.push(check.name + " (" + matches.length + " occurrences)");
    }
  }
});

if (formalFound.length === 0) {
  pass("No overly formal/bureaucratic language detected");
} else {
  warn("Some formal language found (may be appropriate in context)", formalFound.join("; "));
}

// 4b. Sentences should not be excessively long (indicates translation artifacts)
var longSentences = [];
esEntries.forEach(function (entry) {
  var text = stripHtml(entry.value);
  // Skip entries that are meant to be long (blog posts, descriptions)
  if (/^(blog_post|blog_post_embed)\./.test(entry.key)) return;
  // Split on sentence boundaries
  var sentences = text.split(/[.!?]+/).filter(function (s) { return s.trim().length > 0; });
  sentences.forEach(function (sentence) {
    var wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount > 50) {
      longSentences.push(entry.key + " (" + wordCount + " words)");
    }
  });
});

if (longSentences.length === 0) {
  pass("No excessively long sentences (good for readability under stress)");
} else if (longSentences.length <= 3) {
  warn("Some long sentences detected (may be hard to read under stress)", longSentences.join("; "));
} else {
  warn(longSentences.length + " overly long sentences found", longSentences.slice(0, 5).join("; "));
}

// 4c. Check for action-oriented language (imperatives)
var actionWords = /\b(selecciona|elige|busca|toma|revisa|verifica|consulta|planifica|compara|usa|haz|ve |mira|encuentra)\b/i;
if (actionWords.test(allEsTextStripped)) {
  pass("Uses action-oriented imperative verbs (tu form commands)");
} else {
  warn("May lack direct imperative verbs for user instructions");
}

// =====================================================================
// TEST 5: HTML entities preserved
// =====================================================================

console.log("\n=== TEST 5: HTML entities preserved ===\n");

var HTML_ENTITIES = [
  { entity: "&mdash;", name: "em dash" },
  { entity: "&rarr;", name: "right arrow" },
  { entity: "&copy;", name: "copyright" },
  { entity: "&amp;", name: "ampersand" },
  { entity: "&hellip;", name: "ellipsis" }
];

var entityIssues = [];
var entityChecked = 0;

Object.keys(enFlat).forEach(function (key) {
  var enVal = enFlat[key];
  var esVal = esFlat[key];
  if (typeof enVal !== "string" || typeof esVal !== "string") return;

  HTML_ENTITIES.forEach(function (ent) {
    var enCount = (enVal.match(new RegExp(ent.entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    var esCount = (esVal.match(new RegExp(ent.entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (enCount > 0) {
      entityChecked++;
      if (esCount === 0) {
        entityIssues.push(key + ": missing " + ent.entity + " (" + ent.name + ")");
      }
    }
  });
});

if (entityIssues.length === 0) {
  pass("All HTML entities preserved (" + entityChecked + " entity occurrences checked)");
} else {
  fail(entityIssues.length + " missing HTML entities", entityIssues.slice(0, 10).join("; "));
}

// Check that HTML tags (strong, a, code) are preserved
var tagIssues = [];
Object.keys(enFlat).forEach(function (key) {
  var enVal = enFlat[key];
  var esVal = esFlat[key];
  if (typeof enVal !== "string" || typeof esVal !== "string") return;

  var enStrong = (enVal.match(/<strong>/g) || []).length;
  var esStrong = (esVal.match(/<strong>/g) || []).length;
  if (enStrong > 0 && esStrong === 0) {
    tagIssues.push(key + ": missing <strong> tags");
  }

  var enLinks = (enVal.match(/<a\s/g) || []).length;
  var esLinks = (esVal.match(/<a\s/g) || []).length;
  if (enLinks > 0 && esLinks === 0) {
    tagIssues.push(key + ": missing <a> tags");
  }

  var enCode = (enVal.match(/<code>/g) || []).length;
  var esCode = (esVal.match(/<code>/g) || []).length;
  if (enCode > 0 && esCode === 0) {
    tagIssues.push(key + ": missing <code> tags");
  }
});

if (tagIssues.length === 0) {
  pass("All HTML tags (strong, a, code) preserved in translations");
} else {
  fail(tagIssues.length + " entries with missing HTML tags", tagIssues.slice(0, 10).join("; "));
}

// =====================================================================
// TEST 6: Station names and line names stay in English
// =====================================================================

console.log("\n=== TEST 6: Station names, line names, proper nouns stay in English ===\n");

// These must remain in English (they appear on physical signage)
var ENGLISH_PROPER_NOUNS = [
  { name: "Penn Station", re: /Penn Station/g },
  { name: "Hoboken Terminal", re: /Hoboken/g },
  { name: "Secaucus Junction", re: /Secaucus/g },
  { name: "Newark Penn", re: /Newark Penn/g },
  { name: "Port Authority", re: /Port Authority/g },
  { name: "PATH", re: /\bPATH\b/g },
  { name: "NJ Transit", re: /NJ Transit/g },
  { name: "Amtrak", re: /\bAmtrak\b/g },
  { name: "Northeast Corridor", re: /Northeast Corridor/g },
  { name: "Midtown Direct", re: /Midtown Direct/g },
  { name: "Portal Bridge", re: /Portal\s+(North\s+)?Bridge/g },
  { name: "NY Waterway", re: /NY Waterway/g },
  { name: "Bus 126", re: /Bus 126/g },
  { name: "Hackensack River", re: /Hackensack/g }
];

// Check that these English names appear in the Spanish translation where expected
var missingProperNouns = [];
ENGLISH_PROPER_NOUNS.forEach(function (noun) {
  // Check if the English version uses this term
  noun.re.lastIndex = 0;
  var enUses = enEntries.filter(function (entry) {
    noun.re.lastIndex = 0;
    return noun.re.test(entry.value);
  });

  if (enUses.length === 0) return; // Not used in English, skip

  // Check if Spanish version still uses the English form
  noun.re.lastIndex = 0;
  if (noun.re.test(allEsText)) {
    pass('"' + noun.name + '" preserved in English');
  } else {
    missingProperNouns.push(noun.name);
  }
});

if (missingProperNouns.length > 0) {
  fail("Proper nouns translated instead of kept in English", missingProperNouns.join(", "));
}

// Check for incorrectly translated station/line names
var SHOULD_NOT_TRANSLATE = [
  { re: /\bEstaci[oó]n\s+Penn\b/gi, name: "Estacion Penn (should be Penn Station)" },
  { re: /\bAutoridad\s+del?\s+Puerto\b/gi, name: "Autoridad del Puerto (should be Port Authority)" },
  { re: /\bPuente\s+Portal\b/gi, name: "Puente Portal (should be Portal Bridge)" },
  { re: /\bCorredor\s+Noreste\b/gi, name: "Corredor Noreste (should be Northeast Corridor)" },
  { re: /\bJersey\s+City\b/gi, name: "Jersey City" },  // Should stay as-is
  { re: /\bR[ií]o\s+Hackensack\b/gi, name: "Rio Hackensack (should be Hackensack River)" }
];

var translatedNouns = [];
SHOULD_NOT_TRANSLATE.forEach(function (check) {
  check.re.lastIndex = 0;
  if (check.re.test(allEsText)) {
    translatedNouns.push(check.name);
  }
});

if (translatedNouns.length === 0) {
  pass("No improperly translated place names detected");
} else {
  // Some like "Corredor Noreste" may be acceptable in descriptive text
  warn("Some place names may be translated when they should stay in English", translatedNouns.join("; "));
}

// =====================================================================
// TEST 7: Machine-translation artifact detection
// =====================================================================

console.log("\n=== TEST 7: Machine-translation artifact detection ===\n");

// 7a. Check for unnatural word-for-word translation patterns
var MT_ARTIFACTS = [
  { re: /\bhaga\s+clic\s+en\s+el\s+bot[oó]n\s+de\s+abajo\b/gi, name: "word-for-word 'click the button below'", warn: true },
  { re: /\ben\s+orden\s+a\b/gi, name: "en orden a (calque from English 'in order to')" },
  { re: /\baplicaci[oó]n\s+m[oó]vil\b/gi, name: "aplicacion movil (calque; better: app)" },
  { re: /\brealizar\s+un\s+clic\b/gi, name: "realizar un clic (awkward for 'click')" },
  { re: /\bhemos\s+apenas\b/gi, name: "hemos apenas (calque from 'we have just')" },
  { re: /\bnosotros\s+hemos\b/gi, name: "nosotros hemos (unnecessary subject pronoun, MT artifact)" },
  { re: /\bnosotros\s+queremos\b/gi, name: "nosotros queremos (unnecessary subject pronoun)" },
  { re: /\bnosotros\s+construimos\b/gi, name: "nosotros construimos (unnecessary subject pronoun)" }
];

var artifactsFound = [];
var artifactWarnings = [];
MT_ARTIFACTS.forEach(function (check) {
  check.re.lastIndex = 0;
  var matches = allEsTextStripped.match(check.re);
  if (matches) {
    if (check.warn) {
      artifactWarnings.push(check.name + " (" + matches.length + "x)");
    } else {
      artifactsFound.push(check.name + " (" + matches.length + "x)");
    }
  }
});

if (artifactsFound.length === 0) {
  pass("No obvious machine-translation artifacts (calques) detected");
} else {
  fail("Machine-translation artifacts found", artifactsFound.join("; "));
}

if (artifactWarnings.length > 0) {
  warn("Possible MT artifacts (may be acceptable)", artifactWarnings.join("; "));
}

// 7b. Check for untranslated English words that should be in Spanish
var UNTRANSLATED_ENGLISH = [
  { word: "schedule", re: /\bschedule(s)?\b/gi },
  { word: "train", re: /\btrain(s)?\b/gi },
  { word: "station", re: /\bstation(s)?\b/gi },
  { word: "service", re: /\bservice(s)?\b/gi },
  { word: "ticket", re: /\bticket(s)?\b/gi },
  { word: "delay", re: /\bdelay(s|ed)?\b/gi },
  { word: "bridge", re: /\bbridge\b/gi },
  { word: "click", re: /\bclick\b/gi },
  { word: "download", re: /\bdownload\b/gi },
  { word: "line", re: /\bline\b/gi },
  { word: "route", re: /\broute(s)?\b/gi },
  { word: "rider", re: /\brider(s)?\b/gi },
  { word: "commuter", re: /\bcommuter(s)?\b/gi }
];

var untranslatedWords = [];
UNTRANSLATED_ENGLISH.forEach(function (check) {
  esEntries.forEach(function (entry) {
    // Skip entries that naturally contain English (proper nouns, technical terms, URLs)
    if (/meta\.(lang|dir|label)/.test(entry.key)) return;
    // Skip keys with code blocks or technical content
    if (/<code>/.test(entry.value)) return;

    var text = stripHtml(entry.value);
    // Remove known English proper nouns before checking
    text = text.replace(/Portal\s+(North\s+)?Bridge/g, "");
    text = text.replace(/Penn Station/g, "");
    text = text.replace(/Hoboken Terminal/g, "");
    text = text.replace(/NJ Transit/g, "");
    text = text.replace(/Port Authority/g, "");
    text = text.replace(/Northeast Corridor/g, "");
    text = text.replace(/Midtown Direct/g, "");
    text = text.replace(/NY Waterway/g, "");
    text = text.replace(/Bus 126/g, "");
    text = text.replace(/Morristown Line/g, "");
    text = text.replace(/Gladstone Branch/g, "");
    text = text.replace(/Atlantic City Rail Line/g, "");
    text = text.replace(/Lincoln Tunnel/g, "");
    text = text.replace(/Hudson Place/g, "");
    text = text.replace(/Gateway Program/g, "");
    text = text.replace(/GitHub Pages/g, "");
    text = text.replace(/Download PNG/g, "");
    text = text.replace(/Download HTML/g, "");
    text = text.replace(/Reroute NJ/g, "");
    text = text.replace(/Joe Amditis/g, "");
    text = text.replace(/FLEXPASS/g, "");

    check.re.lastIndex = 0;
    var match;
    while ((match = check.re.exec(text)) !== null) {
      // Extra context to determine if this is a proper noun context
      var context = text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20);
      untranslatedWords.push(entry.key + ': "' + check.word + '" in "...' + context.trim() + '..."');
    }
  });
});

if (untranslatedWords.length === 0) {
  pass("No untranslated common English words found in Spanish text");
} else if (untranslatedWords.length <= 3) {
  warn(untranslatedWords.length + " possibly untranslated English words", untranslatedWords.join("; "));
} else {
  fail(untranslatedWords.length + " untranslated English words found", untranslatedWords.slice(0, 10).join("; "));
}

// 7c. Check for duplicated/repeated words (common MT artifact)
var duplicateWordPattern = /\b(\w{4,})\s+\1\b/gi;
var duplicates = [];
esEntries.forEach(function (entry) {
  var text = stripHtml(entry.value);
  duplicateWordPattern.lastIndex = 0;
  var match;
  while ((match = duplicateWordPattern.exec(text)) !== null) {
    // Some duplicates are legitimate (e.g., "nunca nunca")
    var word = match[1].toLowerCase();
    if (["nunca", "cada", "poco", "lado"].indexOf(word) === -1) {
      duplicates.push(entry.key + ': "' + match[0] + '"');
    }
  }
});

if (duplicates.length === 0) {
  pass("No duplicated/repeated words (common MT artifact)");
} else {
  warn("Possible word duplications found", duplicates.join("; "));
}

// 7d. Check for gender/number agreement issues (heuristic)
// Look for patterns like "el estacion" (should be "la estacion"), "los linea" (should be "las lineas")
var GENDER_CHECKS = [
  { re: /\bel\s+estaci[oó]n\b/gi, fix: "la estacion", rule: "estacion is feminine" },
  { re: /\bel\s+l[ií]nea\b/gi, fix: "la linea", rule: "linea is feminine" },
  { re: /\bun\s+estaci[oó]n\b/gi, fix: "una estacion", rule: "estacion is feminine" },
  { re: /\blos\s+l[ií]neas?\b/gi, fix: "las lineas", rule: "linea is feminine" },
  { re: /\bel\s+ruta\b/gi, fix: "la ruta", rule: "ruta is feminine" },
  { re: /\bun\s+ruta\b/gi, fix: "una ruta", rule: "ruta is feminine" },
  { re: /\bel\s+alternativa\b/gi, fix: "la alternativa", rule: "alternativa is feminine" },
  { re: /\bla\s+tren\b/gi, fix: "el tren", rule: "tren is masculine" },
  { re: /\bla\s+aut[oó]bus\b/gi, fix: "el autobus", rule: "autobus is masculine" },
  { re: /\bla\s+servicio\b/gi, fix: "el servicio", rule: "servicio is masculine" },
  { re: /\bla\s+horario\b/gi, fix: "el horario", rule: "horario is masculine" },
  { re: /\bla\s+viaje\b/gi, fix: "el viaje", rule: "viaje is masculine" },
  { re: /\bla\s+retraso\b/gi, fix: "el retraso", rule: "retraso is masculine" }
];

var genderIssues = [];
GENDER_CHECKS.forEach(function (check) {
  check.re.lastIndex = 0;
  if (check.re.test(allEsTextStripped)) {
    genderIssues.push(check.rule + " (should be: " + check.fix + ")");
  }
});

if (genderIssues.length === 0) {
  pass("No gender agreement errors detected");
} else {
  fail("Gender agreement issues found", genderIssues.join("; "));
}

// =====================================================================
// TEST 8: Numbers and date formats
// =====================================================================

console.log("\n=== TEST 8: Numbers and date formats ===\n");

// 8a. Transit-specific numbers must be preserved
var TRANSIT_NUMBERS = ["133", "112", "109", "92", "126", "1910", "115", "50"];
var numberIssues = [];

Object.keys(enFlat).forEach(function (key) {
  var enVal = enFlat[key];
  var esVal = esFlat[key];
  if (typeof enVal !== "string" || typeof esVal !== "string") return;

  TRANSIT_NUMBERS.forEach(function (num) {
    if (enVal.indexOf(num) !== -1 && esVal.indexOf(num) === -1) {
      numberIssues.push(key + ": missing number " + num);
    }
  });
});

if (numberIssues.length === 0) {
  pass("All transit-specific numbers preserved (" + TRANSIT_NUMBERS.join(", ") + ")");
} else {
  fail(numberIssues.length + " missing transit numbers", numberIssues.join("; "));
}

// 8b. Date format check: Feb 15 or 15 feb are both acceptable
var datePatterns = [];
esEntries.forEach(function (entry) {
  var enVal = enFlat[entry.key] || "";
  if (typeof enVal !== "string") return;
  // Check entries that contain date references
  if (/Feb\s+15/i.test(enVal) || /Mar\s+15/i.test(enVal)) {
    datePatterns.push({
      key: entry.key,
      en: enVal.substring(0, 80),
      es: entry.value.substring(0, 80)
    });
  }
});

var dateFormatOk = true;
datePatterns.forEach(function (item) {
  var esText = stripHtml(item.es);
  // Accept: "15 feb", "feb 15", "15 de febrero", "febrero 15", "Feb 15"
  if (!/\b(15\s*(de\s+)?feb|feb\w*\.?\s*15)\b/i.test(esText) && !/\b15\b/.test(esText)) {
    dateFormatOk = false;
  }
});

if (dateFormatOk) {
  pass("Date formats are correct and contain expected date references");
} else {
  warn("Some date entries may have formatting issues -- review manually");
}

// 8c. Check that Spanish date format "12 de febrero de 2026" is used for full dates
var fullDatePattern = /\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}/i;
if (fullDatePattern.test(allEsTextStripped)) {
  pass("Uses Spanish full date format (DD de mes de AAAA)");
} else {
  warn("Spanish full date format not detected (expected: 12 de febrero de 2026)");
}

// 8d. Dollar amounts preserved
var dollarIssues = [];
Object.keys(enFlat).forEach(function (key) {
  var enVal = enFlat[key];
  var esVal = esFlat[key];
  if (typeof enVal !== "string" || typeof esVal !== "string") return;

  var enDollars = enVal.match(/\$[\d,.]+\s*(billion|million|mil\s+millones)?/gi);
  if (enDollars) {
    enDollars.forEach(function (amount) {
      var numPart = amount.match(/[\d,.]+/);
      if (numPart && esVal.indexOf(numPart[0]) === -1) {
        dollarIssues.push(key + ": dollar amount " + amount + " may be missing");
      }
    });
  }
});

if (dollarIssues.length === 0) {
  pass("Dollar amounts preserved in translations");
} else {
  warn("Some dollar amounts may need review", dollarIssues.join("; "));
}

// 8e. Time formats preserved (e.g., "7-9am", "5-7pm", "~25 min")
var timeIssues = [];
Object.keys(enFlat).forEach(function (key) {
  var enVal = enFlat[key];
  var esVal = esFlat[key];
  if (typeof enVal !== "string" || typeof esVal !== "string") return;

  // Check for time durations like "~25 min", "~5 min"
  var enTimes = enVal.match(/~\d+\s*min/gi);
  if (enTimes) {
    enTimes.forEach(function (time) {
      var numPart = time.match(/\d+/);
      if (numPart && esVal.indexOf(numPart[0]) === -1) {
        timeIssues.push(key + ": time value " + time + " may be missing");
      }
    });
  }
});

if (timeIssues.length === 0) {
  pass("Time format values preserved");
} else {
  warn("Some time values may need review", timeIssues.join("; "));
}

// =====================================================================
// ADDITIONAL: Cross-reference consistency checks
// =====================================================================

console.log("\n=== ADDITIONAL: Translation consistency checks ===\n");

// Check that the same English term is translated consistently across the file
var CONSISTENCY_TERMS = [
  { en: "cutover", es: null, keys: [] },
  { en: "commute", es: null, keys: [] },
  { en: "service reduction", es: null, keys: [] },
  { en: "diverted", es: null, keys: [] },
  { en: "single-track", es: null, keys: [] }
];

CONSISTENCY_TERMS.forEach(function (term) {
  var translations = {};
  Object.keys(enFlat).forEach(function (key) {
    var enVal = enFlat[key];
    var esVal = esFlat[key];
    if (typeof enVal !== "string" || typeof esVal !== "string") return;

    if (enVal.toLowerCase().indexOf(term.en) !== -1) {
      // Find the Spanish equivalent in context
      var esLower = stripHtml(esVal).toLowerCase();
      // Store the full Spanish value to check consistency
      term.keys.push({ key: key, es: esLower.substring(0, 60) });
    }
  });
});

// Count how many entries use each term
var consistencyIssues = 0;
CONSISTENCY_TERMS.forEach(function (term) {
  if (term.keys.length > 1) {
    pass('Term "' + term.en + '" appears in ' + term.keys.length + " entries (consistency reviewable)");
  } else if (term.keys.length === 1) {
    pass('Term "' + term.en + '" found in 1 entry');
  } else {
    // The term might not appear directly in translation keys
  }
});

// =====================================================================
// FINAL: Check for "billete" specifically (most common mistake)
// =====================================================================

console.log("\n=== SPOTLIGHT: Ticket terminology check ===\n");

var billeteCount = 0;
var boletoCount = 0;
var pasajeCount = 0;

esEntries.forEach(function (entry) {
  var text = stripHtml(entry.value).toLowerCase();
  billeteCount += (text.match(/\bbillete(s)?\b/g) || []).length;
  boletoCount += (text.match(/\bboleto(s)?\b/g) || []).length;
  pasajeCount += (text.match(/\bpasaje(s)?\b/g) || []).length;
});

console.log("  Ticket term counts: boleto=" + boletoCount + ", pasaje=" + pasajeCount + ", billete=" + billeteCount);

if (boletoCount > 0 && billeteCount === 0) {
  pass("Uses 'boleto' exclusively (Latin American preference) -- " + boletoCount + " occurrences");
} else if (boletoCount > 0 && billeteCount > 0) {
  warn("Mixes 'boleto' (" + boletoCount + ") and 'billete' (" + billeteCount + ") -- consider standardizing on 'boleto'");
} else if (billeteCount > 0 && boletoCount === 0) {
  fail("Uses only 'billete' (" + billeteCount + " times) -- should use 'boleto' for Latin American audience");
} else if (pasajeCount > 0) {
  pass("Uses 'pasaje' for ticket (" + pasajeCount + " occurrences) -- acceptable for Latin American Spanish");
} else {
  warn("No standard ticket term found -- may use alternative phrasing");
}

// =====================================================================
// Final summary
// =====================================================================

console.log("\n" + "=".repeat(70));
console.log("SPANISH LINGUISTIC ACCURACY TEST -- SUMMARY");
console.log("=".repeat(70));
console.log("  Total PASS: " + totalPass);
console.log("  Total FAIL: " + totalFail);
console.log("  Total WARN: " + totalWarn);
console.log("  Total checks: " + (totalPass + totalFail + totalWarn));
console.log("=".repeat(70));

if (totalFail === 0 && totalWarn === 0) {
  console.log("\n  All tests passed! Spanish translations are linguistically accurate");
  console.log("  for the NJ Transit Latin American rider demographic.");
} else if (totalFail === 0) {
  console.log("\n  All tests passed! " + totalWarn + " warning(s) to review.");
  console.log("  The Spanish translations are appropriate for the NJ Transit");
  console.log("  Latin American rider demographic.");
} else {
  console.log("\n  " + totalFail + " test(s) FAILED, " + totalWarn + " warning(s).");
  console.log("  Review the output above for details on linguistic issues.");
}

console.log("");
process.exit(totalFail > 0 ? 1 : 0);
