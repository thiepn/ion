# ION V14 — Boost-Pad Speed Continuity and Scoped WebGL Recovery

**Stacked parent:** V13 draft PR #12 `feature/ion-v13-lap-gates-rescue-webgl-controls`, exact verified head `7b4fde6860d2b8d5b00b76bb80c5ec50b28d290b`. Separate V13-child development branch and draft PR; no writes to prior refs.

## Actual playable functionality

- **Canonical arcade physics:** The original `RaceEngine` owns a brief boost-pad surge (0.9 seconds) triggered only by a genuinely earned original orange pad. Prior V13 code set speed as high as 112 but clamped it immediately to the nonboost 86-unit ceiling the next 60 Hz frame. V14 retains the surge temporarily and sheds excess speed progressively after the pad expires, using source-authoritative drag and an overspeed resistance. The original sustained normal/active-boost targets remain 86/115 units and the pad grants at most 112 units. No additional simulated physics system, fake speed record or source outcome.
- **Gameplay economy continuity:** Recovery, reset and race restart correctly clear the short surge. Countdown/paused race suspends its countdown together with the one authoritative physics clock. Previously earned boost-pad rewards and anti-farming distance checks remain unchanged. The existing fixed-step engine remains the sole owner of speed, boost pool, shield, lap/sector timing, off-road collision and saved best lap.
- **Immediate driver feedback:** V14 shows `BOOST PAD SURGE` separately from manual `BOOST ACTIVE` or normal drive. The established instanced magnetic boost exhaust now visually reflects **either** actual boost or the source engine's temporary pad surge, reusing original authored artwork and quality tiers.
- **Renderer continuity:** `GraphicsContextObserver` now attaches a single context-loss listener to the *actual currently mounted* React Three Fiber WebGL canvas using an effect with cleanup, instead of leaving an unmanaged listener in the Canvas creation callback. A lost WebGL context still pauses the original race through the existing UI recovery authority. Removed canvases can no longer send obsolete context-loss notifications for later successfully remounted renderers.
- **Player-first recovery remains:** V2–V13 original three-lap start-line and sequential quarter-gate authority, measured sector splits, source-spline navigation, missed-checkpoint messages, manual last-earned-gate rescue, fair collision handling, neutral-required gamepad/multi-touch, and optional licensed GLB fallbacks remain intact.

## Assets and constraints

No new assets, shaders, model dependencies, external physics, telemetry or database schemas. Reuse the existing 14 pinned, SHA-validated Kenney Space Kit CC0 GLBs, original Kestrel/Rift craft, React UI, R3F rendering and owner-local personal best. Keep `main`, V2–V13 branch heads, previous PRs and `ion.thiepn.dev` unchanged; no merge or production deployment.

## Essential validation and limitations

The Cloudflare Pages preview automatically compiles TypeScript and Vite and validates CC0 source hashes. A successful compilation is **not** a verified three-lap browser playthrough, mobile multi-touch acceptance, physical gamepad reliability, actual WebGL context-loss test, visual regression review or FPS measurement. Those require separate interactive acceptance before release.
