# ION V13 — Physical Gate Guidance and Recoverable Input/Graphics

**Stacked parent:** V12 draft PR #11, `feature/ion-v12-race-gates-controller-asset-resilience`, exact SHA `9b63886252bd0ccac0908c6dd07212ea46758db6`. Independent V12-child draft. No parent branch or production writes.

## Implemented working source

- **Native race authority:** `RaceEngine` continues to own all three required quarter-checkpoints and every physical lap finish. Crossing the real finish seam while any sector remains unearned now explicitly sets the original missed-checkpoint warning, without granting a lap or rewriting lap history. Crossing the *next required* quarter gate off-road or without legal forward heading similarly explains the failure, while the player can return through it correctly or use existing penalized recovery. No fabricated checkpoint credit.
- **Source-grounded navigation:** The original `track.ts` spline length and current projected spline position now provide `distanceToGateM` and `nextGateLabel` on the existing immutable race snapshot. The HUD identifies the next required physical sector/finish and shows real along-track distance in metres. These are geometric distances, **not** made-up ETA, speed or mastery measurements. Completed sector status, recovery credit and timer remain in the one original engine.
- **Actual sector beacon state:** The 4 pairs of existing spline-placed RaceLineGuidance beacons are now driven by the zero-indexed earned checkpoint count. Start of the race correctly highlights the first, not the second, sector. No separate game state.
- **Mobile/keyboard continuity:** `TouchButton` now tracks actual pointer IDs and releases them on unmount, lost capture, pointer cancel or failed capture, avoiding stuck steering/throttle if the button disappears during a phase/UI transition. Nonprimary mouse clicks are ignored. Underlying InputController continues to own keyboard/gamepad/pointer state.
- **Controller messaging:** A controller disconnect in the garage/menu no longer incorrectly claims a live race was paused. Reconnect instructions differ between an actually paused race and other states. The existing gamepad neutral/reconnect authority remains intact.
- **Optional graphics failure:** QUALITY-mode cinematic bloom now has its own local error boundary. A failed optional post-processing effect is omitted rather than stopping otherwise usable racing physics, Kestrel/Rift, track and HUD. Previous V12 individually retryable Kenney GLB errors retain their original bounded handling. No new third-party models/shaders/rights.
- **Visual presentation:** Compact responsive next-checkpoint guidance in desktop/mobile race HUD; no screen-obscuring new full-screen UI.

## Preserved scope

V2–V12 fixed-step canonical `RaceEngine`, track spline geometry/physics, authorized lap/checkpoint progress, best-lap local persistence, both Kestrel/Rift craft, existing V11 vendor chunks and V12 resilient scenery remain intact. All 14 licensed Kenney Space Kit CC0 files remain pinned, SHA-verified at build, and unmodified. No migrations, new dependencies, racing stores, external GLBs, merges, production changes or altered parent SHA.

## Essential verification and limitations

Cloudflare Pages preview build should run existing `tsc --noEmit && vite build` and asset-hash validation. Passing compilation is **not** an actual in-browser three-lap finish, graphics acceptance, controller disconnection/mobile multi-touch test, or measured FPS. No assertion of such acceptance is made. The original game requires actual manual/interactive device playthrough before production promotion.
