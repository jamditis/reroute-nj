/**
 * HTML Structure Validation Tests for Reroute NJ
 *
 * Validates the HTML structure of all English base pages.
 * Run: node tests/test-html-structure.js
 */

var fs = require("fs");
var path = require("path");

var ROOT = path.resolve(__dirname, "..");

var PAGES = [
  "index.html",
  "compare.html",
  "coverage.html",
  "map.html",
  "embed.html",
  "blog.html",
  "blog/why-we-built-reroute-nj.html",
  "blog/new-embed-system.html",
  "card.html",
  "widget.html"
];

// Pages that are renderers/embeds and exempt from full-page chrome checks
var EXEMPT_PAGES = ["card.html", "widget.html"];

var totalTests = 0;
var passCount = 0;
var failCount = 0;
var failures = [];

function assert(condition, testName, pageName) {
  totalTests++;
  var label = pageName ? "[" + pageName + "] " + testName : testName;
  if (condition) {
    passCount++;
    console.log("  PASS: " + label);
  } else {
    failCount++;
    console.log("  FAIL: " + label);
    failures.push(label);
  }
}

function isExempt(pageName) {
  return EXEMPT_PAGES.indexOf(pageName) !== -1;
}

/**
 * Resolve a relative href from a page's directory to an absolute filesystem path.
 * Skips external URLs (http://, https://, //, data:, javascript:, mailto:, tel:, #).
 * Returns null if the href should be skipped.
 */
function resolveHref(href, pageDir) {
  if (!href) return null;
  href = href.trim();
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("data:") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  ) {
    return null; // external or special — skip
  }
  return path.resolve(pageDir, href);
}

// ---- Load all pages ----
var pageContents = {};
PAGES.forEach(function (pageName) {
  var filePath = path.join(ROOT, pageName);
  if (!fs.existsSync(filePath)) {
    console.error("ERROR: Page not found: " + filePath);
    process.exit(1);
  }
  pageContents[pageName] = fs.readFileSync(filePath, "utf-8");
});

console.log("=== Reroute NJ HTML Structure Tests ===\n");
console.log("Testing " + PAGES.length + " pages...\n");

// =========================================================================
// TEST 1: DOCTYPE declaration
// =========================================================================
console.log("--- Test 1: DOCTYPE declaration ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var hasDoctype = /^\s*<!DOCTYPE\s+html\s*>/i.test(html);
  assert(hasDoctype, "Has valid DOCTYPE declaration", pageName);
});

// =========================================================================
// TEST 2: <html lang="en"> attribute
// =========================================================================
console.log("\n--- Test 2: <html lang=\"en\"> attribute ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var hasLangEn = /<html[^>]*\slang\s*=\s*["']en["']/i.test(html);
  assert(hasLangEn, "Has <html lang=\"en\">", pageName);
});

// =========================================================================
// TEST 3: <title> tag with non-empty content
// =========================================================================
console.log("\n--- Test 3: <title> tag with non-empty content ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  var hasTitle = titleMatch && titleMatch[1].trim().length > 0;
  assert(hasTitle, "Has <title> with non-empty content", pageName);
});

// =========================================================================
// TEST 4: <meta charset> tag
// =========================================================================
console.log("\n--- Test 4: <meta charset> tag ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var hasCharset =
    /<meta\s+charset\s*=\s*["']?utf-8["']?\s*\/?>/i.test(html) ||
    /<meta\s+http-equiv\s*=\s*["']Content-Type["'][^>]*charset\s*=\s*utf-8/i.test(html);
  assert(hasCharset, "Has <meta charset=\"utf-8\"> or equivalent", pageName);
});

// =========================================================================
// TEST 5: <meta name="viewport"> tag
// =========================================================================
console.log("\n--- Test 5: <meta name=\"viewport\"> tag ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var hasViewport = /<meta\s+name\s*=\s*["']viewport["'][^>]*content\s*=\s*["'][^"']+["']/i.test(html);
  assert(hasViewport, "Has <meta name=\"viewport\"> tag", pageName);
});

