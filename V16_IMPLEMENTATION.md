# ION V16 — Source-Backed Racing Repairs and Browser Acceptance Gate

**Stacked parent:** V15 [draft PR #14](https://github.com/thiepn/ion/pull/14), `feature/ion-v15-optional-race-audio-cues`, exact verified parent head `9e113954be0d7ccc564332ebe940dc228361d455`.

**Child:** `fix/ion-v16-race-timing-input-recovery`, separate V15-child draft PR. No writes to main, production, or previous stacked branch refs.

## Repairs implemented in the original code

1. **Real checkpoint-recovery timing.** `RaceEngine.recover()` now retains the timestamp of the last **earned** gate as the pending sector origin. The prior code reset `sectorStartTime` to the lap clock before applying the +5 second recovery penalty, losing all elapsed time since the last earned gate and the penalty from sector splits. The original `elapsed` and `lapTime` authorities are unchanged, and the official split sum can now reconcile to completed lap time after recovery. This is not a fabricated lap result.
2. **No empty-boost stutter.** A held and depleted boost trigger no longer alternates a regeneration frame with a boost frame every 60 Hz. Source-authoritative regeneration resumes after releasing boost or throttle; genuine pad rewards can still refill an empty boost pool.
3. **Physical lap position display.** The HUD/minimap `snapshot.progress` now represents actual track projection `previousT` within [0, 1), not a potentially accumulated engine distance exceeding 100% on a missed/invalid finish. The original distance authority used to prevent boost-pad farming remains engine-private.
4. **Actual boost-pad center crossing.** A boost-pad reward is now earned only by a valid forward spline crossing of its physical source center (`0.16/0.48/0.80`), within both before/after lateral lanes and with a forward-heading check. Merely entering the former wide zone or backing into it does not count. Keep the original pad IDs, fuel (+24), speed (+16, capped at 112), surge duration, occupancy and anti-farming distance authority.
5. **Rapid audio-toggle cancellation.** Prevent a delayed `AudioContext.resume()` from reenabling the synthesized engine after the player requested mute or the component disposed. The original button uses an intention/version token, and `RaceAudio` invalidates superseded async activations. No new persistence, external samples or fake cue events.
6. **Pilot instructions.** State the actual need to release an exhausted boost trigger to recharge. Source engine, records, licensed assets and visual design are otherwise preserved.

## Release acceptance to perform in an executable browser

These are **acceptance scenarios**, not completed test claims:

- **Desktop Chromium, 3 laps:** accelerate, steer through all three earned quarter-gates each lap, physically cross the finish line three times. Verify 3 official recorded lap times, total time and personal best; reverse-seam/skip-sector traversal must never grant a lap or best.
- **Recovery accounting:** after earning S1 and then spending time in S2, recover. Confirm +5 seconds to both race/lap clocks and verify the completed lap's four sector times sum (within rounded display precision) to the recorded lap time; the re-earned last gate must not be fabricated.
- **Pad and boost:** cross orange strip center on road and note one speed surge and +24 pool cap; reverse/re-enter without net forward distance to verify no farm; deplete boost while holding boost and verify no alternating free acceleration. Release boost and verify normal recharge.
- **Desktop keyboard, mobile touch, physical gamepad:** test keyboard shortcuts, two simultaneous touch pointers, pointercancel, gamepad neutral handshake and controller disconnect/reconnect with held Start; no ghost throttle, action repeats or unrequested restart.
- **Audio lifecycle:** audio starts off, real click activates, rapidly tap ON/OFF/ON, pause, background/foreground, mute while `resume()` is pending, unmount/renderer retry; ensure last user intent wins and no phantom cues or auto-activation.
- **Graphics:** independently induce WebGL context loss and restore; observe source race pause and renderer retries; compare real screenshots, frame times and device pixel density in PERFORMANCE/QUALITY desktop and mobile.

## Verification caveat

The connected GitHub source and the exact parent/branch were read. A working native checkout with the application's installed Three.js/React dependency graph and network access to its Cloudflare preview was not available in the container. Chromium is installed but cannot access the remote preview; therefore **interactive browser, real audio, full three-lap race, touch, physical gamepad, induced WebGL loss and FPS measurements are NOT_TESTED** here. Automatic Cloudflare branch-preview compilation may separately qualify TypeScript/Vite and assets; a successful preview build is not interactive browser acceptance.

No CI manually triggered, no merges, paid services, credentials, unlicensed models, database migrations, main writes, or production deployments.
