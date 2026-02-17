// Reroute NJ — Interactive tools for NJ Transit Portal Bridge cutover
// All affected lines with dynamic content generation

(function () {
  "use strict";

  // Date constants (CUTOVER_START, CUTOVER_END, PHASE2_APPROX) and
  // shared helpers (esc, updateCountdown) are in shared.js.
  // LINE_DATA and LINE_ORDER are in line-data.js (loaded before this file).

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
  var currentDirection = "nj-to-nyc";

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
  var $directionToggle = document.getElementById("direction-toggle");
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
      var isActive = lineId === currentLineId;
      btn.className = "line-btn" + (isActive ? " active" : "");
      btn.setAttribute("data-line", lineId);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
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
      var isActive = btns[i].getAttribute("data-line") === lineId;
      btns[i].classList.toggle("active", isActive);
      btns[i].setAttribute("aria-pressed", isActive ? "true" : "false");
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
      '<option value="">' + esc(t("js.choose_station")) + '</option>';

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
  function activateTab(tab) {
    var targetTab = tab.getAttribute("data-tab");
    tabs.forEach(function (t) {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
      t.setAttribute("tabindex", "-1");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    tab.setAttribute("tabindex", "0");
    tab.focus();
    panels.forEach(function (p) {
      p.classList.remove("active");
    });
    var targetPanel = document.getElementById("panel-" + targetTab);
    if (targetPanel) targetPanel.classList.add("active");
  }

  function initTabs() {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activateTab(this);
      });
      tab.addEventListener("keydown", function (e) {
        var index = Array.prototype.indexOf.call(tabs, this);
        var newIndex;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          newIndex = (index + 1) % tabs.length;
          activateTab(tabs[newIndex]);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          newIndex = (index - 1 + tabs.length) % tabs.length;
          activateTab(tabs[newIndex]);
        } else if (e.key === "Home") {
          e.preventDefault();
          activateTab(tabs[0]);
        } else if (e.key === "End") {
          e.preventDefault();
          activateTab(tabs[tabs.length - 1]);
        }
      });
    });
  }

  // =========================================================================
  // SOURCE ATTRIBUTION
  // =========================================================================
  function makeSourceFooter(line) {
    var sources = line && line.sources ? line.sources : {};
    var cutoverUrl = "https://www.njtransit.com/portalcutover";
    var pressUrl = sources.impactType || "https://www.njtransit.com/press-releases/portal-north-bridge-enters-final-phase-construction-work-begins-put-first-track";
    return (
      '<div class="source-attribution">' +
      '<p class="source-label">Sources: ' +
      '<a href="' + esc(cutoverUrl) + '" target="_blank" rel="noopener">NJ Transit cutover page</a>' +
      ' · <a href="' + esc(pressUrl) + '" target="_blank" rel="noopener">NJ Transit/Amtrak press release</a>' +
      ' · <a href="https://www.panynj.gov/path/en/schedules-maps.html" target="_blank" rel="noopener">PATH schedules</a>' +
      ' · <a href="https://www.nywaterway.com/HobokenMidtown.aspx" target="_blank" rel="noopener">NY Waterway</a>' +
      "</p></div>"
    );
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
    $impactResult.focus();
  }

  // --- Impact: Hoboken diversion ---
  function renderHobokenImpact(line, station) {
    var branchLabel = line.branches[station.branch] || station.branch;
    var isReverse = currentDirection === "nyc-to-nj";

    var changes;
    if (isReverse) {
      changes = [
        "Your weekday evening train from Penn Station New York is suspended. To reach " + esc(station.name) + ", you must first get to Hoboken Terminal.",
        "Take PATH from 33rd St to Hoboken, NY Waterway ferry from W. 39th St, or Bus 126 from Port Authority. All cross-honored with your NJ Transit ticket.",
        "At Hoboken Terminal, board your " + esc(line.name) + " train home to " + esc(station.name) + ".",
        "Weekend service from Penn Station to " + esc(station.name) + " continues normally.",
        "Check the temporary evening schedule — your usual train may be retimed or eliminated.",
      ];
    } else {
      changes = [
        "Your weekday train to Penn Station New York is suspended. All weekday " + esc(line.name) + " trains now terminate at Hoboken.",
        "At Hoboken, transfer to PATH (33rd St), NY Waterway ferry (W. 39th St), or Bus 126 (Port Authority). All are cross-honored with your NJ Transit ticket.",
        "Weekend service to Penn Station continues normally. No changes on Saturdays and Sundays. Note: Feb 16 (Presidents\u2019 Day) runs a holiday/weekend schedule with additional trains.",
        "Buy tickets to/from Hoboken (not Penn Station) for weekday travel during Feb 15 – Mar 15.",
        "Travel before 7am or after 9am to avoid the worst crowding at Hoboken and on PATH.",
      ];
    }
    var savingsHtml = getSavingsHtml(station);

    var beforeFlow, beforeNote, afterFlow, afterNote;
    if (isReverse) {
      beforeFlow =
        '<span class="station-tag highlight">Penn Station NY</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(line.hub) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(station.name) + "</span>";
      beforeNote = "Midtown Direct evening service from Penn Station NY through " + esc(line.hub) + " to " + esc(station.name) + " (" + esc(branchLabel) + ").";
      afterFlow =
        '<span class="station-tag highlight">Manhattan</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag accent">Hoboken</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(line.hub) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(station.name) + "</span>";
      afterNote = "Take PATH, ferry, or bus to Hoboken first, then board your NJ Transit train. <strong>All cross-honored with your NJ Transit pass.</strong>";
    } else {
      beforeFlow =
        '<span class="station-tag">' + esc(station.name) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(line.hub) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag highlight">Penn Station NY</span>';
      beforeNote = "Midtown Direct service from " + esc(station.name) + " (" + esc(branchLabel) + ") through " + esc(line.hub) + " to Penn Station NY.";
      afterFlow =
        '<span class="station-tag">' + esc(station.name) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(line.hub) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag accent">Hoboken</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag highlight">Manhattan</span>';
      afterNote = "Then transfer to PATH, ferry, or bus to reach Manhattan. <strong>All cross-honored with your NJ Transit pass.</strong>";
    }

    return (
      '<div class="impact-card severe">' +
      '<div class="impact-header" style="background:' + line.color + '">' +
      '<span class="impact-level">' + t("js.major_changes") + '</span>' +
      '<span class="impact-station">' + esc(station.name) + "</span>" +
      "</div>" +
      '<div class="impact-body">' +
      '<div class="before-after">' +
      '<div class="before">' +
      "<h3>" + t("js.before_normal") + "</h3>" +
      '<div class="route-flow">' + beforeFlow + "</div>" +
      '<p class="route-note">' + beforeNote + "</p>" +
      "</div>" +
      '<div class="after">' +
      "<h3>" + t("js.during_cutover") + "</h3>" +
      '<div class="route-flow">' + afterFlow + "</div>" +
      '<p class="route-note">' + afterNote + "</p>" +
      "</div>" +
      "</div>" +
      '<div class="key-changes"><h3>' + t("js.what_you_need_to_know") + '</h3><ul>' +
      changes.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") +
      "</ul></div>" +
      savingsHtml +
      '<div class="weekend-note"><strong>' + t("js.weekends_different") + '</strong> ' + t("js.weekend_service_continues") + '</div>' +
      makeSourceFooter(line) +
      "</div></div>"
    );
  }

  // --- Impact: Reduced service ---
  function renderReducedServiceImpact(line, station) {
    var isReverse = currentDirection === "nyc-to-nj";
    var changes = [
      isReverse
        ? "Your evening train from Penn Station New York to " + esc(station.name) + " still runs — but there are fewer of them. " + esc(line.name) + " is reduced from " + line.trainsBefore + " to " + line.trainsAfter + " daily trains."
        : "Your train still goes to Penn Station New York — but there are fewer of them. " + esc(line.name) + " is reduced from " + line.trainsBefore + " to " + line.trainsAfter + " daily trains.",
      "Single-track operation between Newark and Secaucus means delays of 15–30+ minutes are common, especially during peak hours.",
      "Check the temporary schedule carefully. Your specific train may be eliminated or retimed.",
      "No ticket changes needed — buy your normal Penn Station tickets.",
      isReverse
        ? "Leave Manhattan before 4pm or after 7pm to avoid the worst evening crowding."
        : "Travel before 7am or after 9am in the morning, and before 4pm or after 7pm in the evening, to reduce crowding.",
    ];

    if (currentLineId === "north-jersey-coast" && (station.id === "perth-amboy" || station.id === "woodbridge")) {
      changes.push("Perth Amboy and Woodbridge riders: your rail pass or ticket is cross-honored on NJ Transit buses from Perth Amboy or Woodbridge to the Port Authority Bus Terminal.");
    }

    var beforeFlow, afterFlow;
    if (isReverse) {
      beforeFlow =
        '<span class="station-tag highlight">Penn Station NY</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">...</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(station.name) + "</span>";
      afterFlow =
        '<span class="station-tag highlight">Penn Station NY</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag warning">Single track</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(station.name) + "</span>";
    } else {
      beforeFlow =
        '<span class="station-tag">' + esc(station.name) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">...</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag highlight">Penn Station NY</span>';
      afterFlow =
        '<span class="station-tag">' + esc(station.name) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag warning">Single track</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag highlight">Penn Station NY</span>';
    }

    return (
      '<div class="impact-card moderate">' +
      '<div class="impact-header" style="background:' + line.color + '">' +
      '<span class="impact-level">' + t("js.schedule_changes") + '</span>' +
      '<span class="impact-station">' + esc(station.name) + "</span>" +
      "</div>" +
      '<div class="impact-body">' +
      '<div class="before-after">' +
      '<div class="before">' +
      "<h3>" + t("js.before_normal") + "</h3>" +
      '<div class="route-flow">' + beforeFlow + "</div>" +
      '<p class="route-note">' + line.trainsBefore + " daily trains on " + esc(line.name) + ".</p>" +
      "</div>" +
      '<div class="after">' +
      "<h3>" + t("js.during_cutover_short") + "</h3>" +
      '<div class="route-flow">' + afterFlow + "</div>" +
      '<p class="route-note">Same ' + (isReverse ? "origin" : "destination") + ", fewer trains (" + line.trainsAfter + " daily). Expect delays from single-track operations at the Portal Bridge.</p>" +
      "</div>" +
      "</div>" +
      '<div class="key-changes"><h3>' + t("js.what_you_need_to_know") + '</h3><ul>' +
      changes.map(function (c) { return "<li>" + c + "</li>"; }).join("") +
      "</ul></div>" +
      '<div class="weekend-note"><strong>Tip:</strong> Your route doesn\'t change, but your schedule does. Download the temporary schedule PDF from <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com/portalcutover</a> and find your specific trains.</div>' +
      makeSourceFooter(line) +
      "</div></div>"
    );
  }

  // --- Impact: Newark termination ---
  function renderNewarkTerminationImpact(line, station) {
    var isReverse = currentDirection === "nyc-to-nj";
    var changes;
    if (isReverse) {
      changes = [
        "Your one-seat ride from Penn Station New York to " + esc(station.name) + " is suspended for the duration of the cutover.",
        "All Raritan Valley Line trains now originate and terminate at Newark Penn Station.",
        "To reach " + esc(station.name) + ", take a Northeast Corridor train from Penn Station NY to Newark Penn (~20 min), then transfer to a Raritan Valley Line train.",
        "The transfer at Newark Penn adds 15–30 minutes to your commute depending on connection timing.",
        "Check the temporary NEC evening schedule to find the best connection with RVL departures from Newark Penn.",
      ];
    } else {
      changes = [
        "Your one-seat ride to Penn Station New York is suspended for the duration of the cutover.",
        "All Raritan Valley Line trains now originate and terminate at Newark Penn Station.",
        "To reach Penn Station NY, transfer at Newark Penn to a Northeast Corridor train (reduced service, ~20 min to PSNY).",
        "The transfer at Newark Penn adds 15–30 minutes to your commute depending on connection timing.",
        "Consider shifting your schedule to off-peak hours to get better NEC connections at Newark Penn.",
      ];
    }

    var beforeFlow, beforeNote, afterFlow, afterNote;
    if (isReverse) {
      beforeFlow =
        '<span class="station-tag highlight">Penn Station NY</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">...</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(station.name) + "</span>";
      beforeNote = "Direct one-seat ride from Penn Station New York to " + esc(station.name) + " (select trains).";
      afterFlow =
        '<span class="station-tag highlight">Penn Station NY</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag warning">NEC</span>' +
        '<span class="arrow">transfer &rarr;</span>' +
        '<span class="station-tag accent">Newark Penn</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">' + esc(station.name) + "</span>";
      afterNote = "Take NEC to Newark Penn, then transfer to Raritan Valley Line. <strong>Allow extra time for the connection.</strong>";
    } else {
      beforeFlow =
        '<span class="station-tag">' + esc(station.name) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag">...</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag highlight">Penn Station NY</span>';
      beforeNote = "Direct one-seat ride from " + esc(station.name) + " to Penn Station New York (select trains).";
      afterFlow =
        '<span class="station-tag">' + esc(station.name) + "</span>" +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag accent">Newark Penn</span>' +
        '<span class="arrow">transfer &rarr;</span>' +
        '<span class="station-tag warning">NEC</span>' +
        '<span class="arrow">&rarr;</span>' +
        '<span class="station-tag highlight">Penn Station NY</span>';
      afterNote = "Train terminates at Newark Penn. Transfer to a Northeast Corridor train for Penn Station NY. <strong>Allow extra time for the connection.</strong>";
    }

    return (
      '<div class="impact-card severe">' +
      '<div class="impact-header" style="background:' + line.color + '">' +
      '<span class="impact-level">' + t("js.major_changes") + '</span>' +
      '<span class="impact-station">' + esc(station.name) + "</span>" +
      "</div>" +
      '<div class="impact-body">' +
      '<div class="before-after">' +
      '<div class="before">' +
      "<h3>Before (normal one-seat ride)</h3>" +
      '<div class="route-flow">' + beforeFlow + "</div>" +
      '<p class="route-note">' + beforeNote + "</p>" +
      "</div>" +
      '<div class="after">' +
      "<h3>" + t("js.during_cutover_short") + "</h3>" +
      '<div class="route-flow">' + afterFlow + "</div>" +
      '<p class="route-note">' + afterNote + "</p>" +
      "</div>" +
      "</div>" +
      '<div class="key-changes"><h3>' + t("js.what_you_need_to_know") + '</h3><ul>' +
      changes.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") +
      "</ul></div>" +
      '<div class="weekend-note"><strong>Alternative:</strong> If you can drive to Newark Penn Station, you can skip the Raritan Valley Line entirely and take an NEC train directly (reduced but still running). Or consider NJ Transit bus service as a backup — some routes serve the Raritan Valley corridor.</div>' +
      makeSourceFooter(line) +
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
      "<p><strong>" + t("js.estimated_savings") + " " + esc(station.name) + " (" + t("js.zone") + " " + station.zone + "):</strong></p>" +
      "<p>" + t("js.monthly_pass_penn") + " ~$" + fares.toPenn + "</p>" +
      "<p>" + t("js.monthly_pass_hoboken") + " ~$" + fares.toHoboken + "</p>" +
      "<p><strong>" + t("js.you_save") + " ~$" + savings + t("js.per_month") + " (" + pctSavings + '% less)</strong>, ' + t("js.cross_honored_free") + '</p>' +
      '<p class="fare-disclaimer"><em>' + t("js.fare_disclaimer") + '</em></p>' +
      "</div>"
    );
  }

  // =========================================================================
  // ROUTE PLANNER
  // =========================================================================
  function renderRoutes() {
    var line = getCurrentLine();
    var isReverse = currentDirection === "nyc-to-nj";

    if (line.impactType === "hoboken-diversion") {
      if (isReverse) {
        $routesIntro.innerHTML =
          "<h2>" + t("js.how_get_home") + "</h2>" +
          "<p>Your evening " + esc(line.name) + " train now departs from Hoboken. Here are your options to get to Hoboken from Manhattan, all cross-honored with your NJ Transit ticket or pass.</p>";
        $routesContent.innerHTML = renderHobokenRoutesReverse();
      } else {
        $routesIntro.innerHTML =
          "<h2>" + t("js.how_get_manhattan") + "</h2>" +
          "<p>Your weekday " + esc(line.name) + " train now ends at Hoboken. Here are your options to get the rest of the way, all cross-honored with your NJ Transit ticket or pass.</p>";
        $routesContent.innerHTML = renderHobokenRoutes();
      }
    } else if (line.impactType === "reduced-service") {
      if (isReverse) {
        $routesIntro.innerHTML =
          "<h2>" + t("js.getting_home") + "</h2>" +
          "<p>Your " + esc(line.name) + " evening train from Penn Station NY still runs, but with fewer trains and more delays. Here's how to adapt.</p>";
      } else {
        $routesIntro.innerHTML =
          "<h2>" + t("js.planning_commute") + "</h2>" +
          "<p>Your " + esc(line.name) + " train still goes to Penn Station NY, but with fewer trains and more delays. Here's how to adapt.</p>";
      }
      $routesContent.innerHTML = renderReducedServiceRoutes(line);
    } else if (line.impactType === "newark-termination") {
      if (isReverse) {
        $routesIntro.innerHTML =
          "<h2>" + t("js.getting_home_manhattan") + "</h2>" +
          "<p>Your " + esc(line.name) + " evening train now departs from Newark Penn Station. Here's how to get from Manhattan to Newark Penn to catch your train.</p>";
        $routesContent.innerHTML = renderNewarkRoutesReverse();
      } else {
        $routesIntro.innerHTML =
          "<h2>" + t("js.getting_past_newark") + "</h2>" +
          "<p>Your " + esc(line.name) + " train now terminates at Newark Penn Station. Here's how to get the rest of the way to Manhattan.</p>";
        $routesContent.innerHTML = renderNewarkRoutes();
      }
    }
  }

  function renderHobokenRoutes() {
    return (
      makeRouteCard(
        "&#x1F687;",
        "PATH train",
        t("js.recommended"),
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
        t("js.scenic_less_crowded"),
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
        t("js.port_authority_area"),
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

  function renderHobokenRoutesReverse() {
    return (
      makeRouteCard(
        "&#x1F687;",
        "PATH to Hoboken",
        t("js.recommended"),
        true,
        [
          { label: "From", value: "33rd Street, Manhattan" },
          { label: "To", value: "Hoboken Terminal" },
          { label: "Travel time", value: "12–15 min" },
          { label: "Frequency", value: "Every 3–5 min (peak), 10–15 min (off-peak)" },
          { label: "Cost", value: "Cross-honored (free with NJ Transit pass/ticket)" },
        ],
        "Fastest option. Direct ride from 33rd St & 6th Ave to Hoboken Terminal.",
        "Expect heavy crowding during evening peak (5–7pm). Trains fill up quickly at 33rd St.",
        "Board at the front of the PATH train for the closest exit to NJ Transit platforms at Hoboken."
      ) +
      makeRouteCard(
        "&#x26F4;&#xFE0F;",
        "NY Waterway ferry to Hoboken",
        t("js.scenic_less_crowded"),
        false,
        [
          { label: "From", value: "W. 39th St, Midtown Manhattan" },
          { label: "To", value: "Hoboken Terminal ferry dock" },
          { label: "Travel time", value: "10–12 min" },
          { label: "Frequency", value: "Enhanced service during commute hours" },
          { label: "Cost", value: "Cross-honored (free with NJ Transit pass/ticket)" },
        ],
        "Usually less crowded than PATH. Free connecting buses from Penn Station, Grand Central, and Wall St to the ferry terminal.",
        "Can be affected by weather. Limited evening frequency. Only departs from W. 39th St.",
        "Check the NY Waterway app for evening departure times. Free connecting buses depart from multiple Manhattan locations."
      ) +
      makeRouteCard(
        "&#x1F68C;",
        "NJ Transit Bus 126 to Hoboken",
        t("js.port_authority_area"),
        false,
        [
          { label: "From", value: "Port Authority Bus Terminal (42nd St & 8th Ave)" },
          { label: "To", value: "Hoboken Terminal bus area" },
          { label: "Travel time", value: "20–40 min (traffic dependent)" },
          { label: "Frequency", value: "Regular service throughout the day" },
          { label: "Cost", value: "Cross-honored (free with NJ Transit pass/ticket)" },
        ],
        "Convenient if you're already near Times Square / west Midtown. No additional fare.",
        "Lincoln Tunnel traffic can double the travel time, especially during evening rush.",
        "Leave Port Authority by 5pm or after 7pm to avoid the worst tunnel traffic."
      ) +
      makeOtherOptionsCard([
        "<strong>Time your connection:</strong> Check the temporary evening schedule for your " + esc(getCurrentLine().name) + " departure time from Hoboken, and plan your PATH/ferry arrival accordingly.",
        "<strong>Work from home:</strong> NJ Transit is asking employers to allow remote work. Even 1–2 days helps.",
        "<strong>Leave early or late:</strong> The 5–7pm window will be the most crowded. Leaving before 5pm or after 7pm is much easier.",
      ])
    );
  }

  function renderNewarkRoutesReverse() {
    return (
      makeRouteCard(
        "&#x1F686;",
        "NEC from Penn Station NY to Newark Penn",
        "Primary option",
        true,
        [
          { label: "From", value: "Penn Station New York" },
          { label: "To", value: "Newark Penn Station" },
          { label: "NEC travel time", value: "~20 min" },
          { label: "Then", value: "Transfer to Raritan Valley Line train home" },
          { label: "Tickets", value: "Your existing ticket/pass should cover the transfer" },
        ],
        "Most direct option. Take an NEC train to Newark Penn, then transfer to your RVL train.",
        "NEC evening trains are reduced, so plan around the temporary schedule. Allow 15–30 min for transfer + wait.",
        "Check both the NEC and Raritan Valley temporary schedules to find the best evening connection pairs."
      ) +
      makeRouteCard(
        "&#x1F687;",
        "PATH to Newark Penn",
        "Alternative from Lower Manhattan",
        false,
        [
          { label: "From", value: "World Trade Center, Manhattan" },
          { label: "To", value: "Newark Penn Station" },
          { label: "Travel time", value: "~25 min" },
          { label: "Then", value: "Transfer to Raritan Valley Line train" },
          { label: "Cost", value: "$2.75 PATH fare (separate)" },
        ],
        "Good option if you work in Lower Manhattan / Financial District. Avoids Penn Station entirely.",
        "Separate fare required. Rush-hour crowding is significant on the WTC–Newark PATH line.",
        "Best for riders whose office is downtown. Takes you directly to Newark Penn for RVL transfer."
      ) +
      makeOtherOptionsCard([
        "<strong>Time your NEC connection:</strong> Find an NEC departure from Penn Station that connects well with your RVL departure from Newark Penn.",
        "<strong>Consider bus alternatives:</strong> NJ Transit buses from Port Authority serve some Raritan Valley corridor towns.",
        "<strong>Leave early:</strong> Evening peak NEC trains from Penn Station will be crowded. Leaving before 5pm gives you better options.",
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
      '<span class="mode-icon" aria-hidden="true">' + icon + "</span>" +
      "<div>" +
      "<h3>" + title + "</h3>" +
      '<span class="' + badgeClass + '">' + esc(badgeText) + "</span>" +
      "</div></div>" +
      '<div class="route-card-body">' +
      '<div class="route-details">' + detailsHtml + "</div>" +
      '<div class="route-tips">' +
      '<p class="pro">' + esc(pro) + "</p>" +
      '<p class="con">' + esc(con) + "</p>" +
      '<p class="tip"><strong>' + t("js.pro_tip") + '</strong> ' + esc(tip) + "</p>" +
      "</div></div></div>"
    );
  }

  function makeOtherOptionsCard(items) {
    return (
      '<div class="route-card other">' +
      '<div class="route-card-header">' +
      '<span class="mode-icon" aria-hidden="true">&#x1F6B6;</span>' +
      "<div><h3>" + t("js.other_options") + "</h3></div>" +
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
        "<h2>" + t("js.what_ticket") + "</h2>" +
        "<p>The cutover changes what you should buy for the " + esc(line.name) + ". Here's a guide based on how you ride.</p>";
      $ticketsContent.innerHTML = renderHobokenTickets(line);
    } else if (line.impactType === "reduced-service") {
      $ticketsIntro.innerHTML =
        "<h2>" + t("js.what_ticket") + "</h2>" +
        "<p>Good news for " + esc(line.name) + " riders: your tickets mostly stay the same.</p>";
      $ticketsContent.innerHTML = renderReducedServiceTickets(line);
    } else if (line.impactType === "newark-termination") {
      $ticketsIntro.innerHTML =
        "<h2>" + t("js.what_ticket") + "</h2>" +
        "<p>Ticketing for " + esc(line.name) + " riders gets a bit more complicated during the cutover.</p>";
      $ticketsContent.innerHTML = renderNewarkTickets(line);
    }
  }

  function renderHobokenTickets(line) {
    return (
      '<div class="ticket-scenarios">' +
      makeScenarioCard(t("js.monthly_pass_holders"), [
        "<strong>Buy a monthly pass to/from Hoboken</strong> (via Newark Broad St) for February and March.",
        "This pass works for Penn Station travel during <strong>Feb 1–15</strong> and <strong>Mar 15–31</strong> (the normal-service portions of each month).",
        "During <strong>Feb 15 – Mar 15</strong>, your Hoboken pass is <strong>cross-honored</strong> on PATH (Hoboken \u2194 33rd St), NY Waterway ferry (Hoboken \u2194 W. 39th St), and NJ Transit Bus 126.",
      ], '<p><strong>You save money.</strong> Hoboken passes cost less than Penn Station passes because Hoboken is closer. The PATH/ferry ride is included free. NJ Transit says riders can save up to 25% per trip.</p>') +
      makeScenarioCard(t("js.one_way_buyers"), [
        "<strong>Feb 15 – Mar 15:</strong> Buy one-way tickets to/from <strong>Hoboken</strong> (not Penn Station).",
        "Your Hoboken ticket is cross-honored on PATH, ferry, and Bus 126 to reach Manhattan.",
        "<strong>Before Feb 15 and after Mar 15:</strong> Buy regular tickets to/from Penn Station New York.",
      ], '<p><strong>You save money.</strong> Hoboken tickets cost less than Penn Station tickets. The PATH/ferry ride is included free.</p>') +
      makeScenarioCard(t("js.weekend_riders"), [
        "<strong>No change.</strong> Weekend Midtown Direct trains continue to Penn Station New York.",
        "Buy regular one-way tickets to/from <strong>Penn Station New York</strong> for Saturday and Sunday travel.",
      ]) +
      makeScenarioCard(t("js.occasional_riders"), [
        "If you ride <strong>weekdays between Feb 15 and Mar 15</strong>: buy a ticket to <strong>Hoboken</strong>. Transfer to PATH/ferry/bus at Hoboken for free.",
        "If you ride <strong>weekends</strong> or <strong>outside the cutover dates</strong>: buy a regular ticket to <strong>Penn Station New York</strong>.",
        'When in doubt, check <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com/portalcutover</a> or ask a conductor.',
      ]) +
      makeScenarioCard("FLEXPASS option", [
        "NJ Transit is offering a special <strong>FLEXPASS</strong> (20-trip ticket with a 15% discount) available starting February 15.",
        "Good option if you ride regularly but don't need a full monthly pass during the cutover period.",
        'Check <a href="https://www.njtransit.com/portalcutover" target="_blank" rel="noopener">njtransit.com/portalcutover</a> for FLEXPASS pricing and purchase options.',
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
      makeScenarioCard(t("js.monthly_pass_holders"), [
        "<strong>No change.</strong> Buy your regular monthly pass to/from Penn Station New York.",
        "Your pass works the same as always — there are just fewer trains running.",
        "Check the temporary schedule to make sure your specific trains are still running.",
      ]) +
      makeScenarioCard(t("js.one_way_buyers"), [
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
      makeScenarioCard(t("js.monthly_pass_holders"), [
        "If your pass was for travel to Penn Station NY, it should still be valid for the Newark Penn transfer + NEC connection.",
        "Verify with NJ Transit that your specific pass covers the transfer. Rules may vary by zone.",
        "Consider whether a different pass configuration saves you money during the cutover period.",
      ]) +
      makeScenarioCard(t("js.one_way_buyers"), [
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
  // DIRECTION TOGGLE
  // =========================================================================
  function initDirectionToggle() {
    if (!$directionToggle) return;
    var btns = $directionToggle.querySelectorAll(".direction-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var dir = this.getAttribute("data-dir");
        if (dir === currentDirection) return;
        currentDirection = dir;
        for (var j = 0; j < btns.length; j++) {
          var isActive = btns[j].getAttribute("data-dir") === dir;
          btns[j].classList.toggle("active", isActive);
          btns[j].setAttribute("aria-pressed", isActive ? "true" : "false");
        }
        // Refresh content for new direction
        if (currentStationId) onStationChange();
        renderRoutes();
        renderTickets();
      });
    }
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
    initDirectionToggle();

    $stationSelect.addEventListener("change", onStationChange);
    setInterval(updateCountdown, 3600000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