// =========================================================================
// TEST 6: <meta name="description"> tag
// =========================================================================
console.log("\n--- Test 6: <meta name=\"description\"> tag ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  if (isExempt(pageName)) {
    // card.html and widget.html may not have descriptions — still check but don't fail
    var hasDesc = /<meta\s+name\s*=\s*["']description["'][^>]*content\s*=\s*["'][^"']+["']/i.test(html);
    assert(true, "Skipped (exempt page) — description " + (hasDesc ? "present" : "absent"), pageName);
  } else {
    var hasDesc = /<meta\s+name\s*=\s*["']description["'][^>]*content\s*=\s*["'][^"']+["']/i.test(html);
    assert(hasDesc, "Has <meta name=\"description\"> with content", pageName);
  }
});

// =========================================================================
// TEST 7: Open Graph tags (og:title, og:description, og:url, og:type, og:image)
// =========================================================================
console.log("\n--- Test 7: Open Graph tags ---");
var OG_TAGS = ["og:title", "og:description", "og:url", "og:type", "og:image"];
PAGES.forEach(function (pageName) {
  if (isExempt(pageName)) {
    assert(true, "Skipped (exempt page) — Open Graph tags not required", pageName);
    return;
  }
  var html = pageContents[pageName];
  var allPresent = true;
  var missing = [];
  OG_TAGS.forEach(function (tag) {
    var regex = new RegExp('<meta\\s+property\\s*=\\s*["\']' + tag.replace(":", "\\:") + '["\'][^>]*content\\s*=\\s*["\'][^"\']+["\']', "i");
    if (!regex.test(html)) {
      allPresent = false;
      missing.push(tag);
    }
  });
  assert(allPresent, "Has all Open Graph tags" + (missing.length ? " (missing: " + missing.join(", ") + ")" : ""), pageName);
});

// =========================================================================
// TEST 8: Twitter card tags (twitter:card, twitter:title, twitter:description)
// =========================================================================
console.log("\n--- Test 8: Twitter card tags ---");
var TWITTER_TAGS = ["twitter:card", "twitter:title", "twitter:description"];
PAGES.forEach(function (pageName) {
  if (isExempt(pageName)) {
    assert(true, "Skipped (exempt page) — Twitter card tags not required", pageName);
    return;
  }
  var html = pageContents[pageName];
  var allPresent = true;
  var missing = [];
  TWITTER_TAGS.forEach(function (tag) {
    var regex = new RegExp('<meta\\s+name\\s*=\\s*["\']' + tag.replace(":", "\\:") + '["\'][^>]*content\\s*=\\s*["\'][^"\']+["\']', "i");
    if (!regex.test(html)) {
      allPresent = false;
      missing.push(tag);
    }
  });
  assert(allPresent, "Has all Twitter card tags" + (missing.length ? " (missing: " + missing.join(", ") + ")" : ""), pageName);
});

// =========================================================================
// TEST 9: Script loading order
// =========================================================================
console.log("\n--- Test 9: Script loading order ---");

/**
 * Expected order for pages that load scripts:
 *   i18n.js -> shared.js -> (optional: line-data.js) -> page-specific.js
 *
 * card.html and widget.html have different loading patterns.
 */
var PAGE_SCRIPTS = {
  "index.html": ["js/i18n.js", "js/shared.js", "js/line-data.js", "js/app.js"],
  "compare.html": ["js/i18n.js", "js/shared.js", "js/compare.js"],
  "coverage.html": ["js/i18n.js", "js/shared.js", "js/coverage.js"],
  "map.html": ["js/i18n.js", "js/shared.js", "js/map.js"],
  "embed.html": ["js/i18n.js", "js/shared.js", "js/line-data.js", "js/embed.js"],
  "blog.html": ["js/i18n.js", "js/shared.js"],
  "blog/why-we-built-reroute-nj.html": ["js/i18n.js", "js/shared.js"],
  "blog/new-embed-system.html": ["js/i18n.js", "js/shared.js"],
  "card.html": ["js/line-data.js", "js/cards.js"],
  "widget.html": [] // widget.html loads scripts dynamically
};

PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var expectedScripts = PAGE_SCRIPTS[pageName];

  if (expectedScripts.length === 0) {
    assert(true, "Script loading order (no static scripts expected)", pageName);
    return;
  }

  // Extract all script src attributes in order
  var scriptSrcRegex = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  var match;
  var foundScripts = [];
  while ((match = scriptSrcRegex.exec(html)) !== null) {
    var src = match[1];
    // Normalize: strip ../ prefix for blog pages to compare base names
    var normalized = src.replace(/^\.\.\//, "");
    foundScripts.push(normalized);
  }

  // Check that expected scripts appear in order (they may be interspersed with others like leaflet)
  var lastIndex = -1;
  var orderCorrect = true;
  var orderIssues = [];
  expectedScripts.forEach(function (expected) {
    var idx = foundScripts.indexOf(expected);
    if (idx === -1) {
      orderCorrect = false;
      orderIssues.push(expected + " not found");
    } else if (idx <= lastIndex) {
      orderCorrect = false;
      orderIssues.push(expected + " out of order");
    } else {
      lastIndex = idx;
    }
  });
  assert(
    orderCorrect,
    "Script loading order is correct" + (orderIssues.length ? " (" + orderIssues.join("; ") + ")" : ""),
    pageName
  );
});

// =========================================================================
// TEST 10: Skip-to-content link
// =========================================================================
console.log("\n--- Test 10: Skip-to-content link ---");
PAGES.forEach(function (pageName) {
  if (isExempt(pageName)) {
    assert(true, "Skipped (exempt page) — skip-to-content link not required", pageName);
    return;
  }
  var html = pageContents[pageName];
  var hasSkipLink =
    /<a[^>]*href\s*=\s*["']#main-content["'][^>]*class\s*=\s*["'][^"']*skip-link[^"']*["']/i.test(html) ||
    /<a[^>]*class\s*=\s*["'][^"']*skip-link[^"']*["'][^>]*href\s*=\s*["']#main-content["']/i.test(html);
  assert(hasSkipLink, "Has skip-to-content link", pageName);
});

