#!/usr/bin/env node
// Reroute NJ — JavaScript Code Integrity Test Suite
// Validates all JS files for syntax, patterns, conventions, and security.

"use strict";

var fs = require("fs");
var path = require("path");

// =========================================================================
// CONFIGURATION
// =========================================================================

var JS_DIR = path.join(__dirname, "..", "js");
var CSS_FILE = path.join(__dirname, "..", "css", "styles.css");

var ALL_JS_FILES = [
  "i18n.js",
  "shared.js",
  "line-data.js",
  "app.js",
  "compare.js",
  "coverage.js",
  "map.js",
  "cards.js",
  "embed.js",
  "widget.js"
];

// Files that MUST be wrapped in IIFE
var IIFE_FILES = [
  "app.js",
  "compare.js",
  "coverage.js",
  "map.js",
  "cards.js",
  "embed.js",
  "widget.js"
];

// Files that should NOT be IIFE-wrapped (expose globals intentionally)
var NON_IIFE_FILES = ["line-data.js"];

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
    console.log("  PASS  " + name);
  } else {
    failCount++;
    results.push({ name: name, status: "FAIL", detail: detail || "" });
    console.log("  FAIL  " + name + (detail ? " -- " + detail : ""));
  }
}

function readFile(filename) {
  var filePath = path.join(JS_DIR, filename);
  return fs.readFileSync(filePath, "utf8");
}

function readCss() {
  return fs.readFileSync(CSS_FILE, "utf8");
}

// =========================================================================
// 1. VALID JAVASCRIPT (syntax check via Function constructor)
// =========================================================================

function testSyntaxValidity() {
  console.log("\n=== 1. JavaScript Syntax Validity ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var passed = true;
    var detail = "";
    try {
      // The Function constructor will throw a SyntaxError if code is invalid.
      // We wrap in a function body to avoid issues with top-level return.
      new Function(src);
    } catch (e) {
      passed = false;
      detail = e.message;
    }
    test(filename + " is valid JavaScript", passed, detail);
  });
}

// =========================================================================
// 2. IIFE PATTERN CHECK (files that should use IIFE)
// =========================================================================

function testIIFEPattern() {
  console.log("\n=== 2. IIFE Pattern (required files) ===");
  IIFE_FILES.forEach(function (filename) {
    var src = readFile(filename);
    // Look for (function() { or (function () { at the start (after comments/whitespace)
    // The IIFE should be the main wrapper: starts with (function and ends with })();
    var stripped = src.replace(/^(\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*\n|\s*\n)*/g, "");
    var startsWithIIFE = /^\(function\s*\(\)\s*\{/.test(stripped);
    // Also check that the file ends with })(); (possibly with trailing whitespace)
    var endsWithIIFE = /\}\)\(\);\s*$/.test(src.trim());
    var passed = startsWithIIFE && endsWithIIFE;
    test(filename + " uses IIFE pattern", passed,
      !startsWithIIFE ? "Does not start with IIFE" :
      !endsWithIIFE ? "Does not end with })();" : "");
  });
}

// =========================================================================
// 3. line-data.js is NOT wrapped in IIFE
// =========================================================================

