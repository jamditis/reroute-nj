/**
 * Reroute NJ — Transit Data Fact-Check Test Suite
 *
 * Validates LINE_DATA, shared.js dates, and coverage.json against
 * known NJ Transit facts for the Portal North Bridge cutover.
 *
 * Run:  node tests/test-transit-facts.js
 */

var fs = require("fs");
var path = require("path");
var vm = require("vm");

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------

// LINE_DATA and LINE_ORDER are declared with `var` at the top level of
// line-data.js. We use vm.runInThisContext so the vars land in global scope
// (eval in strict mode would create a separate scope).
var lineDataSource = fs.readFileSync(
  path.join(__dirname, "..", "js", "line-data.js"),
  "utf8"
);
vm.runInThisContext(lineDataSource); // defines LINE_DATA, LINE_ORDER

// Parse shared.js to extract CUTOVER_START and CUTOVER_END strings.
var sharedSource = fs.readFileSync(
  path.join(__dirname, "..", "js", "shared.js"),
  "utf8"
);
// Extract date strings from var declarations
var startMatch = sharedSource.match(
  /var\s+CUTOVER_START\s*=\s*new\s+Date\(\s*["']([^"']+)["']\s*\)/
);
var endMatch = sharedSource.match(
  /var\s+CUTOVER_END\s*=\s*new\s+Date\(\s*["']([^"']+)["']\s*\)/
);
var CUTOVER_START = startMatch ? new Date(startMatch[1]) : null;
var CUTOVER_END = endMatch ? new Date(endMatch[1]) : null;

var coverageData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "data", "coverage.json"),
    "utf8"
  )
);
var articles = coverageData.articles;

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

var totalTests = 0;
var passed = 0;
var failed = 0;
var failures = [];

function test(id, description, fn) {
  totalTests++;
  try {
    var result = fn();
    if (result === true) {
      passed++;
      console.log("PASS  #" + id + " — " + description);
    } else {
      failed++;
      var msg = typeof result === "string" ? result : "returned falsy";
      failures.push({ id: id, description: description, reason: msg });
      console.log("FAIL  #" + id + " — " + description);
      console.log("       Reason: " + msg);
    }
  } catch (e) {
    failed++;
    failures.push({ id: id, description: description, reason: e.message });
    console.log("FAIL  #" + id + " — " + description);
    console.log("       Error: " + e.message);
  }
}

/**
 * Helper: check that a line's station list includes every station name in
 * the expected array. Returns true or a descriptive string on failure.
 */
function hasStations(lineKey, expectedNames) {
  var line = LINE_DATA[lineKey];
  if (!line) return "Line '" + lineKey + "' not found in LINE_DATA";
  var stationNames = line.stations.map(function (s) { return s.name; });
  var missing = expectedNames.filter(function (n) {
    return stationNames.indexOf(n) === -1;
  });
  if (missing.length > 0) {
    return "Missing stations: " + missing.join(", ");
  }
  return true;
}

// ---------------------------------------------------------------------------
// Station Verification (tests 1-5)
// ---------------------------------------------------------------------------

console.log("\n=== Station Verification ===\n");

test(1, "Montclair-Boonton Line includes known stations", function () {
  return hasStations("montclair-boonton", [
    "Bloomfield",
    "Glen Ridge",
    "Montclair State University",
    "Boonton",
    "Dover",
    "Hackettstown",
    "Little Falls",
    "Denville",
  ]);
});

test(2, "Morris & Essex Lines include known stations", function () {
  return hasStations("morris-essex", [
    "South Orange",
    "Maplewood",
    "Millburn",
    "Short Hills",
    "Summit",
    "Chatham",
    "Madison",
    "Morristown",
    "Gladstone",
    "Bernardsville",
  ]);
});

test(3, "Northeast Corridor includes known stations", function () {
  return hasStations("northeast-corridor", [
    "Trenton",
    "Princeton Junction",
    "New Brunswick",
    "Edison",
    "Metuchen",
    "Metropark",
    "Rahway",
    "Elizabeth",
    "Newark Penn Station",
    "Secaucus Junction",
  ]);
});

test(4, "North Jersey Coast Line includes known stations", function () {
  return hasStations("north-jersey-coast", [
    "Bay Head",
    "Long Branch",
    "Red Bank",
    "Aberdeen-Matawan",
    "Asbury Park",
  ]);
});

