# ION Improvement Phase 09 — Original Three-Lap Racing Experience

**Stacked parent:** Phase 08 draft PR #24, branch `fix/ion-i08-native-race-guidance-first-run`, SHA `e34d66d1338aca04c69a1f2b10d5234939ffcfa5` (verified unchanged). **Child:** `fix/ion-i09-original-race-events-splits`. No merge or manual production deployment.

## Actual native source integration

- **Earned feedback:** Original `RaceEngine.update` is still the sole scorer. Exactly when it credits an authentic, forward, ordered physical quarter-gate, it sets one read-only `RaceEvent` with source lap, sector number, exact sector time and an increasing serial; when an authentic lap completes, it announces that official lap time and legitimate personal-best status. The existing App HUD temporarily shows the earned event. No alternative timer, fake award or synthetic checkpoint.
- **Real lap-sector history:** The source already calculated `sectorTimes[0..3]` but discarded it on each lap transition. The original `RaceEngine` now retains copies of these four *previously scored* splits in its race-local `completedSectorTimes` before clearing the active lap. The actual results screen shows the official time and four splits for all completed laps, along with actual personal-best and recovery count/penalty. The engine still owns all timestamps, records, split quantization, physical gate eligibility and result persistence.
- **Personal-best truth:** The original `bestLap` storage key remains `ion-i06-nightshift-best-lap` and is never renamed or migrated. A run's 'NEW PERSONAL BEST' display compares only legitimate scored lap times against the best recorded *before* this run; it does not award an invented record because of UI rerendering. The existing saved best is retained on restart.
- **Clear race start and condition:** Existing countdown shows 'GET READY' for the final second and a short 'GO · FOLLOW S1' notice on genuinely entering the racing state. Existing meter area now shows only actual source shield impact, earned pad-surge or critical-shield status. No extra GPU effects, score storage, game mode or controller.
- **Accurate interruption lifecycle:** Pause and recovery clear any stale announcement; restart clears race-local event, split history and new-record status. Read-only snapshots make deep copies of stored sector arrays so React cannot mutate the original scorer state.
- **Results layout:** Existing `App.tsx` and `v17.css` handle compact HUD acknowledgments, responsive four-sector rows and scrollable small-screen finish view. Historical CSS is preserved; no independent screen or parallel race engine.

## Executed exact-source qualification

Added `scripts/i09-race-experience-smoke.mjs`, running after existing I05–I08 exact-source gates in `scripts/build.sh`. It bundles the *actual* `src/simulation.ts` and `src/track.ts` using existing esbuild and drives the native 60 Hz engine, providing **only ordinary steering, throttle, brake and boost inputs**. It cannot directly set lap, checkpoints, official split timing, the personal best or finish state.

Authenticated Cloudflare build at code head `c6e38d8cc079a2477eb32aed5537d555a11658da` reported these genuinely executed results:

| Gate | Result |
|---|---|
| Original 3.5-second countdown enters racing | PASS |
| Authentically completed three-lap sequence | PASS — 19,356 original engine updates |
| Real quarter-gate/lap events | PASS — exactly 12 ordered S1/S2/S3/LAP × 3 |
| Exact four scored sector splits per completed lap | PASS — sector sum minus official lap = 0.00s |
| Original best-lap persistence | PASS — 107.412s best lap in test environment |
| Result array owner protection | PASS — snapshot mutation does not affect engine |
| Restart cleanup | PASS — clears event/history/new-PB while keeping saved best |
| Inherited I05–I08 native physics, 1.82 km geometry, collision/camera, fast/slow 3-lap, honest recovery/guidance checks | PASS |
| TypeScript and Vite | PASS — build completed (3.86s Vite) |

The final report-only commit still requires its own exact-head Cloudflare verification; do not transfer intermediate SHA status without checking.

## Unexecuted real gameplay acceptance

- Desktop and mobile Chromium WebGL: genuine screenshots/videos of countdown, GO, each quarter-gate announcement, lap 1→2/2→3 transition, personal-best result, near/chase camera, phone portrait and short landscape.
- Keyboard/gamepad/touch physical 3-lap trials at normal/boost speeds, steering and sound focus, no control obstruction from transient HUD overlays, no wrong finish visibility.
- Screen-reader/politeness and responsive finish table sizes with all four splits, zero fake notifications after a pause/recovery/restart.
- Existing source IDs, Kestrel/Rift, Kenney CC0 licenses, checkpoints, best lap, shield/boost, actual ordered lap scoring, privacy and cloud hosting boundaries unchanged.
- This container has Chromium/Node but **no exact-head complete executable ION checkout or resolvable GitHub/preview DNS**. Browser, real screenshots, GPU timing, mobile multitouch and physical controllers remain **BLOCKED / NOT_TESTED**. Automatic Cloudflare Pages branch preview is not a production deployment and is not evidence of human playability.

No historical PR/main/production modification, merge, intentional production deployment, paid service, credentials or migration.
