/**
 * Reroute NJ — LINE_DATA structural integrity tests
 *
 * Validates that the data in js/line-data.js is well-formed and internally
 * consistent. Run with: node tests/test-line-data-structure.js
 */

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------------------
// Load LINE_DATA and LINE_ORDER by evaluating the source file
// ---------------------------------------------------------------------------
var srcPath = path.resolve(__dirname, "..", "js", "line-data.js");
var src = fs.readFileSync(srcPath, "utf8");

// The file declares `var LINE_DATA = ...` and `var LINE_ORDER = ...`.
// We eval it in a function scope so the vars land in local scope, then
// return them.
var data = (function () {
  eval(src);
  return { LINE_DATA: LINE_DATA, LINE_ORDER: LINE_ORDER };
})();

var LINE_DATA = data.LINE_DATA;
var LINE_ORDER = data.LINE_ORDER;

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------
var passed = 0;
var failed = 0;
var warnings = 0;
var results = [];

function pass(name, detail) {
  passed++;
  var msg = "  PASS  " + name;
  if (detail) msg += " — " + detail;
  results.push(msg);
  console.log("\x1b[32m" + msg + "\x1b[0m");
}

function fail(name, detail) {
  failed++;
  var msg = "  FAIL  " + name;
  if (detail) msg += " — " + detail;
  results.push(msg);
  console.log("\x1b[31m" + msg + "\x1b[0m");
}

function warn(name, detail) {
  warnings++;
  var msg = "  WARN  " + name;
  if (detail) msg += " — " + detail;
  results.push(msg);
  console.log("\x1b[33m" + msg + "\x1b[0m");
}

// ---------------------------------------------------------------------------
// 1. LINE_ORDER contains exactly 5 lines matching the keys in LINE_DATA
// ---------------------------------------------------------------------------
console.log("\n--- Test 1: LINE_ORDER matches LINE_DATA keys ---");

(function () {
  var lineDataKeys = Object.keys(LINE_DATA).sort();
  var lineOrderSorted = LINE_ORDER.slice().sort();

  if (LINE_ORDER.length === 5) {
    pass("LINE_ORDER length", "contains exactly 5 entries");
  } else {
    fail("LINE_ORDER length", "expected 5, got " + LINE_ORDER.length);
  }

  var keysMatch = JSON.stringify(lineDataKeys) === JSON.stringify(lineOrderSorted);
  if (keysMatch) {
    pass("LINE_ORDER keys match LINE_DATA", lineOrderSorted.join(", "));
  } else {
    fail(
      "LINE_ORDER keys match LINE_DATA",
      "LINE_DATA keys: [" + lineDataKeys.join(", ") + "]  LINE_ORDER: [" + lineOrderSorted.join(", ") + "]"
    );
  }
})();

// ---------------------------------------------------------------------------
// 2. Each line has ALL required fields
// ---------------------------------------------------------------------------
console.log("\n--- Test 2: Required fields on each line ---");

var REQUIRED_FIELDS = [
  "name", "shortName", "color", "cssClass", "impactType", "impactLevel",
  "trainsBefore", "trainsAfter", "hub", "summary", "sources", "branches", "stations"
];

LINE_ORDER.forEach(function (lineKey) {
  var line = LINE_DATA[lineKey];
  var missing = REQUIRED_FIELDS.filter(function (f) { return !(f in line); });
  if (missing.length === 0) {
    pass("Required fields [" + lineKey + "]", "all " + REQUIRED_FIELDS.length + " fields present");
  } else {
    fail("Required fields [" + lineKey + "]", "missing: " + missing.join(", "));
  }
});

// ---------------------------------------------------------------------------
// 3. color fields are valid hex codes (#RRGGBB)
// ---------------------------------------------------------------------------
console.log("\n--- Test 3: color is valid #RRGGBB hex ---");

var hexRe = /^#[0-9a-fA-F]{6}$/;

LINE_ORDER.forEach(function (lineKey) {
  var color = LINE_DATA[lineKey].color;
  if (hexRe.test(color)) {
    pass("Color [" + lineKey + "]", color);
  } else {
    fail("Color [" + lineKey + "]", "invalid hex: " + color);
  }
});

