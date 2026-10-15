# ION Improvement Phase 15 — Nightshift Environmental Identity & Light

**Exact verified parent:** Phase 14 draft PR #30 `fix/ion-i14-authentic-craft-showcase-materials`, commit `63440f124e73aa5c34361fb1569e27460c491c3e`.
**Independent stacked child:** `fix/ion-i15-nightshift-environment-identity`. No merge, production deployment, migrations, credentials or paid services.

## Original-source environment improvements

1. **Real section identities; no new course authority.** Added `src/visuals/sectionPalette.ts` with five restrained environmental palettes (launch cyan-teal, switchback industrial amber, north crest pale blue, descent warm rust, homecoming green-teal) derived **only** from the five existing `CIRCUIT_SECTIONS` and their original lap fractions. A cyclic nearest-authoritative-section mapper preserves forward section order around the actual closed Nightshift spline. Visual colors never modify the canonical `track.ts`, RaceEngine, grading, scoring, collision or IDs.
2. **Road/deck lighting no longer uniformly cyan.** The original `TrackInfrastructure` reuses existing `BakedInstances` and geometry matrices but applies per-instance segment colors for shoulder/road guide strips, directionals and elevated canopy light bars. Both QUALITY and PERFORMANCE still use their original bounded counts and a single renderer; no new shader, GPU animation loop or separate light manager.
3. **Coherent named gantries and skyline.** The five existing `CircuitDressing.SignalBridge` panels/edge lamps now display their actual associated section accent without changing their names or hinted driving advice. The original barrier post band instance meshes reflect the local palette. Original cooling towers use the correct nearby section rather than arbitrary array-index alternating colors. QUALITY alone enables up to five localized short-range bridge point lights; PERFORMANCE relies on emissive materials rather than adding GPU lighting work.
4. **Industrial Kenney districts keep their original licensed models.** Existing service platforms now pick structural/edge colors from the original source t. Five representative original GLB placement indices `[0,6,11,15,20]` act as distinctive section anchors on both QUALITY/PERFORMANCE, with small original Three.js marker masts outside the racing road. QUALITY still renders the full existing district placement list; PERFORMANCE shows the five real anchor landmarks and some unchanged additional placements, not a fabricated city asset. All 14 hash-pinned Kenney CC0 GLBs remain unchanged, including the Phase 14 Rift source/paint work.
5. **Distant continuity.** Existing `IndustrialHorizon.RadioMasts` now adds exactly five spline-linked relay towers to its native instanced meshes, beyond the original guardrail and outside the road; source section colors identify distant locations in the same sequence as the on-track signs. Original background mast instances, atmospheric sky, quality limits and geometry remain.
6. **Three physical boost pads visible before reaching them.** Original `World.CircuitDetails` previously rendered only three short road strips for each of the genuine `BOOST_PAD_T` locations. The pads are now obvious warm lane bands with source-positioned approach bars **48, 30 and 14 meters ahead**, and small roadside identifiers physically **outside** the canonical inner guardrail. The original engine still awards boost exactly at `BOOST_PAD_T=[.16,.43,.80]` and only after its prior valid physical traversal checks; no new input, boost, collision or score logic.
7. **Surface finish and contrast.** The original procedurally generated `Rendering.tsx` road textures gain subtle deterministic service-panel fastener marks (no imported textures). Continuous physical guardrail caps/edge lighting are slightly more subdued cyan so the source-colored section cues and warm pad warnings are visible without overwhelming the forward view; rail positions and physical envelope stay identical.

## Real exact-source qualifications

`scripts/i15-environment-smoke.mjs` runs in the existing native `scripts/build.sh` **after I05–I14 full source-engine regressions**. It bundles actual `src/track.ts` and `sectionPalette.ts` with installed Three.js and checks:

- all five original named section centers and five unique valid lighting palettes;
- spline section identity transitions exactly once in forward order: SWITCHBACK → NORTH CREST → DESCENT → HOMECOMING → LAUNCH;
- all **three original boost pads** and their 48/30/14 meter preceding markers, near-seam wrap correctness, real finite track elevation and **minimum 4.62 m of lateral clearance** from visual lane edge to original inner guardrail;
- roadside pad supports are outside the original rail offset; no new boost-pad IDs or collision geometry;
- original quality-bounded source-light/instance and source-colored gantry/skyline/industrial placement contracts;
- five skyline identities placed over 100 m outside the original drivable road; five representative original Kenney section landmarks remain in both graphics presets;
- the unchanged **14** hashed CC0 GLB identities and immutable upstream revision `2c8950b716e6765930b2b51409c59adf3d66fd5c`.

**Executed intermediate code-head evidence:** Cloudflare automatic build for `815467b1fbb028a1dca65347df4aa93a611aa758` completed successfully, running six I15 environment checks and all inherited I05–I14 tests, followed by TypeScript/Vite (4.33 s). A later change added original `IndustrialHorizon` sky-relay instances and a corresponding seventh I15 qualification at `6f6b08ac4bb8089fa34df8cf99173a67d11fdb72`. Those newer commits and this report-only commit require separate exact-head verification. Never infer a PASS from an earlier SHA.

## Mandatory outstanding release acceptance

- Actual desktop and mobile **Chromium/WebGL screenshots** at canonical start, boost positions, all five sections, day/night atmospheric gradients, road and rail materials, and both QUALITY/PERFORMANCE; compare performance/FPS, instanced-color visibility and route sightlines.
- Physically drive real keyboard/gamepad and two-thumb controls through all three earned pads and three scored laps at race speed; verify physical distance/color clarity at speed, rear camera, wall collision fairness, guardrail and section-sign visibility.
- Visual acceptance of Kenney model instancing, original GLB fallback, kiosk/phone/tiny landscape frustum, material readability, GPU point-light cost, fog/contrast on moving background and reduce-motion settings.
- Neither Node-executed geometry tests nor successful Cloudflare branch-preview builds prove real pixel quality, scene brightness, mobile/WebGL performance or human fun. Chromium exists in the runtime, but **no complete exact-head authenticated ION checkout** is mounted and hosted previews do not resolve from its network. Genuine browser screenshots and physical controls remain **BLOCKED/NOT_TESTED**.

## Preservation

No edits to the single original RaceEngine, track spline/sector/boost scoring/three-lap authority, 1,820.8 m Nightshift course, original Kestrel/Rift, Phase I01–I14 controls/PB/clean-lap/garage, licensed Kenney source, earlier stacked PRs, `main` or production. All changes are original-source environment/readability work. Only existing automatic Cloudflare Pages branch preview builds are used.
