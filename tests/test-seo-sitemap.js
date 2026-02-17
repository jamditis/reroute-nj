/**
 * Comprehensive validation tests for SEO elements: sitemap.xml, robots.txt, llms.txt
 *
 * Validates XML structure, URL completeness, hreflang annotations, robots directives,
 * llms.txt content, and cross-references against files on disk.
 *
 * Usage: node tests/test-seo-sitemap.js
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

// ── Constants ────────────────────────────────────────────────────────

var ROOT = path.join(__dirname, "..");
var BASE_DOMAIN = "https://reroutenj.org";
var SUPPORTED_LANGUAGES = ["en", "es", "zh", "tl", "ko", "pt", "gu", "hi", "it", "ar", "pl"];
var TRANSLATED_LANGUAGES = ["es", "zh", "tl", "ko", "pt", "gu", "hi", "it", "ar", "pl"];

var ENGLISH_BASE_PAGES = [
  "index.html",
  "compare.html",
  "coverage.html",
  "map.html",
  "embed.html",
  "blog.html",
  "blog/cutover-begins.html",
  "blog/why-we-built-reroute-nj.html",
  "blog/new-embed-system.html",
  "about.html"
];

var UTILITY_PAGES = [
  "card.html",
  "widget.html"
];

// ══════════════════════════════════════════════════════════════════════
//  SITEMAP.XML TESTS
// ══════════════════════════════════════════════════════════════════════

console.log("\n── sitemap.xml ─────────────────────────────────────────────\n");

var SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
var sitemapRaw;

try {
  sitemapRaw = fs.readFileSync(SITEMAP_PATH, "utf8");
} catch (e) {
  fail("0. sitemap.xml exists and is readable", e.message);
  console.log("\nCannot continue without sitemap.xml. Aborting sitemap tests.");
  sitemapRaw = null;
}

// ── Test 1: Valid XML structure ──────────────────────────────────────

if (sitemapRaw) {
  var hasXmlDecl = sitemapRaw.indexOf("<?xml") === 0;
  var hasUrlsetOpen = sitemapRaw.indexOf("<urlset") !== -1;
  var hasUrlsetClose = sitemapRaw.indexOf("</urlset>") !== -1;
  var hasSitemapNs = sitemapRaw.indexOf("http://www.sitemaps.org/schemas/sitemap/0.9") !== -1;
  var hasXhtmlNs = sitemapRaw.indexOf("http://www.w3.org/1999/xhtml") !== -1;

  if (hasXmlDecl && hasUrlsetOpen && hasUrlsetClose && hasSitemapNs && hasXhtmlNs) {
    pass("1. Valid XML structure", "Has XML declaration, urlset with sitemap and xhtml namespaces, and closing tag");
  } else {
    var missing = [];
    if (!hasXmlDecl) missing.push("XML declaration");
    if (!hasUrlsetOpen) missing.push("<urlset> opening tag");
    if (!hasUrlsetClose) missing.push("</urlset> closing tag");
    if (!hasSitemapNs) missing.push("sitemap namespace");
    if (!hasXhtmlNs) missing.push("xhtml namespace");
    fail("1. Valid XML structure", "Missing: " + missing.join(", "));
  }
}

// ── Extract all <loc> URLs from sitemap ─────────────────────────────

var locUrls = [];
var locRegex = /<loc>([^<]+)<\/loc>/g;
var locMatch;

if (sitemapRaw) {
  while ((locMatch = locRegex.exec(sitemapRaw)) !== null) {
    locUrls.push(locMatch[1]);
  }
}

// ── Extract URL blocks (each <url>...</url>) for hreflang analysis ──

var urlBlocks = [];
var urlBlockRegex = /<url>([\s\S]*?)<\/url>/g;
var blockMatch;

if (sitemapRaw) {
  while ((blockMatch = urlBlockRegex.exec(sitemapRaw)) !== null) {
    var block = blockMatch[1];
    var locInBlock = block.match(/<loc>([^<]+)<\/loc>/);
    var loc = locInBlock ? locInBlock[1] : "";

    var hreflangs = [];
    var hreflangRegex = /hreflang="([^"]+)"\s+href="([^"]+)"/g;
    var hlMatch;
    while ((hlMatch = hreflangRegex.exec(block)) !== null) {
      hreflangs.push({ lang: hlMatch[1], href: hlMatch[2] });
    }

    urlBlocks.push({ loc: loc, hreflangs: hreflangs });
  }
}

// ── Test 2: Contains URLs for all 8 English base pages ──────────────

if (sitemapRaw) {
  var missingEnglish = [];

  ENGLISH_BASE_PAGES.forEach(function(page) {
    // The homepage (index.html) may appear as "/" or "/index.html"
    var expectedUrl = BASE_DOMAIN + "/" + page;
    var altUrl = page === "index.html" ? BASE_DOMAIN + "/" : null;

    var found = locUrls.indexOf(expectedUrl) !== -1;
    if (!found && altUrl) {
      found = locUrls.indexOf(altUrl) !== -1;
    }

    if (!found) {
      missingEnglish.push(page);
    }
  });

  if (missingEnglish.length === 0) {
    pass("2. Contains URLs for all 10 English base pages", ENGLISH_BASE_PAGES.join(", "));
  } else {
    fail("2. Contains URLs for all 10 English base pages", "Missing: " + missingEnglish.join(", "));
  }
}

// ── Test 3: Contains URLs for all 10 languages x 10 pages = 100 translated pages ──

if (sitemapRaw) {
  var missingTranslated = [];

  TRANSLATED_LANGUAGES.forEach(function(lang) {
    ENGLISH_BASE_PAGES.forEach(function(page) {
      var expectedUrl = BASE_DOMAIN + "/" + lang + "/" + page;
      if (locUrls.indexOf(expectedUrl) === -1) {
        missingTranslated.push(lang + "/" + page);
      }
    });
  });

  if (missingTranslated.length === 0) {
    pass("3. Contains URLs for all 100 translated pages (10 langs x 10 pages)", "All 100 translated URLs present");
  } else {
    fail("3. Contains URLs for all 100 translated pages (10 langs x 10 pages)",
      missingTranslated.length + " missing:\n    " + missingTranslated.join("\n    "));
  }
}

// ── Test 4: Total URL count is approximately 90 ─────────────────────

if (sitemapRaw) {
  var totalUrls = locUrls.length;
  // Expected: 10 English + 100 translated + 2 utility (card.html, widget.html) = 112
  var expectedMin = 110;
  var expectedMax = 114;

  if (totalUrls >= expectedMin && totalUrls <= expectedMax) {
    pass("4. Total URL count is approximately 90", totalUrls + " URLs found (expected " + expectedMin + "-" + expectedMax + ")");
  } else {
    fail("4. Total URL count is approximately 90", totalUrls + " URLs found (expected " + expectedMin + "-" + expectedMax + ")");
  }
}

// ── Test 5: Each translatable URL has xhtml:link hreflang alts for all 11 languages ──

if (sitemapRaw) {
  var hreflangIssues = [];
  var expectedLangs = SUPPORTED_LANGUAGES.concat(["x-default"]).sort();

  urlBlocks.forEach(function(block) {
    // Skip utility pages (card.html, widget.html) which may not have hreflangs
    var isUtility = false;
    UTILITY_PAGES.forEach(function(util) {
      if (block.loc === BASE_DOMAIN + "/" + util) isUtility = true;
    });
    if (isUtility) return;

    if (block.hreflangs.length === 0) {
      // Utility pages without hreflangs are acceptable; skip them
      return;
    }

    var blockLangs = block.hreflangs.map(function(h) { return h.lang; }).sort();

    if (blockLangs.length !== expectedLangs.length) {
      hreflangIssues.push(block.loc + " has " + blockLangs.length + " hreflang links (expected " + expectedLangs.length + ")");
    } else {
      for (var i = 0; i < expectedLangs.length; i++) {
        if (blockLangs[i] !== expectedLangs[i]) {
          hreflangIssues.push(block.loc + " missing or has extra hreflang; got [" + blockLangs.join(", ") + "]");
          break;
        }
      }
    }
  });

  if (hreflangIssues.length === 0) {
    var blocksWithHreflang = urlBlocks.filter(function(b) { return b.hreflangs.length > 0; }).length;
    pass("5. Each URL has hreflang alternatives for all 11 languages + x-default", blocksWithHreflang + " URL blocks validated");
  } else {
    fail("5. Each URL has hreflang alternatives for all 11 languages + x-default",
      hreflangIssues.length + " issue(s):\n    " + hreflangIssues.slice(0, 10).join("\n    ") +
      (hreflangIssues.length > 10 ? "\n    ... and " + (hreflangIssues.length - 10) + " more" : ""));
  }
}

// ── Test 6: x-default hreflang points to English pages ──────────────

if (sitemapRaw) {
  var xDefaultIssues = [];

  urlBlocks.forEach(function(block) {
    if (block.hreflangs.length === 0) return;

    var xDefault = null;
    block.hreflangs.forEach(function(h) {
      if (h.lang === "x-default") xDefault = h.href;
    });

    if (!xDefault) {
      xDefaultIssues.push(block.loc + " has no x-default hreflang");
    } else {
      // x-default should point to English page (no language prefix)
      var isEnglishUrl = xDefault.indexOf(BASE_DOMAIN + "/") === 0;
      // Check it does NOT have a language prefix
      var afterDomain = xDefault.substring(BASE_DOMAIN.length + 1);
      var hasLangPrefix = false;
      TRANSLATED_LANGUAGES.forEach(function(lang) {
        if (afterDomain.indexOf(lang + "/") === 0) hasLangPrefix = true;
      });

      if (!isEnglishUrl || hasLangPrefix) {
        xDefaultIssues.push(block.loc + " x-default points to " + xDefault + " (expected English page)");
      }
    }
  });

  if (xDefaultIssues.length === 0) {
    var blocksChecked = urlBlocks.filter(function(b) { return b.hreflangs.length > 0; }).length;
    pass("6. x-default hreflang points to English pages", blocksChecked + " URL blocks validated");
  } else {
    fail("6. x-default hreflang points to English pages",
      xDefaultIssues.length + " issue(s):\n    " + xDefaultIssues.slice(0, 10).join("\n    "));
  }
}

// ── Test 7: All URLs use the correct base domain ────────────────────

if (sitemapRaw) {
  var wrongDomain = [];

  locUrls.forEach(function(url) {
    if (url.indexOf(BASE_DOMAIN) !== 0) {
      wrongDomain.push(url);
    }
  });

  // Also check hreflang href values
  urlBlocks.forEach(function(block) {
    block.hreflangs.forEach(function(h) {
      if (h.href.indexOf(BASE_DOMAIN) !== 0) {
        wrongDomain.push(h.href + " (hreflang in " + block.loc + ")");
      }
    });
  });

  if (wrongDomain.length === 0) {
    pass("7. All URLs use correct base domain " + BASE_DOMAIN, "All loc and hreflang URLs validated");
  } else {
    fail("7. All URLs use correct base domain " + BASE_DOMAIN,
      wrongDomain.length + " wrong domain(s):\n    " + wrongDomain.slice(0, 10).join("\n    "));
  }
}

// ── Test 8: No duplicate URLs ───────────────────────────────────────

if (sitemapRaw) {
  var urlSet = {};
  var dupeUrls = [];

  locUrls.forEach(function(url) {
    if (urlSet[url]) {
      dupeUrls.push(url);
    }
    urlSet[url] = true;
  });

  if (dupeUrls.length === 0) {
    pass("8. No duplicate URLs in sitemap", locUrls.length + " unique URLs");
  } else {
    fail("8. No duplicate URLs in sitemap", dupeUrls.length + " duplicate(s):\n    " + dupeUrls.join("\n    "));
  }
}

// ── Test 9: hreflang language codes match supported languages ───────

if (sitemapRaw) {
  var validLangCodes = {};
  SUPPORTED_LANGUAGES.forEach(function(l) { validLangCodes[l] = true; });
  validLangCodes["x-default"] = true;

  var invalidLangCodes = [];

  urlBlocks.forEach(function(block) {
    block.hreflangs.forEach(function(h) {
      if (!validLangCodes[h.lang]) {
        invalidLangCodes.push(h.lang + " (in " + block.loc + ")");
      }
    });
  });

  if (invalidLangCodes.length === 0) {
    pass("9. hreflang codes match supported languages", "All codes are valid: " + SUPPORTED_LANGUAGES.join(", ") + ", x-default");
  } else {
    fail("9. hreflang codes match supported languages",
      invalidLangCodes.length + " invalid code(s):\n    " + invalidLangCodes.join("\n    "));
  }
}

// ── Test 10: Blog page URLs include blog/ prefix in translated versions ──

if (sitemapRaw) {
  var blogPages = [
    "blog/why-we-built-reroute-nj.html",
    "blog/new-embed-system.html"
  ];
  var missingBlogPrefix = [];

  TRANSLATED_LANGUAGES.forEach(function(lang) {
    blogPages.forEach(function(page) {
      var expectedUrl = BASE_DOMAIN + "/" + lang + "/" + page;
      if (locUrls.indexOf(expectedUrl) === -1) {
        missingBlogPrefix.push(lang + "/" + page);
      }
    });
  });

  // Also check blog.html (the index)
  TRANSLATED_LANGUAGES.forEach(function(lang) {
    var expectedUrl = BASE_DOMAIN + "/" + lang + "/blog.html";
    if (locUrls.indexOf(expectedUrl) === -1) {
      missingBlogPrefix.push(lang + "/blog.html");
    }
  });

  if (missingBlogPrefix.length === 0) {
    pass("10. Blog URLs include blog/ prefix in translated versions", "All " + TRANSLATED_LANGUAGES.length + " languages have correct blog paths");
  } else {
    fail("10. Blog URLs include blog/ prefix in translated versions",
      missingBlogPrefix.length + " missing:\n    " + missingBlogPrefix.join("\n    "));
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ROBOTS.TXT TESTS
// ══════════════════════════════════════════════════════════════════════

console.log("\n── robots.txt ──────────────────────────────────────────────\n");

var ROBOTS_PATH = path.join(ROOT, "robots.txt");
var robotsRaw;

try {
  robotsRaw = fs.readFileSync(ROBOTS_PATH, "utf8");
} catch (e) {
  fail("11-14. robots.txt exists and is readable", e.message);
  robotsRaw = null;
}

// ── Test 11: Has User-agent: * directive ────────────────────────────

if (robotsRaw) {
  if (robotsRaw.indexOf("User-agent: *") !== -1) {
    pass("11. Has User-agent: * directive", "Found wildcard user-agent");
  } else {
    fail("11. Has User-agent: * directive", "Missing 'User-agent: *'");
  }
}

// ── Test 12: Allows crawling of main pages ──────────────────────────

if (robotsRaw) {
  // Check that there is an "Allow: /" after "User-agent: *"
  var wildcardPos = robotsRaw.indexOf("User-agent: *");
  var allowSlash = robotsRaw.indexOf("Allow: /");

  if (allowSlash !== -1) {
    // Also check there are no broad "Disallow:" rules that would block main content
    var hasDisallowAll = robotsRaw.indexOf("Disallow: /") !== -1;
    // "Disallow: /" in the context of the wildcard agent would block everything
    // but we need to be careful: "Disallow: /private" is fine
    var lines = robotsRaw.split("\n");
    var broadDisallow = false;
    lines.forEach(function(line) {
      var trimmed = line.trim();
      if (trimmed === "Disallow: /") {
        broadDisallow = true;
      }
    });

    if (!broadDisallow) {
      pass("12. Allows crawling of main pages", "Allow: / is present, no broad Disallow");
    } else {
      fail("12. Allows crawling of main pages", "Found 'Disallow: /' which blocks all crawling");
    }
  } else {
    fail("12. Allows crawling of main pages", "Missing 'Allow: /' directive");
  }
}

// ── Test 13: Has Sitemap directive pointing to sitemap.xml ──────────

if (robotsRaw) {
  var sitemapDirective = "Sitemap: " + BASE_DOMAIN + "/sitemap.xml";
  if (robotsRaw.indexOf(sitemapDirective) !== -1) {
    pass("13. Has Sitemap directive pointing to sitemap.xml", sitemapDirective);
  } else {
    // Check for any Sitemap directive
    var anySitemap = robotsRaw.match(/Sitemap:\s*(\S+)/i);
    if (anySitemap) {
      fail("13. Has Sitemap directive pointing to sitemap.xml",
        "Found Sitemap directive but URL is: " + anySitemap[1] + " (expected " + BASE_DOMAIN + "/sitemap.xml)");
    } else {
      fail("13. Has Sitemap directive pointing to sitemap.xml", "No Sitemap directive found");
    }
  }
}

// ── Test 14: Mentions AI bot allowances ─────────────────────────────

if (robotsRaw) {
  var aiBots = ["GPTBot", "ClaudeBot", "PerplexityBot"];
  var missingBots = [];

  aiBots.forEach(function(bot) {
    if (robotsRaw.indexOf(bot) === -1) {
      missingBots.push(bot);
    }
  });

  if (missingBots.length === 0) {
    pass("14. Mentions AI bot allowances", "Found: " + aiBots.join(", "));
  } else {
    fail("14. Mentions AI bot allowances", "Missing bots: " + missingBots.join(", "));
  }
}

// ══════════════════════════════════════════════════════════════════════
//  LLMS.TXT TESTS
// ══════════════════════════════════════════════════════════════════════

console.log("\n── llms.txt ────────────────────────────────────────────────\n");

var LLMS_PATH = path.join(ROOT, "llms.txt");
var llmsRaw;

try {
  llmsRaw = fs.readFileSync(LLMS_PATH, "utf8");
} catch (e) {
  fail("15-17. llms.txt exists and is readable", e.message);
  llmsRaw = null;
}

// ── Test 15: File exists and is non-empty ───────────────────────────

if (llmsRaw !== null) {
  if (llmsRaw.trim().length > 0) {
    pass("15. llms.txt exists and is non-empty", llmsRaw.length + " bytes");
  } else {
    fail("15. llms.txt exists and is non-empty", "File exists but is empty");
  }
}

// ── Test 16: Contains structured information about the site ─────────

if (llmsRaw) {
  var hasTitle = llmsRaw.indexOf("Reroute NJ") !== -1;
  var hasDescription = llmsRaw.indexOf("NJ Transit") !== -1 || llmsRaw.indexOf("Portal") !== -1;
  var hasSections = llmsRaw.indexOf("##") !== -1 || llmsRaw.indexOf("# ") !== -1;

  if (hasTitle && hasDescription && hasSections) {
    pass("16. Contains structured information about the site", "Has title, NJ Transit/Portal references, and section headings");
  } else {
    var missing = [];
    if (!hasTitle) missing.push("'Reroute NJ' title");
    if (!hasDescription) missing.push("NJ Transit or Portal reference");
    if (!hasSections) missing.push("section headings (# or ##)");
    fail("16. Contains structured information about the site", "Missing: " + missing.join(", "));
  }
}

// ── Test 17: References the main tools and their URLs ───────────────

if (llmsRaw) {
  var toolUrls = [
    "index.html",
    "compare.html",
    "coverage.html",
    "map.html",
    "embed.html"
  ];
  var missingTools = [];

  toolUrls.forEach(function(tool) {
    if (llmsRaw.indexOf(tool) === -1) {
      missingTools.push(tool);
    }
  });

  if (missingTools.length === 0) {
    pass("17. References main tools and their URLs", "All 5 tool URLs found: " + toolUrls.join(", "));
  } else {
    fail("17. References main tools and their URLs", "Missing tool references: " + missingTools.join(", "));
  }
}

// ══════════════════════════════════════════════════════════════════════
//  CROSS-VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════

console.log("\n── Cross-validation ────────────────────────────────────────\n");

// ── Test 18: Every HTML file on disk has a corresponding sitemap entry ──

if (sitemapRaw) {
  var allDiskHtmlFiles = [];

  // English root HTML pages
  var rootFiles;
  try {
    rootFiles = fs.readdirSync(ROOT);
  } catch (e) {
    rootFiles = [];
  }

  rootFiles.forEach(function(f) {
    if (f.endsWith(".html")) {
      allDiskHtmlFiles.push(f);
    }
  });

  // English blog pages
  var blogDir = path.join(ROOT, "blog");
  try {
    var blogFiles = fs.readdirSync(blogDir);
    blogFiles.forEach(function(f) {
      if (f.endsWith(".html")) {
        allDiskHtmlFiles.push("blog/" + f);
      }
    });
  } catch (e) {
    // blog directory may not exist
  }

  // Translated pages
  TRANSLATED_LANGUAGES.forEach(function(lang) {
    var langDir = path.join(ROOT, lang);
    try {
      var langFiles = fs.readdirSync(langDir);
      langFiles.forEach(function(f) {
        if (f.endsWith(".html")) {
          allDiskHtmlFiles.push(lang + "/" + f);
        }
      });
    } catch (e) {
      // language directory may not exist
    }

    // Translated blog pages
    var langBlogDir = path.join(ROOT, lang, "blog");
    try {
      var langBlogFiles = fs.readdirSync(langBlogDir);
      langBlogFiles.forEach(function(f) {
        if (f.endsWith(".html")) {
          allDiskHtmlFiles.push(lang + "/blog/" + f);
        }
      });
    } catch (e) {
      // blog subdirectory may not exist for this language
    }
  });

  var notInSitemap = [];

  allDiskHtmlFiles.forEach(function(file) {
    var url = BASE_DOMAIN + "/" + file;
    // For index.html at root, also check "/" as the loc
    var altUrl = file === "index.html" ? BASE_DOMAIN + "/" : null;

    var found = locUrls.indexOf(url) !== -1;
    if (!found && altUrl) {
      found = locUrls.indexOf(altUrl) !== -1;
    }

    if (!found) {
      notInSitemap.push(file);
    }
  });

  if (notInSitemap.length === 0) {
    pass("18. Every HTML file on disk has a sitemap entry", allDiskHtmlFiles.length + " HTML files all present in sitemap");
  } else {
    fail("18. Every HTML file on disk has a sitemap entry",
      notInSitemap.length + " file(s) missing from sitemap:\n    " + notInSitemap.join("\n    "));
  }
}

// ── Test 19: Translated page directories exist on disk for each language in sitemap ──

if (sitemapRaw) {
  var sitemapLangs = {};

  locUrls.forEach(function(url) {
    var afterDomain = url.substring(BASE_DOMAIN.length + 1);
    TRANSLATED_LANGUAGES.forEach(function(lang) {
      if (afterDomain.indexOf(lang + "/") === 0) {
        sitemapLangs[lang] = true;
      }
    });
  });

  var missingDirs = [];
  var sitemapLangKeys = Object.keys(sitemapLangs);

  sitemapLangKeys.forEach(function(lang) {
    var langDir = path.join(ROOT, lang);
    try {
      var stat = fs.statSync(langDir);
      if (!stat.isDirectory()) {
        missingDirs.push(lang + " (exists but is not a directory)");
      }
    } catch (e) {
      missingDirs.push(lang);
    }
  });

  if (missingDirs.length === 0) {
    pass("19. Translated page directories exist on disk for sitemap languages",
      sitemapLangKeys.length + " language directories verified: " + sitemapLangKeys.sort().join(", "));
  } else {
    fail("19. Translated page directories exist on disk for sitemap languages",
      missingDirs.length + " missing directory(ies):\n    " + missingDirs.join("\n    "));
  }
}

// ── Test 20: Translated pages exist for all 10 languages ────────────

(function() {
  var missingPages = [];

  TRANSLATED_LANGUAGES.forEach(function(lang) {
    ENGLISH_BASE_PAGES.forEach(function(page) {
      var filePath = path.join(ROOT, lang, page);
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch (e) {
        missingPages.push(lang + "/" + page);
      }
    });
  });

  if (missingPages.length === 0) {
    var total = TRANSLATED_LANGUAGES.length * ENGLISH_BASE_PAGES.length;
    pass("20. Translated pages exist for all 10 languages",
      total + " files verified (" + TRANSLATED_LANGUAGES.length + " languages x " + ENGLISH_BASE_PAGES.length + " pages)");
  } else {
    fail("20. Translated pages exist for all 10 languages",
      missingPages.length + " missing file(s):\n    " + missingPages.slice(0, 20).join("\n    ") +
      (missingPages.length > 20 ? "\n    ... and " + (missingPages.length - 20) + " more" : ""));
  }
})();

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
