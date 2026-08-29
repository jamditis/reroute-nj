#!/usr/bin/env node
"use strict";

var childProcess = require("child_process");
var path = require("path");

var projectDir = path.resolve(__dirname, "..");
var result = childProcess.spawnSync(
  "python3",
  ["-m", "unittest", "tests/test_scrape_coverage.py"],
  { cwd: projectDir, encoding: "utf8" }
);

process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");

if (result.error) {
  process.stderr.write("Could not run coverage publication tests: " + result.error.message + "\n");
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
