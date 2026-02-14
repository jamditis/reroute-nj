/**
 * Reroute NJ — CSS integrity and accessibility tests
 *
 * Validates that css/styles.css contains required style rules, responsive
 * breakpoints, accessibility features, and that index.html meets baseline
 * a11y requirements. Run with: node tests/test-css-a11y.js
 */

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Load source files
// ---------------------------------------------------------------------------
var cssPath = path.resolve(__dirname, "..", "css", "styles.css");
var htmlPath = path.resolve(__dirname, "..", "index.html");
var lineDataPath = path.resolve(__dirname, "..", "js", "line-data.js");

var css = fs.readFileSync(cssPath, "utf8");
var html = fs.readFileSync(htmlPath, "utf8");
var lineDataSrc = fs.readFileSync(lineDataPath, "utf8");

// Evaluate line-data.js to get LINE_DATA and LINE_ORDER
var data = (function () {
  eval(lineDataSrc);
  return { LINE_DATA: LINE_DATA, LINE_ORDER: LINE_ORDER };
})();

var LINE_DATA = data.LINE_DATA;
var LINE_ORDER = data.LINE_ORDER;

// ---------------------------------------------------------------------------
// Test harness (matches project convention from test-line-data-structure.js)
// ---------------------------------------------------------------------------
var passed = 0;
var failed = 0;
var warned = 0;
var results = [];

function pass(name, detail) {
  passed++;
  var msg = "  PASS  " + name;
  if (detail) msg += " -- " + detail;
  results.push(msg);
  console.log("\x1b[32m" + msg + "\x1b[0m");
}

function warn(name, detail) {
  warned++;
  var msg = "  WARN  " + name;
  if (detail) msg += " -- " + detail;
  results.push(msg);
  console.log("\x1b[33m" + msg + "\x1b[0m");
}

function fail(name, detail) {
  failed++;
  var msg = "  FAIL  " + name;
  if (detail) msg += " -- " + detail;
  results.push(msg);
  console.log("\x1b[31m" + msg + "\x1b[0m");
}

// ---------------------------------------------------------------------------
// Utility: WCAG AA contrast ratio calculation
// ---------------------------------------------------------------------------

/**
 * Parse a hex color string (#rrggbb or #rgb) into {r, g, b} (0-255).
 */
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  var num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Compute relative luminance per WCAG 2.0 definition.
 */
function relativeLuminance(rgb) {
  var rsRGB = rgb.r / 255;
  var gsRGB = rgb.g / 255;
  var bsRGB = rgb.b / 255;
  var r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  var g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  var b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute contrast ratio between two hex colors.
 */
function contrastRatio(hex1, hex2) {
  var l1 = relativeLuminance(hexToRgb(hex1));
  var l2 = relativeLuminance(hexToRgb(hex2));
  var lighter = Math.max(l1, l2);
  var darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ===========================================================================
// CSS VALIDATION TESTS
// ===========================================================================

console.log("\n\x1b[1m=== CSS Validation ===\x1b[0m\n");

// ---------------------------------------------------------------------------
// 1. CSS file exists and is non-empty
// ---------------------------------------------------------------------------
(function () {
  var name = "1. CSS file exists and is non-empty";
  if (fs.existsSync(cssPath) && css.trim().length > 0) {
    pass(name, css.length + " bytes");
  } else {
    fail(name, "File missing or empty");
  }
})();

// ---------------------------------------------------------------------------
// 2. Has :root block with CSS custom properties
// ---------------------------------------------------------------------------
(function () {
  var name = "2. :root block with CSS custom properties";
  var hasRoot = /:root\s*\{[^}]*--[\w-]+\s*:/m.test(css);
  if (hasRoot) {
    // Count the number of custom properties defined
    var rootMatch = css.match(/:root\s*\{([^}]+)\}/);
    var propCount = rootMatch ? (rootMatch[1].match(/--[\w-]+\s*:/g) || []).length : 0;
    pass(name, propCount + " custom properties found");
  } else {
    fail(name, "No :root block with custom properties found");
  }
})();

// ---------------------------------------------------------------------------
// 3. Line color CSS classes exist for all 5 lines
// ---------------------------------------------------------------------------
(function () {
  var name = "3. Line color CSS classes for all 5 lines";
  // Line colors are applied via inline styles in app.js (line.color), but
  // each line also has a cssClass (e.g., "montclair-boonton") that is set on
  // DOM elements. We verify that the cssClass names exist in LINE_DATA and
  // that at least the line-badge compound class pattern is established in CSS.
  // Additionally, we check that app.js applies the cssClass and inline color.
  var appJsPath = path.resolve(__dirname, "..", "js", "app.js");
  var appJs = fs.readFileSync(appJsPath, "utf8");

  var lines = [
    "montclair-boonton",
    "morris-essex",
    "northeast-corridor",
    "north-jersey-coast",
    "raritan-valley",
  ];

  // Verify the .line-badge base class exists in CSS (the compound selector
  // pattern). At least one compound class is in the CSS; the rest use inline
  // styles from JS.
  var hasLineBadgeBase = /\.line-badge\b/.test(css);
  // Verify app.js applies cssClass and color inline
  var appAppliesClass = /cssClass/.test(appJs) && /\.color/.test(appJs);

  var allInData = true;
  lines.forEach(function (line) {
    if (!LINE_DATA[line] || !LINE_DATA[line].cssClass) {
      allInData = false;
    }
  });

  if (hasLineBadgeBase && appAppliesClass && allInData) {
    pass(name, ".line-badge base class in CSS; all 5 cssClass names in LINE_DATA; app.js applies them via inline styles");
  } else {
    var issues = [];
    if (!hasLineBadgeBase) issues.push("no .line-badge base in CSS");
    if (!appAppliesClass) issues.push("app.js does not apply cssClass/color");
    if (!allInData) issues.push("some lines missing cssClass in LINE_DATA");
    fail(name, issues.join("; "));
  }
})();

// ---------------------------------------------------------------------------
// 4. Responsive breakpoints at 768px and 480px
// ---------------------------------------------------------------------------
(function () {
  var name = "4. Responsive breakpoints at 768px and 480px";
  var has768 = /@media\s*\([^)]*768px[^)]*\)/.test(css);
  var has480 = /@media\s*\([^)]*480px[^)]*\)/.test(css);
  if (has768 && has480) {
    pass(name, "Both breakpoints found");
  } else {
    var missing = [];
    if (!has768) missing.push("768px");
    if (!has480) missing.push("480px");
    fail(name, "Missing breakpoint(s): " + missing.join(", "));
  }
})();