// ---------------------------------------------------------------------------
// 4. impactType is one of the allowed values
// ---------------------------------------------------------------------------
console.log("\n--- Test 4: impactType is valid ---");

var VALID_IMPACT_TYPES = ["hoboken-diversion", "reduced-service", "newark-termination"];

LINE_ORDER.forEach(function (lineKey) {
  var it = LINE_DATA[lineKey].impactType;
  if (VALID_IMPACT_TYPES.indexOf(it) !== -1) {
    pass("impactType [" + lineKey + "]", it);
  } else {
    fail("impactType [" + lineKey + "]", "got '" + it + "', expected one of: " + VALID_IMPACT_TYPES.join(", "));
  }
});

// ---------------------------------------------------------------------------
// 5. impactLevel is one of "severe" or "moderate"
// ---------------------------------------------------------------------------
console.log("\n--- Test 5: impactLevel is valid ---");

var VALID_IMPACT_LEVELS = ["severe", "moderate"];

LINE_ORDER.forEach(function (lineKey) {
  var il = LINE_DATA[lineKey].impactLevel;
  if (VALID_IMPACT_LEVELS.indexOf(il) !== -1) {
    pass("impactLevel [" + lineKey + "]", il);
  } else {
    fail("impactLevel [" + lineKey + "]", "got '" + il + "', expected one of: " + VALID_IMPACT_LEVELS.join(", "));
  }
});

// ---------------------------------------------------------------------------
// 6. Each station has required fields: id, name, branch, zone
// ---------------------------------------------------------------------------
console.log("\n--- Test 6: Station required fields ---");

var STATION_FIELDS = ["id", "name", "branch", "zone"];

LINE_ORDER.forEach(function (lineKey) {
  var stations = LINE_DATA[lineKey].stations;
  var allOk = true;
  stations.forEach(function (st, idx) {
    var missing = STATION_FIELDS.filter(function (f) { return !(f in st); });
    if (missing.length > 0) {
      fail(
        "Station fields [" + lineKey + " #" + idx + " " + (st.name || st.id || "?") + "]",
        "missing: " + missing.join(", ")
      );
      allOk = false;
    }
  });
  if (allOk) {
    pass("Station fields [" + lineKey + "]", "all " + stations.length + " stations have required fields");
  }
});

// ---------------------------------------------------------------------------
// 7. Station IDs unique within each line AND globally unique (note shared)
// ---------------------------------------------------------------------------
console.log("\n--- Test 7: Station ID uniqueness ---");

var globalIds = {};
var sharedStations = [];

LINE_ORDER.forEach(function (lineKey) {
  var stations = LINE_DATA[lineKey].stations;
  var seen = {};
  var dupes = [];
  stations.forEach(function (st) {
    if (seen[st.id]) {
      dupes.push(st.id);
    }
    seen[st.id] = true;

    if (!globalIds[st.id]) {
      globalIds[st.id] = [];
    }
    globalIds[st.id].push(lineKey);
  });

  if (dupes.length === 0) {
    pass("Station IDs unique within [" + lineKey + "]", stations.length + " stations, 0 duplicates");
  } else {
    fail("Station IDs unique within [" + lineKey + "]", "duplicates: " + dupes.join(", "));
  }
});

// Check global uniqueness
var globalDupes = Object.keys(globalIds).filter(function (id) { return globalIds[id].length > 1; });
if (globalDupes.length === 0) {
  pass("Station IDs globally unique", "no shared station IDs across lines");
} else {
  // These might be intentional shared stations — report as warnings
  globalDupes.forEach(function (id) {
    warn(
      "Shared station ID '" + id + "'",
      "appears in: " + globalIds[id].join(", ")
    );
  });
  pass("Station IDs globally unique (with shared noted)", globalDupes.length + " shared station(s) noted above");
}

// ---------------------------------------------------------------------------
// 8. Station branch values match keys in the line's branches object
// ---------------------------------------------------------------------------
console.log("\n--- Test 8: Station branch values match branches object ---");

