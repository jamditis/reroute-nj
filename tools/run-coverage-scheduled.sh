#!/usr/bin/env bash
set -euo pipefail

repo=/home/jamditis/projects/reroute-nj
python=/home/jamditis/.claude/workstation/venv/bin/python3
lock=/home/jamditis/.claude/workstation/reroute-scrape.lock

exec 9>"$lock"
if ! /usr/bin/flock -n 9; then
  echo "Reroute NJ scraper is already running; skipping this run."
  exit 0
fi

cd "$repo"

branch=$(/usr/bin/git branch --show-current)
if [[ "$branch" != "main" ]]; then
  echo "Reroute NJ scraper requires main; current branch is $branch."
  exit 0
fi

if [[ -n "$(/usr/bin/git status --porcelain)" ]]; then
  echo "Reroute NJ scraper requires a clean worktree; skipping this run."
  exit 0
fi

exec "$python" tools/scrape-coverage.py
