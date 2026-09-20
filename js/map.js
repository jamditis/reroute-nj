// Reroute NJ — Interactive map
// Leaflet for the live view. Geometry comes from data/map-geometry.json
// (NJ Transit rail GTFS shapes and stops). PNG/PDF export composites
// keyless Esri World Light Gray tiles, then draws the same rail geometry.

(function () {
  "use strict";

  var LINE_COLORS = {
    "montclair-boonton": "#E66859",
    "morris-essex": "#08A652",
    "northeast-corridor": "#DD3439",
    "north-jersey-coast": "#03A3DF",
    "raritan-valley": "#F2A537",
  };

  var LINE_TEXT_COLORS = {
    "montclair-boonton": "#9B3228",
    "morris-essex": "#00753A",
    "northeast-corridor": "#B42328",
    "north-jersey-coast": "#00719B",
    "raritan-valley": "#8A5A00",
  };

  var LINE_LABELS = {
    "montclair-boonton": "Montclair-Boonton",
    "morris-essex": "Morris & Essex",
    "northeast-corridor": "Northeast Corridor",
    "north-jersey-coast": "North Jersey Coast",
    "raritan-valley": "Raritan Valley",
  };

  var geometry = null;
  var map = null;
  var layers = {};
  var altLayer = null;
  var currentFilter = "all";

  function geometryUrl() {
    var base = window.BASE_PATH || "";
    return base + "data/map-geometry.json";
  }

  function loadGeometry(callback) {
    var req = new XMLHttpRequest();
    req.open("GET", geometryUrl(), true);
    req.onload = function () {
      if (req.status >= 200 && req.status < 300) {
        try {
          callback(JSON.parse(req.responseText));
          return;
        } catch (e) {
          callback(null);
          return;
        }
      }
      callback(null);
    };
    req.onerror = function () {
      callback(null);
    };
    req.send();
  }

  function linePopupLabel(lineId) {
    return LINE_LABELS[lineId] || lineId;
  }

  function hubDescription(h) {
    var key = "js.hub_" + String(h.id || "").replace(/-/g, "_");
    var text = t(key);
    if (!text || text === key) return h.desc || "";
    return text;
  }

  function addGeometryToMap(data) {
    geometry = data;

    map = L.map("map").setView([40.74, -74.15], 9);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles &copy; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, GIS User Community',
        maxZoom: 16,
        crossOrigin: true,
      }
    ).addTo(map);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "",
        maxZoom: 16,
        crossOrigin: true,
        opacity: 0.9,
      }
    ).addTo(map);

    layers = {
      "portal-bridge": L.layerGroup(),
      "montclair-boonton": L.layerGroup(),
      "morris-essex": L.layerGroup(),
      "northeast-corridor": L.layerGroup(),
      "north-jersey-coast": L.layerGroup(),
      "raritan-valley": L.layerGroup(),
      "transfer-hubs": L.layerGroup(),
    };

    var portal = data.portal;
    var portalIcon = L.divIcon({
      html: '<div class="map-label map-label-portal">Portal North Bridge</div>',
      className: "",
      iconSize: [0, 0],
      iconAnchor: [70, 14],
    });

    L.marker([portal.lat, portal.lng], { icon: portalIcon })
      .bindPopup(
        "<strong>Portal North Bridge</strong><br>" +
          esc(t("js.map_popup_portal_loc")) +
          "<br>" +
          esc(t("js.map_popup_portal_ops"))
      )
      .addTo(layers["portal-bridge"]);

    L.circle([portal.lat, portal.lng], {
      radius: 700,
      color: "#e03030",
      fillColor: "#e03030",
      fillOpacity: 0.08,
      weight: 2,
      dashArray: "5,5",
    }).addTo(layers["portal-bridge"]);

    if (data.oldPortal) {
      L.circleMarker([data.oldPortal.lat, data.oldPortal.lng], {
        radius: 5,
        fillColor: "#6b7280",
        color: "#fff",
        weight: 2,
        fillOpacity: 1,
      })
        .bindPopup(
          "<strong>" +
            esc(t("js.map_old_portal")) +
            "</strong><br>" +
            esc(t("js.map_popup_old"))
        )
        .addTo(layers["portal-bridge"]);
    }

    if (data.cutoverCorridor && data.cutoverCorridor.length > 1) {
      L.polyline(data.cutoverCorridor, {
        color: "#e03030",
        weight: 6,
        opacity: 0.35,
      }).addTo(layers["portal-bridge"]);
      L.polyline(data.cutoverCorridor, {
        color: "#e03030",
        weight: 2,
        opacity: 0.95,
        dashArray: "6,6",
      }).addTo(layers["portal-bridge"]);
    }

    data.routes.forEach(function (route) {
      L.polyline(route.coords, {
        color: "#ffffff",
        weight: 7,
        opacity: 0.95,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(layers[route.line]);
      L.polyline(route.coords, {
        color: LINE_COLORS[route.line],
        weight: 4,
        opacity: 1,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(layers[route.line]);
    });

    data.stations.forEach(function (s) {
      var color = LINE_COLORS[s.line] || "#999";
      var textColor = LINE_TEXT_COLORS[s.line] || color;
      var marker = L.circleMarker([s.lat, s.lng], {
        radius: 4,
        fillColor: color,
        color: "#fff",
        weight: 1.5,
        fillOpacity: 0.95,
      });
      marker.bindPopup(
        "<strong>" +
          esc(s.name) +
          "</strong><br>" +
          '<span style="color:' +
          textColor +
          ';font-weight:700;">' +
          esc(linePopupLabel(s.line)) +
          "</span><br>" +
          '<a href="index.html">' +
          esc(t("js.map_plan_commute")) +
          " \u2192</a>"
      );
      marker.addTo(layers[s.line]);
    });

    data.hubs.forEach(function (h) {
      L.circleMarker([h.lat, h.lng], {
        radius: 7,
        fillColor: "#1a3a5c",
        color: "#fff",
        weight: 2,
        fillOpacity: 0.95,
      })
        .bindPopup(
          "<strong>" +
            esc(h.name) +
            "</strong><br>" +
            esc(hubDescription(h))
        )
        .addTo(layers["transfer-hubs"]);
    });

    altLayer = L.layerGroup();
    if (data.alternatives) {
      data.alternatives.forEach(function (alt) {
        L.polyline(alt.coords, {
          color: "#1a3a5c",
          weight: 2,
          opacity: 0.55,
          dashArray: "4,6",
        }).addTo(altLayer);
      });
    }

    Object.keys(layers).forEach(function (key) {
      layers[key].addTo(map);
    });
    altLayer.addTo(map);

    var bounds = [];
    data.routes.forEach(function (route) {
      route.coords.forEach(function (c) {
        bounds.push(c);
      });
    });
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
    }
    setFilter(currentFilter);
  }

  function setFilter(filter) {
    currentFilter = filter;
    if (!map) return;
    Object.keys(layers).forEach(function (key) {
      if (filter === "all") {
        map.addLayer(layers[key]);
      } else if (filter === "transfer-hubs") {
        if (key === "portal-bridge" || key === "transfer-hubs") {
          map.addLayer(layers[key]);
        } else {
          map.removeLayer(layers[key]);
        }
      } else if (key === "portal-bridge" || key === filter || key === "transfer-hubs") {
        map.addLayer(layers[key]);
      } else {
        map.removeLayer(layers[key]);
      }
    });
    if (altLayer) {
      if (filter === "all" || filter === "transfer-hubs") {
        map.addLayer(altLayer);
      } else {
        map.removeLayer(altLayer);
      }
    }
  }

  function initFilters() {
    var bar = document.getElementById("map-filters");
    if (!bar) return;
    var btns = bar.querySelectorAll(".map-filter-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var filter = this.getAttribute("data-filter");
        for (var j = 0; j < btns.length; j++) {
          var on = btns[j] === this;
          btns[j].classList.toggle("active", on);
          btns[j].setAttribute("aria-pressed", on ? "true" : "false");
        }
        setFilter(filter);
      });
    }
  }

  function mercator(lat, lng) {
    var x = (lng + 180) / 360;
    var sinLat = Math.sin((lat * Math.PI) / 180);
    sinLat = Math.min(Math.max(sinLat, -0.9999), 0.9999);
    var y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
    return [x, y];
  }

  function collectPoints(data) {
    var pts = [];
    data.routes.forEach(function (r) {
      r.coords.forEach(function (c) {
        pts.push(c);
      });
    });
    data.hubs.forEach(function (h) {
      pts.push([h.lat, h.lng]);
    });
    pts.push([data.portal.lat, data.portal.lng]);
    if (data.oldPortal) pts.push([data.oldPortal.lat, data.oldPortal.lng]);
    return pts;
  }

  function projectFit(pts, width, height, padL, padT, padR, padB) {
    var i;
    var xs = [];
    var ys = [];
    for (i = 0; i < pts.length; i++) {
      var m = mercator(pts[i][0], pts[i][1]);
      xs.push(m[0]);
      ys.push(m[1]);
    }
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys);
    var maxY = Math.max.apply(null, ys);
    var innerW = width - padL - padR;
    var innerH = height - padT - padB;
    var spanX = maxX - minX || 0.001;
    var spanY = maxY - minY || 0.001;
    var scale = Math.min(innerW / spanX, innerH / spanY);
    var ox = padL + (innerW - spanX * scale) / 2;
    var oy = padT + (innerH - spanY * scale) / 2;
    return {
      xy: function (lat, lng) {
        var p = mercator(lat, lng);
        return [ox + (p[0] - minX) * scale, oy + (p[1] - minY) * scale];
      },
      scale: scale,
      minX: minX,
      minY: minY,
    };
  }

  function drawPolyline(ctx, toXY, coords, color, width, dash) {
    if (!coords || coords.length < 2) return;
    ctx.save();
    ctx.beginPath();
    var p0 = toXY(coords[0][0], coords[0][1]);
    ctx.moveTo(p0[0], p0[1]);
    for (var i = 1; i < coords.length; i++) {
      var p = toXY(coords[i][0], coords[i][1]);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
  }

  function latLngToTile(lat, lng, z) {
    var m = mercator(lat, lng);
    var n = Math.pow(2, z);
    return [m[0] * n, m[1] * n];
  }

  function sinh(x) {
    return (Math.exp(x) - Math.exp(-x)) / 2;
  }

  function tileNWLatLng(tx, ty, z) {
    var n = Math.pow(2, z);
    var lng = (tx / n) * 360 - 180;
    var mY = ty / n;
    var latRad = Math.atan(sinh(Math.PI * (1 - 2 * mY)));
    return [latRad * 180 / Math.PI, lng];
  }

  function esriTileUrl(kind, z, tx, ty) {
    var svc =
      kind === "ref"
        ? "Canvas/World_Light_Gray_Reference"
        : "Canvas/World_Light_Gray_Base";
    return (
      "https://server.arcgisonline.com/ArcGIS/rest/services/" +
      svc +
      "/MapServer/tile/" +
      z +
      "/" +
      ty +
      "/" +
      tx
    );
  }

  function loadTileImage(url, done) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      done(img);
    };
    img.onerror = function () {
      done(null);
    };
    img.src = url;
  }

  function drawBasemapTiles(ctx, proj, pts, done) {
    var z = Math.round(Math.log(proj.scale / 256) / Math.LN2);
    if (!(z >= 0)) z = 8;
    if (z < 7) z = 7;
    if (z > 12) z = 12;

    var lats = [];
    var lngs = [];
    var i;
    for (i = 0; i < pts.length; i++) {
      lats.push(pts[i][0]);
      lngs.push(pts[i][1]);
    }
    var nw = latLngToTile(Math.max.apply(null, lats), Math.min.apply(null, lngs), z);
    var se = latLngToTile(Math.min.apply(null, lats), Math.max.apply(null, lngs), z);
    var x0 = Math.floor(nw[0]) - 1;
    var y0 = Math.floor(nw[1]) - 1;
    var x1 = Math.floor(se[0]) + 1;
    var y1 = Math.floor(se[1]) + 1;
    var nWorld = Math.pow(2, z);
    if (x0 < 0) x0 = 0;
    if (y0 < 0) y0 = 0;
    if (x1 > nWorld - 1) x1 = nWorld - 1;
    if (y1 > nWorld - 1) y1 = nWorld - 1;
    if (x1 - x0 > 9) x1 = x0 + 9;
    if (y1 - y0 > 9) y1 = y0 + 9;

    var jobs = [];
    var tx;
    var ty;
    for (ty = y0; ty <= y1; ty++) {
      for (tx = x0; tx <= x1; tx++) {
        jobs.push({ kind: "base", z: z, tx: tx, ty: ty });
        jobs.push({ kind: "ref", z: z, tx: tx, ty: ty });
      }
    }

    var remaining = jobs.length;
    if (!remaining) {
      done();
      return;
    }
    var settled = false;
    var loaded = [];
    function paintTile(job, img) {
      var nwLL = tileNWLatLng(job.tx, job.ty, job.z);
      var seLL = tileNWLatLng(job.tx + 1, job.ty + 1, job.z);
      var p0 = proj.xy(nwLL[0], nwLL[1]);
      var p1 = proj.xy(seLL[0], seLL[1]);
      ctx.drawImage(img, p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
    }
    function finish() {
      if (settled) return;
      settled = true;
      var i;
      for (i = 0; i < loaded.length; i++) {
        if (loaded[i].kind === "base") paintTile(loaded[i].job, loaded[i].img);
      }
      for (i = 0; i < loaded.length; i++) {
        if (loaded[i].kind === "ref") paintTile(loaded[i].job, loaded[i].img);
      }
      done(loaded.length < jobs.length);
    }
    setTimeout(finish, 15000);

    jobs.forEach(function (job) {
      loadTileImage(esriTileUrl(job.kind, job.z, job.tx, job.ty), function (img) {
        if (img && !settled) {
          loaded.push({ kind: job.kind, job: job, img: img });
        }
        remaining -= 1;
        if (remaining <= 0) finish();
      });
    });
  }

  function renderExportCanvas(data, done) {
    var width = 1600;
    var height = 1200;
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");

    ctx.fillStyle = "#e8e8e4";
    ctx.fillRect(0, 0, width, height);

    var pts = collectPoints(data);
    var proj = projectFit(pts, width, height, 48, 110, 280, 80);
    var toXY = proj.xy;

    function drawOverlay() {
    if (data.alternatives) {
      data.alternatives.forEach(function (alt) {
        drawPolyline(ctx, toXY, alt.coords, "#4b5d73", 2, [6, 6]);
      });
    }

    data.routes.forEach(function (route) {
      drawPolyline(ctx, toXY, route.coords, "#ffffff", 8, null);
      drawPolyline(ctx, toXY, route.coords, LINE_COLORS[route.line], 4.5, null);
    });

    if (data.cutoverCorridor) {
      drawPolyline(ctx, toXY, data.cutoverCorridor, "#e03030", 8, null);
      ctx.globalAlpha = 0.9;
      drawPolyline(ctx, toXY, data.cutoverCorridor, "#ffffff", 2, [5, 5]);
      ctx.globalAlpha = 1;
    }

    data.stations.forEach(function (s) {
      var p = toXY(s.lat, s.lng);
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2);
      ctx.fillStyle = LINE_COLORS[s.line];
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    });

    data.hubs.forEach(function (h) {
      var p = toXY(h.lat, h.lng);
      ctx.beginPath();
      ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
      ctx.fillStyle = "#1a3a5c";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    });

    var portalXY = toXY(data.portal.lat, data.portal.lng);
    ctx.beginPath();
    ctx.arc(portalXY[0], portalXY[1], 9, 0, Math.PI * 2);
    ctx.fillStyle = "#e03030";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    if (data.oldPortal) {
      var oldXY = toXY(data.oldPortal.lat, data.oldPortal.lng);
      ctx.beginPath();
      ctx.arc(oldXY[0], oldXY[1], 5, 0, Math.PI * 2);
      ctx.fillStyle = "#6b7280";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = "#1a2332";
    ctx.font = "700 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(t("js.map_export_title"), 48, 48);
    ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#4a5568";
    ctx.fillText(t("js.map_export_phase"), 48, 76);

    var legendX = width - 250;
    var legendY = 110;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#d0d5dd";
    ctx.lineWidth = 1;
    ctx.fillRect(legendX - 16, legendY - 24, 230, 430);
    ctx.strokeRect(legendX - 16, legendY - 24, 230, 430);

    ctx.fillStyle = "#1a2332";
    ctx.font = "700 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(t("js.map_legend"), legendX, legendY);
    legendY += 28;

    function legendDot(color, label, r) {
      ctx.beginPath();
      ctx.arc(legendX + 8, legendY - 4, r || 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = "#1a2332";
      ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillText(label, legendX + 24, legendY);
      legendY += 26;
    }

    legendDot("#e03030", "Portal North Bridge", 7);
    legendDot("#6b7280", t("js.map_old_portal"), 5);
    Object.keys(LINE_LABELS).forEach(function (id) {
      legendDot(LINE_COLORS[id], LINE_LABELS[id], 5);
    });
    legendDot("#1a3a5c", t("js.map_transfer_hub"), 6);

    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(legendX, legendY - 4);
    ctx.lineTo(legendX + 16, legendY - 4);
    ctx.strokeStyle = "#4b5d73";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1a2332";
    ctx.fillText(t("js.map_path_ferry_bus"), legendX + 24, legendY);
    legendY += 26;

    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(legendX, legendY - 4);
    ctx.lineTo(legendX + 16, legendY - 4);
    ctx.strokeStyle = "#e03030";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1a2332";
    ctx.fillText(t("js.map_single_track"), legendX + 24, legendY);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, height - 58, width, 58);
    ctx.fillStyle = "#1a2332";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(
      t("js.map_basemap_credit"),
      48,
      height - 36
    );
    ctx.fillText(
      t("js.map_export_footer"),
      48,
      height - 20
    );
    }

    drawBasemapTiles(ctx, proj, pts, function (incomplete) {
      drawOverlay();
      done(canvas, { incomplete: !!incomplete });
    });
  }

  function initExports() {
    var pngBtn = document.getElementById("map-download-png");
    var pdfBtn = document.getElementById("map-download-pdf");
    if (!pngBtn && !pdfBtn) return;

    function setExportStatus(msg) {
      var el = document.getElementById("map-export-status");
      if (el) el.textContent = msg || "";
    }

    function runExport(kind) {
      if (!geometry) {
        window.alert(t("js.map_loading_alert"));
        return;
      }
      setExportStatus(t("js.map_export_preparing"));
      renderExportCanvas(geometry, function (canvas, info) {
        if (!canvas) return;
        if (info && info.incomplete) {
          setExportStatus(t("js.map_export_incomplete"));
        } else {
          setExportStatus("");
        }
        if (kind === "png") {
          exportCanvasPng(canvas, "reroute-nj-phase2-map.png");
        } else {
          exportCanvasPdf(canvas, "reroute-nj-phase2-map.pdf");
        }
      });
    }

    if (pngBtn) {
      pngBtn.addEventListener("click", function () {
        runExport("png");
      });
    }
    if (pdfBtn) {
      pdfBtn.addEventListener("click", function () {
        runExport("pdf");
      });
    }
  }

  function showLoadError() {
    var el = document.getElementById("map");
    if (!el) return;
    el.innerHTML =
      '<p class="map-load-error">' + esc(t("js.map_load_error")) + "</p>";
  }

  function init() {
    updateCountdown();
    setInterval(updateCountdown, 3600000);
    initFilters();
    initExports();
    loadGeometry(function (data) {
      if (!data || !data.routes) {
        showLoadError();
        return;
      }
      addGeometryToMap(data);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
