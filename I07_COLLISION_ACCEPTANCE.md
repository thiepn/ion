# ION Improvement Phase 07 — Road, Rails, Collision & Recovery

**Verified parent:** Phase 06 draft PR #22, branch `fix/ion-i06-nightshift-canonical-circuit`, exact SHA `dc10db1f6ea753c251ef7113abf79f84038865bb`. Independent I07 branch `fix/ion-i07-canonical-rails-collision-envelopes`, based exactly on I06 without modifying I06, main or production.

## Original source defects and implementation

1. **Rails were not visually solid.** `World.Road` rendered the old rail as a thin horizontal ribbon only 0.43 m above the roadway while the physical craft was 2.5 m above it; this visually allowed the player to pass through a line that acted like a guardrail. `src/track.ts` now declares one authoritative rail inner offset, bottom/top rise, and `railWall(side)` generates continuous **3.15 m-high upright wall faces** from the exact original `trackAt()` samples. Existing `Road` retains the physical surface/underside, with brighter top markers. No separate track engine or projection.
2. **Stationary-width approximation clipped turning hulls.** A fixed 8.85 m craft-center boundary accounted for Kestrel's straight wings but failed when the hull was yawed relative to a bend: the longitudinal silhouette projects laterally too. The original `RaceEngine` collision now computes a conservative rotated 3.95 m × 3.95 m half-envelope against the same `RAIL_INNER_OFFSET`. The 3.95 m covers the original Kestrel's authored 3.86 m wing plus bevel and the Rift's normalized 7.7 m horizontal model footprint. Both craft choices continue to use one shared collision authority. This is a conservative source approximation, not measured GLB per-polygon contact.
3. **Road-surface penetration on elevation change.** The physics had intentionally damped vertical movement but could lag below the actual steep uphill road surface. It now maintains at least 2.12 m clearance between canonical projected road height and craft center while preserving the source slope and natural downhill smoothing. No second terrain surface.
4. **Camera clipping into the new rails.** `ChaseRig` previously clamped the camera's height but not its horizontal location on sharp bends. Both original camera modes now keep the camera center 1.7 m inside the rail and at least 2.7 m above nearby road height when within the projector's relevant region. No camera/physics state duplication.
5. **Existing impact and recovery preserved.** The angled collision still uses original shield, single-contact wall cooldown, travel-heading correction, projection guard and damage/destruction authorities. Recovery remains to the last physically earned quarter gate, with +5 s and shield penalty. No imaginary recovery marker or scoring bypass.

## Original-engine executed evidence

The existing `scripts/build.sh` runs the inherited I05 native-physics checks, I06 Three.js geometry qualification, I06 low-speed three-lap pilot and new `scripts/i07-collision-and-fast-laps.mjs` using the *actual original source*. The full check is a hard build gate before TypeScript and Vite, not independent formulas copied into a test.

Authenticated final I07 source-run evidence at commit `18e812af152ad3bb5609c88588ca6f664ec14590`, Cloudflare deployment log from actual Node 22 build **PASS**:

| Check | Executed result |
|---|---|
| I05 physics | 7 checks PASS, including real physical boost-pad crossing |
| I06 spline | closed 1,820.8 m circuit, 0 intersections, 87.0 m nonlocal centreline gap, 12.4% maximum grade, 34.7 m minimum sampled corner radius, all PASS |
| I06 original-engine low-speed 3 laps | PASS, genuine 107.77/107.41/107.41 s |
| I07 upright rail source geometry | PASS, both sides across 38 sampled sections |
| I07 angled contacts | PASS, both directions; rotated hull stays inside actual rail, one physical hit with cooldown, real shield cost |
| I07 road crest height | PASS, five canonical elevation test positions |
| I07 near/chase camera clearance | PASS, two sides in both camera modes in actual `ChaseRig` |
| I07 source pad locations | PASS, all three canonical strips |
| I07 earned S1 recovery | PASS; 1,628 actual frame updates to earn quarter checkpoint before calling original `recover()`, then correct t=0.25 physical spawn, +5 s, shield cost and cooldown |
| I07 faster original-engine three-lap race | PASS, 9,137 genuine 60 Hz updates; lap times 51.23/50.51/50.53 s |
| Fast-lap scoring and pads | PASS, 9 physically earned quarter-gate credits, 9 forward boost-pad activations, 0 impacts and missed-gate warning frames |
| Fast lap positioning | PASS, 2.33 m maximum observed centreline deviation, no recovery |
| Exact-head TypeScript + Vite | PASS |

The automated pilot supplies only normal throttle/brake/steer inputs to the source `RaceEngine.update()`. It cannot set lap, earned-gate, pad, finish or scoring state or teleport between sectors. The original `RaceEngine` itself decides them. These checks establish **engine-level** continuity, not human playability, render quality or physical controllers.

## Unexecuted high-priority browser acceptance

- Desktop Chromium and mobile Chrome real WebGL launch, actual Kestrel/Rift model silhouette to rail clearance under roll and yaw (including Kenney GLB loading), visual rail materials, signage, support collision illusion, gameplay HUD and camera at 16:9/portrait/landscape.
- Three laps at real human-controlled race speed with brake zones, boosted corners, rail impacts and rail separation; no controller inversion/stuck inputs or persistent off-road bouncing.
- True fast physical collision at all tight corners, camera wall occlusion and bridge/gantry vertical interference; no automatic scripted route can prove graphics or driving quality.
- Touch simultaneous steering/GO/BRAKE/BOOST and orientation events; real controller reconnect after collision or recovery; verify physical lap/boost/shield UI consistency.
- GPU frame-time/fps measurements across QUALITY/PERFORMANCE and shader/asset recovery; actual screenshots or recordings.

**Runtime blocker:** Current local container has Chromium/Node but no exact-head ION checkout under `/mnt/data`; the preview and GitHub hostnames do not resolve here. Therefore browser, mobile, screenshots, frame rates and physical controller claims remain **BLOCKED/NOT_TESTED** even though authenticated Cloudflare's build gates passed.

## Preservation / restrictions

Keeps the single original `RaceEngine`, `nearestTrack`, physical checkpoints, personal-best records, original input system and Phase 01–06 repairs. All 14 Kenney CC0 GLB asset identities and original Kestrel/Rift model files unchanged. Earlier stacked PRs, main and production not mutated; no merge, intentional production deploy, credential, paid service or historical record rewrite. Only the Git-integrated Cloudflare **branch preview** may auto-deploy as part of the existing verification workflow.