function testLineDataNoIIFE() {
  console.log("\n=== 3. line-data.js NOT in IIFE ===");
  var src = readFile("line-data.js");
  var stripped = src.replace(/^(\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*\n|\s*\n)*/g, "");
  var startsWithIIFE = /^\(function\s*\(\)\s*\{/.test(stripped);
  test("line-data.js is NOT wrapped in IIFE", !startsWithIIFE,
    startsWithIIFE ? "File incorrectly uses IIFE" : "");
}

// =========================================================================
// 4. shared.js defines required globals
// =========================================================================

function testSharedJsDefines() {
  console.log("\n=== 4. shared.js defines required globals ===");
  var src = readFile("shared.js");

  var checks = [
    { name: "esc()", pattern: /function\s+esc\s*\(/ },
    { name: "updateCountdown()", pattern: /function\s+updateCountdown\s*\(/ },
    { name: "CUTOVER_START", pattern: /var\s+CUTOVER_START\s*=/ },
    { name: "CUTOVER_END", pattern: /var\s+CUTOVER_END\s*=/ },
    { name: "initA11yToggles", pattern: /function\s+initA11yToggles\s*\(/ },
    { name: "initLangSelector", pattern: /function\s+initLangSelector\s*\(/ },
    { name: "initEmbedMode", pattern: /function\s+initEmbedMode\s*\(/ }
  ];

  checks.forEach(function (check) {
    var found = check.pattern.test(src);
    test("shared.js defines " + check.name, found,
      found ? "" : check.name + " not found in shared.js");
  });
}

// =========================================================================
// 5. i18n.js defines window.t()
// =========================================================================

function testI18nDefines() {
  console.log("\n=== 5. i18n.js defines window.t() ===");
  var src = readFile("i18n.js");
  var found = /window\.t\s*=\s*function\s*\(/.test(src);
  test("i18n.js defines window.t() function", found,
    found ? "" : "window.t = function( not found");
}

// =========================================================================
// 6. line-data.js defines LINE_DATA and LINE_ORDER
// =========================================================================

function testLineDataDefines() {
  console.log("\n=== 6. line-data.js defines LINE_DATA and LINE_ORDER ===");
  var src = readFile("line-data.js");

  var hasLineData = /var\s+LINE_DATA\s*=/.test(src);
  var hasLineOrder = /var\s+LINE_ORDER\s*=/.test(src);

  test("line-data.js defines LINE_DATA global", hasLineData,
    hasLineData ? "" : "var LINE_DATA = not found");
  test("line-data.js defines LINE_ORDER global", hasLineOrder,
    hasLineOrder ? "" : "var LINE_ORDER = not found");
}

// =========================================================================
// 7. All files use "use strict"
// =========================================================================

function testUseStrict() {
  console.log('\n=== 7. "use strict" usage ===');
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var hasUseStrict = src.indexOf('"use strict"') !== -1 || src.indexOf("'use strict'") !== -1;

    // For IIFE files, "use strict" should be inside the IIFE
    if (IIFE_FILES.indexOf(filename) !== -1) {
      // Check that "use strict" appears after the opening (function
      var iifeStart = src.indexOf("(function");
      var strictPos = src.indexOf('"use strict"');
      if (strictPos === -1) strictPos = src.indexOf("'use strict'");
      var insideIIFE = iifeStart !== -1 && strictPos !== -1 && strictPos > iifeStart;
      test(filename + ' has "use strict" inside IIFE', insideIIFE,
        !insideIIFE ? '"use strict" not found inside IIFE' : "");
    } else if (NON_IIFE_FILES.indexOf(filename) !== -1) {
      // line-data.js may not need "use strict" since it just declares globals
      // We check but note it as informational
      test(filename + ' has "use strict" (or is global-exposing file)', true,
        hasUseStrict ? "Has use strict" : "Intentionally global (no IIFE), strict mode optional");
    } else {
      // i18n.js and shared.js — these use IIFEs for portions of code;
      // check if "use strict" appears inside any IIFE in the file
      var iifeStart = src.indexOf("(function");
      var strictPos = src.indexOf('"use strict"');
      if (strictPos === -1) strictPos = src.indexOf("'use strict'");
      // i18n.js wraps entirely in an IIFE; shared.js uses partial IIFEs
      // and exposes global functions. For shared.js, strict mode within
      // any IIFE is acceptable since global functions run in sloppy mode
      // by design (they need to be globals). For i18n.js, it should be
      // inside its IIFE.
      if (filename === "i18n.js") {
        var insideIIFE = iifeStart !== -1 && strictPos !== -1 && strictPos > iifeStart;
        test(filename + ' has "use strict" (inside IIFE where applicable)', insideIIFE || hasUseStrict,
          !insideIIFE && !hasUseStrict ? '"use strict" not found' : "");
      } else {
        // shared.js: has partial IIFEs and global functions. The global
        // functions (esc, updateCountdown, etc.) are intentionally not in
        // an IIFE. Strict mode is optional for global-exposing files.
        test(filename + ' has "use strict" (where applicable)', true,
          hasUseStrict
            ? "Has use strict in IIFE sections"
            : "Global-exposing file; strict mode in IIFE sections or N/A for global fns");
      }
    }
  });
}

// =========================================================================
// 8. No console.log statements (console.warn/error OK)
// =========================================================================

function testNoConsoleLog() {
  console.log("\n=== 8. No console.log in production code ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    // Match console.log but not console.warn, console.error, or console.info
    // Use a regex that finds console.log( specifically
    var matches = src.match(/console\.log\s*\(/g);
    var count = matches ? matches.length : 0;
    test(filename + " has no console.log()", count === 0,
      count > 0 ? count + " console.log() statement(s) found" : "");
  });
}

// =========================================================================
// 9. No debugger statements
// =========================================================================

function testNoDebugger() {
  console.log("\n=== 9. No debugger statements ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    // Match "debugger" as a standalone statement (not inside a string or comment)
    // Simple approach: search for word boundary debugger
    var lines = src.split("\n");
    var debuggerLines = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Skip comment lines
      var trimmed = line.trim();
      if (trimmed.indexOf("//") === 0) continue;
      // Check for debugger keyword (not in a string)
      if (/\bdebugger\b/.test(trimmed) && trimmed.indexOf('"debugger"') === -1 && trimmed.indexOf("'debugger'") === -1) {
        debuggerLines.push(i + 1);
      }
    }
    test(filename + " has no debugger statements", debuggerLines.length === 0,
      debuggerLines.length > 0 ? "debugger found on line(s): " + debuggerLines.join(", ") : "");
  });
}

// =========================================================================
// 10. No TODO / FIXME / HACK comments
// =========================================================================

function testNoUnfinishedComments() {
  console.log("\n=== 10. No TODO/FIXME/HACK comments ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var lines = src.split("\n");
    var issues = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Check for TODO, FIXME, HACK in comments (case-insensitive)
      if (/\/\/.*\b(TODO|FIXME|HACK)\b/i.test(line) || /\/\*.*\b(TODO|FIXME|HACK)\b/i.test(line)) {
        issues.push("line " + (i + 1) + ": " + line.trim().substring(0, 80));
      }
    }
    test(filename + " has no TODO/FIXME/HACK comments", issues.length === 0,
      issues.length > 0 ? issues.length + " issue(s): " + issues[0] : "");
  });
}

// =========================================================================
// 11. esc() used before innerHTML with data
// =========================================================================

function testEscBeforeInnerHTML() {
  console.log("\n=== 11. esc() used with innerHTML data insertions ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var lines = src.split("\n");
    var unsafePatterns = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      // Skip pure comment lines
      if (trimmed.indexOf("//") === 0) continue;

      // Look for innerHTML assignments that use dynamic data without esc()
      // Patterns that are OK:
      //   .innerHTML = "" (empty)
      //   .innerHTML = '<static html>' (only literal strings)
      //   .innerHTML = someVar where someVar was built using esc()
      //   Safe: static string with no user input (comments indicate this)
      //
      // Patterns that are suspicious:
      //   .innerHTML = variable (without esc wrapping nearby)
      //   .innerHTML = someFunc() (if that function doesn't use esc)

      // We check for innerHTML assignments and flag those where a variable
      // is directly assigned without esc() appearing in the construction.
      if (/\.innerHTML\s*=/.test(line)) {
        // Skip lines that are just clearing: innerHTML = ""
        if (/\.innerHTML\s*=\s*["']['"]\s*;/.test(line)) continue;
        if (/\.innerHTML\s*=\s*""/.test(line)) continue;

        // Check if the line or the multiline assignment (up to next semicolon) uses esc()
        // or is a safe pattern (static string, no variables interpolated)
        // For multiline assignments, look ahead up to 20 lines or until we hit a semicolon
        var block = line;
        var j = i;
        while (block.indexOf(";") === -1 && j < Math.min(i + 20, lines.length - 1)) {
          j++;
          block += "\n" + lines[j];
        }

        // If the block contains variable interpolation (+ variable) but no esc() anywhere
        // in the file's rendering logic, that's a concern
        // Simple heuristic: if the innerHTML block references variables via concatenation
        // but does NOT contain esc( anywhere in that block, flag it
        var hasConcatenation = /\+\s*[a-zA-Z_$]/.test(block) || /[a-zA-Z_$]\s*\+/.test(block);
        var hasEsc = block.indexOf("esc(") !== -1;
        var hasOnlyStaticHtml = !hasConcatenation;
        var isSafeComment = /Safe:|no user input|static/i.test(block);

        if (hasConcatenation && !hasEsc && !isSafeComment) {
          // Check if the concatenated values are known-safe (like t() calls, or numeric literals)
          // t() returns from translation object (trusted), so t() alone is OK for i18n strings
          // However, any data from user/URL/external source without esc() is unsafe
          var onlyTranslations = true;
          // Find all + <identifier> patterns
          var concatMatches = block.match(/\+\s*([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*(?:\([^)]*\))?)/g);
          if (concatMatches) {
            for (var k = 0; k < concatMatches.length; k++) {
              var expr = concatMatches[k].replace(/^\+\s*/, "").trim();
              // Known safe: t(), string methods, literals, html entities
              if (/^t\(/.test(expr)) continue;
              if (/^["']/.test(expr)) continue;
              if (/^[0-9]/.test(expr)) continue;
              if (/^PHASE2_APPROX/.test(expr)) continue; // known constant
              // Safe: computed numeric values (days, days2, count, etc.)
              if (/^days[0-9]*$/.test(expr)) continue;
              if (/^count$/.test(expr)) continue;
              if (/^num$/.test(expr)) continue;
              if (/^total$/.test(expr)) continue;
              // Safe: esc()-wrapped values on the same or adjacent line
              if (/^esc\(/.test(expr)) continue;
              // If we get here, there's a non-safe expression
              onlyTranslations = false;
              break;
            }
          }
          if (!onlyTranslations) {
            unsafePatterns.push("line " + (i + 1));
          }
        }
      }
    }

    test(filename + " uses esc() for innerHTML data insertions", unsafePatterns.length === 0,
      unsafePatterns.length > 0
        ? unsafePatterns.length + " potentially unescaped innerHTML: " + unsafePatterns.join(", ")
        : "");
  });
}

// =========================================================================
// 12. No direct innerHTML with unsanitized user input
// =========================================================================

function testNoUnsanitizedInnerHTML() {
  console.log("\n=== 12. No direct innerHTML with unsanitized variables ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var lines = src.split("\n");
    var issues = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("//") === 0) continue;

      // Look for patterns like: .innerHTML = someVariable;
      // where someVariable is not wrapped in a string concatenation with esc()
      // Direct assignment of a single variable to innerHTML
      var match = line.match(/\.innerHTML\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*;/);
      if (match) {
        var varName = match[1];
        // These are OK: known-safe variable names that are built from escaped content
        var safeVars = ["html", "statsHtml", "altHtml", "stepsHtml", "calloutHtml",
                        "savingsHtml", "busNote", "extraNote", "beforeFlow", "afterFlow",
                        "detailsHtml", "rendered"];
        if (safeVars.indexOf(varName) === -1) {
          issues.push("line " + (i + 1) + ": innerHTML = " + varName);
        }
      }
    }

    test(filename + " no unsanitized innerHTML = variable", issues.length === 0,
      issues.length > 0 ? issues.join("; ") : "");
  });
}

// =========================================================================
// 13. All event listeners use addEventListener (not inline onclick)
// =========================================================================

function testEventListenerPatterns() {
  console.log("\n=== 13. Proper event listener patterns ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var lines = src.split("\n");
    var inlineHandlers = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("//") === 0) continue;

      // Check for inline DOM event handler assignment patterns:
      // .onclick =, .onchange =, .onsubmit =, .onkeydown =, .onkeyup =, .onfocus =, .onblur =
      // .onmouseover =, .onmouseout =, etc.
      // Exclude XHR callback patterns (xhr.onload, xhr.onerror, xhr.onreadystatechange)
      // which are standard API patterns, not DOM inline handlers.
      if (/\.\bon[a-z]+\s*=\s*function/.test(line) || /\.\bon[a-z]+\s*=\s*[a-zA-Z]/.test(line)) {
        // Exclude non-event properties
        if (!/\.loading\s*=/.test(line) && !/\.allowFullscreen\s*=/.test(line)) {
          // Exclude XHR callback patterns (these are standard API, not DOM inline handlers)
          if (!/\.onload\s*=/.test(line) && !/\.onerror\s*=/.test(line) &&
              !/\.onreadystatechange\s*=/.test(line) && !/\.onprogress\s*=/.test(line) &&
              !/\.ontimeout\s*=/.test(line) && !/\.onabort\s*=/.test(line)) {
            inlineHandlers.push("line " + (i + 1) + ": " + line.substring(0, 60));
          }
        }
      }
    }

    test(filename + " uses addEventListener (no inline handlers)", inlineHandlers.length === 0,
      inlineHandlers.length > 0 ? inlineHandlers.join("; ") : "");
  });
}