LINE_ORDER.forEach(function (lineKey) {
  var line = LINE_DATA[lineKey];
  var branchKeys = Object.keys(line.branches);
  var invalid = [];
  line.stations.forEach(function (st) {
    if (branchKeys.indexOf(st.branch) === -1) {
      invalid.push(st.id + " (branch: '" + st.branch + "')");
    }
  });
  if (invalid.length === 0) {
    pass("Branch values [" + lineKey + "]", "all stations reference valid branch keys: " + branchKeys.join(", "));
  } else {
    fail("Branch values [" + lineKey + "]", "invalid branches: " + invalid.join("; "));
  }
});

// ---------------------------------------------------------------------------
// 9. Zone values are positive integers (1-10)
// ---------------------------------------------------------------------------
console.log("\n--- Test 9: Zone values are positive integers 1-10 ---");

LINE_ORDER.forEach(function (lineKey) {
  var stations = LINE_DATA[lineKey].stations;
  var bad = [];
  stations.forEach(function (st) {
    if (typeof st.zone !== "number" || st.zone < 1 || st.zone > 10 || st.zone !== Math.floor(st.zone)) {
      bad.push(st.id + " (zone: " + st.zone + ")");
    }
  });
  if (bad.length === 0) {
    var zones = stations.map(function (s) { return s.zone; });
    var min = Math.min.apply(null, zones);
    var max = Math.max.apply(null, zones);
    pass("Zones [" + lineKey + "]", "range " + min + "-" + max + ", all positive integers");
  } else {
    fail("Zones [" + lineKey + "]", "invalid zones: " + bad.join("; "));
  }
});

// ---------------------------------------------------------------------------
// 10. Zones increase monotonically from east to west (with allowance for
//     branch splits and listing direction). Some lines list stations
//     west-to-east (decreasing zones, e.g. NEC starts at Trenton zone 9)
//     while others list east-to-west (increasing zones). Both are valid
//     as long as the ordering is monotonic (consistently non-decreasing
//     OR non-increasing) within each branch.
// ---------------------------------------------------------------------------
console.log("\n--- Test 10: Zones monotonic per branch (increasing or decreasing) ---");

LINE_ORDER.forEach(function (lineKey) {
  var line = LINE_DATA[lineKey];
  var branchKeys = Object.keys(line.branches);
  var allOk = true;

  branchKeys.forEach(function (br) {
    var brStations = line.stations.filter(function (st) { return st.branch === br; });
    if (brStations.length < 2) return;

    var isNonDecreasing = true;
    var isNonIncreasing = true;
    for (var i = 1; i < brStations.length; i++) {
      if (brStations[i].zone < brStations[i - 1].zone) isNonDecreasing = false;
      if (brStations[i].zone > brStations[i - 1].zone) isNonIncreasing = false;
    }

    var direction = isNonDecreasing && isNonIncreasing ? "flat" :
                    isNonDecreasing ? "non-decreasing (east-to-west)" :
                    isNonIncreasing ? "non-increasing (west-to-east)" :
                    "mixed (non-monotonic)";

    if (isNonDecreasing || isNonIncreasing) {
      pass("Zone order [" + lineKey + "/" + br + "]", direction);
    } else {
      // Find first violation to report clearly
      var firstDir = null;
      for (var k = 1; k < brStations.length; k++) {
        if (brStations[k].zone !== brStations[k - 1].zone) {
          firstDir = brStations[k].zone > brStations[k - 1].zone ? "increasing" : "decreasing";
          break;
        }
      }
      for (var j = 1; j < brStations.length; j++) {
        var prev = brStations[j - 1];
        var curr = brStations[j];
        var violated = false;
        if (firstDir === "increasing" && curr.zone < prev.zone) violated = true;
        if (firstDir === "decreasing" && curr.zone > prev.zone) violated = true;
        if (violated) {
          fail(
            "Zone order [" + lineKey + "/" + br + "]",
            "direction is " + firstDir + " but zone went from " +
            prev.name + " (zone " + prev.zone + ") to " +
            curr.name + " (zone " + curr.zone + ")"
          );
          allOk = false;
          break;
        }
      }
    }
  });

  if (allOk) {
    pass("Zone order [" + lineKey + "]", "monotonic on all branches");
  }
});

