// Reroute NJ — Interactive Map
// Uses Leaflet.js with OpenStreetMap tiles to show Portal Bridge,
// affected stations, transfer hubs, and alternative routes.

(function () {
  "use strict";

  // =========================================================================
  // PORTAL BRIDGE LOCATION
  // =========================================================================
  var PORTAL_BRIDGE = { lat: 40.7334, lng: -74.0910, name: "Portal Bridge" };

  // =========================================================================
  // TRANSFER HUBS
  // =========================================================================
  var TRANSFER_HUBS = [
    { lat: 40.7355, lng: -74.0279, name: "Hoboken Terminal", desc: "NJ Transit, PATH, Ferry, Bus 126", type: "hub" },
    { lat: 40.7340, lng: -74.1644, name: "Newark Penn Station", desc: "NJ Transit, PATH, buses", type: "hub" },
    { lat: 40.7618, lng: -74.0756, name: "Secaucus Junction", desc: "NJ Transit transfer station", type: "hub" },
    { lat: 40.7505, lng: -73.9935, name: "Penn Station New York", desc: "NJ Transit, Amtrak, LIRR, subway", type: "hub" },
    { lat: 40.7527, lng: -73.9772, name: "33rd Street PATH", desc: "PATH from Hoboken", type: "hub" },
    { lat: 40.7664, lng: -74.0001, name: "W. 39th St Ferry Terminal", desc: "NY Waterway from Hoboken", type: "hub" },
    { lat: 40.7569, lng: -73.9903, name: "Port Authority Bus Terminal", desc: "Bus 126 from Hoboken", type: "hub" },
    { lat: 40.7126, lng: -74.0099, name: "World Trade Center PATH", desc: "PATH from Newark", type: "hub" },
  ];

  // =========================================================================
  // LINE COLORS
  // =========================================================================
  var LINE_COLORS = {
    "montclair-boonton": "#7b2d8e",
    "morris-essex": "#00a651",
    "northeast-corridor": "#ee3a43",
    "north-jersey-coast": "#0082c8",
    "raritan-valley": "#faa634",
  };

  // WCAG AA accessible text colors (4.5:1 contrast against white)
  var LINE_TEXT_COLORS = {
    "montclair-boonton": "#7b2d8e",
    "morris-essex": "#007a3d",
    "northeast-corridor": "#c5303a",
    "north-jersey-coast": "#006ba1",
    "raritan-valley": "#8a5d00",
  };

  // =========================================================================
  // STATION DATA (key stations with coordinates)
  // Stations are ordered west→east or south→north for each line.
  // =========================================================================
  var STATIONS = [
    // Montclair-Boonton Line: Dover → Hoboken (diverted during cutover)
    { name: "Dover", lat: 40.8828, lng: -74.5579, line: "montclair-boonton" },
    { name: "Denville", lat: 40.8917, lng: -74.4818, line: "montclair-boonton" },
    { name: "Boonton", lat: 40.9022, lng: -74.4067, line: "montclair-boonton" },
    { name: "Wayne/Route 23", lat: 40.9199, lng: -74.2404, line: "montclair-boonton" },
    { name: "Little Falls", lat: 40.8796, lng: -74.2196, line: "montclair-boonton" },
    { name: "Montclair State University", lat: 40.8634, lng: -74.1993, line: "montclair-boonton" },
    { name: "Upper Montclair", lat: 40.8253, lng: -74.2021, line: "montclair-boonton" },
    { name: "Watchung Avenue", lat: 40.8130, lng: -74.2143, line: "montclair-boonton" },
    { name: "Bay Street (Montclair)", lat: 40.8087, lng: -74.2098, line: "montclair-boonton" },
    { name: "Glen Ridge", lat: 40.7977, lng: -74.2037, line: "montclair-boonton" },
    { name: "Bloomfield", lat: 40.7923, lng: -74.1992, line: "montclair-boonton" },
    { name: "Watsessing Avenue", lat: 40.7885, lng: -74.1859, line: "montclair-boonton" },

    // Morris & Essex — Morristown Line: Morristown → Hoboken (diverted during cutover)
    { name: "Morristown", lat: 40.7966, lng: -74.4778, line: "morris-essex" },
    { name: "Convent Station", lat: 40.7779, lng: -74.4407, line: "morris-essex" },
    { name: "Madison", lat: 40.7571, lng: -74.4173, line: "morris-essex" },
    { name: "Chatham", lat: 40.7416, lng: -74.3835, line: "morris-essex" },
    { name: "Summit", lat: 40.7159, lng: -74.3575, line: "morris-essex" },
    { name: "Short Hills", lat: 40.7254, lng: -74.3233, line: "morris-essex" },
    { name: "Millburn", lat: 40.7259, lng: -74.3041, line: "morris-essex" },
    { name: "Maplewood", lat: 40.7303, lng: -74.2739, line: "morris-essex" },
    { name: "South Orange", lat: 40.7479, lng: -74.2591, line: "morris-essex" },
    { name: "Orange", lat: 40.7717, lng: -74.2321, line: "morris-essex" },
    { name: "East Orange", lat: 40.7674, lng: -74.2147, line: "morris-essex" },
    { name: "Brick Church", lat: 40.7635, lng: -74.2259, line: "morris-essex" },
    { name: "Newark Broad Street", lat: 40.7418, lng: -74.1698, line: "morris-essex" },

    // Morris & Essex — Gladstone Branch: Gladstone → Summit (joins Morristown Line)
    { name: "Gladstone", lat: 40.7213, lng: -74.6654, line: "morris-essex" },
    { name: "Bernardsville", lat: 40.7180, lng: -74.5682, line: "morris-essex" },
    { name: "Stirling", lat: 40.6737, lng: -74.4897, line: "morris-essex" },
    { name: "Berkeley Heights", lat: 40.6811, lng: -74.4302, line: "morris-essex" },
    { name: "New Providence", lat: 40.6984, lng: -74.4018, line: "morris-essex" },

    // Northeast Corridor: Trenton → Penn Station NY via Secaucus
    { name: "Trenton", lat: 40.2170, lng: -74.7554, line: "northeast-corridor" },
    { name: "Hamilton", lat: 40.2373, lng: -74.7250, line: "northeast-corridor" },
    { name: "Princeton Junction", lat: 40.3165, lng: -74.6222, line: "northeast-corridor" },
    { name: "New Brunswick", lat: 40.4966, lng: -74.4454, line: "northeast-corridor" },
    { name: "Edison", lat: 40.5195, lng: -74.4118, line: "northeast-corridor" },
    { name: "Metuchen", lat: 40.5421, lng: -74.3632, line: "northeast-corridor" },
    { name: "Metropark", lat: 40.5694, lng: -74.3275, line: "northeast-corridor" },
    { name: "Rahway", lat: 40.6083, lng: -74.2753, line: "northeast-corridor" },
    { name: "Linden", lat: 40.6319, lng: -74.2477, line: "northeast-corridor" },
    { name: "Elizabeth", lat: 40.6682, lng: -74.2131, line: "northeast-corridor" },
    { name: "Newark Airport", lat: 40.7035, lng: -74.1870, line: "northeast-corridor" },
    { name: "Newark Penn Station", lat: 40.7340, lng: -74.1644, line: "northeast-corridor" },

    // North Jersey Coast Line: Bay Head → Penn Station NY
    // Own tracks Bay Head to Rahway, then shares NEC north to Penn Station
    { name: "Bay Head", lat: 40.0767, lng: -74.0462, line: "north-jersey-coast" },
    { name: "Point Pleasant Beach", lat: 40.0886, lng: -74.0477, line: "north-jersey-coast" },
    { name: "Asbury Park", lat: 40.2193, lng: -74.0120, line: "north-jersey-coast" },
    { name: "Long Branch", lat: 40.2982, lng: -73.9920, line: "north-jersey-coast" },
    { name: "Little Silver", lat: 40.3316, lng: -74.0388, line: "north-jersey-coast" },
    { name: "Red Bank", lat: 40.3483, lng: -74.0756, line: "north-jersey-coast" },
    { name: "Middletown", lat: 40.3896, lng: -74.1149, line: "north-jersey-coast" },
    { name: "Hazlet", lat: 40.4165, lng: -74.1897, line: "north-jersey-coast" },
    { name: "Aberdeen-Matawan", lat: 40.4180, lng: -74.2315, line: "north-jersey-coast" },
    { name: "South Amboy", lat: 40.4844, lng: -74.2818, line: "north-jersey-coast" },
    { name: "Perth Amboy", lat: 40.5073, lng: -74.2684, line: "north-jersey-coast" },
    { name: "Woodbridge", lat: 40.5563, lng: -74.2804, line: "north-jersey-coast" },

    // Raritan Valley Line: High Bridge → Newark Penn (terminates here during cutover)
    { name: "High Bridge", lat: 40.6669, lng: -74.8940, line: "raritan-valley" },
    { name: "Somerville", lat: 40.5738, lng: -74.6098, line: "raritan-valley" },
    { name: "Bound Brook", lat: 40.5618, lng: -74.5380, line: "raritan-valley" },
    { name: "Plainfield", lat: 40.6176, lng: -74.4166, line: "raritan-valley" },
    { name: "Westfield", lat: 40.6586, lng: -74.3490, line: "raritan-valley" },
    { name: "Cranford", lat: 40.6564, lng: -74.3002, line: "raritan-valley" },
    { name: "Roselle Park", lat: 40.6643, lng: -74.2654, line: "raritan-valley" },
    { name: "Union", lat: 40.6997, lng: -74.2337, line: "raritan-valley" },
  ];

  // =========================================================================
  // ROUTE PATHS (explicit polyline coordinates for each line)
  // Separate from station markers so branches and shared track render correctly.
  // Hub coordinates (Hoboken, Newark Penn, Secaucus, Penn Station NY) are
  // included here as polyline endpoints but shown as transfer hub markers.
  // =========================================================================
  var ROUTES = [
    // Montclair-Boonton: Dover → Newark Broad St → Hoboken Terminal
    {
      line: "montclair-boonton",
      coords: [
        [40.8828, -74.5579],  // Dover
        [40.8917, -74.4818],  // Denville
        [40.9022, -74.4067],  // Boonton
        [40.9199, -74.2404],  // Wayne/Route 23
        [40.8796, -74.2196],  // Little Falls
        [40.8634, -74.1993],  // MSU
        [40.8253, -74.2021],  // Upper Montclair
        [40.8130, -74.2143],  // Watchung Avenue
        [40.8087, -74.2098],  // Bay Street
        [40.7977, -74.2037],  // Glen Ridge
        [40.7923, -74.1992],  // Bloomfield
        [40.7885, -74.1859],  // Watsessing Avenue
        [40.7418, -74.1698],  // Newark Broad Street
        [40.7355, -74.0279],  // Hoboken Terminal
      ],
    },

    // Morris & Essex — Morristown Line: Morristown → Newark Broad St → Hoboken
    {
      line: "morris-essex",
      coords: [
        [40.7966, -74.4778],  // Morristown
        [40.7779, -74.4407],  // Convent Station
        [40.7571, -74.4173],  // Madison
        [40.7416, -74.3835],  // Chatham
        [40.7159, -74.3575],  // Summit
        [40.7254, -74.3233],  // Short Hills
        [40.7259, -74.3041],  // Millburn
        [40.7303, -74.2739],  // Maplewood
        [40.7479, -74.2591],  // South Orange
        [40.7717, -74.2321],  // Orange
        [40.7674, -74.2147],  // East Orange
        [40.7635, -74.2259],  // Brick Church
        [40.7418, -74.1698],  // Newark Broad Street
        [40.7355, -74.0279],  // Hoboken Terminal
      ],
    },

    // Morris & Essex — Gladstone Branch: Gladstone → Summit (joins Morristown Line)
    {
      line: "morris-essex",
      coords: [
        [40.7213, -74.6654],  // Gladstone
        [40.7180, -74.5682],  // Bernardsville
        [40.6737, -74.4897],  // Stirling
        [40.6811, -74.4302],  // Berkeley Heights
        [40.6984, -74.4018],  // New Providence
        [40.7159, -74.3575],  // Summit (joins main line)
      ],
    },

    // Northeast Corridor: Trenton → Secaucus → Penn Station NY
    {
      line: "northeast-corridor",
      coords: [
        [40.2170, -74.7554],  // Trenton
        [40.2373, -74.7250],  // Hamilton
        [40.3165, -74.6222],  // Princeton Junction
        [40.4966, -74.4454],  // New Brunswick
        [40.5195, -74.4118],  // Edison
        [40.5421, -74.3632],  // Metuchen
        [40.5694, -74.3275],  // Metropark
        [40.6083, -74.2753],  // Rahway
        [40.6319, -74.2477],  // Linden
        [40.6682, -74.2131],  // Elizabeth
        [40.7035, -74.1870],  // Newark Airport
        [40.7340, -74.1644],  // Newark Penn Station
        [40.7618, -74.0756],  // Secaucus Junction
        [40.7505, -73.9935],  // Penn Station New York
      ],
    },

    // North Jersey Coast Line: Bay Head → own tracks to Rahway → NEC to Penn Station
    {
      line: "north-jersey-coast",
      coords: [
        [40.0767, -74.0462],  // Bay Head
        [40.0886, -74.0477],  // Point Pleasant Beach
        [40.2193, -74.0120],  // Asbury Park
        [40.2982, -73.9920],  // Long Branch
        [40.3316, -74.0388],  // Little Silver
        [40.3483, -74.0756],  // Red Bank
        [40.3896, -74.1149],  // Middletown
        [40.4165, -74.1897],  // Hazlet
        [40.4180, -74.2315],  // Aberdeen-Matawan
        [40.4844, -74.2818],  // South Amboy
        [40.5073, -74.2684],  // Perth Amboy
        [40.5563, -74.2804],  // Woodbridge
        [40.6083, -74.2753],  // Rahway (joins NEC)
        [40.6319, -74.2477],  // Linden
        [40.6682, -74.2131],  // Elizabeth
        [40.7035, -74.1870],  // Newark Airport
        [40.7340, -74.1644],  // Newark Penn Station
        [40.7618, -74.0756],  // Secaucus Junction
        [40.7505, -73.9935],  // Penn Station New York
      ],
    },

    // Raritan Valley Line: High Bridge → Newark Penn (terminates during cutover)
    {
      line: "raritan-valley",
      coords: [
        [40.6669, -74.8940],  // High Bridge
        [40.5738, -74.6098],  // Somerville
        [40.5618, -74.5380],  // Bound Brook
        [40.6176, -74.4166],  // Plainfield
        [40.6586, -74.3490],  // Westfield
        [40.6564, -74.3002],  // Cranford
        [40.6643, -74.2654],  // Roselle Park
        [40.6997, -74.2337],  // Union
        [40.7340, -74.1644],  // Newark Penn Station
      ],
    },
  ];

  // =========================================================================
  // MAP INITIALIZATION
  // =========================================================================
  var map = L.map("map").setView([40.74, -74.15], 10);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  // =========================================================================
  // LAYER GROUPS
  // =========================================================================
  var layers = {
    "portal-bridge": L.layerGroup(),
    "montclair-boonton": L.layerGroup(),
    "morris-essex": L.layerGroup(),
    "northeast-corridor": L.layerGroup(),
    "north-jersey-coast": L.layerGroup(),
    "raritan-valley": L.layerGroup(),
    "transfer-hubs": L.layerGroup(),
  };

  // =========================================================================
  // ADD PORTAL BRIDGE MARKER
  // =========================================================================
  var portalIcon = L.divIcon({
    html: '<div style="background:#e03030;color:#fff;font-weight:700;font-size:10px;padding:3px 8px;border-radius:4px;white-space:nowrap;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">Portal Bridge</div>',
    className: "",
    iconSize: [0, 0],
    iconAnchor: [45, 15],
  });

  L.marker([PORTAL_BRIDGE.lat, PORTAL_BRIDGE.lng], { icon: portalIcon })
    .bindPopup(
      "<strong>Portal Bridge</strong><br>" +
      "Hackensack River, Kearny NJ<br>" +
      "<em>115-year-old swing bridge being replaced by Portal North Bridge</em><br><br>" +
      "The cutover zone: single-track operations between Newark and Secaucus."
    )
    .addTo(layers["portal-bridge"]);

  // Add a circle around the portal bridge to highlight the bottleneck
  L.circle([PORTAL_BRIDGE.lat, PORTAL_BRIDGE.lng], {
    radius: 800,
    color: "#e03030",
    fillColor: "#e03030",
    fillOpacity: 0.08,
    weight: 2,
    dashArray: "5,5",
  }).addTo(layers["portal-bridge"]);

  // =========================================================================
  // ADD STATION MARKERS
  // =========================================================================
  STATIONS.forEach(function (s) {
    var color = LINE_COLORS[s.line] || "#999";
    var textColor = LINE_TEXT_COLORS[s.line] || color;
    var lineLabel = s.line.split("-").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");

    var icon = L.circleMarker([s.lat, s.lng], {
      radius: 5,
      fillColor: color,
      color: "#fff",
      weight: 2,
      fillOpacity: 0.9,
    });

    icon.bindPopup(
      '<strong>' + esc(s.name) + '</strong><br>' +
      '<span style="color:' + textColor + ';font-weight:700;">' + esc(lineLabel) + ' Line</span><br>' +
      '<a href="index.html" target="_blank">Plan your commute &rarr;</a>'
    );

    icon.addTo(layers[s.line]);
  });

  // =========================================================================
  // ADD LINE POLYLINES (from explicit route paths)
  // =========================================================================
  ROUTES.forEach(function (route) {
    L.polyline(route.coords, {
      color: LINE_COLORS[route.line],
      weight: 3,
      opacity: 0.7,
    }).addTo(layers[route.line]);
  });

  // =========================================================================
  // ADD TRANSFER HUB MARKERS
  // =========================================================================
  TRANSFER_HUBS.forEach(function (h) {
    var icon = L.circleMarker([h.lat, h.lng], {
      radius: 8,
      fillColor: "#1a3a5c",
      color: "#fff",
      weight: 3,
      fillOpacity: 0.9,
    });

    icon.bindPopup(
      '<strong>' + esc(h.name) + '</strong><br>' +
      esc(h.desc)
    );

    icon.addTo(layers["transfer-hubs"]);
  });

  // =========================================================================
  // ADD ALL LAYERS TO MAP
  // =========================================================================
  Object.keys(layers).forEach(function (key) {
    layers[key].addTo(map);
  });

  // =========================================================================
  // FILTER BUTTONS
  // =========================================================================
  var $filters = document.getElementById("map-filters");
  var filterBtns = $filters.querySelectorAll(".map-filter-btn");

  for (var i = 0; i < filterBtns.length; i++) {
    filterBtns[i].addEventListener("click", function () {
      var filter = this.getAttribute("data-filter");

      // Update active state
      for (var j = 0; j < filterBtns.length; j++) {
        var isActive = filterBtns[j] === this;
        filterBtns[j].classList.toggle("active", isActive);
        filterBtns[j].setAttribute("aria-pressed", isActive ? "true" : "false");
      }

      // Show/hide layers
      if (filter === "all") {
        Object.keys(layers).forEach(function (key) {
          map.addLayer(layers[key]);
        });
      } else if (filter === "transfer-hubs") {
        Object.keys(layers).forEach(function (key) {
          if (key === "portal-bridge" || key === "transfer-hubs") {
            map.addLayer(layers[key]);
          } else {
            map.removeLayer(layers[key]);
          }
        });
      } else {
        Object.keys(layers).forEach(function (key) {
          if (key === "portal-bridge" || key === filter) {
            map.addLayer(layers[key]);
          } else {
            map.removeLayer(layers[key]);
          }
        });
        // Also show transfer hubs when filtering by line
        map.addLayer(layers["transfer-hubs"]);
      }
    });
  }

  // =========================================================================
  // INIT
  // =========================================================================
  function init() {
    updateCountdown();
    setInterval(updateCountdown, 3600000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
