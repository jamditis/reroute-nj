// Reroute NJ — Interactive tools for NJ Transit Portal Bridge cutover
// All affected lines with dynamic content generation

(function () {
  "use strict";

  // Date constants (CUTOVER_START, CUTOVER_END, PHASE2_APPROX) and
  // shared helpers (esc, updateCountdown) are in shared.js.

  // =========================================================================
  // LINE DATA
  // Each line has: name, color, cssClass, impactType, impactLevel,
  // trainsBefore, trainsAfter, summary, stations[], branches{}
  //
  // impactType determines which content templates are used:
  //   "hoboken-diversion" — trains diverted to Hoboken (M-B, M&E, Gladstone)
  //   "reduced-service"   — fewer trains, same destination (NEC, NJCL)
  //   "newark-termination" — one-seat rides to PSNY suspended (Raritan Valley)
  // =========================================================================

  var LINE_DATA = {
    "montclair-boonton": {
      name: "Montclair-Boonton Line",
      shortName: "Montclair-Boonton",
      color: "#7b2d8e",
      cssClass: "montclair-boonton",
      impactType: "hoboken-diversion",
      impactLevel: "severe",
      trainsBefore: 64,
      trainsAfter: 60,
      hub: "Newark Broad St",
      summary:
        "All weekday Midtown Direct trains diverted to Hoboken. Weekend service to Penn Station NY continues.",
      branches: {
        montclair: "Montclair branch",
        boonton: "Boonton branch",
      },
      stations: [
        { id: "watsessing-ave", name: "Watsessing Avenue", branch: "montclair", zone: 3 },
        { id: "bloomfield", name: "Bloomfield", branch: "montclair", zone: 3 },
        { id: "glen-ridge", name: "Glen Ridge", branch: "montclair", zone: 3 },
        { id: "bay-street", name: "Bay Street (Montclair)", branch: "montclair", zone: 4 },
        { id: "walnut-street", name: "Walnut Street", branch: "montclair", zone: 4 },
        { id: "watchung-ave", name: "Watchung Avenue", branch: "montclair", zone: 4 },
        { id: "upper-montclair", name: "Upper Montclair", branch: "montclair", zone: 4 },
        { id: "mountain-ave", name: "Mountain Avenue", branch: "montclair", zone: 4 },
        { id: "montclair-heights", name: "Montclair Heights", branch: "montclair", zone: 4 },
        { id: "montclair-state", name: "Montclair State University", branch: "montclair", zone: 5 },
        { id: "little-falls", name: "Little Falls", branch: "boonton", zone: 5 },
        { id: "mountain-view", name: "Mountain View", branch: "boonton", zone: 5 },
        { id: "wayne-route23", name: "Wayne/Route 23", branch: "boonton", zone: 5 },
        { id: "lincoln-park", name: "Lincoln Park", branch: "boonton", zone: 6 },
        { id: "boonton", name: "Boonton", branch: "boonton", zone: 6 },
        { id: "mountain-lakes", name: "Mountain Lakes", branch: "boonton", zone: 7 },
        { id: "denville", name: "Denville", branch: "boonton", zone: 7 },
        { id: "dover-mb", name: "Dover", branch: "boonton", zone: 7 },
        { id: "lake-hopatcong", name: "Lake Hopatcong", branch: "boonton", zone: 8 },
        { id: "netcong", name: "Netcong", branch: "boonton", zone: 8 },
        { id: "mount-olive", name: "Mount Olive", branch: "boonton", zone: 9 },
        { id: "hackettstown-mb", name: "Hackettstown", branch: "boonton", zone: 10 },
      ],
    },

    "morris-essex": {
      name: "Morris & Essex Lines",
      shortName: "Morris & Essex",
      color: "#00a651",
      cssClass: "morris-essex",
      impactType: "hoboken-diversion",
      impactLevel: "severe",
      trainsBefore: 149,
      trainsAfter: 141,
      hub: "Newark Broad St",
      summary:
        "All weekday Midtown Direct trains on the Morristown Line and Gladstone Branch diverted to Hoboken. Weekend service to Penn Station NY continues.",
      branches: {
        morristown: "Morristown Line",
        gladstone: "Gladstone Branch",
      },
      stations: [
        // Morristown Line (east to west)
        { id: "orange", name: "Orange", branch: "morristown", zone: 2 },
        { id: "highland-ave", name: "Highland Avenue", branch: "morristown", zone: 3 },
        { id: "mountain-station", name: "Mountain Station", branch: "morristown", zone: 3 },
        { id: "south-orange", name: "South Orange", branch: "morristown", zone: 3 },
        { id: "maplewood", name: "Maplewood", branch: "morristown", zone: 3 },
        { id: "millburn", name: "Millburn", branch: "morristown", zone: 4 },
        { id: "short-hills", name: "Short Hills", branch: "morristown", zone: 4 },
        { id: "summit", name: "Summit", branch: "morristown", zone: 4 },
        { id: "chatham", name: "Chatham", branch: "morristown", zone: 5 },
        { id: "madison", name: "Madison", branch: "morristown", zone: 5 },
        { id: "convent-station", name: "Convent Station", branch: "morristown", zone: 5 },
        { id: "morristown", name: "Morristown", branch: "morristown", zone: 6 },
        { id: "morris-plains", name: "Morris Plains", branch: "morristown", zone: 6 },
        { id: "hanover", name: "Hanover", branch: "morristown", zone: 6 },
        { id: "whippany", name: "Whippany", branch: "morristown", zone: 6 },
        // Gladstone Branch (splits at Summit)
        { id: "murray-hill", name: "Murray Hill", branch: "gladstone", zone: 5 },
        { id: "new-providence", name: "New Providence", branch: "gladstone", zone: 5 },
        { id: "berkeley-heights", name: "Berkeley Heights", branch: "gladstone", zone: 5 },
        { id: "gillette", name: "Gillette", branch: "gladstone", zone: 5 },
        { id: "stirling", name: "Stirling", branch: "gladstone", zone: 6 },
        { id: "millington", name: "Millington", branch: "gladstone", zone: 6 },
        { id: "lyons", name: "Lyons", branch: "gladstone", zone: 6 },
        { id: "basking-ridge", name: "Basking Ridge", branch: "gladstone", zone: 6 },
        { id: "bernardsville", name: "Bernardsville", branch: "gladstone", zone: 7 },
        { id: "far-hills", name: "Far Hills", branch: "gladstone", zone: 7 },
        { id: "peapack", name: "Peapack", branch: "gladstone", zone: 7 },
        { id: "gladstone", name: "Gladstone", branch: "gladstone", zone: 7 },
      ],
    },

    "northeast-corridor": {
      name: "Northeast Corridor",
      shortName: "Northeast Corridor",
      color: "#ee3a43",
      cssClass: "northeast-corridor",
      impactType: "reduced-service",
      impactLevel: "moderate",
      trainsBefore: 133,
      trainsAfter: 112,
      hub: "Newark Penn",
      summary:
        "Trains still run to Penn Station NY, but service is reduced from 133 to 112 daily trains due to single-track operation between Newark and Secaucus.",
      branches: {
        nec: "Northeast Corridor",
      },
      stations: [
        { id: "trenton", name: "Trenton", branch: "nec", zone: 9 },
        { id: "hamilton", name: "Hamilton", branch: "nec", zone: 8 },
        { id: "princeton-jct", name: "Princeton Junction", branch: "nec", zone: 7 },
        { id: "jersey-ave", name: "Jersey Avenue", branch: "nec", zone: 7 },
        { id: "new-brunswick", name: "New Brunswick", branch: "nec", zone: 6 },
        { id: "edison", name: "Edison", branch: "nec", zone: 5 },
        { id: "metuchen", name: "Metuchen", branch: "nec", zone: 5 },
        { id: "metropark", name: "Metropark", branch: "nec", zone: 4 },
        { id: "rahway", name: "Rahway", branch: "nec", zone: 4 },
        { id: "linden", name: "Linden", branch: "nec", zone: 3 },
        { id: "elizabeth", name: "Elizabeth", branch: "nec", zone: 3 },
        { id: "north-elizabeth", name: "North Elizabeth", branch: "nec", zone: 3 },
        { id: "newark-airport", name: "Newark Airport", branch: "nec", zone: 2 },
        { id: "newark-penn", name: "Newark Penn Station", branch: "nec", zone: 1 },
        { id: "secaucus", name: "Secaucus Junction", branch: "nec", zone: 1 },
      ],
    },

    "north-jersey-coast": {
      name: "North Jersey Coast Line",
      shortName: "North Jersey Coast",
      color: "#0082c8",
      cssClass: "north-jersey-coast",
      impactType: "reduced-service",
      impactLevel: "moderate",
      trainsBefore: 109,
      trainsAfter: 92,
      hub: "Secaucus Junction",
      summary:
        "Trains still run to Penn Station NY, but reduced from 109 to 92 daily trains. Significant schedule changes. Perth Amboy/Woodbridge riders get bus cross-honoring to Port Authority.",
      branches: {
        njcl: "North Jersey Coast Line",
      },
      stations: [
        { id: "bay-head", name: "Bay Head", branch: "njcl", zone: 10 },
        { id: "point-pleasant", name: "Point Pleasant Beach", branch: "njcl", zone: 9 },
        { id: "manasquan", name: "Manasquan", branch: "njcl", zone: 9 },
        { id: "spring-lake", name: "Spring Lake", branch: "njcl", zone: 8 },
        { id: "belmar", name: "Belmar", branch: "njcl", zone: 8 },
        { id: "bradley-beach", name: "Bradley Beach", branch: "njcl", zone: 8 },
        { id: "asbury-park", name: "Asbury Park", branch: "njcl", zone: 7 },
        { id: "allenhurst", name: "Allenhurst", branch: "njcl", zone: 7 },
        { id: "elberon", name: "Elberon", branch: "njcl", zone: 7 },
        { id: "long-branch", name: "Long Branch", branch: "njcl", zone: 6 },
        { id: "little-silver", name: "Little Silver", branch: "njcl", zone: 6 },
        { id: "red-bank", name: "Red Bank", branch: "njcl", zone: 6 },
        { id: "middletown", name: "Middletown", branch: "njcl", zone: 5 },
        { id: "hazlet", name: "Hazlet", branch: "njcl", zone: 5 },
        { id: "aberdeen-matawan", name: "Aberdeen-Matawan", branch: "njcl", zone: 5 },
        { id: "south-amboy", name: "South Amboy", branch: "njcl", zone: 5 },
        { id: "perth-amboy", name: "Perth Amboy", branch: "njcl", zone: 5 },
        { id: "woodbridge", name: "Woodbridge", branch: "njcl", zone: 4 },
      ],
    },

    "raritan-valley": {
      name: "Raritan Valley Line",
      shortName: "Raritan Valley",
      color: "#faa634",
      cssClass: "raritan-valley",
      impactType: "newark-termination",
      impactLevel: "severe",
      trainsBefore: "All trains",
      trainsAfter: "No one-seat rides to PSNY",
      hub: "Newark Penn",
      summary:
        "All one-seat rides to Penn Station New York are suspended. All trains now originate and terminate at Newark Penn Station. Transfer to NEC at Newark Penn to reach PSNY.",
      branches: {
        rvl: "Raritan Valley Line",
      },
      stations: [
        { id: "high-bridge", name: "High Bridge", branch: "rvl", zone: 9 },
        { id: "annandale", name: "Annandale", branch: "rvl", zone: 8 },
        { id: "lebanon", name: "Lebanon", branch: "rvl", zone: 8 },
        { id: "white-house", name: "White House", branch: "rvl", zone: 7 },
        { id: "north-branch", name: "North Branch", branch: "rvl", zone: 7 },
        { id: "raritan", name: "Raritan", branch: "rvl", zone: 6 },
        { id: "somerville", name: "Somerville", branch: "rvl", zone: 6 },
        { id: "bridgewater", name: "Bridgewater", branch: "rvl", zone: 6 },
        { id: "bound-brook", name: "Bound Brook", branch: "rvl", zone: 6 },
        { id: "dunellen", name: "Dunellen", branch: "rvl", zone: 5 },
        { id: "plainfield", name: "Plainfield", branch: "rvl", zone: 5 },
        { id: "fanwood", name: "Fanwood", branch: "rvl", zone: 4 },
        { id: "westfield", name: "Westfield", branch: "rvl", zone: 4 },
        { id: "cranford", name: "Cranford", branch: "rvl", zone: 3 },
        { id: "roselle-park", name: "Roselle Park", branch: "rvl", zone: 3 },
        { id: "union", name: "Union", branch: "rvl", zone: 3 },
      ],
    },
  };

  // Order to display lines
  var LINE_ORDER = [
    "montclair-boonton",
    "morris-essex",
    "northeast-corridor",
    "north-jersey-coast",
    "raritan-valley",
  ];

  // =========================================================================
  // APPROXIMATE FARE DATA
  // Monthly pass prices by zone (approximate, for estimation only)
  // IMPORTANT: Verify at njtransit.com before purchasing
  // =========================================================================
  var monthlyFares = {
    1: { toPenn: 120, toHoboken: 100 },
    2: { toPenn: 170, toHoboken: 120 },
    3: { toPenn: 204, toHoboken: 153 },
    4: { toPenn: 243, toHoboken: 183 },
    5: { toPenn: 272, toHoboken: 214 },
    6: { toPenn: 309, toHoboken: 244 },
    7: { toPenn: 344, toHoboken: 275 },
    8: { toPenn: 370, toHoboken: 305 },
    9: { toPenn: 396, toHoboken: 336 },
    10: { toPenn: 420, toHoboken: 360 },
  };

  // =========================================================================
  // STATE
  // =========================================================================
  var currentLineId = "montclair-boonton";
  var currentStationId = null;

  // =========================================================================
  // DOM REFERENCES
  // =========================================================================
  var $lineBadge = document.getElementById("line-badge");
  var $lineNav = document.getElementById("line-nav");
  var $stationSelect = document.getElementById("station-select");
  var $impactEmpty = document.getElementById("impact-empty");
  var $impactResult = document.getElementById("impact-result");
  var $routesIntro = document.getElementById("routes-intro");
  var $routesContent = document.getElementById("routes-content");
  var $ticketsIntro = document.getElementById("tickets-intro");
  var $ticketsContent = document.getElementById("tickets-content");
  var tabs = document.querySelectorAll(".tab");
  var panels = document.querySelectorAll(".tool-panel");

  // =========================================================================
  // HELPERS
  // =========================================================================
  function getCurrentLine() {
    return LINE_DATA[currentLineId];
  }

  function getStation(lineId, stationId) {
    var line = LINE_DATA[lineId];
    if (!line) return null;
    for (var i = 0; i < line.stations.length; i++) {
      if (line.stations[i].id === stationId) return line.stations[i];
    }
    return null;
  }

  // =========================================================================
  // TIMELINE
  // =========================================================================
  function updateTimeline() {
    var now = new Date();
    var items = [
      { id: "tl-announce", date: new Date("2026-01-16") },
      { id: "tl-tickets", date: new Date("2026-02-01") },
      { id: "tl-start", date: new Date("2026-02-15") },
      { id: "tl-end", date: new Date("2026-03-15") },
      { id: "tl-phase2", date: new Date("2026-09-01") },
    ];
    var activeSet = false;
    for (var i = items.length - 1; i >= 0; i--) {
      var el = document.getElementById(items[i].id);
      if (!el) continue;
      el.classList.remove("past", "active");
      if (now >= items[i].date) {
        if (!activeSet) {
          el.classList.add("active");
          activeSet = true;
        } else {
          el.classList.add("past");
        }
      }
    }
  }

  // =========================================================================
  // LINE NAVIGATION
  // =========================================================================
  function buildLineNav() {
    $lineNav.innerHTML = "";
    LINE_ORDER.forEach(function (lineId) {
      var line = LINE_DATA[lineId];
      var btn = document.createElement("button");
      btn.className = "line-btn" + (lineId === currentLineId ? " active" : "");
      btn.setAttribute("data-line", lineId);
      btn.textContent = line.shortName;
      btn.addEventListener("click", function () {
        selectLine(lineId);
      });
      $lineNav.appendChild(btn);
    });
  }

  function selectLine(lineId) {
    if (!LINE_DATA[lineId]) return;
    currentLineId = lineId;
    currentStationId = null;

    // Update nav active state
    var btns = $lineNav.querySelectorAll(".line-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle(
        "active",
        btns[i].getAttribute("data-line") === lineId
      );
    }

    // Update badge
    var line = getCurrentLine();
    $lineBadge.textContent = line.name;
    $lineBadge.className = "line-badge " + line.cssClass;
    $lineBadge.style.backgroundColor = line.color;
    $lineBadge.style.color = "#fff";

    // Rebuild station dropdown
    populateStations();

    // Reset impact panel
    $impactEmpty.classList.remove("hidden");
    $impactResult.classList.add("hidden");
    $impactResult.innerHTML = "";

    // Rebuild route planner and ticket guide
    renderRoutes();
    renderTickets();
  }

  // =========================================================================
  // STATION DROPDOWN
  // =========================================================================
  function populateStations() {
    // Clear existing options except placeholder
    $stationSelect.innerHTML =
      '<option value="">Choose your station&hellip;</option>';

    var line = getCurrentLine();
    var branches = {};

    line.stations.forEach(function (s) {
      if (!branches[s.branch]) branches[s.branch] = [];
      branches[s.branch].push(s);
    });

    Object.keys(line.branches).forEach(function (branchKey) {
      if (!branches[branchKey]) return;
      var group = document.createElement("optgroup");
      group.label = line.branches[branchKey];
      branches[branchKey].forEach(function (s) {
        var opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.name;
        group.appendChild(opt);
      });
      $stationSelect.appendChild(group);
    });
  }

  // =========================================================================
  // TABS
  // =========================================================================
  function initTabs() {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var targetTab = this.getAttribute("data-tab");
        tabs.forEach(function (t) {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        this.classList.add("active");
        this.setAttribute("aria-selected", "true");
        panels.forEach(function (p) {
          p.classList.remove("active");
        });
        var targetPanel = document.getElementById("panel-" + targetTab);
        if (targetPanel) targetPanel.classList.add("active");
      });
    });
  }

  // =========================================================================
  // IMPACT PANEL (Am I affected?)
  // =========================================================================
  function onStationChange() {
    currentStationId = $stationSelect.value;
    if (!currentStationId) {
      $impactEmpty.classList.remove("hidden");
      $impactResult.classList.add("hidden");
      return;
    }

    var station = getStation(currentLineId, currentStationId);
    if (!station) return;

    $impactEmpty.classList.add("hidden");
    $impactResult.classList.remove("hidden");

    var line = getCurrentLine();
    var html = "";

    if (line.impactType === "hoboken-diversion") {
      html = renderHobokenImpact(line, station);
    } else if (line.impactType === "reduced-service") {
      html = renderReducedServiceImpact(line, station);
    } else if (line.impactType === "newark-termination") {
      html = renderNewarkTerminationImpact(line, station);
    }

    $impactResult.innerHTML = html;
  }

  // --- Impact: Hoboken diversion ---
  function renderHobokenImpact(line, station) {
    var branchLabel = line.branches[station.branch] || station.branch;
    var changes = [
      "Your weekday train to Penn Station New York is suspended. All weekday " + esc(line.name) + " trains now terminate at Hoboken.",
      "At Hoboken, transfer to PATH (33rd St), NY Waterway ferry (W. 39th St), or Bus 126 (Port Authority). All are cross-honored with your NJ Transit ticket.",
      "Weekend service to Penn Station continues normally. No changes on Saturdays and Sundays.",
      "Buy tickets to/from Hoboken (not Penn Station) for weekday travel during Feb 15 – Mar 15.",
      "Travel before 7am or after 9am to avoid the worst crowding at Hoboken and on PATH.",
    ];
    var savingsHtml = getSavingsHtml(station);

    return (
      '<div class="impact-card severe">' +
      '<div class="impact-header" style="background:' + line.color + '">' +
      '<span class="impact-level">MAJOR CHANGES</span>' +
      '<span class="impact-station">' + esc(station.name) + "</span>" +
      "</div>" +
      '<div class="impact-body">' +
      '<div class="before-after">' +
      '<div class="before">' +
      "<h4>Before (normal service)</h4>" +
      '<div class="route-flow">' +
      '<span class="station-tag">' + esc(station.name) + "</span>" +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag">' + esc(line.hub) + "</span>" +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag highlight">Penn Station NY</span>' +
      "</div>" +
      '<p class="route-note">Midtown Direct service from ' + esc(station.name) + " (" + esc(branchLabel) + ") through " + esc(line.hub) + " to Penn Station NY.</p>" +
      "</div>" +
      '<div class="after">' +
      "<h4>During cutover (weekdays, Feb 15 – Mar 15)</h4>" +
      '<div class="route-flow">' +
      '<span class="station-tag">' + esc(station.name) + "</span>" +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag">' + esc(line.hub) + "</span>" +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag accent">Hoboken</span>' +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag highlight">Manhattan</span>' +
      "</div>" +
      '<p class="route-note">Then transfer to PATH, ferry, or bus to reach Manhattan. <strong>All cross-honored with your NJ Transit pass.</strong></p>' +
      "</div>" +
      "</div>" +
      '<div class="key-changes"><h4>What you need to know</h4><ul>' +
      changes.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") +
      "</ul></div>" +
      savingsHtml +
      '<div class="weekend-note"><strong>Weekends are different:</strong> Midtown Direct service to Penn Station NY continues on Saturday and Sunday. Buy regular Penn Station tickets for weekend travel.</div>' +
      "</div></div>"
    );
  }

  // --- Impact: Reduced service ---
  function renderReducedServiceImpact(line, station) {
    var changes = [
      "Your train still goes to Penn Station New York — but there are fewer of them. " + esc(line.name) + " is reduced from " + line.trainsBefore + " to " + line.trainsAfter + " daily trains.",
      "Single-track operation between Newark and Secaucus means delays of 15–30+ minutes are common, especially during peak hours.",
      "Check the temporary schedule carefully. Your specific train may be eliminated or retimed.",
      "No ticket changes needed — buy your normal Penn Station tickets.",
      "Travel before 7am or after 9am in the morning, and before 4pm or after 7pm in the evening, to reduce crowding.",
    ];

    if (currentLineId === "north-jersey-coast" && (station.id === "perth-amboy" || station.id === "woodbridge")) {
      changes.push("Perth Amboy and Woodbridge riders: your rail pass or ticket is cross-honored on NJ Transit buses from Perth Amboy or Woodbridge to the Port Authority Bus Terminal.");
    }

    return (
      '<div class="impact-card moderate">' +
      '<div class="impact-header" style="background:' + line.color + '">' +
      '<span class="impact-level">SCHEDULE CHANGES</span>' +
      '<span class="impact-station">' + esc(station.name) + "</span>" +
      "</div>" +
      '<div class="impact-body">' +
      '<div class="before-after">' +
      '<div class="before">' +
      "<h4>Before (normal service)</h4>" +
      '<div class="route-flow">' +
      '<span class="station-tag">' + esc(station.name) + "</span>" +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag">...</span>' +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag highlight">Penn Station NY</span>' +
      "</div>" +
      '<p class="route-note">' + line.trainsBefore + " daily trains on " + esc(line.name) + ".</p>" +
      "</div>" +
      '<div class="after">' +
      "<h4>During cutover (Feb 15 – Mar 15)</h4>" +
      '<div class="route-flow">' +
      '<span class="station-tag">' + esc(station.name) + "</span>" +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag warning">Single track</span>' +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag highlight">Penn Station NY</span>' +
      "</div>" +
      '<p class="route-note">Same destination, fewer trains (' + line.trainsAfter + " daily). Expect delays from single-track operations at the Portal Bridge.</p>" +
      "</div>" +
      "</div>" +
      '<div class="key-changes"><h4>What you need to know</h4><ul>' +
      changes.map(function (c) { return "<li>" + c + "</li>"; }).join("") +
      "</ul></div>" +
      '<div class="weekend-note"><strong>Tip:</strong> Your route doesn\'t change, but your schedule does. Download the temporary schedule PDF from <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com/portalcutover</a> and find your specific trains.</div>' +
      "</div></div>"
    );
  }

  // --- Impact: Newark termination ---
  function renderNewarkTerminationImpact(line, station) {
    var changes = [
      "Your one-seat ride to Penn Station New York is suspended for the duration of the cutover.",
      "All Raritan Valley Line trains now originate and terminate at Newark Penn Station.",
      "To reach Penn Station NY, transfer at Newark Penn to a Northeast Corridor train (reduced service, ~20 min to PSNY).",
      "The transfer at Newark Penn adds 15–30 minutes to your commute depending on connection timing.",
      "Consider shifting your schedule to off-peak hours to get better NEC connections at Newark Penn.",
    ];

    return (
      '<div class="impact-card severe">' +
      '<div class="impact-header" style="background:' + line.color + '">' +
      '<span class="impact-level">MAJOR CHANGES</span>' +
      '<span class="impact-station">' + esc(station.name) + "</span>" +
      "</div>" +
      '<div class="impact-body">' +
      '<div class="before-after">' +
      '<div class="before">' +
      "<h4>Before (normal one-seat ride)</h4>" +
      '<div class="route-flow">' +
      '<span class="station-tag">' + esc(station.name) + "</span>" +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag">...</span>' +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag highlight">Penn Station NY</span>' +
      "</div>" +
      '<p class="route-note">Direct one-seat ride from ' + esc(station.name) + " to Penn Station New York (select trains).</p>" +
      "</div>" +
      '<div class="after">' +
      "<h4>During cutover (Feb 15 – Mar 15)</h4>" +
      '<div class="route-flow">' +
      '<span class="station-tag">' + esc(station.name) + "</span>" +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag accent">Newark Penn</span>' +
      '<span class="arrow">transfer &rarr;</span>' +
      '<span class="station-tag warning">NEC</span>' +
      '<span class="arrow">&rarr;</span>' +
      '<span class="station-tag highlight">Penn Station NY</span>' +
      "</div>" +
      '<p class="route-note">Train terminates at Newark Penn. Transfer to a Northeast Corridor train for Penn Station NY. <strong>Allow extra time for the connection.</strong></p>' +
      "</div>" +
      "</div>" +
      '<div class="key-changes"><h4>What you need to know</h4><ul>' +
      changes.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") +
      "</ul></div>" +
      '<div class="weekend-note"><strong>Alternative:</strong> If you can drive to Newark Penn Station, you can skip the Raritan Valley Line entirely and take an NEC train directly (reduced but still running). Or consider NJ Transit bus service as a backup — some routes serve the Raritan Valley corridor.</div>' +
      "</div></div>"
    );
  }

  // --- Savings callout ---
  function getSavingsHtml(station) {
    var fares = monthlyFares[station.zone];
    if (!fares) return "";
    var savings = fares.toPenn - fares.toHoboken;
    var pctSavings = Math.round((savings / fares.toPenn) * 100);
    return (
      '<div class="savings-callout">' +
      "<p><strong>Estimated savings for " + esc(station.name) + " (zone " + station.zone + "):</strong></p>" +
      "<p>Monthly pass to Penn Station: ~$" + fares.toPenn + "</p>" +
      "<p>Monthly pass to Hoboken: ~$" + fares.toHoboken + "</p>" +
      "<p><strong>You save ~$" + savings + "/month (" + pctSavings + '% less)</strong>, and PATH/ferry from Hoboken is cross-honored at no extra cost.</p>' +
      '<p class="fare-disclaimer"><em>Fares are approximate estimates. Verify at <a href="https://www.njtransit.com" target="_blank" rel="noopener">njtransit.com</a> before purchasing.</em></p>' +
      "</div>"
    );
  }

  // =========================================================================
  // ROUTE PLANNER
  // =========================================================================
  function renderRoutes() {
    var line = getCurrentLine();

    if (line.impactType === "hoboken-diversion") {
      $routesIntro.innerHTML =
        "<h2>How do I get to Manhattan?</h2>" +
        "<p>Your weekday " + esc(line.name) + " train now ends at Hoboken. Here are your options to get the rest of the way, all cross-honored with your NJ Transit ticket or pass.</p>";
      $routesContent.innerHTML = renderHobokenRoutes();
    } else if (line.impactType === "reduced-service") {
      $routesIntro.innerHTML =
        "<h2>Planning your commute</h2>" +
        "<p>Your " + esc(line.name) + " train still goes to Penn Station NY, but with fewer trains and more delays. Here's how to adapt.</p>";
      $routesContent.innerHTML = renderReducedServiceRoutes(line);
    } else if (line.impactType === "newark-termination") {
      $routesIntro.innerHTML =
        "<h2>Getting past Newark Penn</h2>" +
        "<p>Your " + esc(line.name) + " train now terminates at Newark Penn Station. Here's how to get the rest of the way to Manhattan.</p>";
      $routesContent.innerHTML = renderNewarkRoutes();
    }
  }

  function renderHobokenRoutes() {
    return (
      makeRouteCard(
        "&#x1F687;",
        "PATH train",
        "Best for most riders",
        true,
        [
          { label: "From", value: "Hoboken Terminal" },
          { label: "To", value: "33rd Street, Manhattan" },
          { label: "Travel time", value: "12–15 min" },
          { label: "Frequency", value: "Every 3–5 min (peak), 10–15 min (off-peak)" },
          { label: "Cost", value: "Cross-honored (free with NJ Transit pass/ticket)" },
        ],
        "Fastest option. Direct ride to 33rd St & 6th Ave in Midtown.",
        "Expect extreme crowding during peak hours (7–9am, 5–7pm). Board at front of train for fastest exit at 33rd St.",
        "Travel before 7am or after 9am to avoid the worst crowds."
      ) +
      makeRouteCard(
        "&#x26F4;&#xFE0F;",
        "NY Waterway ferry",
        "Scenic & less crowded",
        false,
        [
          { label: "From", value: "Hoboken Terminal ferry dock" },
          { label: "To", value: "W. 39th St, Midtown Manhattan" },
          { label: "Travel time", value: "10–12 min" },
          { label: "Frequency", value: "Enhanced service during commute hours" },
          { label: "Cost", value: "Cross-honored (free with NJ Transit pass/ticket)" },
        ],
        "Usually less crowded than PATH. Five free connecting bus routes from the Midtown ferry terminal to other parts of Manhattan.",
        "Can be affected by weather. Limited evening/weekend frequency. Only serves W. 39th St area.",
        "Check the NY Waterway app for real-time ferry departures. The free connecting buses go to Penn Station, Grand Central, and Wall Street area."
      ) +
      makeRouteCard(
        "&#x1F68C;",
        "NJ Transit Bus 126",
        "Best for Port Authority area",
        false,
        [
          { label: "From", value: "Hoboken Terminal bus area" },
          { label: "To", value: "Port Authority Bus Terminal (42nd St & 8th Ave)" },
          { label: "Travel time", value: "20–40 min (traffic dependent)" },
          { label: "Frequency", value: "Regular service throughout the day" },
          { label: "Cost", value: "Cross-honored (free with NJ Transit pass/ticket)" },
        ],
        "Drops you at Port Authority, useful for Times Square / west Midtown. No additional fare.",
        "Lincoln Tunnel traffic can double the travel time. Standing room likely during peak hours.",
        "Best option if your final destination is near Times Square, Hell's Kitchen, or the west side."
      ) +
      makeOtherOptionsCard([
        "<strong>Work from home:</strong> NJ Transit is specifically asking employers to allow remote work during the cutover. Even 1–2 days a week helps reduce crowding for everyone.",
        "<strong>Drive to a different station:</strong> Consider driving to Secaucus Junction or Newark Penn to catch a direct NEC train to Penn Station NY (reduced but still running).",
        "<strong>Shift your schedule:</strong> Travel before 7am or after 9am in the morning, and before 4pm or after 7pm in the evening.",
      ])
    );
  }

  function renderReducedServiceRoutes(line) {
    var busNote = "";
    if (currentLineId === "north-jersey-coast") {
      busNote = makeRouteCard(
        "&#x1F68C;",
        "Bus alternative (Perth Amboy / Woodbridge)",
        "Cross-honored for NJCL riders",
        false,
        [
          { label: "From", value: "Perth Amboy or Woodbridge" },
          { label: "To", value: "Port Authority Bus Terminal" },
          { label: "Cost", value: "Cross-honored with NJCL rail pass/ticket" },
        ],
        "Riders from Perth Amboy or Woodbridge can use their rail pass or ticket on a bus to Port Authority, bypassing the rail system entirely.",
        "Bus travel time depends on traffic conditions.",
        "Check NJ Transit bus schedules for routes serving Perth Amboy and Woodbridge."
      );
    }

    return (
      makeRouteCard(
        "&#x1F686;",
        "Stay on the " + esc(line.shortName),
        "Same route, new schedule",
        true,
        [
          { label: "Destination", value: "Penn Station New York (unchanged)" },
          { label: "Service level", value: line.trainsBefore + " → " + line.trainsAfter + " daily trains" },
          { label: "Extra time", value: "15–30+ min delays likely during peak" },
          { label: "Tickets", value: "No change — buy regular Penn Station tickets" },
        ],
        "Your route doesn't change. Trains still run to Penn Station NY.",
        "Fewer trains and single-track operations mean crowding and delays. Your specific train may be eliminated or retimed.",
        "Download the temporary schedule from njtransit.com/portalcutover. Find your specific trains and plan around them."
      ) +
      busNote +
      makeOtherOptionsCard([
        "<strong>Check your specific trains:</strong> The temporary schedule eliminates or retimes many trains. Don't assume your usual train is running — verify before you leave.",
        "<strong>Shift your schedule:</strong> Off-peak trains will be less crowded and less affected by single-track delays. Travel before 7am or after 9am.",
        "<strong>Work from home:</strong> NJ Transit is asking employers to support remote work during the cutover. Even 1–2 WFH days a week makes a difference.",
        "<strong>Consider driving to Newark Penn:</strong> If you drive to your station, going directly to Newark Penn skips the most congested portion of your line.",
      ])
    );
  }

  function renderNewarkRoutes() {
    return (
      makeRouteCard(
        "&#x1F686;",
        "Transfer to NEC at Newark Penn",
        "Primary option",
        true,
        [
          { label: "Transfer at", value: "Newark Penn Station" },
          { label: "Then take", value: "Northeast Corridor train to Penn Station NY" },
          { label: "NEC travel time", value: "~20 min (Newark Penn → Penn Station NY)" },
          { label: "NEC frequency", value: "Reduced — 112 daily trains (down from 133)" },
          { label: "Tickets", value: "Your existing ticket/pass should cover the transfer" },
        ],
        "Most direct option. Cross-platform transfer at Newark Penn to an NEC train.",
        "NEC trains are also reduced, so connections may not be immediate. Allow 15–30 min for transfer + wait time. Peak hours will be crowded.",
        "Check both the Raritan Valley temporary schedule AND the NEC temporary schedule to find the best connection pairs."
      ) +
      makeRouteCard(
        "&#x1F68C;",
        "NJ Transit bus from Newark",
        "Bypass rail entirely",
        false,
        [
          { label: "From", value: "Newark Penn Station bus area" },
          { label: "To", value: "Port Authority Bus Terminal" },
          { label: "Travel time", value: "30–50 min (traffic dependent)" },
        ],
        "Several NJ Transit bus routes connect Newark to Port Authority / Manhattan. Skips the rail bottleneck entirely.",
        "Subject to Lincoln Tunnel and Newark traffic, especially during peak hours.",
        "Check NJ Transit bus routes from Newark for your best option."
      ) +
      makeRouteCard(
        "&#x1F687;",
        "PATH from Newark",
        "Alternative to Manhattan",
        false,
        [
          { label: "From", value: "Newark Penn Station" },
          { label: "To", value: "World Trade Center, Manhattan" },
          { label: "Travel time", value: "~25 min" },
          { label: "Frequency", value: "Every 5–10 min" },
          { label: "Cost", value: "$2.75 (separate fare)" },
        ],
        "PATH runs from Newark Penn to World Trade Center in Lower Manhattan. Good option if your destination is downtown or the Financial District.",
        "This goes to Lower Manhattan, not Midtown. Separate fare required (not cross-honored on this route). Will also be more crowded during cutover.",
        "Best for riders whose final destination is downtown Manhattan or who can connect to the subway at WTC."
      ) +
      makeOtherOptionsCard([
        "<strong>Drive to Newark Penn:</strong> If you normally drive to your Raritan Valley station, consider driving directly to Newark Penn and taking an NEC train. Saves the transfer.",
        "<strong>Drive to Secaucus:</strong> Another option is driving to Secaucus Junction to catch a train that's already past the bottleneck.",
        "<strong>Work from home:</strong> NJ Transit is asking employers to support remote work during the cutover.",
        "<strong>Shift your schedule:</strong> Off-peak NEC connections at Newark Penn will be much less crowded.",
      ])
    );
  }

  // --- Route card builder ---
  function makeRouteCard(icon, title, badgeText, recommended, details, pro, con, tip) {
    var badgeClass = recommended ? "badge recommended" : "badge";
    var detailsHtml = details
      .map(function (d) {
        return (
          '<div class="detail">' +
          '<span class="detail-label">' + esc(d.label) + "</span>" +
          '<span class="detail-value">' + esc(d.value) + "</span>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="route-card">' +
      '<div class="route-card-header">' +
      '<span class="mode-icon">' + icon + "</span>" +
      "<div>" +
      "<h3>" + title + "</h3>" +
      '<span class="' + badgeClass + '">' + esc(badgeText) + "</span>" +
      "</div></div>" +
      '<div class="route-card-body">' +
      '<div class="route-details">' + detailsHtml + "</div>" +
      '<div class="route-tips">' +
      '<p class="pro">' + esc(pro) + "</p>" +
      '<p class="con">' + esc(con) + "</p>" +
      '<p class="tip"><strong>Pro tip:</strong> ' + esc(tip) + "</p>" +
      "</div></div></div>"
    );
  }

  function makeOtherOptionsCard(items) {
    return (
      '<div class="route-card other">' +
      '<div class="route-card-header">' +
      '<span class="mode-icon">&#x1F6B6;</span>' +
      "<div><h3>Other options to consider</h3></div>" +
      "</div>" +
      '<div class="route-card-body"><div class="route-tips">' +
      items.map(function (item) { return "<p>" + item + "</p>"; }).join("") +
      "</div></div></div>"
    );
  }

  // =========================================================================
  // TICKET GUIDE
  // =========================================================================
  function renderTickets() {
    var line = getCurrentLine();

    if (line.impactType === "hoboken-diversion") {
      $ticketsIntro.innerHTML =
        "<h2>What ticket should I buy?</h2>" +
        "<p>The cutover changes what you should buy for the " + esc(line.name) + ". Here's a guide based on how you ride.</p>";
      $ticketsContent.innerHTML = renderHobokenTickets(line);
    } else if (line.impactType === "reduced-service") {
      $ticketsIntro.innerHTML =
        "<h2>What ticket should I buy?</h2>" +
        "<p>Good news for " + esc(line.name) + " riders: your tickets mostly stay the same.</p>";
      $ticketsContent.innerHTML = renderReducedServiceTickets(line);
    } else if (line.impactType === "newark-termination") {
      $ticketsIntro.innerHTML =
        "<h2>What ticket should I buy?</h2>" +
        "<p>Ticketing for " + esc(line.name) + " riders gets a bit more complicated during the cutover.</p>";
      $ticketsContent.innerHTML = renderNewarkTickets(line);
    }
  }

  function renderHobokenTickets(line) {
    return (
      '<div class="ticket-scenarios">' +
      makeScenarioCard("Monthly pass holders", [
        "<strong>Buy a monthly pass to/from Hoboken</strong> (via Newark Broad St) for February and March.",
        "This pass works for Penn Station travel during <strong>Feb 1–15</strong> and <strong>Mar 15–31</strong> (the normal-service portions of each month).",
        "During <strong>Feb 15 – Mar 15</strong>, your Hoboken pass is <strong>cross-honored</strong> on PATH (Hoboken \u2194 33rd St), NY Waterway ferry (Hoboken \u2194 W. 39th St), and NJ Transit Bus 126.",
      ], '<p><strong>You save money.</strong> Hoboken passes cost less than Penn Station passes because Hoboken is closer. The PATH/ferry ride is included free. NJ Transit says riders can save up to 25% per trip.</p>') +
      makeScenarioCard("One-way ticket buyers (weekdays)", [
        "<strong>Feb 15 – Mar 15:</strong> Buy one-way tickets to/from <strong>Hoboken</strong> (not Penn Station).",
        "Your Hoboken ticket is cross-honored on PATH, ferry, and Bus 126 to reach Manhattan.",
        "<strong>Before Feb 15 and after Mar 15:</strong> Buy regular tickets to/from Penn Station New York.",
      ], '<p><strong>You save money.</strong> Hoboken tickets cost less than Penn Station tickets. The PATH/ferry ride is included free.</p>') +
      makeScenarioCard("Weekend riders", [
        "<strong>No change.</strong> Weekend Midtown Direct trains continue to Penn Station New York.",
        "Buy regular one-way tickets to/from <strong>Penn Station New York</strong> for Saturday and Sunday travel.",
      ]) +
      makeScenarioCard("Occasional riders / not sure what to do", [
        "If you ride <strong>weekdays between Feb 15 and Mar 15</strong>: buy a ticket to <strong>Hoboken</strong>. Transfer to PATH/ferry/bus at Hoboken for free.",
        "If you ride <strong>weekends</strong> or <strong>outside the cutover dates</strong>: buy a regular ticket to <strong>Penn Station New York</strong>.",
        'When in doubt, check <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com/portalcutover</a> or ask a conductor.',
      ]) +
      "</div>"
    );
  }

  function renderReducedServiceTickets(line) {
    var extraNote = "";
    if (currentLineId === "north-jersey-coast") {
      extraNote = makeScenarioCard("Perth Amboy / Woodbridge riders", [
        "Your existing rail pass or ticket is <strong>cross-honored on NJ Transit buses</strong> from Perth Amboy or Woodbridge to the Port Authority Bus Terminal.",
        "This is a free alternative — no additional fare needed if you have a valid rail ticket or pass.",
        "Check NJ Transit bus schedules for routes and times.",
      ]);
    }

    return (
      '<div class="ticket-scenarios">' +
      makeScenarioCard("Monthly pass holders", [
        "<strong>No change.</strong> Buy your regular monthly pass to/from Penn Station New York.",
        "Your pass works the same as always — there are just fewer trains running.",
        "Check the temporary schedule to make sure your specific trains are still running.",
      ]) +
      makeScenarioCard("One-way ticket buyers", [
        "<strong>No change.</strong> Buy regular one-way tickets to/from Penn Station New York.",
        "Same tickets, same prices — just fewer trains and potentially longer travel times.",
      ]) +
      extraNote +
      makeScenarioCard("General advice", [
        "Your tickets don't change, but your <strong>travel time probably will</strong>. Budget an extra 15–30 minutes.",
        "Download the temporary schedule from <a href=\"https://www.njtransit.com/portalcutover\" target=\"_blank\" rel=\"noopener\">njtransit.com/portalcutover</a> and find your specific trains.",
        "Consider shifting to off-peak hours to avoid the worst crowding and delays.",
      ]) +
      "</div>"
    );
  }

  function renderNewarkTickets(line) {
    return (
      '<div class="ticket-scenarios">' +
      makeScenarioCard("If you had a one-seat ride to Penn Station NY", [
        "Your one-seat ride is suspended. Trains now terminate at <strong>Newark Penn Station</strong>.",
        "You will need to transfer to a <strong>Northeast Corridor</strong> train at Newark Penn to reach Penn Station NY.",
        'Check <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com/portalcutover</a> for specific ticket guidance — your existing pass or ticket should cover the transfer in most cases.',
      ]) +
      makeScenarioCard("Monthly pass holders", [
        "If your pass was for travel to Penn Station NY, it should still be valid for the Newark Penn transfer + NEC connection.",
        "Verify with NJ Transit that your specific pass covers the transfer. Rules may vary by zone.",
        "Consider whether a different pass configuration saves you money during the cutover period.",
      ]) +
      makeScenarioCard("One-way ticket buyers", [
        "Buy a ticket to your final destination (Penn Station New York) as usual.",
        "The transfer at Newark Penn should be covered by your through ticket.",
        "If in doubt, ask a conductor or check the NJ Transit app.",
      ]) +
      makeScenarioCard("Alternative: PATH from Newark Penn", [
        "PATH trains run from Newark Penn to <strong>World Trade Center</strong> in Lower Manhattan (~25 min, $2.75).",
        "This is a <strong>separate fare</strong> — not included in your NJ Transit ticket.",
        "Best option if your final destination is downtown Manhattan / Financial District.",
      ]) +
      "</div>"
    );
  }

  function makeScenarioCard(title, steps, callout) {
    var stepsHtml = steps
      .map(function (step, i) {
        return (
          '<div class="step">' +
          '<span class="step-num">' + (i + 1) + "</span>" +
          "<div><p>" + step + "</p></div>" +
          "</div>"
        );
      })
      .join("");

    var calloutHtml = callout
      ? '<div class="savings-callout">' + callout + "</div>"
      : "";

    return (
      '<div class="scenario-card">' +
      "<h3>" + esc(title) + "</h3>" +
      '<div class="scenario-body">' +
      stepsHtml +
      calloutHtml +
      "</div></div>"
    );
  }

  // =========================================================================
  // INIT
  // =========================================================================
  function init() {
    updateCountdown();
    updateTimeline();
    buildLineNav();
    selectLine(currentLineId);
    initTabs();

    $stationSelect.addEventListener("change", onStationChange);
    setInterval(updateCountdown, 3600000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
