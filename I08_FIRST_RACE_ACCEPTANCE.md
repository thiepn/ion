# ION Improvement Phase 08 — Native Racing Guidance & First-Run Usability

**Source-verified parent:** draft PR #23 `fix/ion-i07-canonical-rails-collision-envelopes` exact `7bdf3efc8433cf3adca9e5d7cd55cfa9b9629217`. Phase 08 is a separate stacked branch `fix/ion-i08-native-race-guidance-first-run`. Earlier PR branches, `main` and production stay unchanged.

## Implemented in original game

1. **Required-gate beacons were one checkpoint behind.** The original `RaceLineGuidance` rendered beacon pairs indexed FINISH=0/S1=1/S2=2/S3=3 but colored `Math.min(3, game.checkpoints)` as the next target. At grid with no checkpoint credit, it illuminated FINISH, rather than S1; after crossing S1 it highlighted S1, instead of S2. Now a pure `requiredBeaconIndex()` in `src/track.ts` maps actual earned counts `0→S1,1→S2,2→S3,3→FINISH`. The scene reads `RaceEngine.checkpoints` (sole scoring authority) and distinguishes already-earned green beacons from the amber next target. It does not create or credit checkpoint state.
2. **No actionable corner entry guidance.** `upcomingApproach()` samples the *actual* closed Catmull-Rom spline ahead of the real snapshot progress, detects consequential bends by source curvature, derives the source left/right direction and a cautious `KM/H ADVISORY` using a bounded curve-radius heuristic. Braking is suggested only when observed speed and physically available approach distance meet the deceleration warning. The screen does not change physics, automatically brake or guarantee this speed is safe. It suppresses the cue while a race warning or first-run coach is visible. The center of the road and mobile control panel remain interactive and are not covered by an onboarding modal.
3. **First-race onboarding was inaccessible during driving.** Added a short, dismissible first-run card inside the existing race HUD during countdown and the opening 17 seconds. It explains GO/W, steering, real sector gates and corner markers; dismissing stores an optional local preference under `ion-i08-first-race-guide`. It never pauses the race, rebinds a key or sets any progress.
4. **Track/recovery copy was incomplete.** Paused recovery now shows the real destination (START GRID before S1 or the last credited sector), **+5 seconds, −8 shield and −25 boost**, matching existing original `RaceEngine.recover()` (shield has its preexisting minimum floor). Touch recover has the same contextual accessible description. The Controls manual states S1→S2→S3→finish and explains re-crossing a missed gate forwards versus paying for recovery; no fake checkpoint progression.
5. **Track direction not legible enough on the physical deck.** The original `RaceLineGuidance` now positions 20 paired low-profile directional chevrons along the actual course tangent, not an independent path. Original roadside braking markers are amber to distinguish them from ordinary cool-color road markings. These are purely rendered, no physics/writer change.

## Executable exact-source verification

`scripts/i08-guidance-smoke.mjs` uses the already-installed esbuild to import the actual source `track.ts` and `simulation.ts`, without implementing another geometry engine or writing score state. It runs in the unchanged automatic `scripts/build.sh` after the previous I05–I07 gates and before `npm run build`.

The initial executed Cloudflare build for commit `1e6bdc7400b349546e7a0dcf95fcadeac27ddf47` reported:
- **PASS** required beacon mapping grid→S1→S2→S3→FINISH;
- **PASS** spline-backed approach direction and high-speed braking warnings across 360 course locations: 294 candidates, 213 braking-warning samples, 0 tighter LEFT and 294 tighter RIGHT. This is a meaningful limitation of the I06 circuit's tight-corner geometry, not evidence of fabricated left turns. Gentle leftwards variations may exist without meeting the threshold;
- **PASS** course seam wraparound, invalid inputs and zero-speed no-brake safety;
- **PASS** physically earned real `RaceEngine` S1 after 1,628 genuine fixed-step updates, with S2 becoming the next target;
- Inherited Phase 05–07 engine, 1,820.8m track, rail collision, camera, earned checkpoint recovery, nine boost pads/nine quarter gates and three-lap source-engine checks remained **PASS**. Build TypeScript/Vite **PASS**.

Final-head build checks must be read separately after the final source and report commits; never transfer intermediate PASS to a changed exact head without inspecting its own logs.

## Browser acceptance — remains necessary

- **Real desktop Chromium and mobile Chrome/WebKit:** render the actual START, HUD, first-run coach, highlighted real S1/S2/S3/FINISH beacons, source chevrons, right bend braking panels and mobile touch layout. Capture *real* screenshots, inspect usable tap/click dismissal, screen-reader names, camera-visible road cues and no road/controls occlusion.
- **Human-driven laps:** first-time users must understand W/A/S/D, touch GO/STEER, braking cues and forward quarter gates without opening a multi-page tutorial. Verify that the advisory heuristic is conservative/helpful at the actual handling limits before calling it a safe target speed. Three genuine three-lap races with keyboard, touch and controller.
- **Recovery:** right before first S1, after each earned quarter and after a missed gate, verify rendered destination/penalties and canonical respawn; never reward missed credit.
- **Low-end mobile performance:** test the source-spline advisory calculation, camera, scene markers, pointer response, memory/GC and measured FPS in QUALITY/PERFORMANCE.
- **Accessibility and interruption:** focus and escape, persistent dismissal, narrow portrait/short landscape, visibility changes and button tap targets.

The available container has Chromium but no actual exact-head checkout, project dependencies or resolvable GitHub/preview DNS, so an honest Chromium playthrough and screenshots are **BLOCKED/NOT_TESTED**. Cloudflare branch-preview deployment/build and original-engine Node tests do not replace this.

**Preservation:** no alternate physical course, new store/auth/score writer, artificial grades/records, road physics edits, checkpoint bypass, asset/license changes, production deployment, merging, credentials or paid services. Retains original I01–I07, Kestrel/Rift and 14 Kenney CC0 GLB assets.