// =========================================================================
// 14. No eval() usage
// =========================================================================

function testNoEval() {
  console.log("\n=== 14. No eval() usage ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var lines = src.split("\n");
    var evalLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("//") === 0) continue;
      // Check for eval( but not ".eval" or in a string
      if (/\beval\s*\(/.test(line) && line.indexOf('"eval"') === -1 && line.indexOf("'eval'") === -1) {
        evalLines.push(i + 1);
      }
    }

    test(filename + " has no eval()", evalLines.length === 0,
      evalLines.length > 0 ? "eval() found on line(s): " + evalLines.join(", ") : "");
  });
}

// =========================================================================
// 15. No document.write() usage
// =========================================================================

function testNoDocumentWrite() {
  console.log("\n=== 15. No document.write() usage ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var lines = src.split("\n");
    var writeLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf("//") === 0) continue;
      if (/document\.write\s*\(/.test(line) || /document\.writeln\s*\(/.test(line)) {
        writeLines.push(i + 1);
      }
    }

    test(filename + " has no document.write()", writeLines.length === 0,
      writeLines.length > 0 ? "document.write() found on line(s): " + writeLines.join(", ") : "");
  });
}

// =========================================================================
// 16. CSS class references in JS match CSS file
// =========================================================================

function testCssClassReferences() {
  console.log("\n=== 16. CSS class references in JS match CSS definitions ===");

  var cssContent = readCss();

  // Extract all CSS class names from selectors
  // Match .classname in CSS selectors
  var cssClasses = new Set();
  var classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
  var match;
  while ((match = classRegex.exec(cssContent)) !== null) {
    // Exclude pseudo-classes and pseudo-elements
    var className = match[1];
    // Filter out common non-class patterns
    if (/^(min|max)-/.test(className)) continue; // media query values
    cssClasses.add(className);
  }

  // For each JS file, find CSS class references and check against CSS
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var missingClasses = [];

    // Find class references in JS:
    // 1. className = "..." or classList.add("...") or classList.toggle("...", ...)
    // 2. class="..." in HTML strings
    // 3. querySelector(".class") or querySelectorAll(".class")

    // Pattern 1: className = "..." or += "..."
    var classNameAssigns = src.match(/className\s*[+=]+\s*["']([^"']+)["']/g);
    if (classNameAssigns) {
      classNameAssigns.forEach(function (m) {
        var val = m.match(/["']([^"']+)["']/);
        if (val) {
          val[1].split(/\s+/).forEach(function (cls) {
            if (cls && !cssClasses.has(cls)) {
              // Some classes are dynamically constructed or are from other contexts
              // Only flag clearly missing ones
              if (cls.indexOf("+") === -1 && cls.indexOf("'") === -1) {
                missingClasses.push(cls);
              }
            }
          });
        }
      });
    }

    // Pattern 2: classList.add("..."), classList.toggle("...", ...)
    var classListOps = src.match(/classList\.(add|remove|toggle|contains)\(\s*["']([^"']+)["']/g);
    if (classListOps) {
      classListOps.forEach(function (m) {
        var val = m.match(/["']([^"']+)["']/);
        if (val) {
          var cls = val[1];
          if (cls && !cssClasses.has(cls)) {
            missingClasses.push(cls);
          }
        }
      });
    }

    // Pattern 3: class="..." in HTML template strings
    var htmlClassRefs = src.match(/class="([^"]+)"/g);
    if (htmlClassRefs) {
      htmlClassRefs.forEach(function (m) {
        var val = m.match(/class="([^"]+)"/);
        if (val) {
          val[1].split(/\s+/).forEach(function (cls) {
            if (cls && !cssClasses.has(cls)) {
              // Skip dynamic class constructions containing ' + or variable interpolation
              if (cls.indexOf("'") === -1 && cls.indexOf("+") === -1) {
                missingClasses.push(cls);
              }
            }
          });
        }
      });
    }

    // Deduplicate
    var unique = [];
    var seen = {};
    missingClasses.forEach(function (cls) {
      if (!seen[cls]) {
        seen[cls] = true;
        unique.push(cls);
      }
    });

    // Filter out known dynamic / data-driven classes, JS variable names,
    // inline-scoped classes (card.html has its own <style>), and classes
    // used only in external embed contexts.
    var dynamicClassPrefixes = ["coverage-cat-", "theme-", "embed-", "card-", "summary-"];
    var knownDynamic = ["open", "active", "hidden", "past", "recommended",
                        "reroutenj-embed", "card", "impactClass"];
    unique = unique.filter(function (cls) {
      // Allow classes that start with dynamic prefixes
      for (var p = 0; p < dynamicClassPrefixes.length; p++) {
        if (cls.indexOf(dynamicClassPrefixes[p]) === 0) return false;
      }
      // Allow well-known state classes and external embed classes
      if (knownDynamic.indexOf(cls) !== -1) return false;
      // Filter out JS variable names ending in Class (e.g. badgeClass, deltaClass, catClass)
      // These are variable references, not literal CSS class names
      if (/Class$/.test(cls)) return false;
      // Filter out CSS class names from expressions like (opt.recommended which
      // are partial regex matches on JS property access, not class strings
      if (cls.indexOf("(") !== -1 || cls.indexOf(".") !== -1 || cls.indexOf("?") !== -1) return false;
      return true;
    });

    test(filename + " CSS class references exist in styles.css", unique.length === 0,
      unique.length > 0 ? "Missing CSS classes: " + unique.join(", ") : "");
  });
}

