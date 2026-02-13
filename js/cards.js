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

  // --- Canvas PNG export helpers ---

  var FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  function fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(" ");
    var line = "";
    var lines = [];
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    for (var j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], x, y + j * lineHeight);
    }
    return lines.length;
  }

  function renderCardToCanvas(type, lineId, stationId, theme) {
    var isDark = theme === "dark";
    var isSummary = type === "summary" || (!lineId && type !== "station");
    var width = 600;
    var height = isSummary ? 500 : 400;
    var pad = 24;
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = isDark ? "#1a2332" : "#ffffff";
    fillRoundRect(ctx, 0, 0, width, height, 12);

    var textColor = isDark ? "#e8ecf1" : "#1a2332";
    var subtextColor = isDark ? "#9eaab8" : "#73849a";
    var bodyColor = isDark ? "#b0bec5" : "#4a5568";

    if (isSummary) {
      return renderSummaryToCanvas(ctx, canvas, isDark, textColor, subtextColor, bodyColor, width, height, pad);
    }

    var line = LINE_DATA[lineId];
    if (!line) {
      return renderSummaryToCanvas(ctx, canvas, isDark, textColor, subtextColor, bodyColor, width, height, pad);
    }

    // Color bar
    ctx.fillStyle = line.color;
    ctx.fillRect(0, 0, width, 8);

    var curY = 8 + pad;

    // Station card: station name + line context
    if (type === "station" && stationId) {
      var station = null;
      for (var si = 0; si < line.stations.length; si++) {
        if (line.stations[si].id === stationId) {
          station = line.stations[si];
          break;
        }
      }
      if (station) {
        ctx.fillStyle = textColor;
        ctx.font = "bold 20px " + FONT_FAMILY;
        ctx.fillText(station.name, pad, curY + 16);
        curY += 28;
        ctx.fillStyle = subtextColor;
        ctx.font = "13px " + FONT_FAMILY;
        ctx.fillText(line.name + " \u00B7 Zone " + station.zone, pad, curY + 10);
        curY += 22;
      } else {
        // Station not found, render as line card
        ctx.fillStyle = textColor;
        ctx.font = "bold 18px " + FONT_FAMILY;
        ctx.fillText(line.name, pad, curY + 14);
        curY += 26;
      }
    } else {
      // Line card: line name
      ctx.fillStyle = textColor;
      ctx.font = "bold 18px " + FONT_FAMILY;
      ctx.fillText(line.name, pad, curY + 14);
      curY += 26;
    }

    // Impact badge
    var impactText = (IMPACT_LABELS[line.impactType] || line.impactType).toUpperCase();
    var isSevere = line.impactLevel === "severe";
    ctx.font = "600 11px " + FONT_FAMILY;
    var badgeWidth = ctx.measureText(impactText).width + 20;
    ctx.fillStyle = isDark
      ? (isSevere ? "#4a1c1c" : "#4a3c0a")
      : (isSevere ? "#fde8e8" : "#fff3cd");
    fillRoundRect(ctx, pad, curY, badgeWidth, 22, 11);
    ctx.fillStyle = isDark
      ? (isSevere ? "#f87171" : "#fbbf24")
      : (isSevere ? "#c41e1e" : "#856404");
    ctx.fillText(impactText, pad + 10, curY + 15);
    curY += 32;

    // Summary text
    ctx.fillStyle = bodyColor;
    ctx.font = "14px " + FONT_FAMILY;
    var summaryLines = wrapText(ctx, line.summary, pad, curY + 12, width - pad * 2, 20);
    curY += summaryLines * 20 + 18;

    // Train stats
    if (typeof line.trainsBefore === "number") {
      var statBoxWidth = (width - pad * 2 - 16) / 2;
      for (var s = 0; s < 2; s++) {
        var sx = pad + s * (statBoxWidth + 16);
        var val = s === 0 ? String(line.trainsBefore) : String(line.trainsAfter);
        var label = s === 0 ? "TRAINS BEFORE" : "TRAINS DURING";
        ctx.fillStyle = textColor;
        ctx.font = "bold 22px " + FONT_FAMILY;
        ctx.textAlign = "center";
        ctx.fillText(val, sx + statBoxWidth / 2, curY + 18);
        ctx.fillStyle = subtextColor;
        ctx.font = "10px " + FONT_FAMILY;
        ctx.fillText(label, sx + statBoxWidth / 2, curY + 34);
      }
      ctx.textAlign = "left";
      curY += 46;
    } else {
      var halfW = (width - pad * 2 - 16) / 2;
      for (var sb = 0; sb < 2; sb++) {
        var bx = pad + sb * (halfW + 16);
        var bval = sb === 0 ? String(line.trainsBefore) : String(line.trainsAfter);
        var blabel = sb === 0 ? "BEFORE" : "DURING";
        ctx.fillStyle = textColor;
        ctx.font = "bold 13px " + FONT_FAMILY;
        ctx.textAlign = "center";
        ctx.fillText(bval, bx + halfW / 2, curY + 16);
        ctx.fillStyle = subtextColor;
        ctx.font = "10px " + FONT_FAMILY;
        ctx.fillText(blabel, bx + halfW / 2, curY + 32);
      }
      ctx.textAlign = "left";
      curY += 46;
    }

    // Alternatives
    var alts = ALTERNATIVES[line.impactType] || [];
    if (alts.length > 0) {
      ctx.fillStyle = bodyColor;
      ctx.font = "600 12px " + FONT_FAMILY;
      ctx.fillText("Your alternatives", pad, curY + 10);
      curY += 20;
      ctx.font = "12px " + FONT_FAMILY;
      for (var ai = 0; ai < alts.length; ai++) {
        ctx.fillStyle = bodyColor;
        ctx.fillText(alts[ai], pad, curY + 12);
        curY += 20;
        if (ai < alts.length - 1) {
          ctx.strokeStyle = isDark ? "#2d3e54" : "#f0f2f5";
          ctx.beginPath();
          ctx.moveTo(pad, curY);
          ctx.lineTo(width - pad, curY);
          ctx.stroke();
        }
      }
      curY += 8;
    }

    // Dates
    ctx.fillStyle = subtextColor;
    ctx.font = "12px " + FONT_FAMILY;
    ctx.fillText("Feb 15 \u2013 Mar 15, 2026", pad, curY + 10);

    // Attribution at bottom
    ctx.fillStyle = "#9eaab8";
    ctx.font = "11px " + FONT_FAMILY;
    ctx.textAlign = "center";
    ctx.fillText("Powered by Reroute NJ \u00B7 reroutenj.org", width / 2, height - 12);
    ctx.textAlign = "left";

    return canvas;
  }

  function renderSummaryToCanvas(ctx, canvas, isDark, textColor, subtextColor, bodyColor, width, height, pad) {
    var curY = pad;

    // Title
    ctx.fillStyle = textColor;
    ctx.font = "bold 20px " + FONT_FAMILY;
    ctx.fillText("Portal Bridge cutover", pad, curY + 16);
    curY += 30;

    // Summary text
    ctx.fillStyle = bodyColor;
    ctx.font = "14px " + FONT_FAMILY;
    var summaryStr = "Five NJ Transit lines affected from Feb 15 \u2013 Mar 15, 2026. Service reduced while the new Portal North Bridge is connected.";
    var sLines = wrapText(ctx, summaryStr, pad, curY + 12, width - pad * 2, 20);
    curY += sLines * 20 + 20;

    // Line rows
    var rowH = 36;
    var rowGap = 6;
    for (var i = 0; i < LINE_ORDER.length; i++) {
      var id = LINE_ORDER[i];
      var line = LINE_DATA[id];
      var rowY = curY;
      var isSevere = line.impactLevel === "severe";

      // Row background
      ctx.fillStyle = isDark ? "#243044" : "#f8f9fb";
      fillRoundRect(ctx, pad, rowY, width - pad * 2, rowH, 6);

      // Dot
      ctx.fillStyle = line.color;
      ctx.beginPath();
      ctx.arc(pad + 16, rowY + rowH / 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // Line name
      ctx.fillStyle = textColor;
      ctx.font = "600 13px " + FONT_FAMILY;
      ctx.fillText(line.shortName, pad + 30, rowY + rowH / 2 + 4);

      // Impact badge on right side
      var impactLabel = IMPACT_LABELS[line.impactType] || "";
      ctx.font = "600 10px " + FONT_FAMILY;
      var impBadgeW = ctx.measureText(impactLabel).width + 16;
      var impBadgeX = width - pad - impBadgeW - 80;
      ctx.fillStyle = isDark
        ? (isSevere ? "#4a1c1c" : "#4a3c0a")
        : (isSevere ? "#fde8e8" : "#fff3cd");
      fillRoundRect(ctx, impBadgeX, rowY + 8, impBadgeW, 20, 10);
      ctx.fillStyle = isDark
        ? (isSevere ? "#f87171" : "#fbbf24")
        : (isSevere ? "#c41e1e" : "#856404");
      ctx.fillText(impactLabel, impBadgeX + 8, rowY + 22);

      // Train count on far right
      var trainInfo = typeof line.trainsBefore === "number"
        ? String(line.trainsBefore) + " \u2192 " + String(line.trainsAfter)
        : "Suspended";
      ctx.fillStyle = subtextColor;
      ctx.font = "12px " + FONT_FAMILY;
      ctx.textAlign = "right";
      ctx.fillText(trainInfo, width - pad - 6, rowY + rowH / 2 + 4);
      ctx.textAlign = "left";

      curY += rowH + rowGap;
    }

    curY += 8;

    // Dates
    ctx.fillStyle = subtextColor;
    ctx.font = "12px " + FONT_FAMILY;
    ctx.fillText("Feb 15 \u2013 Mar 15, 2026", pad, curY + 10);

    // Attribution at bottom
    ctx.fillStyle = "#9eaab8";
    ctx.font = "11px " + FONT_FAMILY;
    ctx.textAlign = "center";
    ctx.fillText("Powered by Reroute NJ \u00B7 reroutenj.org", width / 2, height - 12);
    ctx.textAlign = "left";

    return canvas;
  }

  function exportCardAsPng() {
    var type = getParam("type") || "summary";
    var lineId = getParam("line");
    var stationId = getParam("station");
    var theme = getParam("theme");

    // Validate lineId
    if (lineId && !LINE_DATA[lineId]) {
      lineId = null;
    }

    var canvas = renderCardToCanvas(type, lineId, stationId, theme);
    var filename;
    if (type === "station" && lineId && stationId) {
      filename = "reroute-nj-station-" + stationId + ".png";
    } else if (type === "line" && lineId) {
      filename = "reroute-nj-line-" + lineId + ".png";
    } else {
      filename = "reroute-nj-summary.png";
    }

    canvas.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 100);
    }, "image/png");
  }

  // Expose for PNG export (Task 4) and cross-frame calls
  window.renderLineCard = renderLineCard;
  window.renderStationCard = renderStationCard;
  window.renderSummaryCard = renderSummaryCard;
  window.renderCardToCanvas = renderCardToCanvas;
  window.exportCardAsPng = exportCardAsPng;

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
