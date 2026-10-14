# ION V9 — Race Continuity and Input Reliability

**Stack parent:** V8 draft PR #7, branch `feature/ion-v8-race-integrity-runtime-recovery`, exact SHA `cf39d77e2e58ed8cdf0d5539ccc9904deca8e40a`.

## Implemented in original authorities

- `src/simulation.ts`: Stable single-controller gamepad selection with explicit disconnect/reconnect transitions. New controllers are edge-armed using their currently depressed Start/Y/X/LB buttons, preventing accidental pause, restart, camera or recovery actions on reconnection. Driving input and buttons from a disappeared device no longer linger. If a previously used racing controller disappears, the existing App handler pauses an active run; reacquisition is explicit. Existing keyboard/multi-touch inputs remain independent.
- Gamepad axes and trigger input are clamped and finite-checked before reaching the original `RaceEngine`; analog stick deadzone remains continuously remapped. Browser Gamepad API permission/availability failures are handled as unavailable input.
- `src/App.tsx` and `src/styles.css`: Actionable, dismissible controller-loss and reconnect status; no invented telemetry. Existing main menu, pause recovery, pointer ownership, mobile, keyboard and gamepad actions preserved.
- `src/simulation.ts`: Each sector is awarded on physically crossing the actual source-spline gate in increasing order, not by accumulated floating-point progress alone. A complete lap still requires an actual forward start/finish-seam crossing after S1–S3; new-lap progress is initialized from the real projected position. This removes drift from accumulated travel and prevents missing a physically crossed finish due to minor numeric accumulation differences.
- A paused running race resumes with a short countdown while the established authoritative lap and elapsed clocks remain suspended. Initial countdown interruption retains its remaining start time. No second timing or scoring engine.
- `src/visuals/ChaseRig.ts`: On recovery or restart, snap the camera to the real craft even when movement is less than the previous hard-coded teleport-distance threshold; preserve source road-clearance and ongoing smoothing otherwise.
- `src/RaceStage.tsx`: DPR is strictly constrained by actual viewport pixel budget in PERFORMANCE and QUALITY modes, including 4K/8K viewports and resize. Removes the previous minimum floor that defeated the intended cap.
- `src/World.tsx`: Performance mode renders fewer original atmospheric particles, while QUALITY retains the established full density. No gameplay impact.

## Ownership and licenses

All original race mechanics remain in one `RaceEngine`; the spline and nearest projection stay in `track.ts`. No alternative progress store, state writer, racing physics authority, or fabricated lap telemetry is introduced. All 14 previously licensed and hash-verified Kenney CC0 GLBs remain intact. No new external models, audio, or textures were copied.

## Verification constraints

The requested Cloudflare branch preview checks compilation, native TypeScript and Vite bundling, asset hash verification and deployability. It **does not** prove real-browser three-lap completion, gaming-device behavior, source-GPU visual correctness, input fairness, or measured FPS. Keep V9 a draft until an actual browser/desktop/mobile playthrough accepts it. Do not merge, rewrite parent stacks, or alter `main`/`ion.thiepn.dev`.
