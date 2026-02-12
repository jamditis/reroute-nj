// Reroute NJ — News Coverage Feed
// Loads data/coverage.json and renders a filterable article feed.
// All dynamic text is sanitized through esc() (from shared.js) before
// insertion to prevent XSS from article data.

(function () {
  "use strict";

  // =========================================================================
  // LINE LABELS (for display)
  // =========================================================================
  var LINE_LABELS = {
    "montclair-boonton": "Montclair-Boonton",
    "morris-essex": "Morris & Essex",
    "northeast-corridor": "Northeast Corridor",
    "north-jersey-coast": "North Jersey Coast",
    "raritan-valley": "Raritan Valley",
    "all": "All lines",
  };

  var CATEGORY_LABELS = {
    news: "News",
    opinion: "Opinion",
    analysis: "Analysis",
    official: "Official",
    community: "Community",
  };

  var DIRECTION_LABELS = {
    "nj-to-nyc": "NJ \u2192 NYC",
    "nyc-to-nj": "NYC \u2192 NJ",
    both: "Both directions",
  };

  // =========================================================================
  // STATE
  // =========================================================================
  var articles = [];
  var searchTimer = null;

  // =========================================================================
  // DOM
  // =========================================================================
  var $feed = document.getElementById("coverage-feed");
  var $updated = document.getElementById("coverage-updated");
  var $filterSource = document.getElementById("filter-source");
  var $filterCategory = document.getElementById("filter-category");
  var $filterLine = document.getElementById("filter-line");
  var $filterDirection = document.getElementById("filter-direction");
  var $filterSearch = document.getElementById("filter-search");

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  function loadData() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "data/coverage.json", true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          articles = data.articles || [];
          if (data.lastUpdated) {
            $updated.textContent = "Last updated: " + formatDate(data.lastUpdated);
          }
          populateSourceFilter();
          renderFeed();
        } catch (e) {
          showEmpty("Error loading coverage data.");
        }
      } else {
        showEmpty("Could not load coverage data.");
      }
    };
    xhr.send();
  }

  function showEmpty(msg) {
    var wrapper = document.createElement("div");
    wrapper.className = "coverage-empty";
    var p = document.createElement("p");
    p.textContent = msg;
    wrapper.appendChild(p);
    $feed.textContent = "";
    $feed.appendChild(wrapper);
  }

  // =========================================================================
  // FILTERS
  // =========================================================================
  function populateSourceFilter() {
    var sources = {};
    for (var i = 0; i < articles.length; i++) {
      sources[articles[i].source] = true;
    }
    var names = Object.keys(sources).sort();
    for (var j = 0; j < names.length; j++) {
      var opt = document.createElement("option");
      opt.value = names[j];
      opt.textContent = names[j];
      $filterSource.appendChild(opt);
    }
  }

  function getFiltered() {
    var source = $filterSource.value;
    var category = $filterCategory.value;
    var line = $filterLine.value;
    var direction = $filterDirection.value;
    var search = $filterSearch.value.toLowerCase().trim();

    return articles.filter(function (a) {
      if (source && a.source !== source) return false;
      if (category && a.category !== category) return false;
      if (line) {
        var hasLine = false;
        for (var i = 0; i < a.lines.length; i++) {
          if (a.lines[i] === line || a.lines[i] === "all") { hasLine = true; break; }
        }
        if (!hasLine) return false;
      }
      if (direction && a.direction !== direction && a.direction !== "both") return false;
      if (search) {
        var haystack = (a.title + " " + a.excerpt + " " + a.source + " " + (a.author || "")).toLowerCase();
        if (haystack.indexOf(search) === -1) return false;
      }
      return true;
    });
  }

  // =========================================================================
  // RENDERING
  // All dynamic text from article data passes through esc() before insertion.
  // =========================================================================
  function renderFeed() {
    var filtered = getFiltered();

    if (filtered.length === 0) {
      $feed.innerHTML =
        '<div class="coverage-empty">' +
        '<div class="empty-icon">&#x1F4F0;</div>' +
        "<p>No articles match your filters.</p>" +
        "</div>";
      return;
    }

    // Sort newest first
    filtered.sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    var html = "";
    for (var i = 0; i < filtered.length; i++) {
      html += renderCard(filtered[i]);
    }
    $feed.innerHTML = html;
  }

  function renderCard(article) {
    var catClass = "coverage-cat-" + esc(article.category);
    var catLabel = CATEGORY_LABELS[article.category] || article.category;
    var dirLabel = DIRECTION_LABELS[article.direction] || article.direction;

    var lineTags = "";
    for (var i = 0; i < article.lines.length; i++) {
      var label = LINE_LABELS[article.lines[i]] || article.lines[i];
      lineTags += '<span class="coverage-line-tag">' + esc(label) + "</span>";
    }

    var authorHtml = article.author
      ? '<span class="coverage-author">By ' + esc(article.author) + "</span>"
      : "";

    return (
      '<article class="coverage-card">' +
      '<div class="coverage-card-header">' +
      '<div class="coverage-card-meta">' +
      '<span class="coverage-source">' + esc(article.source) + "</span>" +
      '<span class="coverage-cat ' + catClass + '">' + esc(catLabel) + "</span>" +
      "</div>" +
      '<time class="coverage-date">' + esc(formatDate(article.date)) + "</time>" +
      "</div>" +
      '<h3 class="coverage-title"><a href="' + esc(article.url) + '" target="_blank" rel="noopener">' + esc(article.title) + "</a></h3>" +
      authorHtml +
      '<p class="coverage-excerpt">' + esc(article.excerpt) + "</p>" +
      '<div class="coverage-card-footer">' +
      '<div class="coverage-tags">' + lineTags + "</div>" +
      '<span class="coverage-direction">' + esc(dirLabel) + "</span>" +
      "</div>" +
      "</article>"
    );
  }

  function formatDate(dateStr) {
    var parts = dateStr.split("T")[0].split("-");
    var months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    return months[m] + " " + d + ", " + parts[0];
  }

  // =========================================================================
  // EVENT LISTENERS
  // =========================================================================
  function onFilterChange() {
    renderFeed();
  }

  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(renderFeed, 200);
  }

  // =========================================================================
  // INIT
  // =========================================================================
  function init() {
    updateCountdown();
    setInterval(updateCountdown, 3600000);

    $filterSource.addEventListener("change", onFilterChange);
    $filterCategory.addEventListener("change", onFilterChange);
    $filterLine.addEventListener("change", onFilterChange);
    $filterDirection.addEventListener("change", onFilterChange);
    $filterSearch.addEventListener("input", onSearchInput);

    loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
