#!/usr/bin/env bash
# ION V2 development-branch build. The production main branch retains
# the independently deployable, pinned HexGL build until V2 is approved.
set -euo pipefail
npm install --no-audit --no-fund
node scripts/sync-cc0-assets.mjs
npm run build
