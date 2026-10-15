# ION Improvement Phase 12 — Source-Accurate Racing HUD & Mobile Telemetry

**Verified parent:** Phase 11 draft PR #27 `fix/ion-i11-professional-visual-foundation`, exact SHA `412d77d3d65ff87f9c3b3b1107c7f2a5f1864626`.
**Stacked child:** `fix/ion-i12-source-telemetry-hud-hierarchy`. The parent, main and production remain unchanged.

## Real original-source changes

1. **Minimap colored FINISH as earned before S1.** Old original `src/Minimap.tsx` set index zero (FINISH) amber before the three required forward gates, and only treated gate markers as previously earned. `gateMarkerStatus` now maps `RaceSnapshot.nextGate` to exactly S1→S2→S3→FINISH (index 0), with distinct amber next, cyan genuinely earned and muted pending colors. No other sector authority, no fake scoreboard or independent map geometry: positions still come from the existing canonical `TRACK_SAMPLES`, and the vehicle uses real source `worldX/worldZ/heading`.
2. **Track progress wasn't available on narrow touch screens.** The legacy responsive stylesheet unconditionally hid `.minimap` on coarse pointers and phone widths. On desktops the existing physical spline map remains. At 320px portrait and short landscape, a compact version shows **the correct required gate**, physical on-course percent and an accessible `progressbar` in a small upper-right panel. SVG circuit is suppressed only inside that compact form to preserve the central forward road/craft view. Percentage remains the physical fractional `previousT` of the original lap, not a claim that a checkpoint is earned.
3. **Fragmented sector hierarchy.** Existing original `App.tsx` now displays a four-step S1/S2/S3/FIN row using `data.nextGate`, the real required-gate label/distance, and the last officially scored split from `data.lastSectorTime`. Source-legitimate pending/earned/next states replace the redundant “SECTOR x/4” text. No extra React telemetry engine, subscription or writer.
4. **Meter semantics and speed:** the original shield/boost values are clamped once to the valid accessible and visible 0–100 display range, and both `aria-valuenow` and bar width use the same `level`. Actual speed remains sourced from `RaceSnapshot.speedKmh` with a stable readable unit and accessible description. All engine values and physics are untouched.
5. **Source-first warnings:** when the canonical engine reports wrong-way, missed checkpoint or projector recovery, that higher-priority safety/course alert suppresses first-time onboarding, preventing two contradictory panels. Real earned race milestone and correct physical braking guidance remain in the existing HUD.
6. **Responsive layout in existing two CSS files:** sector row and track bar use the consolidated Phase 11 tokens in `styles.css`. Targeted portrait 320px and short landscape rules present a compact, legible map while preserving touch-zone sizes, 44px recovery and safe area offsets. Original `v17.css` no longer hides source split/next gate unconditionally. No third stylesheet or duplicate controls.

## Executable native qualification

New `scripts/i12-hud-telemetry-smoke.mjs` bundles **the original** Three.js `track.ts`, `Minimap.tsx` helper and `RaceEngine` source under Node with the project's existing `esbuild`. The test operates the real engine through 19,356 60Hz physics updates, no direct score/sector/lap mutation, and validates:
- index 0 finish only becomes next after **three real earned quarters**; exactly one next marker, correct earned vs pending markers;
- actual original engine moves S1→S2→S3→FINISH for all three laps with an honest 4→1 lap seam; exactly **12 authentic changes** including three official finished laps;
- original forward progress stays in range, and gate distance is nonnegative;
- source-level accessible `progressbar`, meters, four-stage HUD, finish statuses and mobile compact breakpoint styles are present;
- inherited original I05–I11 physics, geometry, camera, source-scored 3-lap, split/record/replay and contrast/keyboard-accessibility checks remain mandatory as part of the same `scripts/build.sh`.

**Actual build evidence:** Cloudflare branch build on code SHA `6297a8bab6a091ae6359d033ce2b04efa8643d2d` ran all I05–I12 regression gates, including all three I12 PASS logs and TypeScript/Vite build **PASS (5.64s)**. An earlier I12 build `3a01ee9` failed only in a brittle inherited I11 *source test* that expected the meter JSX identifier `amount`. The corrected original App uses one clamped and accessible numeric `level`; fixed the I11 test to check the source attribute rather than a specific variable name, and the complete head build passed. Final documentation-head checks should be verified independently.

## Browser / release acceptance still required

- **Actual desktop Chromium at 1440×900 and 1920×1080**, Android Chrome 320×568 portrait, short landscape 667×375, tablet and iOS WebKit: real WebGL screenshots, computed bounding rectangles for minimap/touch/coach/notifications, graphically visible road and player craft, no overlaps or clipped headers.
- Real keyboard, gamepad and two-thumb touch driving; responsive orientation/safe areas, first-run dismiss, source-split/gate notifications, source-owned pause and recovery.
- Genuinely visible low-shield/boost meters, correct on-course percent vs *earned* sector distinction, all three lap transitions, source-backed finish records.
- Color contrast over the animated actual scene, GPS/render frame time, GPU FPS, input latency and mobile memory. Source CSS existence checks cannot replace pixel/assistive-tech QA.

**Runtime blocker:** no complete executable exact-head checkout under `/mnt/data`; Chromium is locally installed but Github and Cloudflare preview DNS are not resolvable from this environment and the web preview did not render. No real screenshots, mobile/physical controller acceptance or FPS can truthfully be called PASS. Keep those **BLOCKED / NOT_TESTED**.

## Preservation

Original `RaceEngine`, `Minimap` spline, score/lap/checkpoint owner, original Nightshift 1,820.8m course, Kestrel/Rift, all 14 Kenney CC0 GLBs and licensing, Phase 01–11 gameplay/control/replay improvements, original browser localStorage personal best, previous stacked PR branches, main and production. No merges, intentional production deployments, migrations, paid resources or credentials; automatic Git-integrated branch previews only.
