# ION V10 — Race Crossing Fidelity and Runtime Continuity

**Stacked on:** V9 draft PR #8, branch `feature/ion-v9-race-continuity-input-reliability`, exact head `35b77aee74d95b6b8ff9e3f90b5de026cd9c3c87`.

## Implemented

- `src/simulation.ts`: The single existing `RaceEngine` now awards each of the three physical source-spline quarter gates only when the craft is on the road and heading substantially forward. Split timing interpolates the crossing position within the original fixed 60 Hz step. The third lap completes only on a real forward, on-road start/finish crossing, with the fractional terminal step removed from total time. The remainder of intermediate lap-crossing steps is carried into the next lap instead of being lost or counted twice. The existing recovery penalties and lap/checkpoint authority are preserved.
- `src/main.tsx`: The heavy race App is now lazy-loaded behind a small accessible first-paint shell. The app, engine and track code no longer live in the static application entrypoint; the WebGL `RaceStage` remains independently lazy-loaded.
- `src/World.tsx`: The 24 distant procedural monoliths now share one colored instanced draw batch instead of individually allocated meshes and materials. The original geometry positions, colors and visual intent remain.
- `src/App.tsx`: System window blur safely releases driving inputs and pauses an active race, even when `visibilitychange` has not fired. Hidden-tab, gamepad and renderer interruption paths remain, with no automatic unrequested resume. Finished-race copy accurately explains that the best lap (not necessarily every full run) is saved locally.
- `src/visuals/ChaseRig.ts`: Avoids unnecessary camera projection recomputations when speed-related FOV changes are visually insignificant, while retaining smooth acceleration, boost and reduced-motion camera behavior.
- `src/styles.css`: Small responsive application initialization screen, separate from the 3D scene-loading state.

## Source and rights boundaries

The original authoritative `RaceEngine`, original `track.ts` source spline, existing React UI, race timer, checkpoint/lap/personal best data and all V2–V9 controls, effects and craft assets are reused. There is **no** new race-scoring authority, no additional persistent store and no external model, asset, sound or proprietary game code. The previous 14 pinned/hash-verified Kenney CC0 GLBs and license manifest are retained.

## Verification and limitations

The requested focused verification is an essential Cloudflare preview TypeScript/Vite build and asset hash validation only. Build or deployment success **does not** prove a complete browser three-lap run, camera behavior on a real GPU, mobile multi-touch, actual measured FPS, physical race fairness or startup time on target devices. Keep this stacked PR in draft until those behaviors receive interactive acceptance.

Do not change previous branches, `main`, merges, production settings, or `ion.thiepn.dev`.