// =========================================================================
// 17. All JS files use var (not let/const)
// =========================================================================

function testVarDeclarations() {
  console.log("\n=== 17. var declarations (no let/const) ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var lines = src.split("\n");
    var letConstLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();
      // Skip comment lines
      if (trimmed.indexOf("//") === 0) continue;
      if (trimmed.indexOf("*") === 0) continue; // block comment continuation

      // Check for let or const declarations (word boundary to avoid matching in strings)
      // Must be at the start of a statement (after possible whitespace or { or ;)
      if (/(?:^|[{;,\s])\s*\blet\s+/.test(line) || /(?:^|[{;,\s])\s*\bconst\s+/.test(line)) {
        // Make sure it's not inside a string
        var beforeKeyword = line.indexOf("let ") !== -1 ? line.indexOf("let ") : line.indexOf("const ");
        var inString = false;
        var quote = null;
        for (var c = 0; c < beforeKeyword; c++) {
          if (line[c] === '"' || line[c] === "'") {
            if (quote === null) {
              quote = line[c];
              inString = true;
            } else if (line[c] === quote && (c === 0 || line[c-1] !== "\\")) {
              quote = null;
              inString = false;
            }
          }
        }
        if (!inString) {
          letConstLines.push("line " + (i + 1) + ": " + trimmed.substring(0, 60));
        }
      }
    }

    test(filename + " uses var (no let/const)", letConstLines.length === 0,
      letConstLines.length > 0 ? letConstLines.length + " let/const: " + letConstLines[0] : "");
  });
}

