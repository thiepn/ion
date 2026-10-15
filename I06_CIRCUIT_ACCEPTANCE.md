# ION Improvement Phase 06 — Canonical Nightshift Circuit

**Exact stacked parent:** Phase 05 [draft PR #21], \`fix/ion-i05-native-driving-feel-traction\`, exact original SHA \`a859ace582a962db62ff32903f792bcc174ddb94\`.

**Separate I06 development branch:** \`fix/ion-i06-nightshift-canonical-circuit\`. No updates to historical branches, main or production.

## Actual track and functional source changes

- **One canonical circuit, not a second engine:** \`src/track.ts\` now owns a newly authored clockwise 32-point closed Catmull-Rom Nightshift course. The course has a long south launch, a progressive east-side run with S-bends, a broad northern crest and elevation change, a deliberate northwest braking sector, the west-side descent and a visible finish approach. The original \`TRACK_CURVE\`, \`TRACK_SAMPLES\`, \`nearestTrack\`, \`trackAt\`, \`ROAD_HALF_WIDTH\` and projector still determine geometry and physics.
- **True visual/racing authority agreement:** \`BOOST_PAD_T\` is declared once in \`track.ts\` and reused by the original \`RaceEngine\` and \`World\` render, with strips at 0.16, 0.43 and 0.80. Old fake decorative checkpoint gantries at 0.18/0.34/0.58/0.74/0.93 are replaced with the original race's **actual 0.25/0.50/0.75 sector gates**. The complete-lap seam remains t=0, three earned quarter gates and forward physical crossing, unchanged.
- **Five real wayfinding sections:** \`CIRCUIT_SECTIONS\` in canonical track source is consumed by existing \`CircuitDressing\` bridge signage, independent of graphics preset; segment headings include LAUNCH, SWITCHBACK, NORTH CREST, DESCENT and HOMECOMING. Section signs avoid exactly overlapping checkpoint gantries, and long labels now fit the authored canvas.
- **Real braking sightlines:** \`RaceLineGuidance\` now places a corner brake board ~85 m before an indicated bend **along the spline**, rather than subtracting 23 m from the local tangent, which could leave it off-route and was only 0.27 seconds of warning at the original 86 m/s maximum drive speed.
- **Fair stored personal best:** the substantially changed course uses \`ion-i06-nightshift-best-lap\`; earlier records under \`ion-v17-nightshift-best-lap\` and \`ion-v2-best-lap\` remain untouched and are not incorrectly compared against a different lap geometry.
- Existing Kestrel/Rift, 14 licensed Kenney CC0 GLBs, original touch/controller/keyboard Phase 01–05, driving physics, collisions, checkpoint rules, boost anti-farming, scoreboard and recovery authority remain intact.

## Executed exact-head evidence from automatic Cloudflare build

These checks are **real Node execution** of the source \`track.ts\` / \`simulation.ts\`, bundled with the existing project esbuild dependency in \`scripts/build.sh\`. They are not independent formulas copied into a spec.

Prior geometry+three-lap build: commit \`9158f813095a8cfa2f193ee2052713957bda9355\`, Cloudflare Pages **PASS**, full downloaded Cloudflare deployment logs verified:

| Gate | Actual executed result |
|---|---|
| Canonical Three.js spline closure/length | **PASS** — 1,820.8 m |
| Distinct road arm crossing | **PASS** — 0 intersections |
| Non-local arm clearance | **PASS** — 87.0 m minimum centerline distance (excluding nearby arc neighbors) |
| Road gradient | **PASS** — max sampled grade 12.4% |
| Corner radius | **PASS** — min sampled radius 34.7 m |
| Original nearestTrack and road offsets | **PASS** — 53 sampled cross-sections (center and ±7 m) |
| Physical pad and quarter-gate separation | **PASS** — three strips on high-radius sections |
| Five canonical waypoint signs | **PASS** |
| Inherited I05 physics smoke incl. forward pad crossing | **PASS** — seven source checks |
| Genuine RaceEngine scripted 3 laps | **PASS** — input-only deterministic pilot; 19,357 real 60 Hz updates |
| Scripted lap 1 | 107.77 s; sector 4 crossed |
| Scripted lap 2 | 107.41 s; sector 4 crossed |
| Scripted lap 3 | 107.41 s; sector 4 crossed |
| Scripted driving lane/impacts | max lateral 1.43 m, ~0 impacts |
| TypeScript/Vite | **PASS** — 85 modules, 3.15 s build |

The scripted pilot invokes \`RaceEngine.start()\` plus actual 60 Hz \`update()\` calls, controlling only normal steering/throttle/brake. It **does not** set \`lap\`, \`checkpoints\`, \`progress\`, \`phase='finished'\` or \`lapTimes\`, nor does it teleport, grant checkpoints or manipulate the race clock. It verifies an honest **engine-level** three-lap finish without any fake scoring. It is intentionally low speed; **not** proof that humans can comfortably race at 86–115 m/s.

The first initial I06 build correctly **FAILED** because the inherited I05 single-frame pad smoke assumed a pad at 0.16 would be crossed from 0.159 on any course. The test was repaired to drive forward over a physical multi-frame approach, never setting \`padSurge\` or artificially rewarding a pad. Subsequently the real checks and TypeScript/Vite passed. Do not erase this history or mischaracterize initial failures.

## Still required before approval

- **Actual desktop/mobile Chromium/WebGL playthrough** — screenshots, input trace, framerate and human feedback on pace, braking, apex visibility, guardrails and intersections in 16:9, ultrawide, tablet and phone portrait/landscape.
- **Physical Kestrel/Rift collision/rail clearance** — board clearance from large hulls, fast drift and side-scrape recovery with full vehicle model/asset loading.
- **Fast real driving** — 3 laps at intended driving speeds with keyboard, controller and multi-touch; verify handling at tightest corners and braking signs are useful in practice, no stranded checkpoints or camera clipping over crests.
- **Authority regression in browser** — backward pass, pads anti-farming, recovery only at last earned gate, personal-best records on correct track key, race progress and three-lap scoring, no accidental UI overlay collisions.
- **Rendered visual review** — actual sign legibility and occlusion, lighting and graphics presets, frame metrics and mobile input reach. No fabricated screenshots or made-up FPS.

Local runtime is not an authenticated executable exact-head checkout; container DNS for preview and GitHub was unavailable. Therefore the **real browser gates remain BLOCKED/NOT_TESTED**. Cloudflare preview success is build success plus genuine headless engine/scripted-drive gates only.

**Preservation:** no merges, main/production deployments, credentials, paid services, alternate track/race engine, fake user grades or personal history changes.