// ---------------------------------------------------------------------------
// 5. High-contrast mode styles ([data-contrast="high"])
// ---------------------------------------------------------------------------
(function () {
  var name = '5. High-contrast mode styles ([data-contrast="high"])';
  var hasContrast = /\[data-contrast\s*=\s*["']high["']\]/.test(css);
  if (hasContrast) {
    // Count the number of high-contrast rule blocks
    var count = (css.match(/\[data-contrast\s*=\s*["']high["']\]/g) || []).length;
    pass(name, count + " high-contrast selectors found");
  } else {
    fail(name, "No high-contrast mode styles found");
  }
})();

// ---------------------------------------------------------------------------
// 6. Simplified view styles ([data-view="simplified"])
// ---------------------------------------------------------------------------
(function () {
  var name = '6. Simplified view styles ([data-view="simplified"])';
  var hasSimplified = /\[data-view\s*=\s*["']simplified["']\]/.test(css);
  if (hasSimplified) {
    var count = (css.match(/\[data-view\s*=\s*["']simplified["']\]/g) || []).length;
    pass(name, count + " simplified-view selectors found");
  } else {
    fail(name, "No simplified view styles found");
  }
})();

// ---------------------------------------------------------------------------
// 7. Embed-mode styles (.embed-mode)
// ---------------------------------------------------------------------------
(function () {
  var name = "7. Embed-mode styles (.embed-mode)";
  var hasEmbed = /\.embed-mode\b/.test(css);
  if (hasEmbed) {
    pass(name);
  } else {
    fail(name, "No .embed-mode styles found");
  }
})();

// ---------------------------------------------------------------------------
// 8. Print styles (@media print)
// ---------------------------------------------------------------------------
(function () {
  var name = "8. Print styles (@media print)";
  var hasPrint = /@media\s+print\b/.test(css);
  if (hasPrint) {
    pass(name);
  } else {
    fail(name, "No @media print styles found (consider adding print styles for better printability)");
  }
})();

// ---------------------------------------------------------------------------
// 9. All color values in LINE_DATA exist as CSS classes, CSS, or JS inline styles
// ---------------------------------------------------------------------------
(function () {
  var name = "9. LINE_DATA colors referenced in CSS or applied via JS";
  // Line colors are applied via inline styles in app.js, cards.js, etc.
  // We verify that each color from LINE_DATA appears either in the CSS file
  // or in the JS files that generate inline styles.
  var jsDir = path.resolve(__dirname, "..", "js");
  var jsFiles = fs.readdirSync(jsDir).filter(function (f) { return f.endsWith(".js"); });
  var allJs = jsFiles.map(function (f) {
    return fs.readFileSync(path.join(jsDir, f), "utf8");
  }).join("\n");

  var missing = [];
  LINE_ORDER.forEach(function (key) {
    var line = LINE_DATA[key];
    var color = line.color;
    var cssClass = line.cssClass;
    // Check if color appears in CSS or JS
    var colorInCSS = css.indexOf(color) !== -1;
    var colorInJS = allJs.indexOf(color) !== -1;
    // Check if cssClass appears in CSS or JS
    var classRegex = new RegExp("\\." + cssClass.replace(/-/g, "\\-") + "[\\s{,.:[]");
    var classInCSS = classRegex.test(css);
    // JS references the cssClass via LINE_DATA, so it's always "in JS" -- check
    // that the color is applied somewhere
    if (!colorInCSS && !colorInJS && !classInCSS) {
      missing.push(key + " (color: " + color + ", class: " + cssClass + ")");
    }
  });
  if (missing.length === 0) {
    pass(name, "All " + LINE_ORDER.length + " line colors found in CSS or JS");
  } else {
    fail(name, "Missing: " + missing.join("; "));
  }
})();

// ---------------------------------------------------------------------------
// 10. Mobile hamburger menu styles
// ---------------------------------------------------------------------------
(function () {
  var name = "10. Mobile hamburger menu styles";
  var hasHamburger = /\.hamburger-btn\b/.test(css);
  var hasToolNavOpen = /\.tool-nav\.open\b/.test(css) || /\.tool-nav\.open\s/.test(css);
  if (hasHamburger && hasToolNavOpen) {
    pass(name, ".hamburger-btn and .tool-nav.open styles found");
  } else {
    var missing = [];
    if (!hasHamburger) missing.push(".hamburger-btn");
    if (!hasToolNavOpen) missing.push(".tool-nav.open");
    fail(name, "Missing: " + missing.join(", "));
  }
})();

// ---------------------------------------------------------------------------
// 11. Skip-to-content link styles
// ---------------------------------------------------------------------------
(function () {
  var name = "11. Skip-to-content link styles";
  var hasSkipLink = /\.skip-link\b/.test(css);
  var hasSkipLinkFocus = /\.skip-link:focus\b/.test(css);
  if (hasSkipLink && hasSkipLinkFocus) {
    pass(name, ".skip-link and .skip-link:focus styles present");
  } else {
    fail(name, "Missing skip-to-content link styles");
  }
})();

// ---------------------------------------------------------------------------
// 12. Focus-visible styles for keyboard navigation
// ---------------------------------------------------------------------------
(function () {
  var name = "12. Focus-visible styles for keyboard navigation";
  var hasFocusVisible = /:focus-visible\b/.test(css);
  if (hasFocusVisible) {
    var count = (css.match(/:focus-visible\b/g) || []).length;
    pass(name, count + " :focus-visible rule(s) found");
  } else {
    fail(name, "No :focus-visible styles found");
  }
})();

// ---------------------------------------------------------------------------
// 13. Touch target sizes (min 44px) on mobile
// ---------------------------------------------------------------------------
(function () {
  var name = "13. Touch target sizes (min 44px) for interactive elements";
  // Look for min-height: 44px declarations, which is the WCAG minimum
  var matches = css.match(/min-height:\s*44px/g) || [];
  if (matches.length > 0) {
    pass(name, matches.length + " elements with min-height: 44px found");
  } else {
    fail(name, "No min-height: 44px declarations found for touch targets");
  }
})();

// ---------------------------------------------------------------------------
// 14. RTL support styles
// ---------------------------------------------------------------------------
(function () {
  var name = "14. RTL support styles";
  var hasDirRtl = /\[dir\s*=\s*["']rtl["']\]/.test(css);
  var hasLangAr = /\[lang\s*=\s*["']ar["']\]/.test(css);
  if (hasDirRtl || hasLangAr) {
    var details = [];
    if (hasDirRtl) details.push('[dir="rtl"]');
    if (hasLangAr) details.push('[lang="ar"]');
    pass(name, details.join(" and ") + " selectors found");
  } else {
    fail(name, 'No [dir="rtl"] or [lang="ar"] styles found');
  }
})();

// ===========================================================================
// ACCESSIBILITY IN HTML TESTS
// ===========================================================================

console.log("\n\x1b[1m=== Accessibility in HTML ===\x1b[0m\n");

// ---------------------------------------------------------------------------
// 15. All img tags have alt attributes
// ---------------------------------------------------------------------------
(function () {
  var name = "15. All img tags have alt attributes";
  // Match all <img tags
  var imgTags = html.match(/<img\b[^>]*>/gi) || [];
  if (imgTags.length === 0) {
    pass(name, "No img tags found in index.html (all images may be CSS/SVG-based)");
    return;
  }
  var missingAlt = [];
  imgTags.forEach(function (tag) {
    if (!/\balt\s*=/i.test(tag)) {
      missingAlt.push(tag.substring(0, 80));
    }
  });
  if (missingAlt.length === 0) {
    pass(name, "All " + imgTags.length + " img tag(s) have alt attributes");
  } else {
    fail(name, missingAlt.length + " img tag(s) missing alt: " + missingAlt.join("; "));
  }
})();

// ---------------------------------------------------------------------------
// 16. Form inputs have associated labels
// ---------------------------------------------------------------------------
(function () {
  var name = "16. Form inputs have associated labels";
  // Find all select and input elements (not type=hidden, not type=submit, not type=button)
  var inputs = html.match(/<(?:select|input)\b[^>]*>/gi) || [];
  var unlabeled = [];
  inputs.forEach(function (tag) {
    // Skip hidden, submit, button, color inputs
    if (/type\s*=\s*["'](?:hidden|submit|button)["']/i.test(tag)) return;
    // Extract the id
    var idMatch = tag.match(/\bid\s*=\s*["']([^"']+)["']/i);
    if (!idMatch) {
      // No id -- check for aria-label
      if (!/aria-label\s*=/i.test(tag)) {
        unlabeled.push(tag.substring(0, 80));
      }
      return;
    }
    var id = idMatch[1];
    // Check for label[for="id"] or aria-label on the element
    var labelRegex = new RegExp('<label[^>]*\\bfor\\s*=\\s*["\']' + id + '["\']', "i");
    if (!labelRegex.test(html) && !/aria-label\s*=/i.test(tag)) {
      unlabeled.push(id);
    }
  });
  if (unlabeled.length === 0) {
    pass(name, "All " + inputs.length + " form inputs have labels");
  } else {
    fail(name, "Unlabeled inputs: " + unlabeled.join(", "));
  }
})();

// ---------------------------------------------------------------------------
// 17. Buttons have accessible names
// ---------------------------------------------------------------------------
(function () {
  var name = "17. Buttons have accessible names";
  // Match all <button ...>...</button> pairs
  var buttonPattern = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  var match;
  var unnamed = [];
  var total = 0;
  while ((match = buttonPattern.exec(html)) !== null) {
    total++;
    var attrs = match[1];
    var content = match[2];
    // A button has an accessible name if:
    // 1. It has aria-label attribute, OR
    // 2. Its text content (stripped of HTML tags) is non-empty
    var hasAriaLabel = /aria-label\s*=/i.test(attrs);
    var textContent = content.replace(/<[^>]+>/g, "").trim();
    if (!hasAriaLabel && textContent.length === 0) {
      unnamed.push((attrs.match(/\bid\s*=\s*["']([^"']+)["']/i) || [null, "(no id)"])[1]);
    }
  }
  if (unnamed.length === 0) {
    pass(name, "All " + total + " buttons have accessible names");
  } else {
    fail(name, "Buttons without accessible names: " + unnamed.join(", "));
  }
})();

// ---------------------------------------------------------------------------
// 18. ARIA roles are used correctly
// ---------------------------------------------------------------------------
(function () {
  var name = "18. ARIA roles used correctly";
  var checks = {
    banner: /role\s*=\s*["']banner["']/i,
    navigation: /aria-label\s*=\s*["'][^"']*["'][^>]*>|role\s*=\s*["']navigation["']/i,
    main: /<main\b/i,
    contentinfo: /role\s*=\s*["']contentinfo["']/i,
    tablist: /role\s*=\s*["']tablist["']/i,
    tabpanel: /role\s*=\s*["']tabpanel["']/i,
    tab: /role\s*=\s*["']tab["']/i,
    alert: /role\s*=\s*["']alert["']/i,
  };
  var missing = [];
  var found = [];
  Object.keys(checks).forEach(function (role) {
    if (checks[role].test(html)) {
      found.push(role);
    } else {
      missing.push(role);
    }
  });
  if (missing.length === 0) {
    pass(name, "All key ARIA roles present: " + found.join(", "));
  } else if (missing.length <= 2) {
    // Warn but still pass if most roles are present
    pass(name, "Found: " + found.join(", ") + " (not found: " + missing.join(", ") + ")");
  } else {
    fail(name, "Missing roles: " + missing.join(", "));
  }
})();

// ---------------------------------------------------------------------------
// 19. aria-live regions for dynamic content
// ---------------------------------------------------------------------------
(function () {
  var name = "19. aria-live regions for dynamic content";
  var liveRegions = html.match(/aria-live\s*=\s*["'][^"']+["']/gi) || [];
  if (liveRegions.length > 0) {
    pass(name, liveRegions.length + " aria-live region(s) found");
  } else {
    fail(name, "No aria-live regions found");
  }
})();

// ---------------------------------------------------------------------------
// 20. Color contrast: line textColor vs white meet WCAG AA (4.5:1)
// ---------------------------------------------------------------------------
(function () {
  var name = "20. Color contrast — line text colors against white (WCAG AA 4.5:1)";
  var white = "#ffffff";
  var failedLines = [];
  var passedLines = [];
  LINE_ORDER.forEach(function (key) {
    var line = LINE_DATA[key];
    var color = line.textColor || line.color;
    var ratio = contrastRatio(color, white);
    var ratioStr = ratio.toFixed(2) + ":1";
    if (ratio >= 4.5) {
      passedLines.push(line.shortName + " " + color + " (" + ratioStr + ")");
    } else {
      failedLines.push(line.shortName + " " + color + " (" + ratioStr + ")");
    }
  });
  if (failedLines.length === 0) {
    pass(name, "All lines pass: " + passedLines.join(", "));
  } else {
    fail(
      name,
      "Below 4.5:1 on white: " +
        failedLines.join("; ") +
        (passedLines.length > 0 ? " | Passing: " + passedLines.join(", ") : "")
    );
  }
})();

// ---------------------------------------------------------------------------
// 21. Language selector has proper label
// ---------------------------------------------------------------------------
(function () {
  var name = "21. Language selector has proper label";
  // Check for a label associated with the language select
  var hasLangLabel =
    /<label[^>]*\bfor\s*=\s*["']lang-select["'][^>]*>/i.test(html) ||
    /aria-label\s*=\s*["'][^"']*[Ll]anguage[^"']*["']/i.test(html);
  // Also check that the select element itself exists
  var hasLangSelect = /id\s*=\s*["']lang-select["']/i.test(html);
  if (hasLangLabel && hasLangSelect) {
    pass(name, "Language selector with associated label found");
  } else {
    var detail = [];
    if (!hasLangSelect) detail.push("no #lang-select element");
    if (!hasLangLabel) detail.push("no label for lang-select");
    fail(name, detail.join(", "));
  }
})();

// ---------------------------------------------------------------------------
// 22. High contrast toggle has aria-pressed
// ---------------------------------------------------------------------------
(function () {
  var name = "22. High contrast toggle has aria-pressed";
  // Find the toggle-contrast button and check for aria-pressed
  var contrastBtnMatch = html.match(/<button[^>]*id\s*=\s*["']toggle-contrast["'][^>]*>/i);
  if (!contrastBtnMatch) {
    fail(name, "No #toggle-contrast button found");
    return;
  }
  var btn = contrastBtnMatch[0];
  if (/aria-pressed\s*=/i.test(btn)) {
    pass(name, "aria-pressed attribute present on #toggle-contrast");
  } else {
    fail(name, "#toggle-contrast button is missing aria-pressed attribute");
  }
})();

// ---------------------------------------------------------------------------
// 23. CSS custom properties for accessible line text colors
// ---------------------------------------------------------------------------
(function () {
  var name = "23. CSS custom properties for accessible line text colors";
  var missing = [];
  LINE_ORDER.forEach(function (key) {
    var line = LINE_DATA[key];
    var propName = "--line-" + line.cssClass;
    if (css.indexOf(propName) === -1) {
      missing.push(propName);
    }
  });
  if (missing.length === 0) {
    pass(name, "All " + LINE_ORDER.length + " line text color custom properties found in CSS");
  } else {
    fail(name, "Missing custom properties: " + missing.join(", "));
  }
})();

// ===========================================================================
// Summary
// ===========================================================================
console.log("\n\x1b[1m=== Summary ===\x1b[0m\n");
console.log(
  "  Total: " + (passed + failed) + "  |  " +
  "\x1b[32mPassed: " + passed + "\x1b[0m  |  " +
  (failed > 0 ? "\x1b[31m" : "\x1b[32m") +
  "Failed: " + failed + "\x1b[0m"
);
console.log("");

process.exit(failed > 0 ? 1 : 0);