// ---------------------------------------------------------------------------
// 11. cssClass values match the LINE_DATA key
// ---------------------------------------------------------------------------
console.log("\n--- Test 11: cssClass matches LINE_DATA key ---");

LINE_ORDER.forEach(function (lineKey) {
  var cssClass = LINE_DATA[lineKey].cssClass;
  if (cssClass === lineKey) {
    pass("cssClass [" + lineKey + "]", cssClass);
  } else {
    fail("cssClass [" + lineKey + "]", "expected '" + lineKey + "', got '" + cssClass + "'");
  }
});

// ---------------------------------------------------------------------------
// 12. sources object has required keys with valid URL formats
// ---------------------------------------------------------------------------
console.log("\n--- Test 12: sources object structure and URLs ---");

var REQUIRED_SOURCE_KEYS = ["trainCounts", "impactType", "stations"];
var urlRe = /^https?:\/\/.+/;

LINE_ORDER.forEach(function (lineKey) {
  var sources = LINE_DATA[lineKey].sources;

  if (typeof sources !== "object" || sources === null) {
    fail("Sources object [" + lineKey + "]", "sources is not an object");
    return;
  }

  var missingKeys = REQUIRED_SOURCE_KEYS.filter(function (k) { return !(k in sources); });
  if (missingKeys.length > 0) {
    fail("Sources keys [" + lineKey + "]", "missing keys: " + missingKeys.join(", "));
  } else {
    pass("Sources keys [" + lineKey + "]", "has trainCounts, impactType, stations");
  }

  var badUrls = [];
  REQUIRED_SOURCE_KEYS.forEach(function (k) {
    if (sources[k] && !urlRe.test(sources[k])) {
      badUrls.push(k + ": " + sources[k]);
    }
  });
  if (badUrls.length === 0) {
    pass("Sources URLs [" + lineKey + "]", "all URLs have valid format");
  } else {
    fail("Sources URLs [" + lineKey + "]", "invalid URLs: " + badUrls.join("; "));
  }
});

// ---------------------------------------------------------------------------
// 13. trainsBefore and trainsAfter consistent with summary text
// ---------------------------------------------------------------------------
console.log("\n--- Test 13: trainsBefore/trainsAfter consistent with summary ---");

LINE_ORDER.forEach(function (lineKey) {
  var line = LINE_DATA[lineKey];
  var summary = line.summary;
  var before = line.trainsBefore;
  var after = line.trainsAfter;

  // For lines with numeric train counts, check if they appear in the summary
  if (typeof before === "number" && typeof after === "number") {
    var beforeStr = String(before);
    var afterStr = String(after);
    var beforeInSummary = summary.indexOf(beforeStr) !== -1;
    var afterInSummary = summary.indexOf(afterStr) !== -1;

    if (beforeInSummary && afterInSummary) {
      pass(
        "Train counts in summary [" + lineKey + "]",
        "summary contains " + beforeStr + " and " + afterStr
      );
    } else if (!beforeInSummary && !afterInSummary) {
      // Some lines describe impact qualitatively — that's OK if summary doesn't have numbers
      var hasAnyNumber = /\d+/.test(summary);
      if (hasAnyNumber) {
        // Summary has numbers but they don't match trainsBefore/After
        var numberMatches = summary.match(/\d+/g);
        fail(
          "Train counts in summary [" + lineKey + "]",
          "trainsBefore=" + before + ", trainsAfter=" + after +
          " but summary has numbers: " + numberMatches.join(", ")
        );
      } else {
        pass(
          "Train counts in summary [" + lineKey + "]",
          "summary is qualitative (no numbers), trainsBefore=" + before + " trainsAfter=" + after
        );
      }
    } else {
      // One matches, the other doesn't — suspicious
      warn(
        "Train counts in summary [" + lineKey + "]",
        "trainsBefore=" + before + " (" + (beforeInSummary ? "found" : "NOT found") +
        "), trainsAfter=" + after + " (" + (afterInSummary ? "found" : "NOT found") + ")"
      );
    }
  } else {
    // Non-numeric train counts (e.g., Raritan Valley "All trains")
    pass(
      "Train counts in summary [" + lineKey + "]",
      "non-numeric: trainsBefore='" + before + "', trainsAfter='" + after + "' (qualitative)"
    );
  }

  // Additional check: for numeric values, trainsBefore >= trainsAfter (service reduction)
  if (typeof before === "number" && typeof after === "number") {
    if (before >= after) {
      pass("Service reduction [" + lineKey + "]", before + " -> " + after + " (reduction or same)");
    } else {
      fail("Service reduction [" + lineKey + "]", before + " -> " + after + " (increase — unexpected)");
    }
  }
});

