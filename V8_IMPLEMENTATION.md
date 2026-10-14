# ION V8 — Race Integrity and Runtime Implementation

Exact parent: `93d73b7a11c5ca55778ce6d13ad18ffd34227ee0` on `feature/ion-v7-circuit-playability-visual-recovery` (stacked draft PR #6). This is an independent V8 child branch. None of the previous branches or production targets were modified.

## Working source

- `src/simulation.ts`: Race completion requires actually crossing the source track's start/finish seam **forwards** after earning the three sequential sector gates; accumulated progress alone cannot finish a lap. Rejects implausible projection jumps, uses the original track length for bounded physical movement and preserves existing source race-state. Reverse-forward repetition cannot duplicate sector splits. One continuous rail scrape counts as one impact until separation, rather than consuming shield repeatedly every cooldown. After a completed race, no later pad bonus is processed.
- `src/simulation.ts` / `src/App.tsx`: Keyboard and touch presses have independent ownership; simultaneous multi-touch pointer IDs remain held independently, and release/blur/visibility loss/return-to-menu clears the correct controls. Analog gamepad steering now applies a continuous deadzone. Existing gamepad and keyboard recovery/pause mapping are retained.
- `src/simulation.ts`: Recovery uses the last **earned** checkpoint, not a floating progress guess, and the five-second recovery penalty contributes to the real active sector split as well as total lap time. No secondary lap-scoring engine.
- `src/visuals/ChaseRig.ts`: Large craft teleport or track recovery snaps the chase-camera pose to the returned craft, rather than animating a long trip through geometry. Road-clearance and optional orbit controls remain unchanged.
- `src/RaceStage.tsx`: Resizes WebGL rendering pixel ratio against a measurable viewport pixel budget (2.2M/1.1M pixels for QUALITY/PERFORMANCE as implementation targets, **not measured frame rates**). Handles orientation/viewport resize and retains the user's graphics setting.
- `src/visuals/Rendering.tsx`, `src/World.tsx`: Lower-resolution original roadway textures in PERFORMANCE, scaled authoring details, responsible disposal and an untextured PBR fallback when the 2D canvas texture context is unavailable. No licensing changes to the existing 14 pinned Kenney CC0 assets.
- `src/styles.css`: Practical multi-touch driving controls for coarse-pointer tablets and convertibles, not only narrow mobile screens; retain established landscape layout and disabled recovery styling.

## Boundaries and incomplete work

This is independent source work and focused deployment compilation. A successful Cloudflare Pages branch preview verifies actual GitHub source, TypeScript/Vite compilation and asset hash checks. It does **not** prove a full real-browser three-lap race, mobile FPS, touch devices, collision fairness or rendered PBR quality. Keep V8 draft/unmerged until interactive player acceptance. Do not merge, deploy to `ion.thiepn.dev` or rewrite parent branches.