test(5, "Raritan Valley Line includes known stations", function () {
  return hasStations("raritan-valley", [
    "High Bridge",
    "Somerville",
    "Bound Brook",
    "Plainfield",
    "Westfield",
    "Cranford",
  ]);
});

// ---------------------------------------------------------------------------
// Line Data Verification (tests 6-17)
// ---------------------------------------------------------------------------

console.log("\n=== Line Data Verification ===\n");

test(6, "Montclair-Boonton impactType is 'hoboken-diversion'", function () {
  var actual = LINE_DATA["montclair-boonton"].impactType;
  if (actual !== "hoboken-diversion") {
    return "Expected 'hoboken-diversion', got '" + actual + "'";
  }
  return true;
});

test(7, "Morris & Essex impactType is 'hoboken-diversion'", function () {
  var actual = LINE_DATA["morris-essex"].impactType;
  if (actual !== "hoboken-diversion") {
    return "Expected 'hoboken-diversion', got '" + actual + "'";
  }
  return true;
});

test(8, "Northeast Corridor impactType is 'reduced-service'", function () {
  var actual = LINE_DATA["northeast-corridor"].impactType;
  if (actual !== "reduced-service") {
    return "Expected 'reduced-service', got '" + actual + "'";
  }
  return true;
});

test(9, "North Jersey Coast impactType is 'reduced-service'", function () {
  var actual = LINE_DATA["north-jersey-coast"].impactType;
  if (actual !== "reduced-service") {
    return "Expected 'reduced-service', got '" + actual + "'";
  }
  return true;
});

test(10, "Raritan Valley impactType is 'newark-termination'", function () {
  var actual = LINE_DATA["raritan-valley"].impactType;
  if (actual !== "newark-termination") {
    return "Expected 'newark-termination', got '" + actual + "'";
  }
  return true;
});

test(11, "NEC trains before: 133, after: 112", function () {
  var nec = LINE_DATA["northeast-corridor"];
  if (nec.trainsBefore !== 133) {
    return "trainsBefore: expected 133, got " + nec.trainsBefore;
  }
  if (nec.trainsAfter !== 112) {
    return "trainsAfter: expected 112, got " + nec.trainsAfter;
  }
  return true;
});

test(12, "NJCL trains before: 109, after: 92", function () {
  var njcl = LINE_DATA["north-jersey-coast"];
  if (njcl.trainsBefore !== 109) {
    return "trainsBefore: expected 109, got " + njcl.trainsBefore;
  }
  if (njcl.trainsAfter !== 92) {
    return "trainsAfter: expected 92, got " + njcl.trainsAfter;
  }
  return true;
});

test(13, "Montclair-Boonton hub is 'Newark Broad St'", function () {
  var actual = LINE_DATA["montclair-boonton"].hub;
  if (actual !== "Newark Broad St") {
    return "Expected 'Newark Broad St', got '" + actual + "'";
  }
  return true;
});

test(14, "Morris & Essex hub is 'Newark Broad St'", function () {
  var actual = LINE_DATA["morris-essex"].hub;
  if (actual !== "Newark Broad St") {
    return "Expected 'Newark Broad St', got '" + actual + "'";
  }
  return true;
});

test(15, "Northeast Corridor hub is 'Newark Penn'", function () {
  var actual = LINE_DATA["northeast-corridor"].hub;
  if (actual !== "Newark Penn") {
    return "Expected 'Newark Penn', got '" + actual + "'";
  }
  return true;
});

test(16, "North Jersey Coast hub is 'Secaucus Junction'", function () {
  var actual = LINE_DATA["north-jersey-coast"].hub;
  if (actual !== "Secaucus Junction") {
    return "Expected 'Secaucus Junction', got '" + actual + "'";
  }
  return true;
});

test(17, "Raritan Valley hub is 'Newark Penn'", function () {
  var actual = LINE_DATA["raritan-valley"].hub;
  if (actual !== "Newark Penn") {
    return "Expected 'Newark Penn', got '" + actual + "'";
  }
  return true;
});

// ---------------------------------------------------------------------------
// Branch Verification (tests 18-22)
// ---------------------------------------------------------------------------

console.log("\n=== Branch Verification ===\n");

test(18, "Montclair-Boonton has branches: montclair and boonton", function () {
  var branches = Object.keys(LINE_DATA["montclair-boonton"].branches);
  if (branches.length !== 2) {
    return "Expected 2 branches, got " + branches.length + ": " + branches.join(", ");
  }
  if (branches.indexOf("montclair") === -1) {
    return "Missing 'montclair' branch";
  }
  if (branches.indexOf("boonton") === -1) {
    return "Missing 'boonton' branch";
  }
  return true;
});

