# ION / Improvement Phase 01 — Source-Qualified Playability Baseline

## Source identity and environment

- Verified parent: draft PR #16, `feature/ion-v17-playability-ui-circuit-reset` at exact `9ab0d64b98e804421cf5c95d9c79043592845355`.
- Separate development branch: `fix/ion-i01-playability-source-baseline`.
- Local runtime capabilities: Chromium, Node.js and Playwright executable are installed.
- **Blocking problem:** the container cannot resolve `github.com` and does not contain the exact game checkout, dependencies or built assets. The public Cloudflare preview was also inaccessible to the available network fetcher. No faithful gameplay URL can be loaded in local Chromium. Do not claim genuine screenshot, full race, real-device controls, FPS or WebGL result from source review.
- GitHub connector was able to read the exact parent original source and write targeted repairs. An automatic Cloudflare Pages branch-preview result, when successful, qualifies **compile/deploy**, not gameplay acceptance.

## Priority baseline findings from original source

| Severity | Area | Source-grounded observation | Change or release requirement |
|---|---|---|---|
| P0 | Keyboard focus | `InputController.onKeyDown` previously returned on *any* focused button except Escape. Clicking SOUND or CAMERA while racing leaves that button focused and WASD/arrows/Space silently stop driving. | Repair in original input controller, wire `isRaceActive` from canonical `RaceEngine.phase`, keep menu Space/Enter native. Browser acceptance still required. |
| P0 | Collisions | The visual rail begins `12.72m` from the center, while the canonical collision boundary was `11.5m`, allowing the authored Kestrel wing envelope (`3.86m` from center) to penetrate the visual rail by about `2.64m` before physical resolution. | Adjust collision center boundary to `8.85m` (wing edge `12.71m`, approximately aligned with visible inner rail). Confirm actual RIFT/Kestrel geometry and turning collisions in browser. |
| P0 | Mobile thumbs | V17 portrait at 320px viewport created narrow steering buttons (~61px); GO and BRAKE were each ~55px tall. The portrait `max-height:660px` override reduced them to ~44px; landscape `max-height:540px` similarly stacked GO/BRAKE in a 94px panel. | Make steering group wider in portrait, increase thumb-zone height to at least 139px, and arrange landscape boost/GO/BRAKE horizontally at 88px height. Browser hit-target overlay and two-finger acceptance required. |
| P1 | Track | V17 changed to 24 authored control points but first-drive experience/line of sight has not been tested. Polygon length of control vertices is approximately 1,273m (not spline arc-length). The largest raw vertex direction bend is about 46°. These are geometry-source measurements, **not** driving-quality claims. | Full physical three-lap trace, checkpoints, projection recovery and surface/collision audits; do not add more circuits until gate passes. |
| P1 | Visuals | HUD, typography, world lighting, procedural asphalt and 3D scene source can be inspected, but no pixel-accurate rendered screenshot can be captured. | Compare genuine desktop/mobile menu, driving, turns, finish, pause, garage, quality presets. No source-only VISUAL_PASS. |
| P1 | Handling | Input filtering, auto-alignment, brake-steering and chase camera have already changed in V17; no input-to-motion latency or human-feel measurements exist. | Keyboard/gamepad/touch straight-line and corner-entry playthroughs at target hardware refresh rates. |
| P1 | Rendering | Quality preset, geometry instancing, React Three Fiber and asset boundaries are present; no real FPS, shader warmup, draw call or context-loss measurements were obtained. | Measure frame times on actual desktop and midrange mobile; WebGL loss/retry, no missing CC0 assets. |

## Changes made in Phase 01

1. `src/simulation.ts` — align craft center collision boundary with visible rail after accounting for the **original Kestrel wing width**. Preserves original projector, collision authority, checkpoint, score, penalty and recovery engines.
2. `src/v17.css` — prevent narrow portrait and short landscape primary touch controls from collapsing. Center steering + drive zones remain intact; preserve multi-pointer semantics and visual style.
3. `src/simulation.ts` and `src/App.tsx` — keep gameplay keyboard input working when clicking a race HUD button and retain correct native menu button activation. Maintain one authority for race state, with no new store or grader.

## Explicit executable acceptance matrix — not yet executed

- **Desktop Chromium 1366×768 and 1920×1080**: confirm START, visible player and track, camera, keyboard W/arrow/R/L, sound focus, no unexpected restart after Space; precise screenshots, console and frame timing.
- **Mobile portrait 320×568, 360×800, 390×844, 430×932**: screenshot touch hitboxes; no button below 64px intended height/width (except disabled optional recovery); hold LEFT+GO and RIGHT+BOOST simultaneously, release/cancel independently, rotate and resume without stuck controls.
- **Mobile landscape 667×375, 812×375, 932×430**: all five primary touch buttons are reachable without obstructing the driving line; test min hitbox ≥64px.
- **Real track and race**: three forward laps, exactly three sector credits and one forward seam per lap, lap times/sector sums, honest best record, manual checkpoint recovery, pad anti-farming, shield/rail collision without deep model penetration or projection jump.
- **Camera/control**: visible right input moves the craft to the right of the chase screen, left moves left, no input inversions after restart/recovery/camera change; gamepad trigger/stick and neutral-reconnect.
- **Visuals/performance**: actual screenshots (menu, straight, turn, crest, garage, pause, finish) and objective GPU frame-time distribution; PERFORMANCE and QUALITY presets; WebGL context loss; missing licensed models.
- **Audio**: starts muted, click to enable, rapid ON/OFF, focus loss, no phantom sound.

## Quality status vocabulary

- **PASS** only on actual command/browser execution or authenticated check for the exact head and exact scope stated.
- **FAIL** on demonstrated defect, not impression alone.
- **BLOCKED / NOT_TESTED** for the inaccessible browser/runtime and every human-dependent gameplay judgement.
- The repairs above are **implemented source changes**, not verified playable fixes. Before approving release, obtain exact-head full checkout or authenticated cloud browser access and perform the matrix.

No merges, production deployments, credential/paid resource usage, history/ID rewrites or changes to Kenney CC0 asset set or historical branches.