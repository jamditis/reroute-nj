// Reroute NJ — Commute Comparison Tool
// Visual side-by-side commute option comparison

(function () {
  "use strict";

  // Date constants (CUTOVER_START, CUTOVER_END, PHASE2_APPROX) and
  // shared helpers (esc, updateCountdown) are in shared.js.

  // =========================================================================
  // MANHATTAN DESTINATIONS
  // Each destination has "last mile" times (in minutes) from each arrival
  // point in Manhattan. These are walking + subway estimates.
  // =========================================================================
  var DESTINATIONS = [
    {
      id: "penn-station",
      name: "Penn Station",
      area: "33rd St & 7th Ave",
      icon: "&#x1F689;",
      fromPATH33: 7,
      fromFerry39: 15,
      fromPortAuth: 10,
      fromPennNY: 0,
      fromWTC: 20,
    },
    {
      id: "herald-square",
      name: "Herald Square",
      area: "34th St & Broadway",
      icon: "&#x1F6CD;&#xFE0F;",
      fromPATH33: 3,
      fromFerry39: 15,
      fromPortAuth: 10,
      fromPennNY: 5,
      fromWTC: 22,
    },
    {
      id: "times-square",
      name: "Times Square",
      area: "42nd St & Broadway",
      icon: "&#x1F3AD;",
      fromPATH33: 12,
      fromFerry39: 10,
      fromPortAuth: 3,
      fromPennNY: 10,
      fromWTC: 22,
    },
    {
      id: "grand-central",
      name: "Grand Central",
      area: "42nd St & Park Ave",
      icon: "&#x1F3DB;&#xFE0F;",
      fromPATH33: 15,
      fromFerry39: 18,
      fromPortAuth: 15,
      fromPennNY: 12,
      fromWTC: 25,
    },
    {
      id: "hudson-yards",
      name: "Hudson Yards",
      area: "34th St & 11th Ave",
      icon: "&#x1F3D7;&#xFE0F;",
      fromPATH33: 12,
      fromFerry39: 8,
      fromPortAuth: 10,
      fromPennNY: 8,
      fromWTC: 28,
    },
    {
      id: "wtc-fidi",
      name: "WTC / Financial District",
      area: "Lower Manhattan",
      icon: "&#x1F3E2;",
      fromPATH33: 25,
      fromFerry39: 30,
      fromPortAuth: 25,
      fromPennNY: 20,
      fromWTC: 3,
    },
    {
      id: "union-square",
      name: "Union Square",
      area: "14th St & Broadway",
      icon: "&#x1F333;",
      fromPATH33: 12,
      fromFerry39: 22,
      fromPortAuth: 18,
      fromPennNY: 12,
      fromWTC: 15,
    },
    {
      id: "midtown-west",
      name: "Midtown West",
      area: "50th St & 8th–10th Ave",
      icon: "&#x1F30C;",
      fromPATH33: 15,
      fromFerry39: 5,
      fromPortAuth: 8,
      fromPennNY: 12,
      fromWTC: 28,
    },
  ];

  // =========================================================================
  // STATION DATA WITH TRAVEL TIMES
  // timeToHub: estimated minutes from station to its line's hub during cutover
  // normalTimeToPenn: estimated minutes for normal service to Penn Station NY
  // =========================================================================
  var LINES = {
    "montclair-boonton": {
      name: "Montclair-Boonton Line",
      shortName: "Montclair-Boonton",
      color: "#7b2d8e",
      impactType: "hoboken-diversion",
      hubName: "Hoboken",
      branches: { montclair: "Montclair branch", boonton: "Boonton branch" },
      stations: [
        { id: "watsessing-ave", name: "Watsessing Avenue", branch: "montclair", timeToHub: 18, normalTimeToPenn: 35 },
        { id: "bloomfield", name: "Bloomfield", branch: "montclair", timeToHub: 20, normalTimeToPenn: 38 },
        { id: "glen-ridge", name: "Glen Ridge", branch: "montclair", timeToHub: 22, normalTimeToPenn: 40 },
        { id: "bay-street", name: "Bay Street (Montclair)", branch: "montclair", timeToHub: 25, normalTimeToPenn: 42 },
        { id: "walnut-street", name: "Walnut Street", branch: "montclair", timeToHub: 27, normalTimeToPenn: 44 },
        { id: "watchung-ave", name: "Watchung Avenue", branch: "montclair", timeToHub: 28, normalTimeToPenn: 45 },
        { id: "upper-montclair", name: "Upper Montclair", branch: "montclair", timeToHub: 30, normalTimeToPenn: 47 },
        { id: "mountain-ave", name: "Mountain Avenue", branch: "montclair", timeToHub: 32, normalTimeToPenn: 48 },
        { id: "montclair-heights", name: "Montclair Heights", branch: "montclair", timeToHub: 34, normalTimeToPenn: 50 },
        { id: "montclair-state", name: "Montclair State University", branch: "montclair", timeToHub: 37, normalTimeToPenn: 55 },
        { id: "little-falls", name: "Little Falls", branch: "boonton", timeToHub: 40, normalTimeToPenn: 55 },
        { id: "mountain-view", name: "Mountain View", branch: "boonton", timeToHub: 42, normalTimeToPenn: 58 },
        { id: "wayne-route23", name: "Wayne/Route 23", branch: "boonton", timeToHub: 45, normalTimeToPenn: 60 },
        { id: "lincoln-park", name: "Lincoln Park", branch: "boonton", timeToHub: 50, normalTimeToPenn: 65 },
        { id: "boonton", name: "Boonton", branch: "boonton", timeToHub: 55, normalTimeToPenn: 70 },
        { id: "mountain-lakes", name: "Mountain Lakes", branch: "boonton", timeToHub: 58, normalTimeToPenn: 73 },
        { id: "denville", name: "Denville", branch: "boonton", timeToHub: 62, normalTimeToPenn: 78 },
        { id: "dover-mb", name: "Dover", branch: "boonton", timeToHub: 68, normalTimeToPenn: 82 },
        { id: "lake-hopatcong", name: "Lake Hopatcong", branch: "boonton", timeToHub: 75, normalTimeToPenn: 88 },
        { id: "netcong", name: "Netcong", branch: "boonton", timeToHub: 78, normalTimeToPenn: 90 },
        { id: "mount-olive", name: "Mount Olive", branch: "boonton", timeToHub: 82, normalTimeToPenn: 95 },
        { id: "hackettstown-mb", name: "Hackettstown", branch: "boonton", timeToHub: 90, normalTimeToPenn: 100 },
      ],
    },
    "morris-essex": {
      name: "Morris & Essex Lines",
      shortName: "Morris & Essex",
      color: "#00a651",
      impactType: "hoboken-diversion",
      hubName: "Hoboken",
      branches: { morristown: "Morristown Line", gladstone: "Gladstone Branch" },
      stations: [
        { id: "orange", name: "Orange", branch: "morristown", timeToHub: 15, normalTimeToPenn: 30 },
        { id: "highland-ave", name: "Highland Avenue", branch: "morristown", timeToHub: 18, normalTimeToPenn: 33 },
        { id: "mountain-station", name: "Mountain Station", branch: "morristown", timeToHub: 20, normalTimeToPenn: 35 },
        { id: "south-orange", name: "South Orange", branch: "morristown", timeToHub: 22, normalTimeToPenn: 37 },
        { id: "maplewood", name: "Maplewood", branch: "morristown", timeToHub: 24, normalTimeToPenn: 38 },
        { id: "millburn", name: "Millburn", branch: "morristown", timeToHub: 28, normalTimeToPenn: 42 },
        { id: "short-hills", name: "Short Hills", branch: "morristown", timeToHub: 30, normalTimeToPenn: 44 },
        { id: "summit", name: "Summit", branch: "morristown", timeToHub: 35, normalTimeToPenn: 48 },
        { id: "chatham", name: "Chatham", branch: "morristown", timeToHub: 38, normalTimeToPenn: 52 },
        { id: "madison", name: "Madison", branch: "morristown", timeToHub: 42, normalTimeToPenn: 55 },
        { id: "convent-station", name: "Convent Station", branch: "morristown", timeToHub: 45, normalTimeToPenn: 58 },
        { id: "morristown", name: "Morristown", branch: "morristown", timeToHub: 50, normalTimeToPenn: 62 },
        { id: "morris-plains", name: "Morris Plains", branch: "morristown", timeToHub: 52, normalTimeToPenn: 65 },
        { id: "hanover", name: "Hanover", branch: "morristown", timeToHub: 55, normalTimeToPenn: 68 },
        { id: "whippany", name: "Whippany", branch: "morristown", timeToHub: 58, normalTimeToPenn: 70 },
        { id: "murray-hill", name: "Murray Hill", branch: "gladstone", timeToHub: 40, normalTimeToPenn: 55 },
        { id: "new-providence", name: "New Providence", branch: "gladstone", timeToHub: 42, normalTimeToPenn: 57 },
        { id: "berkeley-heights", name: "Berkeley Heights", branch: "gladstone", timeToHub: 45, normalTimeToPenn: 60 },
        { id: "gillette", name: "Gillette", branch: "gladstone", timeToHub: 48, normalTimeToPenn: 63 },
        { id: "stirling", name: "Stirling", branch: "gladstone", timeToHub: 52, normalTimeToPenn: 67 },
        { id: "millington", name: "Millington", branch: "gladstone", timeToHub: 55, normalTimeToPenn: 70 },
        { id: "lyons", name: "Lyons", branch: "gladstone", timeToHub: 58, normalTimeToPenn: 73 },
        { id: "basking-ridge", name: "Basking Ridge", branch: "gladstone", timeToHub: 60, normalTimeToPenn: 75 },
        { id: "bernardsville", name: "Bernardsville", branch: "gladstone", timeToHub: 65, normalTimeToPenn: 80 },
        { id: "far-hills", name: "Far Hills", branch: "gladstone", timeToHub: 68, normalTimeToPenn: 83 },
        { id: "peapack", name: "Peapack", branch: "gladstone", timeToHub: 72, normalTimeToPenn: 87 },
        { id: "gladstone", name: "Gladstone", branch: "gladstone", timeToHub: 75, normalTimeToPenn: 90 },
      ],
    },
    "northeast-corridor": {
      name: "Northeast Corridor",
      shortName: "Northeast Corridor",
      color: "#ee3a43",
      impactType: "reduced-service",
      hubName: "Penn Station NY",
      branches: { nec: "Northeast Corridor" },
      stations: [
        { id: "trenton", name: "Trenton", branch: "nec", timeToHub: 95, normalTimeToPenn: 80 },
        { id: "hamilton", name: "Hamilton", branch: "nec", timeToHub: 85, normalTimeToPenn: 72 },
        { id: "princeton-jct", name: "Princeton Junction", branch: "nec", timeToHub: 78, normalTimeToPenn: 65 },
        { id: "jersey-ave", name: "Jersey Avenue", branch: "nec", timeToHub: 72, normalTimeToPenn: 60 },
        { id: "new-brunswick", name: "New Brunswick", branch: "nec", timeToHub: 65, normalTimeToPenn: 52 },
        { id: "edison", name: "Edison", branch: "nec", timeToHub: 55, normalTimeToPenn: 45 },
        { id: "metuchen", name: "Metuchen", branch: "nec", timeToHub: 50, normalTimeToPenn: 42 },
        { id: "metropark", name: "Metropark", branch: "nec", timeToHub: 45, normalTimeToPenn: 38 },
        { id: "rahway", name: "Rahway", branch: "nec", timeToHub: 40, normalTimeToPenn: 33 },
        { id: "linden", name: "Linden", branch: "nec", timeToHub: 38, normalTimeToPenn: 30 },
        { id: "elizabeth", name: "Elizabeth", branch: "nec", timeToHub: 35, normalTimeToPenn: 28 },
        { id: "north-elizabeth", name: "North Elizabeth", branch: "nec", timeToHub: 33, normalTimeToPenn: 26 },
        { id: "newark-airport", name: "Newark Airport", branch: "nec", timeToHub: 28, normalTimeToPenn: 22 },
        { id: "newark-penn", name: "Newark Penn Station", branch: "nec", timeToHub: 25, normalTimeToPenn: 20 },
        { id: "secaucus", name: "Secaucus Junction", branch: "nec", timeToHub: 18, normalTimeToPenn: 12 },
      ],
    },
    "north-jersey-coast": {
      name: "North Jersey Coast Line",
      shortName: "North Jersey Coast",
      color: "#0082c8",
      impactType: "reduced-service",
      hubName: "Penn Station NY",
      branches: { njcl: "North Jersey Coast Line" },
      stations: [
        { id: "bay-head", name: "Bay Head", branch: "njcl", timeToHub: 120, normalTimeToPenn: 105 },
        { id: "point-pleasant", name: "Point Pleasant Beach", branch: "njcl", timeToHub: 115, normalTimeToPenn: 100 },
        { id: "manasquan", name: "Manasquan", branch: "njcl", timeToHub: 110, normalTimeToPenn: 95 },
        { id: "spring-lake", name: "Spring Lake", branch: "njcl", timeToHub: 105, normalTimeToPenn: 90 },
        { id: "belmar", name: "Belmar", branch: "njcl", timeToHub: 100, normalTimeToPenn: 85 },
        { id: "bradley-beach", name: "Bradley Beach", branch: "njcl", timeToHub: 98, normalTimeToPenn: 83 },
        { id: "asbury-park", name: "Asbury Park", branch: "njcl", timeToHub: 95, normalTimeToPenn: 80 },
        { id: "allenhurst", name: "Allenhurst", branch: "njcl", timeToHub: 92, normalTimeToPenn: 78 },
        { id: "elberon", name: "Elberon", branch: "njcl", timeToHub: 88, normalTimeToPenn: 75 },
        { id: "long-branch", name: "Long Branch", branch: "njcl", timeToHub: 85, normalTimeToPenn: 70 },
        { id: "little-silver", name: "Little Silver", branch: "njcl", timeToHub: 80, normalTimeToPenn: 67 },
        { id: "red-bank", name: "Red Bank", branch: "njcl", timeToHub: 78, normalTimeToPenn: 65 },
        { id: "middletown", name: "Middletown", branch: "njcl", timeToHub: 72, normalTimeToPenn: 60 },
        { id: "hazlet", name: "Hazlet", branch: "njcl", timeToHub: 68, normalTimeToPenn: 57 },
        { id: "aberdeen-matawan", name: "Aberdeen-Matawan", branch: "njcl", timeToHub: 65, normalTimeToPenn: 53 },
        { id: "south-amboy", name: "South Amboy", branch: "njcl", timeToHub: 60, normalTimeToPenn: 48 },
        { id: "perth-amboy", name: "Perth Amboy", branch: "njcl", timeToHub: 58, normalTimeToPenn: 46 },
        { id: "woodbridge", name: "Woodbridge", branch: "njcl", timeToHub: 48, normalTimeToPenn: 38 },
      ],
    },
    "raritan-valley": {
      name: "Raritan Valley Line",
      shortName: "Raritan Valley",
      color: "#faa634",
      impactType: "newark-termination",
      hubName: "Newark Penn",
      branches: { rvl: "Raritan Valley Line" },
      stations: [
        { id: "high-bridge", name: "High Bridge", branch: "rvl", timeToHub: 75, normalTimeToPenn: 95 },
        { id: "annandale", name: "Annandale", branch: "rvl", timeToHub: 68, normalTimeToPenn: 88 },
        { id: "lebanon", name: "Lebanon", branch: "rvl", timeToHub: 65, normalTimeToPenn: 85 },
        { id: "white-house", name: "White House", branch: "rvl", timeToHub: 60, normalTimeToPenn: 80 },
        { id: "north-branch", name: "North Branch", branch: "rvl", timeToHub: 55, normalTimeToPenn: 75 },
        { id: "raritan", name: "Raritan", branch: "rvl", timeToHub: 50, normalTimeToPenn: 70 },
        { id: "somerville", name: "Somerville", branch: "rvl", timeToHub: 48, normalTimeToPenn: 68 },
        { id: "bridgewater", name: "Bridgewater", branch: "rvl", timeToHub: 45, normalTimeToPenn: 65 },
        { id: "bound-brook", name: "Bound Brook", branch: "rvl", timeToHub: 42, normalTimeToPenn: 62 },
        { id: "dunellen", name: "Dunellen", branch: "rvl", timeToHub: 38, normalTimeToPenn: 58 },
        { id: "plainfield", name: "Plainfield", branch: "rvl", timeToHub: 35, normalTimeToPenn: 55 },
        { id: "fanwood", name: "Fanwood", branch: "rvl", timeToHub: 30, normalTimeToPenn: 50 },
        { id: "westfield", name: "Westfield", branch: "rvl", timeToHub: 28, normalTimeToPenn: 48 },
        { id: "cranford", name: "Cranford", branch: "rvl", timeToHub: 25, normalTimeToPenn: 45 },
        { id: "roselle-park", name: "Roselle Park", branch: "rvl", timeToHub: 22, normalTimeToPenn: 42 },
        { id: "union", name: "Union", branch: "rvl", timeToHub: 20, normalTimeToPenn: 40 },
      ],
    },
  };

  var LINE_ORDER = [
    "montclair-boonton",
    "morris-essex",
    "northeast-corridor",
    "north-jersey-coast",
    "raritan-valley",
  ];

  // =========================================================================
  // TRANSFER TIMES (minutes)
  // =========================================================================
  var TRANSFERS = {
    hobokenToPATH: 5,
    hobokenToFerry: 8,
    hobokenToBus: 5,
    newarkToNEC: 8,
    newarkToPATH: 8,
    newarkToBus: 5,
  };

  // =========================================================================
  // MODE COLORS (for timeline bars)
  // =========================================================================
  var MODE_COLORS = {
    train: "#1a3a5c",
    transfer: "#8895a7",
    path: "#00875a",
    ferry: "#0082c8",
    bus: "#e87722",
    nec: "#ee3a43",
    walk: "#b0bec5",
    subway: "#7b2d8e",
  };

  // =========================================================================
  // STATE
  // =========================================================================
  var currentLineId = null;
  var currentStation = null;
  var currentDest = null;

  // =========================================================================
  // DOM
  // =========================================================================
  var $lineNav = document.getElementById("line-nav");
  var $stationSelect = document.getElementById("station-select");
  var $destGrid = document.getElementById("dest-grid");
  var $results = document.getElementById("results");
  var $resultsHeader = document.getElementById("results-header");
  var $resultsNormal = document.getElementById("results-normal");
  var $resultsList = document.getElementById("results-list");
  var $resultsShare = document.getElementById("results-share");

  // =========================================================================
  // LINE NAV
  // =========================================================================
  function buildLineNav() {
    LINE_ORDER.forEach(function (lineId) {
      var line = LINES[lineId];
      var btn = document.createElement("button");
      btn.className = "line-btn";
      btn.setAttribute("data-line", lineId);
      btn.textContent = line.shortName;
      btn.addEventListener("click", function () { selectLine(lineId); });
      $lineNav.appendChild(btn);
    });
  }

  function selectLine(lineId) {
    currentLineId = lineId;
    currentStation = null;
    currentDest = null;

    // Update active state
    var btns = $lineNav.querySelectorAll(".line-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].getAttribute("data-line") === lineId);
    }

    populateStations();
    clearResults();
  }

  // =========================================================================
  // STATION DROPDOWN
  // =========================================================================
  function populateStations() {
    $stationSelect.innerHTML = '<option value="">Choose your station&hellip;</option>';
    if (!currentLineId) return;

    var line = LINES[currentLineId];
    var branches = {};
    line.stations.forEach(function (s) {
      if (!branches[s.branch]) branches[s.branch] = [];
      branches[s.branch].push(s);
    });

    Object.keys(line.branches).forEach(function (bk) {
      if (!branches[bk]) return;
      var group = document.createElement("optgroup");
      group.label = line.branches[bk];
      branches[bk].forEach(function (s) {
        var opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        group.appendChild(opt);
      });
      $stationSelect.appendChild(group);
    });
  }

  function onStationChange() {
    var id = $stationSelect.value;
    if (!id || !currentLineId) { currentStation = null; clearResults(); return; }
    var line = LINES[currentLineId];
    for (var i = 0; i < line.stations.length; i++) {
      if (line.stations[i].id === id) { currentStation = line.stations[i]; break; }
    }
    if (currentDest) runComparison();
  }

  // =========================================================================
  // DESTINATION GRID
  // =========================================================================
  function buildDestGrid() {
    DESTINATIONS.forEach(function (dest) {
      var btn = document.createElement("button");
      btn.className = "dest-card";
      btn.setAttribute("data-dest", dest.id);
      btn.innerHTML =
        '<span class="dest-icon">' + dest.icon + "</span>" +
        '<span class="dest-name">' + esc(dest.name) + "</span>" +
        '<span class="dest-area">' + esc(dest.area) + "</span>";
      btn.addEventListener("click", function () {
        currentDest = dest;
        var cards = $destGrid.querySelectorAll(".dest-card");
        for (var i = 0; i < cards.length; i++) {
          cards[i].classList.toggle("active", cards[i].getAttribute("data-dest") === dest.id);
        }
        if (currentStation) runComparison();
      });
      $destGrid.appendChild(btn);
    });
  }

  // =========================================================================
  // COMPARISON ENGINE
  // =========================================================================
  function runComparison() {
    if (!currentStation || !currentDest || !currentLineId) return;

    var line = LINES[currentLineId];
    var options = [];

    if (line.impactType === "hoboken-diversion") {
      options = buildHobokenOptions(line);
    } else if (line.impactType === "reduced-service") {
      options = buildReducedServiceOptions(line);
    } else if (line.impactType === "newark-termination") {
      options = buildNewarkOptions(line);
    }

    // Sort by total time
    options.sort(function (a, b) { return a.totalTime - b.totalTime; });

    // Mark best option
    if (options.length > 0) options[0].recommended = true;

    renderResults(line, options);
  }

  function buildHobokenOptions(line) {
    var trainTime = currentStation.timeToHub;
    var opts = [];

    // PATH
    var pathTransfer = TRANSFERS.hobokenToPATH;
    var pathRide = 15;
    var pathLastMile = currentDest.fromPATH33;
    opts.push({
      name: "Train \u2192 PATH \u2192 " + currentDest.name,
      summary: esc(line.shortName) + " to Hoboken \u2192 PATH to 33rd St \u2192 " + esc(currentDest.name),
      legs: [
        { label: "Train to Hoboken", time: trainTime, mode: "train" },
        { label: "Transfer", time: pathTransfer, mode: "transfer" },
        { label: "PATH to 33rd", time: pathRide, mode: "path" },
        { label: lastMileLabel(currentDest, "PATH"), time: pathLastMile, mode: "walk" },
      ],
      totalTime: trainTime + pathTransfer + pathRide + pathLastMile,
      cost: "Cross-honored",
    });

    // Ferry
    var ferryTransfer = TRANSFERS.hobokenToFerry;
    var ferryRide = 12;
    var ferryLastMile = currentDest.fromFerry39;
    opts.push({
      name: "Train \u2192 Ferry \u2192 " + currentDest.name,
      summary: esc(line.shortName) + " to Hoboken \u2192 Ferry to W. 39th St \u2192 " + esc(currentDest.name),
      legs: [
        { label: "Train to Hoboken", time: trainTime, mode: "train" },
        { label: "Transfer", time: ferryTransfer, mode: "transfer" },
        { label: "Ferry to W. 39th", time: ferryRide, mode: "ferry" },
        { label: lastMileLabel(currentDest, "ferry"), time: ferryLastMile, mode: "walk" },
      ],
      totalTime: trainTime + ferryTransfer + ferryRide + ferryLastMile,
      cost: "Cross-honored",
    });

    // Bus 126
    var busTransfer = TRANSFERS.hobokenToBus;
    var busRide = 30;
    var busLastMile = currentDest.fromPortAuth;
    opts.push({
      name: "Train \u2192 Bus 126 \u2192 " + currentDest.name,
      summary: esc(line.shortName) + " to Hoboken \u2192 Bus 126 to Port Authority \u2192 " + esc(currentDest.name),
      legs: [
        { label: "Train to Hoboken", time: trainTime, mode: "train" },
        { label: "Transfer", time: busTransfer, mode: "transfer" },
        { label: "Bus 126 to PABT", time: busRide, mode: "bus" },
        { label: lastMileLabel(currentDest, "PABT"), time: busLastMile, mode: "walk" },
      ],
      totalTime: trainTime + busTransfer + busRide + busLastMile,
      cost: "Cross-honored",
    });

    return opts;
  }

  function buildReducedServiceOptions(line) {
    var trainTime = currentStation.timeToHub;
    var lastMile = currentDest.fromPennNY;

    return [{
      name: "Train (delayed) \u2192 " + currentDest.name,
      summary: esc(line.shortName) + " to Penn Station NY (reduced, expect delays) \u2192 " + esc(currentDest.name),
      legs: [
        { label: "Train to Penn Stn", time: trainTime, mode: "train" },
        { label: lastMileLabel(currentDest, "Penn"), time: lastMile, mode: "walk" },
      ],
      totalTime: trainTime + lastMile,
      cost: "No change",
      note: "Same route, but ~" + (trainTime - currentStation.normalTimeToPenn) + " min slower due to single-track. Check temp schedule.",
    }];
  }

  function buildNewarkOptions(line) {
    var trainTime = currentStation.timeToHub;
    var opts = [];

    // NEC transfer
    var necTransfer = TRANSFERS.newarkToNEC;
    var necRide = 20;
    var necLastMile = currentDest.fromPennNY;
    opts.push({
      name: "Train \u2192 NEC \u2192 " + currentDest.name,
      summary: "RVL to Newark Penn \u2192 NEC to Penn Station NY \u2192 " + esc(currentDest.name),
      legs: [
        { label: "Train to Newark", time: trainTime, mode: "train" },
        { label: "Transfer to NEC", time: necTransfer, mode: "transfer" },
        { label: "NEC to Penn Stn", time: necRide, mode: "nec" },
        { label: lastMileLabel(currentDest, "Penn"), time: necLastMile, mode: "walk" },
      ],
      totalTime: trainTime + necTransfer + necRide + necLastMile,
      cost: "Your ticket covers the transfer",
    });

    // PATH from Newark
    var pathTransfer = TRANSFERS.newarkToPATH;
    var pathRide = 25;
    var pathLastMile = currentDest.fromWTC;
    opts.push({
      name: "Train \u2192 PATH (WTC) \u2192 " + currentDest.name,
      summary: "RVL to Newark Penn \u2192 PATH to World Trade Center \u2192 " + esc(currentDest.name),
      legs: [
        { label: "Train to Newark", time: trainTime, mode: "train" },
        { label: "Transfer to PATH", time: pathTransfer, mode: "transfer" },
        { label: "PATH to WTC", time: pathRide, mode: "path" },
        { label: lastMileLabel(currentDest, "WTC"), time: pathLastMile, mode: "walk" },
      ],
      totalTime: trainTime + pathTransfer + pathRide + pathLastMile,
      cost: "$2.75 PATH fare (separate)",
    });

    // Bus from Newark
    var busTransfer = TRANSFERS.newarkToBus;
    var busRide = 40;
    var busLastMile = currentDest.fromPortAuth;
    opts.push({
      name: "Train \u2192 Bus \u2192 " + currentDest.name,
      summary: "RVL to Newark Penn \u2192 Bus to Port Authority \u2192 " + esc(currentDest.name),
      legs: [
        { label: "Train to Newark", time: trainTime, mode: "train" },
        { label: "Transfer to bus", time: busTransfer, mode: "transfer" },
        { label: "Bus to PABT", time: busRide, mode: "bus" },
        { label: lastMileLabel(currentDest, "PABT"), time: busLastMile, mode: "walk" },
      ],
      totalTime: trainTime + busTransfer + busRide + busLastMile,
      cost: "Check fare",
    });

    return opts;
  }

  function lastMileLabel(dest, from) {
    if (dest.id === "penn-station" && from === "Penn") return "Arrive";
    if (dest.id === "wtc-fidi" && from === "WTC") return "Arrive";
    return "Walk/subway";
  }

  // =========================================================================
  // RENDER RESULTS
  // =========================================================================
  function renderResults(line, options) {
    $results.classList.remove("hidden");

    // Header
    $resultsHeader.innerHTML =
      '<h2>' + esc(currentStation.name) + " \u2192 " + esc(currentDest.name) + "</h2>" +
      '<p class="results-subtitle">' + esc(line.name) + ' &middot; Cutover options (Feb 15 – Mar 15)</p>';

    // Normal commute reference
    var normalTotal = currentStation.normalTimeToPenn + currentDest.fromPennNY;
    $resultsNormal.innerHTML =
      '<div class="normal-ref">' +
      '<div class="normal-ref-label">Your normal commute</div>' +
      '<div class="normal-ref-time">~' + normalTotal + " min</div>" +
      '<div class="normal-ref-route">' + esc(currentStation.name) + " \u2192 Penn Station NY \u2192 " + esc(currentDest.name) + "</div>" +
      "</div>";

    // Find max time for bar scaling
    var maxTime = normalTotal;
    options.forEach(function (o) { if (o.totalTime > maxTime) maxTime = o.totalTime; });

    // Render option cards
    var html = "";
    options.forEach(function (opt, idx) {
      var delta = opt.totalTime - normalTotal;
      var deltaStr = delta > 0 ? "+" + delta + " min" : (delta === 0 ? "Same" : delta + " min");
      var deltaClass = delta <= 5 ? "delta-good" : (delta <= 15 ? "delta-ok" : "delta-bad");

      html += '<div class="result-card' + (opt.recommended ? " recommended" : "") + '">';
      html += '<div class="result-rank">' + (idx + 1) + "</div>";
      html += '<div class="result-info">';
      html += "<h3>" + opt.name + (opt.recommended ? ' <span class="rec-badge">Fastest</span>' : "") + "</h3>";
      html += '<p class="result-summary">' + opt.summary + "</p>";

      // Timeline bar
      html += '<div class="time-bar">';
      opt.legs.forEach(function (leg) {
        if (leg.time <= 0) return;
        var pct = Math.max((leg.time / maxTime) * 100, 4);
        var bg = MODE_COLORS[leg.mode] || "#ccc";
        html += '<div class="bar-segment" style="flex:' + leg.time + ";background:" + bg + '">';
        html += '<span class="bar-label">' + (leg.time >= 8 ? leg.label + " " : "") + leg.time + "m</span>";
        html += "</div>";
      });
      html += "</div>";

      // Meta
      html += '<div class="result-meta">';
      html += '<span class="result-total">~' + opt.totalTime + " min total</span>";
      html += '<span class="result-delta ' + deltaClass + '">' + deltaStr + " vs normal</span>";
      html += '<span class="result-cost">' + esc(opt.cost) + "</span>";
      html += "</div>";

      if (opt.note) {
        html += '<p class="result-note">' + esc(opt.note) + "</p>";
      }

      html += "</div></div>";
    });

    $resultsList.innerHTML = html;

    // Share button
    var shareText = buildShareText(line, options, normalTotal);
    $resultsShare.innerHTML =
      '<button class="share-btn" id="share-btn">Copy commute summary to clipboard</button>' +
      '<span class="share-confirm hidden" id="share-confirm">Copied!</span>';

    document.getElementById("share-btn").addEventListener("click", function () {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(function () {
          document.getElementById("share-confirm").classList.remove("hidden");
          setTimeout(function () {
            document.getElementById("share-confirm").classList.add("hidden");
          }, 2000);
        });
      }
    });

    // Scroll to results
    $results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildShareText(line, options, normalTotal) {
    var text = "My commute during the Portal Bridge cutover:\n";
    text += currentStation.name + " (" + line.shortName + ") \u2192 " + currentDest.name + "\n\n";
    text += "Normal: ~" + normalTotal + " min\n\n";
    text += "Cutover options:\n";
    options.forEach(function (opt, i) {
      var delta = opt.totalTime - normalTotal;
      text += (i + 1) + ". " + opt.name + " — ~" + opt.totalTime + " min";
      text += delta > 0 ? " (+" + delta + " min)" : "";
      text += opt.recommended ? " \u2b50 Fastest" : "";
      text += "\n";
    });
    text += "\nPlan your commute: RerouteNJ";
    return text;
  }

  function clearResults() {
    $results.classList.add("hidden");
    $resultsHeader.innerHTML = "";
    $resultsNormal.innerHTML = "";
    $resultsList.innerHTML = "";
    $resultsShare.innerHTML = "";
  }

  // =========================================================================
  // INIT
  // =========================================================================
  function init() {
    updateCountdown();
    buildLineNav();
    buildDestGrid();

    $stationSelect.addEventListener("change", onStationChange);
    setInterval(updateCountdown, 3600000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