test(19, "Morris & Essex has branches: morristown and gladstone", function () {
  var branches = Object.keys(LINE_DATA["morris-essex"].branches);
  if (branches.length !== 2) {
    return "Expected 2 branches, got " + branches.length + ": " + branches.join(", ");
  }
  if (branches.indexOf("morristown") === -1) {
    return "Missing 'morristown' branch";
  }
  if (branches.indexOf("gladstone") === -1) {
    return "Missing 'gladstone' branch";
  }
  // Verify Gladstone Branch splits at Summit — gladstone branch stations
  // should have zones >= Summit's zone
  var summitStation = LINE_DATA["morris-essex"].stations.filter(function (s) {
    return s.name === "Summit";
  })[0];
  if (!summitStation) return "Summit station not found";
  var gladstoneStations = LINE_DATA["morris-essex"].stations.filter(function (s) {
    return s.branch === "gladstone";
  });
  var invalidZones = gladstoneStations.filter(function (s) {
    return s.zone < summitStation.zone;
  });
  if (invalidZones.length > 0) {
    return (
      "Gladstone Branch stations with zone < Summit (" +
      summitStation.zone +
      "): " +
      invalidZones.map(function (s) { return s.name + " (zone " + s.zone + ")"; }).join(", ")
    );
  }
  return true;
});

test(20, "NEC has one branch", function () {
  var branches = Object.keys(LINE_DATA["northeast-corridor"].branches);
  if (branches.length !== 1) {
    return "Expected 1 branch, got " + branches.length + ": " + branches.join(", ");
  }
  return true;
});

test(21, "NJCL has one branch", function () {
  var branches = Object.keys(LINE_DATA["north-jersey-coast"].branches);
  if (branches.length !== 1) {
    return "Expected 1 branch, got " + branches.length + ": " + branches.join(", ");
  }
  return true;
});

test(22, "RVL has one branch", function () {
  var branches = Object.keys(LINE_DATA["raritan-valley"].branches);
  if (branches.length !== 1) {
    return "Expected 1 branch, got " + branches.length + ": " + branches.join(", ");
  }
  return true;
});

// ---------------------------------------------------------------------------
// Date Verification (tests 23-24)
// ---------------------------------------------------------------------------

console.log("\n=== Date Verification ===\n");

test(23, "CUTOVER_START is Feb 15, 2026", function () {
  if (!CUTOVER_START) return "Could not parse CUTOVER_START from shared.js";
  var y = CUTOVER_START.getFullYear();
  var m = CUTOVER_START.getMonth(); // 0-indexed
  var d = CUTOVER_START.getDate();
  if (y !== 2026 || m !== 1 || d !== 15) {
    return (
      "Expected 2026-02-15, got " +
      y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0")
    );
  }
  return true;
});

test(24, "CUTOVER_END is Mar 15, 2026", function () {
  if (!CUTOVER_END) return "Could not parse CUTOVER_END from shared.js";
  var y = CUTOVER_END.getFullYear();
  var m = CUTOVER_END.getMonth();
  var d = CUTOVER_END.getDate();
  if (y !== 2026 || m !== 2 || d !== 15) {
    return (
      "Expected 2026-03-15, got " +
      y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0")
    );
  }
  return true;
});

// ---------------------------------------------------------------------------
// Zone Verification (tests 25-26)
// ---------------------------------------------------------------------------

console.log("\n=== Zone Verification ===\n");

test(25, "NEC zones: Trenton (zone 9) down to Newark Penn/Secaucus (zone 1)", function () {
  var nec = LINE_DATA["northeast-corridor"];
  var trenton = nec.stations.filter(function (s) { return s.name === "Trenton"; })[0];
  var newarkPenn = nec.stations.filter(function (s) {
    return s.name === "Newark Penn Station";
  })[0];
  var secaucus = nec.stations.filter(function (s) {
    return s.name === "Secaucus Junction";
  })[0];
  if (!trenton) return "Trenton not found";
  if (!newarkPenn) return "Newark Penn Station not found";
  if (!secaucus) return "Secaucus Junction not found";
  if (trenton.zone !== 9) {
    return "Trenton zone: expected 9, got " + trenton.zone;
  }
  if (newarkPenn.zone !== 1) {
    return "Newark Penn zone: expected 1, got " + newarkPenn.zone;
  }
  if (secaucus.zone !== 1) {
    return "Secaucus Junction zone: expected 1, got " + secaucus.zone;
  }
  return true;
});