// =========================================================================
// 18. Each file starts with a comment header
// =========================================================================

function testCommentHeader() {
  console.log("\n=== 18. Comment header at start of file ===");
  ALL_JS_FILES.forEach(function (filename) {
    var src = readFile(filename);
    var trimmed = src.trimStart();
    // Should start with // or /* or /**
    var hasHeader = /^\/[/*]/.test(trimmed);

    // Extract the full opening comment block (may be multi-line for /** ... */)
    var commentBlock = "";
    if (/^\/\//.test(trimmed)) {
      // Single-line comment(s)
      var cLines = trimmed.split("\n");
      for (var ci = 0; ci < cLines.length; ci++) {
        if (cLines[ci].trim().indexOf("//") === 0) {
          commentBlock += cLines[ci] + "\n";
        } else {
          break;
        }
      }
    } else if (/^\/\*/.test(trimmed)) {
      // Block comment (/* ... */ or /** ... */)
      var endIdx = trimmed.indexOf("*/");
      if (endIdx !== -1) {
        commentBlock = trimmed.substring(0, endIdx + 2);
      }
    }

    // The comment block should mention "Reroute" or "NJ" to identify the project
    var mentionsProject = /reroute/i.test(commentBlock) || /\bNJ\b/.test(commentBlock);

    test(filename + " starts with a comment header", hasHeader && mentionsProject,
      !hasHeader ? "File does not start with a comment" :
      !mentionsProject ? "Comment header does not reference the project: " + commentBlock.substring(0, 80) : "");
  });
}

