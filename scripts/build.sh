#!/usr/bin/env bash
# ION V2 development-branch build. The production main branch retains
# the independently deployable, pinned HexGL build until V2 is approved.
set -euo pipefail
npm install --no-audit --no-fund
# Focused real RaceEngine movement/steering/recovery smoke checks use the
# existing installed esbuild dependency, not a second game or CI service.
node scripts/i05-physics-smoke.mjs
# I06 qualifies the exact Three.js spline before shipping a circuit preview.
node scripts/i06-track-qualification.mjs
# Drive three physically earned laps at low speed using canonical RaceEngine.
node scripts/i06-three-lap-drive.mjs
# I07 exercises real rail geometry, angled impacts, crests and faster laps.
node scripts/i07-collision-and-fast-laps.mjs
# Check the source-derived next gate and corner instruction guidance.
node scripts/i08-guidance-smoke.mjs
node scripts/sync-cc0-assets.mjs
npm run build