test(26, "Stations closer to NYC have lower zone numbers (NEC south-to-north decreasing)", function () {
  var nec = LINE_DATA["northeast-corridor"];
  var stations = nec.stations;
  // Stations are listed south to north (Trenton -> Secaucus).
  // Zones should be non-increasing (each station's zone <= previous zone).
  for (var i = 1; i < stations.length; i++) {
    if (stations[i].zone > stations[i - 1].zone) {
      return (
        "Zone increases going toward NYC: " +
        stations[i - 1].name + " (zone " + stations[i - 1].zone + ") -> " +
        stations[i].name + " (zone " + stations[i].zone + ")"
      );
    }
  }
  return true;
});

// ---------------------------------------------------------------------------
// Summary Text Verification (tests 27-31)
// ---------------------------------------------------------------------------

console.log("\n=== Summary Text Verification ===\n");

test(27, "Hoboken-diverted lines mention 'Hoboken' in summary", function () {
  var lines = Object.keys(LINE_DATA);
  var problems = [];
  for (var i = 0; i < lines.length; i++) {
    var line = LINE_DATA[lines[i]];
    if (line.impactType === "hoboken-diversion") {
      if (line.summary.indexOf("Hoboken") === -1) {
        problems.push(lines[i] + " summary does not mention Hoboken");
      }
    }
  }
  if (problems.length > 0) return problems.join("; ");
  return true;
});

test(28, "Reduced-service lines mention specific train count changes in summary", function () {
  var lines = Object.keys(LINE_DATA);
  var problems = [];
  for (var i = 0; i < lines.length; i++) {
    var line = LINE_DATA[lines[i]];
    if (line.impactType === "reduced-service") {
      // Check that both trainsBefore and trainsAfter values appear in the summary
      var beforeStr = String(line.trainsBefore);
      var afterStr = String(line.trainsAfter);
      if (line.summary.indexOf(beforeStr) === -1) {
        problems.push(
          lines[i] + " summary missing trainsBefore count (" + beforeStr + ")"
        );
      }
      if (line.summary.indexOf(afterStr) === -1) {
        problems.push(
          lines[i] + " summary missing trainsAfter count (" + afterStr + ")"
        );
      }
    }
  }
  if (problems.length > 0) return problems.join("; ");
  return true;
});

test(29, "Newark-termination line mentions 'Newark Penn Station' in summary", function () {
  var lines = Object.keys(LINE_DATA);
  var problems = [];
  for (var i = 0; i < lines.length; i++) {
    var line = LINE_DATA[lines[i]];
    if (line.impactType === "newark-termination") {
      if (line.summary.indexOf("Newark Penn Station") === -1) {
        problems.push(lines[i] + " summary does not mention Newark Penn Station");
      }
    }
  }
  if (problems.length > 0) return problems.join("; ");
  return true;
});

test(30, "Montclair-Boonton summary mentions weekend service to Penn Station continues", function () {
  var summary = LINE_DATA["montclair-boonton"].summary;
  if (summary.indexOf("Weekend") === -1 && summary.indexOf("weekend") === -1) {
    return "Summary does not mention weekend service";
  }
  if (summary.indexOf("Penn Station") === -1) {
    return "Summary does not mention Penn Station";
  }
  if (summary.indexOf("continues") === -1 && summary.indexOf("continue") === -1) {
    return "Summary does not mention service continuing";
  }
  return true;
});

test(31, "Morris & Essex summary mentions both Morristown Line and Gladstone Branch", function () {
  var summary = LINE_DATA["morris-essex"].summary;
  if (summary.indexOf("Morristown") === -1) {
    return "Summary does not mention Morristown Line";
  }
  if (summary.indexOf("Gladstone") === -1) {
    return "Summary does not mention Gladstone Branch";
  }
  return true;
});

// ---------------------------------------------------------------------------
// Coverage Data Cross-Check (tests 32-35)
// ---------------------------------------------------------------------------

console.log("\n=== Coverage Data Cross-Check ===\n");

var validLineKeys = Object.keys(LINE_DATA);

