// Resolve local CSS imports so static checks inspect the actual cascade.
// Reject missing files and circular imports rather than silently skipping them.
var fs = require("fs");
var path = require("path");
module.exports = function readStyles(filename, ancestors) {
  filename = path.resolve(filename);
  ancestors = ancestors || [];
  if (ancestors.indexOf(filename) !== -1) throw new Error("Circular CSS import: " + filename);
  var chain = ancestors.concat(filename);
  return fs.readFileSync(filename, "utf8").replace(
    /@import\s+url\(["']([^"']+)["']\)\s*;/g,
    function (rule, imported) {
      if (/^(?:[a-z]+:|\/\/)/i.test(imported)) throw new Error("External CSS import: " + imported);
      return module.exports(path.resolve(path.dirname(filename), imported), chain);
    }
  );
};