// =========================================================================
// TEST 11: Language selector
// =========================================================================
console.log("\n--- Test 11: Language selector ---");
PAGES.forEach(function (pageName) {
  if (isExempt(pageName)) {
    assert(true, "Skipped (exempt page) — language selector not required", pageName);
    return;
  }
  var html = pageContents[pageName];
  var hasLangSelector =
    /class\s*=\s*["'][^"']*lang-selector[^"']*["']/i.test(html) ||
    /id\s*=\s*["']lang-select["']/i.test(html);
  assert(hasLangSelector, "Has language selector", pageName);
});

// =========================================================================
// TEST 12: Accessibility toggle buttons
// =========================================================================
console.log("\n--- Test 12: Accessibility toggle buttons ---");
PAGES.forEach(function (pageName) {
  if (isExempt(pageName)) {
    assert(true, "Skipped (exempt page) — accessibility toggles not required", pageName);
    return;
  }
  var html = pageContents[pageName];
  var hasContrastToggle = /id\s*=\s*["']toggle-contrast["']/i.test(html);
  var hasSimplifiedToggle = /id\s*=\s*["']toggle-simplified["']/i.test(html);
  var hasA11yToggles = /class\s*=\s*["'][^"']*a11y-toggles[^"']*["']/i.test(html);
  assert(
    hasContrastToggle && hasSimplifiedToggle && hasA11yToggles,
    "Has accessibility toggle buttons (contrast: " + hasContrastToggle +
      ", simplified: " + hasSimplifiedToggle +
      ", container: " + hasA11yToggles + ")",
    pageName
  );
});

// =========================================================================
// TEST 13: Internal links use relative paths (not absolute URLs to reroutenj.org)
// =========================================================================
console.log("\n--- Test 13: Internal links use relative paths ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];

  // Find all href and src attributes that point to reroutenj.org internal pages
  // Exclude: canonical links, og:url, hreflang alternates, JSON-LD, meta tags, and attribution links
  // We only check <a href="...">, <script src="...">, and <link rel="stylesheet" href="...">
  var absoluteInternalLinks = [];

  // Check <a> tags for absolute internal links
  var aHrefRegex = /<a\s[^>]*href\s*=\s*["'](https?:\/\/reroutenj\.org[^"']*)["'][^>]*>/gi;
  var match;
  while ((match = aHrefRegex.exec(html)) !== null) {
    var fullTag = match[0];
    // Skip attribution links (they are displayed in embeds and intentionally absolute)
    if (/class\s*=\s*["'][^"']*attribution/i.test(fullTag)) continue;
    // Skip links with target="_blank" (intentionally external-facing references)
    if (/target\s*=\s*["']_blank["']/i.test(fullTag)) continue;
    // Skip bare domain links (e.g., "link back to reroutenj.org") — these are
    // editorial mentions of the URL as a display name, not navigation links
    if (/^https?:\/\/reroutenj\.org\/?$/.test(match[1])) continue;
    absoluteInternalLinks.push(match[1]);
  }

  // Check <script src> for absolute internal links (should be relative)
  var scriptSrcAbsRegex = /<script[^>]*src\s*=\s*["'](https?:\/\/reroutenj\.org[^"']*)["'][^>]*>/gi;
  while ((match = scriptSrcAbsRegex.exec(html)) !== null) {
    absoluteInternalLinks.push(match[1]);
  }

  // Check <link rel="stylesheet" href> for absolute internal links (should be relative)
  var cssSrcAbsRegex = /<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["'](https?:\/\/reroutenj\.org[^"']*)["'][^>]*>/gi;
  while ((match = cssSrcAbsRegex.exec(html)) !== null) {
    absoluteInternalLinks.push(match[1]);
  }

  assert(
    absoluteInternalLinks.length === 0,
    "All internal links use relative paths" +
      (absoluteInternalLinks.length > 0 ? " (found absolute: " + absoluteInternalLinks.join(", ") + ")" : ""),
    pageName
  );
});

// =========================================================================
// TEST 14: No broken script src paths
// =========================================================================
console.log("\n--- Test 14: No broken script src paths ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var pageDir = path.dirname(path.join(ROOT, pageName));

  var scriptSrcRegex = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  var match;
  var brokenScripts = [];

  while ((match = scriptSrcRegex.exec(html)) !== null) {
    var src = match[1];
    var resolved = resolveHref(src, pageDir);
    if (resolved === null) continue; // external URL — skip
    if (!fs.existsSync(resolved)) {
      brokenScripts.push(src + " -> " + resolved);
    }
  }

  assert(
    brokenScripts.length === 0,
    "All script src paths resolve to existing files" +
      (brokenScripts.length > 0 ? " (broken: " + brokenScripts.join("; ") + ")" : ""),
    pageName
  );
});

// =========================================================================
// TEST 15: No broken CSS href paths
// =========================================================================
console.log("\n--- Test 15: No broken CSS href paths ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var pageDir = path.dirname(path.join(ROOT, pageName));

  var cssHrefRegex = /<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  var match;
  var brokenCSS = [];

  while ((match = cssHrefRegex.exec(html)) !== null) {
    var href = match[1];
    var resolved = resolveHref(href, pageDir);
    if (resolved === null) continue; // external URL — skip
    if (!fs.existsSync(resolved)) {
      brokenCSS.push(href + " -> " + resolved);
    }
  }

  // Also check the reverse order: href before rel
  var cssHrefRegex2 = /<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi;
  while ((match = cssHrefRegex2.exec(html)) !== null) {
    var href = match[1];
    var resolved = resolveHref(href, pageDir);
    if (resolved === null) continue;
    if (!fs.existsSync(resolved)) {
      brokenCSS.push(href + " -> " + resolved);
    }
  }

  assert(
    brokenCSS.length === 0,
    "All CSS href paths resolve to existing files" +
      (brokenCSS.length > 0 ? " (broken: " + brokenCSS.join("; ") + ")" : ""),
    pageName
  );
});

// =========================================================================
// TEST 16: Canonical link tag
// =========================================================================
console.log("\n--- Test 16: Canonical link tag ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];
  var hasCanonical =
    /<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["'][^"']+["'][^>]*>/i.test(html) ||
    /<link[^>]*href\s*=\s*["'][^"']+["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i.test(html);

  if (isExempt(pageName)) {
    // Card and widget may or may not have canonical — just report
    assert(true, "Skipped (exempt page) — canonical " + (hasCanonical ? "present" : "absent"), pageName);
  } else {
    assert(hasCanonical, "Has <link rel=\"canonical\"> tag", pageName);
  }
});

// =========================================================================
// TEST 17: Blog pages have correct relative paths for assets (../ prefix)
// =========================================================================
console.log("\n--- Test 17: Blog pages have correct relative asset paths ---");
var BLOG_PAGES = [
  "blog/why-we-built-reroute-nj.html",
  "blog/new-embed-system.html"
];

BLOG_PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];

  // Check that CSS, JS, and favicon references use ../ prefix
  var cssOk = true;
  var jsOk = true;
  var faviconOk = true;
  var issues = [];

  // CSS: should be ../css/styles.css
  var cssMatch = html.match(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["']/i);
  if (cssMatch) {
    var cssHref = cssMatch[1];
    if (!cssHref.startsWith("http") && !cssHref.startsWith("../")) {
      cssOk = false;
      issues.push("CSS href missing ../ prefix: " + cssHref);
    }
  }

  // JS scripts: should use ../js/ prefix
  var scriptRegex = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  var sMatch;
  while ((sMatch = scriptRegex.exec(html)) !== null) {
    var src = sMatch[1];
    if (!src.startsWith("http") && src.indexOf("js/") !== -1 && !src.startsWith("../")) {
      jsOk = false;
      issues.push("Script src missing ../ prefix: " + src);
    }
  }

  // Favicon: should be ../img/favicon.svg
  var favMatch = html.match(/<link[^>]*href\s*=\s*["']([^"']+favicon[^"']*)["']/i);
  if (favMatch) {
    var favHref = favMatch[1];
    if (!favHref.startsWith("http") && !favHref.startsWith("../")) {
      faviconOk = false;
      issues.push("Favicon href missing ../ prefix: " + favHref);
    }
  }

  assert(
    cssOk && jsOk && faviconOk,
    "Blog page uses ../ prefix for nested assets" +
      (issues.length ? " (" + issues.join("; ") + ")" : ""),
    pageName
  );
});

// Also verify non-blog root-level pages do NOT use ../ prefix
var ROOT_PAGES = PAGES.filter(function (p) {
  return BLOG_PAGES.indexOf(p) === -1;
});
ROOT_PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];

  // Root-level pages should reference css/styles.css and js/*.js without ../ prefix
  var badPrefix = false;
  var issues = [];

  var stylesheetMatch = html.match(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["']/gi);
  if (stylesheetMatch) {
    stylesheetMatch.forEach(function (tag) {
      var hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
      if (hrefMatch) {
        var href = hrefMatch[1];
        if (!href.startsWith("http") && href.startsWith("../")) {
          badPrefix = true;
          issues.push("Unexpected ../ prefix in CSS href: " + href);
        }
      }
    });
  }

  var scriptRegex = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  var sMatch;
  while ((sMatch = scriptRegex.exec(html)) !== null) {
    var src = sMatch[1];
    if (!src.startsWith("http") && src.startsWith("../")) {
      badPrefix = true;
      issues.push("Unexpected ../ prefix in script src: " + src);
    }
  }

  assert(
    !badPrefix,
    "Root-level page does not use ../ prefix for assets" +
      (issues.length ? " (" + issues.join("; ") + ")" : ""),
    pageName
  );
});

// =========================================================================
// TEST 18: JSON-LD structured data is valid JSON
// =========================================================================
console.log("\n--- Test 18: JSON-LD structured data is valid JSON ---");
PAGES.forEach(function (pageName) {
  var html = pageContents[pageName];

  // Extract all <script type="application/ld+json"> blocks
  var jsonLdRegex = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  var match;
  var blocks = [];
  while ((match = jsonLdRegex.exec(html)) !== null) {
    blocks.push(match[1]);
  }

  if (blocks.length === 0) {
    // Some pages (card.html, widget.html) may not have JSON-LD
    if (isExempt(pageName)) {
      assert(true, "No JSON-LD blocks (exempt page)", pageName);
    } else {
      assert(false, "Has at least one JSON-LD block", pageName);
    }
    return;
  }

  var allValid = true;
  var parseErrors = [];
  blocks.forEach(function (block, idx) {
    try {
      var parsed = JSON.parse(block);
      // Basic validation: must have @context and @type
      if (!parsed["@context"] || !parsed["@type"]) {
        allValid = false;
        parseErrors.push("Block " + (idx + 1) + ": missing @context or @type");
      }
    } catch (e) {
      allValid = false;
      parseErrors.push("Block " + (idx + 1) + ": " + e.message);
    }
  });

  assert(
    allValid,
    "All " + blocks.length + " JSON-LD block(s) are valid JSON" +
      (parseErrors.length ? " (" + parseErrors.join("; ") + ")" : ""),
    pageName
  );
});

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n=== SUMMARY ===");
console.log("Total tests: " + totalTests);
console.log("Passed:      " + passCount);
console.log("Failed:      " + failCount);

if (failures.length > 0) {
  console.log("\nFailed tests:");
  failures.forEach(function (f) {
    console.log("  - " + f);
  });
  process.exit(1);
} else {
  console.log("\nAll tests passed!");
  process.exit(0);
}
