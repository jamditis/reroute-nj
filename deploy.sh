#!/usr/bin/env bash
# Deploy reroute-nj to Cloudflare Pages (Montclair account)
# Uses wrangler direct upload — no GitHub Actions dependency
set -euo pipefail
cd "$(dirname "$0")"

export CLOUDFLARE_API_KEY=$(pass show claude/api/cloudflare-montclair)
export CLOUDFLARE_EMAIL="amditisj@montclair.edu"
export CLOUDFLARE_ACCOUNT_ID="269f308f59c26fc3c7f69b5824610ddf"

COMMIT_MSG=$(git log -1 --format="%h %s" 2>/dev/null || echo "manual deploy")
echo "Deploying reroute-nj..."
echo "Commit: $COMMIT_MSG"

# Clear wrangler account cache (prevents cross-account contamination)
rm -f "$HOME/node_modules/.cache/wrangler/wrangler-account.json" "$HOME/node_modules/.cache/wrangler/pages.json" 2>/dev/null

npx wrangler pages deploy . \
  --project-name=reroute-nj \
  --branch=main \
  --commit-message="$COMMIT_MSG" --commit-dirty=true

echo "Done: https://reroute-nj.pages.dev"
