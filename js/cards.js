// Reroute NJ — Info card renderer
// Renders line cards, station cards, and summary cards from URL params.
// Loaded by card.html. Depends on LINE_DATA and LINE_ORDER from line-data.js.
//
// Security note: All URL param values are sanitized via esc() (textContent-based
// HTML entity encoding) before DOM insertion. LINE_DATA is trusted static data.

(function () {
  "use strict";

  // Local esc() since shared.js is not loaded on card.html
  function esc(str) {
    var div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function getParam(name) {
    var match = window.location.search.match(new RegExp("[?&]" + name + "=([^&]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  var IMPACT_LABELS = {
    "hoboken-diversion": "Diverted to Hoboken",
    "reduced-service": "Reduced service",
    "newark-termination": "Terminates at Newark"
  };

  var ALTERNATIVES = {
    "hoboken-diversion": [
      "PATH from Hoboken to 33rd St (~25 min)",
      "NY Waterway ferry to W. 39th St (~15 min)",
      "Bus 126 to Port Authority (~40 min)"
    ],
    "reduced-service": [
      "Expect longer wait times between trains",
      "Consider off-peak travel if flexible",
      "Check NJ Transit app for real-time status"
    ],
    "newark-termination": [
      "Transfer to NEC at Newark Penn for PSNY",
      "PATH from Newark to WTC (~25 min)",
      "Consider driving to Newark Penn directly"
    ]
  };

  function renderLineCard(lineId) {
    var line = LINE_DATA[lineId];
    if (!line) return renderSummaryCard();

    var accent = getParam("accent");
    var barColor = accent ? "#" + accent.replace(/^#/, "") : line.color;
    var badgeClass = line.impactLevel === "severe" ? "badge-severe" : "badge-moderate";
    var alts = ALTERNATIVES[line.impactType] || [];

    var altHtml = "";
    for (var i = 0; i < alts.length; i++) {
      altHtml += '<div class="card-alt-item">' + esc(alts[i]) + "</div>";
    }

    var statsHtml = "";
    if (typeof line.trainsBefore === "number") {
      statsHtml = '<div class="card-stats">' +
        '<div class="card-stat"><div class="card-stat-value">' + esc(String(line.trainsBefore)) + '</div><div class="card-stat-label">Trains before</div></div>' +
        '<div class="card-stat"><div class="card-stat-value">' + esc(String(line.trainsAfter)) + '</div><div class="card-stat-label">Trains during</div></div>' +
        "</div>";
    } else {
      statsHtml = '<div class="card-stats">' +
        '<div class="card-stat"><div class="card-stat-value" style="font-size:0.9rem;">' + esc(String(line.trainsBefore)) + '</div><div class="card-stat-label">Before</div></div>' +
        '<div class="card-stat"><div class="card-stat-value" style="font-size:0.9rem;">' + esc(String(line.trainsAfter)) + '</div><div class="card-stat-label">During</div></div>' +
        "</div>";
    }

    return '<div class="card">' +
      '<div class="card-color-bar" style="background:' + esc(barColor) + ';"></div>' +
      '<div class="card-body">' +
        '<div class="card-line-name">' + esc(line.name) + "</div>" +
        '<span class="card-badge ' + badgeClass + '">' + esc(IMPACT_LABELS[line.impactType] || line.impactType) + "</span>" +
        '<div class="card-summary">' + esc(line.summary) + "</div>" +
        statsHtml +
        '<div class="card-alternatives"><h4>Your alternatives</h4>' + altHtml + "</div>" +
        '<div class="card-dates">Feb 15 – Mar 15, 2026</div>' +
        '<a class="card-cta" href="https://reroutenj.org/?line=' + esc(lineId) + '" target="_blank" rel="noopener">Plan your commute</a>' +
      "</div></div>";
  }

  function renderStationCard(lineId, stationId) {
    var line = LINE_DATA[lineId];
    if (!line) return renderSummaryCard();

    var station = null;
    for (var i = 0; i < line.stations.length; i++) {
      if (line.stations[i].id === stationId) {
        station = line.stations[i];
        break;
      }
    }
    if (!station) return renderLineCard(lineId);

    var accent = getParam("accent");
    var barColor = accent ? "#" + accent.replace(/^#/, "") : line.color;
    var badgeClass = line.impactLevel === "severe" ? "badge-severe" : "badge-moderate";
    var alts = ALTERNATIVES[line.impactType] || [];

    var altHtml = "";
    for (var j = 0; j < alts.length; j++) {
      altHtml += '<div class="card-alt-item">' + esc(alts[j]) + "</div>";
    }

    return '<div class="card">' +
      '<div class="card-color-bar" style="background:' + esc(barColor) + ';"></div>' +
      '<div class="card-body">' +
        '<div class="card-station-name">' + esc(station.name) + "</div>" +
        '<div class="card-line-context">' + esc(line.name) + " · Zone " + esc(String(station.zone)) + "</div>" +
        '<span class="card-badge ' + badgeClass + '">' + esc(IMPACT_LABELS[line.impactType] || line.impactType) + "</span>" +
        '<div class="card-summary">' + esc(line.summary) + "</div>" +
        '<div class="card-alternatives"><h4>Your alternatives</h4>' + altHtml + "</div>" +
        '<div class="card-dates">Feb 15 – Mar 15, 2026</div>' +
        '<a class="card-cta" href="https://reroutenj.org/?line=' + esc(lineId) + '&station=' + esc(stationId) + '" target="_blank" rel="noopener">Full details</a>' +
      "</div></div>";
  }

  function renderSummaryCard() {
    var html = '<div class="card"><div class="card-body">' +
      '<div class="card-line-name">Portal Bridge cutover</div>' +
      '<div class="card-summary">Five NJ Transit lines affected from Feb 15 – Mar 15, 2026. Service reduced while the new Portal North Bridge is connected.</div>' +
      '<div class="summary-grid">';

    for (var i = 0; i < LINE_ORDER.length; i++) {
      var id = LINE_ORDER[i];
      var line = LINE_DATA[id];
      var impactClass = line.impactLevel === "severe" ? "summary-severe" : "summary-moderate";
      var trainInfo = typeof line.trainsBefore === "number"
        ? esc(String(line.trainsBefore)) + " → " + esc(String(line.trainsAfter))
        : "Suspended";

      html += '<div class="summary-line">' +
        '<span class="summary-dot" style="background:' + esc(line.color) + ';"></span>' +
        '<span class="summary-line-name">' + esc(line.shortName) + "</span>" +
        '<span class="summary-impact ' + impactClass + '">' + esc(IMPACT_LABELS[line.impactType] || "") + "</span>" +
        '<span class="summary-trains">' + trainInfo + "</span>" +
        "</div>";
    }

    html += '</div>' +
      '<div class="card-dates" style="margin-top:12px;">Feb 15 – Mar 15, 2026</div>' +
      '<a class="card-cta" href="https://reroutenj.org" target="_blank" rel="noopener">Plan your commute</a>' +
      "</div></div>";
    return html;
  }

  // Expose for PNG export (Task 4) and cross-frame calls
  window.renderLineCard = renderLineCard;
  window.renderStationCard = renderStationCard;
  window.renderSummaryCard = renderSummaryCard;

  function init() {
    var type = getParam("type") || "summary";
    var lineId = getParam("line");
    var stationId = getParam("station");
    var theme = getParam("theme");
    var root = document.getElementById("card-root");

    if (theme === "dark") {
      document.body.classList.add("theme-dark");
    }

    // Validate lineId against LINE_DATA keys
    if (lineId && !LINE_DATA[lineId]) {
      lineId = null;
    }

    var html;
    if (type === "line" && lineId) {
      html = renderLineCard(lineId);
    } else if (type === "station" && lineId && stationId) {
      html = renderStationCard(lineId, stationId);
    } else {
      html = renderSummaryCard();
    }

    root.innerHTML = html;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
