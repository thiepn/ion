# ION V11 — Race Guidance, Controller Neutrality, Asset Failover & Chunk Recovery

**Exact stacked parent:** `feature/ion-v10-race-finish-controls-runtime` at `8e0022b4379d13d2435e746ebcb6ad06f4cec1a3` (draft PR #9). V11 is a separate child branch and draft PR. No main or previous-branch edits.

## Working learner/player features

- **Single authoritative RaceEngine:** Debounced actual wrong-way detection derived from speed, current projected track tangent and actual heading; no invented race result. Detects forward crossings of later sector gates when required earlier checkpoints remain unearned. HUD shows explicit return-to-gate or recovery guidance, not silent lap failure. Properly resets warnings following valid progress, recovery or new lap.
- **Fair impact:** A 0.18-second true separation from a guardrail is required before a renewed rail entry can register another shield impact; one-frame spline jitter cannot multiply damage. No change to underlying shield/best-lap ownership.
- **InputController:** On blur, pause, menu, controller loss and reconnection, gamepad driving stays neutral-locked until the stick, throttle, brakes and boost are physically released. Existing keyboard/multi-touch commands still function. Escape from focused UI buttons remains available to pause/resume.
- **Rift and scenery fallbacks:** A new local `AssetBoundary` safely catches individual GLB load errors. Decorative failed models are omitted while the remaining environment/race stays active. A failed licensed Rift GLB falls back to the existing self-authored Kestrel geometry, preserving gameplay and controls. Build-time CC0 integrity validation remains mandatory for the 14 genuine Kenney files.
- **WebGL recovery:** The existing retry and PERFORMANCE switch are retained, with an additional explicit full app reload action for failures which a renderer remount cannot correct (such as a cached rejected dynamic import).
- **Rendering:** Window and lamp instanced geometry now computes bounding spheres and supports normal frustum culling. The source Vite build isolates reusable Three.js, post-processing, React and R3F dependency bundles from original ION app code to improve caching and reduce the oversized monolithic application chunk. This is a bundling change, not a claim of measured FPS gains.
- **Preserves all authority:** V2–V10 `RaceEngine`, native 480-segment course spline, fixed-step simulation, three physical lap crossings, recovery penalties, garage/vehicles, UI, original PBR, owner-local best lap, and 14 provenance-verified Kenney CC0 GLBs. No additional racing store, graphics engine, media asset or dependency.

## Verification and limitations

Only the Cloudflare Pages preview compilation/asset integrity/build and minimal focused checks were requested. Successful build verifies TypeScript output and static deployment, **not** a real three-lap browser playthrough, mobile touch handling, actual GPU frames, real physical controller reconnection, or graphics aesthetics. Review interactive playability before any merge. Keep `main`, `ion.thiepn.dev`, V2–V10 PR stack, credentials, deployments to production and paid resources untouched.
