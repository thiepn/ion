# ION V7 — Race Recovery, Sector Timing and Visual Clarity

**Stack:** V7 child of `feature/ion-v6-arcade-handling-race-visuals`, exact original parent `f52ce58a97e5d5c249be08e5bb51659a5177cbbd` (draft PR #5). No files on the original parent, V2–V5, `main` or production have been modified.

## Player-visible functionality

- Native `RaceEngine.recover()` moves a stuck craft back to its last **actually traversed** quarter-lap checkpoint without awarding extra progress or checkpoints. It applies an explicit 5-second time penalty, 8 shield points and 25 boost energy, preserves earned laps, and enforces an 8-second gameplay cooldown. Race timing remains valid, including while the player was paused.
- Keyboard T, gamepad LB, pause-menu and on-screen touch recovery use this **one** native authority. Button disabled state reflects original engine state.
- Authored per-sector split calculations and HUD feedback derive from the actual fixed-step lap clock. A highest-scored-checkpoint bound prevents repeated forward/backward crossing from creating fake splits. Rewinding via recovery invalidates only sector splits the player has not retained.
- Last split, remaining recovery state and recovery count are rendered with the existing UI rather than a separate overlay engine.
- `RailImpactFX` uses the native wall-impact intensity/side and instanced emissive metal sparks to show true collision events. It is strictly visual.
- Original `CircuitSurfaceDetails` stamps a checkered start grid, track-center guide marks and corner-informed caution strips onto the established collision spline. These are batched geometry, not a copied asset or disconnected collision track.
- Chase camera has a dynamic nearby-road floor constraint to reduce geometry clipping while cresting the road. Does not alter racing/collision authority.
- Mobile controls retain steering, throttle, boost and braking with a compact separately placed recovery button, narrower layouts and better landscape behavior.

## Compatibility

- Reuses V2–V6 `RaceEngine`, `track.ts`, `InputController`, native owner-local records, Kestrel/Rift, native Three.js and React UI.
- All 14 Kenney CC0 GLB files remain pinned and individually verified. V7 imports **no** new third-party models, scripts, assets or sounds.
- Original V4 scene decorations, PBR rendering, V5 camera, V6 boost and gamepad, and unchanged race record-storage authority remain.

## Incomplete / acceptance

Cloudflare's essential preview build can verify TypeScript + Vite compilation, asset integrity and deployment but **not** a complete real-browser three-lap playthrough, accurate on-screen splines, touch behavior, FPS, or compatibility on target Android/desktop hardware. Maintain the PR as a draft; do not merge or promote to `ion.thiepn.dev` until manual acceptance.

No build-produced speedups, FPS, verified skill ratings, accurate aerodynamic/physical simulations or test passes beyond actual logs are claimed.
