// Reroute NJ — Embed Page
// Generates embed codes and handles copy-to-clipboard.

(function () {
  "use strict";

  var BASE_URL = "https://jamditis.github.io/reroute-nj/";

  var $tool = document.getElementById("embed-tool");
  var $width = document.getElementById("embed-width");
  var $height = document.getElementById("embed-height");
  var $codeBox = document.getElementById("embed-code-box");
  var $copyBtn = document.getElementById("copy-embed-btn");
  var $copyConfirm = document.getElementById("copy-embed-confirm");

  function generateCode() {
    var tool = $tool.value;
    var w = $width.value;
    var h = $height.value;
    var url = BASE_URL + tool;
    var code =
      '<iframe src="' + url + '" ' +
      'width="' + w + '" height="' + h + '" ' +
      'style="border:1px solid #d5dbe3;border-radius:8px;" ' +
      'title="Reroute NJ" loading="lazy" ' +
      'allowfullscreen></iframe>';
    return code;
  }

  function updatePreview() {
    var code = generateCode();
    $codeBox.textContent = code;
  }

  function copyCode() {
    var code = generateCode();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(function () {
        $copyConfirm.classList.remove("hidden");
        setTimeout(function () {
          $copyConfirm.classList.add("hidden");
        }, 2000);
      });
    }
  }

  function init() {
    updateCountdown();
    setInterval(updateCountdown, 3600000);

    $tool.addEventListener("change", updatePreview);
    $width.addEventListener("change", updatePreview);
    $height.addEventListener("change", updatePreview);
    $copyBtn.addEventListener("click", copyCode);

    updatePreview();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
