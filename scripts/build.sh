#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_SHA="6addc95a2fce3bf05f4d751823cc054c61a16d68"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$ROOT/.ion-upstream"
OUTPUT_DIR="$ROOT/dist"

for bin in git tar node; do
  command -v "$bin" >/dev/null 2>&1 || { echo "Missing build dependency: $bin" >&2; exit 1; }
done

rm -rf "$UPSTREAM_DIR" "$OUTPUT_DIR"
mkdir -p "$UPSTREAM_DIR" "$OUTPUT_DIR"

echo "Fetching HexGL at immutable revision $UPSTREAM_SHA..."
git -C "$UPSTREAM_DIR" init -q
git -C "$UPSTREAM_DIR" remote add origin https://github.com/BKcore/HexGL.git
git -C "$UPSTREAM_DIR" fetch -q --depth=1 origin "$UPSTREAM_SHA"

echo "Exporting the original game, without repository metadata..."
git -C "$UPSTREAM_DIR" archive --format=tar FETCH_HEAD | tar -xf - -C "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/ion"
cp "$ROOT/ion/ion.css" "$OUTPUT_DIR/ion/ion.css"
cp "$ROOT/ion/favicon.svg" "$OUTPUT_DIR/ion/favicon.svg"
cp "$ROOT/ion/credits.html" "$OUTPUT_DIR/ion/credits.html"

echo "Applying non-destructive ION shell overrides..."
node "$ROOT/scripts/brand.mjs" "$OUTPUT_DIR/index.html"
rm -rf "$UPSTREAM_DIR"
echo "Built ION in $OUTPUT_DIR"