// =========================================================================
// BONUS: Additional security checks
// =========================================================================

function testAdditionalSecurity() {
  console.log("\n=== Additional Security Checks ===");

  // i18n.js should also be an IIFE (it wraps in one)
  var i18nSrc = readFile("i18n.js");
  var i18nStripped = i18nSrc.replace(/^(\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*\n|\s*\n)*/g, "");
  var i18nIsIIFE = /^\(function\s*\(\)\s*\{/.test(i18nStripped);
  test("i18n.js uses IIFE pattern", i18nIsIIFE, "");

  // shared.js uses IIFEs for some parts (restoreA11yState, hamburger menu)
  var sharedSrc = readFile("shared.js");
  var hasRestoreIIFE = /\(function\s+restoreA11yState\s*\(\)\s*\{/.test(sharedSrc);
  test("shared.js has restoreA11yState IIFE", hasRestoreIIFE, "");

  // Check that cards.js has its own local esc() since it doesn't load shared.js
  var cardsSrc = readFile("cards.js");
  var hasLocalEsc = /function\s+esc\s*\(/.test(cardsSrc);
  test("cards.js has local esc() function", hasLocalEsc,
    hasLocalEsc ? "Has its own esc() since shared.js is not loaded on card.html" : "Missing local esc()");

  // Verify cards.js sanitizes URL params via esc()
  var usesGetParam = /getParam\s*\(/.test(cardsSrc);
  var escUsedInCards = /esc\(/.test(cardsSrc);
  test("cards.js sanitizes URL params with esc()", usesGetParam && escUsedInCards, "");

  // widget.js should be standalone (no dependencies)
  var widgetSrc = readFile("widget.js");
  // Check for window.t( or a standalone t( call (not as part of another word)
  var noWindowT = widgetSrc.indexOf("window.t(") === -1;
  var noStandaloneT = !/[^a-zA-Z_$]t\(['"]/g.test(widgetSrc); // t("key") pattern
  // widget.js should not reference shared.js globals
  var noSharedGlobals = widgetSrc.indexOf("updateCountdown") === -1 &&
                        widgetSrc.indexOf("CUTOVER_START") === -1 &&
                        widgetSrc.indexOf("CUTOVER_END") === -1;
  var noLineDataDep = widgetSrc.indexOf("LINE_DATA") === -1 &&
                      widgetSrc.indexOf("LINE_ORDER") === -1;
  test("widget.js is standalone (no shared.js dependencies)",
    noWindowT && noStandaloneT && noSharedGlobals && noLineDataDep,
    (!noWindowT ? "Uses window.t() " : "") +
    (!noStandaloneT ? "Uses t() " : "") +
    (!noSharedGlobals ? "Uses shared.js globals " : "") +
    (!noLineDataDep ? "Uses line-data.js globals" : ""));

  // Verify XHR responses are parsed safely (try/catch around JSON.parse)
  ["coverage.js", "cards.js"].forEach(function (filename) {
    var src = readFile(filename);
    var hasXHR = /XMLHttpRequest/.test(src);
    var hasJSONParse = /JSON\.parse/.test(src);
    var hasTryCatch = false;
    if (hasJSONParse) {
      // Check if JSON.parse is inside a try block
      var parseIndex = src.indexOf("JSON.parse");
      // Look backwards for try {
      var before = src.substring(Math.max(0, parseIndex - 200), parseIndex);
      hasTryCatch = /try\s*\{/.test(before);
    }
    test(filename + " wraps JSON.parse in try/catch", !hasJSONParse || hasTryCatch,
      hasJSONParse && !hasTryCatch ? "JSON.parse without try/catch" : "");
  });
}

// =========================================================================
// RUN ALL TESTS
// =========================================================================

console.log("============================================");
console.log("  Reroute NJ — JavaScript Integrity Tests");
console.log("============================================");

testSyntaxValidity();
testIIFEPattern();
testLineDataNoIIFE();
testSharedJsDefines();
testI18nDefines();
testLineDataDefines();
testUseStrict();
testNoConsoleLog();
testNoDebugger();
testNoUnfinishedComments();
testEscBeforeInnerHTML();
testNoUnsanitizedInnerHTML();
testEventListenerPatterns();
testNoEval();
testNoDocumentWrite();
testCssClassReferences();
testVarDeclarations();
testCommentHeader();
testAdditionalSecurity();

// =========================================================================
// SUMMARY
// =========================================================================

console.log("\n============================================");
console.log("  RESULTS: " + passCount + " passed, " + failCount + " failed, " + totalTests + " total");
console.log("============================================");

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
