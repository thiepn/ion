# ION V17 — Playability, Interface and Circuit Reset

**Parent:** V16 stacked draft PR #15, \`fix/ion-v16-race-timing-input-recovery\`, verified exact head \`44c30e43370cf6841f6b9f1cfa5eeafef504bd59\`. Independent V16-child development branch and stacked draft PR. No merge or production writes.

## Direct problem report, not hypothetical user research

The pilot reported: reversed left/right; cramped controls at corners; terrible buttons, font, layout; frustrating handling; boring/annoying map; ugly graphics. Treat playability as release-blocking, not as a reason to add more incidental features. Previous Cloudflare build PASS is not sufficient gameplay evidence.

## Source implementation

- **Camera-relative control direction:** \`src/simulation.ts\` changes positive right-steer intent into negative Three.js Y heading rotation. From the chase camera behind a craft pointing along +Z, projected screen-right is world -X. The previous positive heading turned the craft toward screen-left. Keyboard, gamepad and touch share the same corrected yaw in the original engine; no duplicated input layer.
- **Handling:** smoother human steering, closer chase/near camera, faster camera targeting with less excess drift and reduced high-speed FOV expansion. Braking gives tighter corner authority, while high-speed steering is less twitchy. These settings require actual driver feel testing, not merely compilation.
- **Thumb controls:** replaces two groups of small bottom-corner buttons with a width-constrained centered dual-zone control layout. Large left/right pads on the left and dedicated boost, accelerator and brake pads on the right; independent existing pointer capture and multi-pointer ownership continue. Manual earned-gate recovery sits just above the steering zone. Responsive portrait/landscape/tablet sizing and safe-area offset support; no pointer controls obscuring the entire track.
- **HUD/typography:** race information is reduced and clearly tiered; big speed digits reduced, map removed from phone cockpit, pause/audio/camera controls made readable, simple clear menu and action hierarchy. New \`src/v17.css\` mounts last to keep original authored styles recoverable. Replaces old condensed UI font families with Inter, Space Grotesk and IBM Plex Mono (system fallbacks). All buttons keep visible focus indication.
- **Actually different course:** \`src/track.ts\` is now a wider flowing, non-intersecting authored closed loop with changing radius, an east-side chicane, elevated crest, and west-side switchbacks. The existing SINGLE \`TRACK_CURVE\` still owns rendered track, collisions, sector gates, pad positions, minimap, racing line and camera. No second projection or race engine.
- **Fair personal best:** records for this materially changed course use \`ion-v17-nightshift-best-lap\`. Existing original \`ion-v2-best-lap\` entries remain untouched, accessible to the original code and historical builds; old times must not be mixed with new track records.
- **Readability improvements:** closer playable camera, lighter fog, brighter broad illumination, dark racing-surface texture, inner-lane borders and clear road/shoulder separation. Preserve Kenney CC0 assets and original visual component ownership.

## Required browser acceptance before release

1. **Steering:** From a straight grid, press RIGHT or D: craft must visibly move to screen-right; LEFT/A must move screen-left. Repeat with actual touch and controller. Confirm camera switches retain the same intuitive steering direction; release must settle without prolonged drift.
2. **Mobile portrait (320–430px):** both thumbs can reliably hold GO+LEFT/RIGHT and GO+BOOST; independently release pointer(s), rotate device, trigger pointercancel and recover. Test iPhone/Android safe-area insets and 360px width. No offscreen tap targets or overlapping race labels.
3. **Landscape/tablet:** verify all control zones reachable with two thumbs and graphics remain unobscured. Test 16:9, 20:9 and common tablet widths; verify desktop keyboard does not see touch controls unnecessarily.
4. **Original race integrity:** race 3 real laps on the new circuit, earn 1/4, 1/2, 3/4 and seam for each lap; compare sector sums and best lap. Backward/recovery/pad farming cannot create a lap or fake best. Verify no abandoned projection/stranded laps around the chicane.
5. **Course quality:** confirm actual corner geometry/racing line and corner guide signs, camera sightlines, guardrail collision behavior at fast/slow speed, pad visibility and fun factor; revise trajectory/steering only from demonstrated outcomes.
6. **Visual review:** actual desktop and mobile screenshots (start menu, straight, chicane, crest, pause, results) against V16, text legibility, sky/road separation, Kenney originals, loading/error states, font loading. Assess GPU/performance on target hardware, not guessed FPS.
7. **Audio/WebGL:** V15/V16 optional audio mute activation and rendering retries still pass, including rapid toggle and loss/recreation; real browser required.

## Verification distinctions

GitHub source-level inspection and the exact V16 parent/ref were verified. A Cloudflare Pages automatic branch preview may verify TypeScript and Vite compilation. An authentic browser runtime and network-accessible preview inside this execution environment were unavailable; no real UI screenshots, frame metrics, physical gamepad/mobile test, WebGL context loss, complete 3-lap playthrough, or human handling/fun assessment were performed. Mark those **NOT_TESTED**.

**Safeguards:** Keep old versions/branches and main unchanged. No production deployment, merges, history rewrite, credentials, private user state, fake race outcomes, new licensed assets or paid resources.