test(32, "Articles mentioning specific lines reference valid LINE_DATA keys", function () {
  var problems = [];
  for (var i = 0; i < articles.length; i++) {
    var art = articles[i];
    if (!art.lines || !Array.isArray(art.lines)) {
      problems.push("Article '" + art.id + "' has no lines array");
      continue;
    }
    for (var j = 0; j < art.lines.length; j++) {
      var lineRef = art.lines[j];
      if (lineRef === "all") continue; // "all" is a special sentinel
      if (validLineKeys.indexOf(lineRef) === -1) {
        problems.push(
          "Article '" + art.id + "' references unknown line '" + lineRef + "'"
        );
      }
    }
  }
  if (problems.length > 0) return problems.join("; ");
  return true;
});

test(33, "Articles about hoboken diversion reference montclair-boonton or morris-essex", function () {
  // Articles that mention "Hoboken" diversion in excerpt should reference
  // at least one of the hoboken-diverted lines, or use "all".
  var hobokenArticles = articles.filter(function (a) {
    return (
      a.excerpt &&
      (a.excerpt.indexOf("diverted to Hoboken") !== -1 ||
        a.excerpt.indexOf("rerouted to Hoboken") !== -1 ||
        a.excerpt.indexOf("redirected to Hoboken") !== -1 ||
        a.excerpt.indexOf("Hoboken Terminal") !== -1)
    );
  });
  var problems = [];
  for (var i = 0; i < hobokenArticles.length; i++) {
    var art = hobokenArticles[i];
    var lines = art.lines || [];
    var hasRelevant =
      lines.indexOf("all") !== -1 ||
      lines.indexOf("montclair-boonton") !== -1 ||
      lines.indexOf("morris-essex") !== -1;
    if (!hasRelevant) {
      problems.push(
        "Article '" +
          art.id +
          "' mentions Hoboken diversion but doesn't tag montclair-boonton or morris-essex"
      );
    }
  }
  if (problems.length > 0) return problems.join("; ");
  if (hobokenArticles.length === 0) {
    return "No articles found mentioning Hoboken diversion — check excerpt matching";
  }
  return true;
});

test(34, "Official NJ Transit source articles exist in coverage data", function () {
  var officialArticles = articles.filter(function (a) {
    return a.category === "official";
  });
  if (officialArticles.length === 0) {
    return "No articles with category 'official' found";
  }
  // Check that at least one is from NJ Transit directly
  var njTransitOfficial = officialArticles.filter(function (a) {
    return (
      a.source === "NJ Transit" ||
      (a.url && a.url.indexOf("njtransit.com") !== -1)
    );
  });
  if (njTransitOfficial.length === 0) {
    return "No official NJ Transit articles found (expected njtransit.com source)";
  }
  // Check that at least one is from Amtrak (joint project)
  var amtrakOfficial = officialArticles.filter(function (a) {
    return (
      a.source === "Amtrak Media" ||
      (a.url && a.url.indexOf("amtrak.com") !== -1)
    );
  });
  if (amtrakOfficial.length === 0) {
    return "No official Amtrak articles found (expected amtrak.com source)";
  }
  return true;
});

test(35, "Article dates are within a reasonable range around the cutover period", function () {
  // Expect articles to be dated between 2025-10-01 and 2026-04-30
  // (covers pre-announcement through the aftermath period)
  var rangeStart = new Date("2025-10-01");
  var rangeEnd = new Date("2026-04-30");
  var problems = [];
  for (var i = 0; i < articles.length; i++) {
    var art = articles[i];
    if (!art.date) {
      problems.push("Article '" + art.id + "' has no date");
      continue;
    }
    var d = new Date(art.date);
    if (isNaN(d.getTime())) {
      problems.push("Article '" + art.id + "' has invalid date: " + art.date);
      continue;
    }
    if (d < rangeStart || d > rangeEnd) {
      problems.push(
        "Article '" + art.id + "' date " + art.date + " is outside expected range (2025-10-01 to 2026-04-30)"
      );
    }
  }
  if (problems.length > 0) return problems.join("; ");
  return true;
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n===================================================");
console.log("  RESULTS: " + passed + " passed, " + failed + " failed, " + totalTests + " total");
console.log("===================================================\n");

if (failures.length > 0) {
  console.log("Failed tests:");
  for (var i = 0; i < failures.length; i++) {
    var f = failures[i];
    console.log("  #" + f.id + " " + f.description);
    console.log("       " + f.reason);
  }
  console.log("");
}

process.exit(failed > 0 ? 1 : 0);