// ---------------------------------------------------------------------------
// 14. Hub stations are valid NJ Transit hub names
// ---------------------------------------------------------------------------
console.log("\n--- Test 14: Hub stations are valid NJ Transit hubs ---");

var VALID_HUBS = [
  "Newark Penn",
  "Newark Broad St",
  "Secaucus Junction",
  "Hoboken Terminal"
];

LINE_ORDER.forEach(function (lineKey) {
  var hub = LINE_DATA[lineKey].hub;
  if (VALID_HUBS.indexOf(hub) !== -1) {
    pass("Hub [" + lineKey + "]", hub);
  } else {
    fail("Hub [" + lineKey + "]", "got '" + hub + "', expected one of: " + VALID_HUBS.join(", "));
  }
});

// ---------------------------------------------------------------------------
// 15. Station count per line is reasonable (>5, <50)
// ---------------------------------------------------------------------------
console.log("\n--- Test 15: Station count is reasonable (>5, <50) ---");

LINE_ORDER.forEach(function (lineKey) {
  var count = LINE_DATA[lineKey].stations.length;
  if (count > 5 && count < 50) {
    pass("Station count [" + lineKey + "]", count + " stations");
  } else {
    fail("Station count [" + lineKey + "]", count + " stations (expected >5 and <50)");
  }
});

// ---------------------------------------------------------------------------
// 16. No duplicate station names within a line
// ---------------------------------------------------------------------------
console.log("\n--- Test 16: No duplicate station names within a line ---");

LINE_ORDER.forEach(function (lineKey) {
  var stations = LINE_DATA[lineKey].stations;
  var seen = {};
  var dupes = [];
  stations.forEach(function (st) {
    if (seen[st.name]) {
      dupes.push(st.name);
    }
    seen[st.name] = true;
  });
  if (dupes.length === 0) {
    pass("Unique names [" + lineKey + "]", stations.length + " stations, 0 duplicate names");
  } else {
    fail("Unique names [" + lineKey + "]", "duplicate names: " + dupes.join(", "));
  }
});

// ---------------------------------------------------------------------------
// 17. Station IDs follow kebab-case convention
// ---------------------------------------------------------------------------
console.log("\n--- Test 17: Station IDs follow kebab-case ---");

var kebabRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;

LINE_ORDER.forEach(function (lineKey) {
  var stations = LINE_DATA[lineKey].stations;
  var bad = [];
  stations.forEach(function (st) {
    if (!kebabRe.test(st.id)) {
      bad.push(st.id);
    }
  });
  if (bad.length === 0) {
    pass("Kebab-case IDs [" + lineKey + "]", "all " + stations.length + " station IDs are kebab-case");
  } else {
    fail("Kebab-case IDs [" + lineKey + "]", "non-kebab IDs: " + bad.join(", "));
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(60));
console.log("  RESULTS SUMMARY");
console.log("=".repeat(60));
console.log("  Passed:   " + passed);
console.log("  Failed:   " + failed);
console.log("  Warnings: " + warnings);
console.log("  Total:    " + (passed + failed));
console.log("=".repeat(60));

if (failed > 0) {
  console.log("\x1b[31m  OVERALL: FAIL (" + failed + " test(s) failed)\x1b[0m\n");
  process.exit(1);
} else {
  console.log("\x1b[32m  OVERALL: PASS (all " + passed + " tests passed)\x1b[0m\n");
  process.exit(0);
}
