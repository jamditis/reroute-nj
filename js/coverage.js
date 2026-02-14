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

  var CATEGORY_WEIGHT = {
    official: 5,
    news: 4,
    analysis: 3,
    opinion: 2,
    community: 1,
  };

  // =========================================================================
  // STATE
  // =========================================================================
  var articles = [];
  var searchTimer = null;
  var currentPage = 1;
  var ITEMS_PER_PAGE = 15;

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
  var $filterSort = document.getElementById("filter-sort");
  var $pagination = document.getElementById("coverage-pagination");
  var $resultCount = document.getElementById("coverage-result-count");

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  function loadData() {
    var xhr = new XMLHttpRequest();
    var dataUrl = (window.BASE_PATH || "") + "data/coverage.json";
    xhr.open("GET", dataUrl, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          articles = data.articles || [];
          if (data.lastUpdated) {
            $updated.textContent = t("coverage.last_updated") + " " + formatDate(data.lastUpdated);
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
    $pagination.innerHTML = "";
    $resultCount.textContent = "";
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
  // SORTING
  // =========================================================================
  function getRelevanceScore(article) {
    var catScore = CATEGORY_WEIGHT[article.category] || 1;
    var now = new Date();
    var articleDate = new Date(article.date);
    var daysDiff = Math.max(0, (now - articleDate) / (1000 * 60 * 60 * 24));
    var recencyScore = Math.max(0, 10 - daysDiff * 0.3);
    var scopeScore = 0;
    for (var i = 0; i < article.lines.length; i++) {
      if (article.lines[i] === "all") { scopeScore = 2; break; }
      scopeScore += 1;
    }
    return catScore * 3 + recencyScore + scopeScore;
  }

  function sortArticles(filtered) {
    var sortMode = $filterSort.value;
    if (sortMode === "relevance") {
      filtered.sort(function (a, b) {
        var sa = getRelevanceScore(a);
        var sb = getRelevanceScore(b);
        if (sb !== sa) return sb - sa;
        return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
      });
    } else if (sortMode === "oldest") {
      filtered.sort(function (a, b) {
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      });
    } else {
      filtered.sort(function (a, b) {
        return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
      });
    }
    return filtered;
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
        "<p>" + t("coverage.no_articles") + "</p>" +
        "</div>";
      $pagination.innerHTML = "";
      $resultCount.textContent = "";
      return;
    }

    sortArticles(filtered);

    var totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    var endIdx = Math.min(startIdx + ITEMS_PER_PAGE, filtered.length);
    var pageItems = filtered.slice(startIdx, endIdx);

    // Result count
    var showingText = t("coverage.showing") || "Showing";
    var ofText = t("coverage.of") || "of";
    var articlesText = t("coverage.articles_count") || "articles";
    $resultCount.textContent = showingText + " " + (startIdx + 1) + "\u2013" + endIdx + " " + ofText + " " + filtered.length + " " + articlesText;

    var html = "";
    for (var i = 0; i < pageItems.length; i++) {
      html += renderCard(pageItems[i]);
    }
    $feed.innerHTML = html;

    renderPagination(totalPages, filtered.length);
  }

  function renderPagination(totalPages, totalItems) {
    if (totalPages <= 1) {
      $pagination.innerHTML = "";
      return;
    }

    var prevLabel = t("coverage.prev") || "Previous";
    var nextLabel = t("coverage.next") || "Next";
    var pageLabel = t("coverage.page") || "Page";

    var html = '<nav class="pagination-nav" aria-label="' + esc(t("coverage.pagination_label") || "Article pagination") + '">';

    html += '<button class="pagination-btn pagination-prev"' +
      (currentPage <= 1 ? " disabled" : "") +
      ' aria-label="' + esc(prevLabel) + '">' +
      '<span class="pagination-arrow">\u2190</span> ' +
      '<span class="pagination-btn-text">' + esc(prevLabel) + '</span>' +
      "</button>";

    html += '<span class="pagination-info">' +
      esc(pageLabel) + " " + currentPage + " / " + totalPages +
      "</span>";

    html += '<button class="pagination-btn pagination-next"' +
      (currentPage >= totalPages ? " disabled" : "") +
      ' aria-label="' + esc(nextLabel) + '">' +
      '<span class="pagination-btn-text">' + esc(nextLabel) + '</span>' +
      ' <span class="pagination-arrow">\u2192</span>' +
      "</button>";

    html += "</nav>";
    $pagination.innerHTML = html;

    var prevBtn = $pagination.querySelector(".pagination-prev");
    var nextBtn = $pagination.querySelector(".pagination-next");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (currentPage > 1) {
          currentPage--;
          renderFeed();
          scrollToFeed();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (currentPage < totalPages) {
          currentPage++;
          renderFeed();
          scrollToFeed();
        }
      });
    }
  }

  function scrollToFeed() {
    var filtersEl = document.getElementById("coverage-filters");
    if (filtersEl) {
      filtersEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
    currentPage = 1;
    renderFeed();
  }

  function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      currentPage = 1;
      renderFeed();
    }, 200);
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
    $filterSort.addEventListener("change", onFilterChange);
    $filterSearch.addEventListener("input", onSearchInput);

    loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
