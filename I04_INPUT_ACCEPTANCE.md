# ION Improvement Phase 04 — Keyboard & Gamepad Consistency

**Exact verified parent:** Phase 03 draft PR #19 `fix/ion-i03-mobile-thumb-control-ownership`, `cfed76fd7238e9d2d5e98b89059d7c7e63675929`.

**Child:** `fix/ion-i04-keyboard-gamepad-input-coherence`. Original `InputController`, `RaceEngine` and native UI remain authoritative. No second engine, duplicate state store or score modification.

## Actual source-level problems repaired

1. **Digital keys always defeated analog steering.** Original `get()` selected `steer=Math.abs(padSteer)>Math.abs(steer)?padSteer:steer`. Holding a full-strength keyboard direction (`|steer|=1`) prevented every analog controller correction from changing steering. Now, if standard gamepad D-pad is engaged, or filtered analog stick magnitude is over `0.08`, controller steering takes precedence. Otherwise keyboard/touch steering remains usable. Right stick direction retains the existing V17 screen-relative sign through the canonical `RaceEngine`.
2. **Trigger drift and inconsistent analog precision.** Previously all nonzero triggers were combined directly with keyboard/touch acceleration/braking. Now L2/R2 use an `0.08` noise deadzone with the remainder of the range remapped smoothly to `0..1`; digital face-button throttle/brake still works. The stick deadzone remains radial per standard horizontal axis, but can be set to **10%, 15% (default), 20%, or 25%** through both paused race options and the existing Controls manual. The selected value is stored locally under `ion-i04-stick-deadzone`, constrained to `0.08..0.28`, and is respected by both analog steering and controller reconnect neutral validation.
3. **False controller ownership from keyboard/touch BOOST.** The controller-used flag was assigned after merging `boost=boost||gamepadBoost`, so pressing **keyboard Space** with a connected but unused gamepad marked the pad as actively driving; unplugging it could pause keyboard play. Only actual gamepad steering, trigger, button or gamepad action may now mark controller ownership.
4. **Stale ownership across races.** `clear()` previously reset keyboard/touch input but retained the gamepad-used flag from a previous race. Releasing a controller that had been used in a previous run could pause a later keyboard race. `clear()` now resets ownership and explicitly requires a neutral gamepad handshake again before use.
5. **Uncleared input on actual disconnect.** The existing app disconnected-controller handler paused the race but did not explicitly clear all held keyboard/touch/gamepad input. It now calls the canonical `input.clear()` first, preserving reconnect-neutral behavior and the existing pause/report path.
6. **Browser modifier shortcuts were intercepted before checking modifiers.** The original keyboard handler called `preventDefault` on arrows and Space before checking Ctrl/Alt/Meta. Modifier combinations no longer suppress browser shortcuts and are not treated as racing controls.

## Playability and authority preserved

- Single `InputController.get()` and original `RaceEngine.update()` are still the only input and race authorities.
- Original 3-lap sector gates, win conditions, recovery penalties, original score and best-lap key, Kestrel/Rift, camera modes, native gamepad Start/Y/X/LB action edges, touch zone pointer capture and Phase 01–03 fixes are unchanged.
- No new online service, paid asset, authentication, migration or player telemetry. The only new local preference is the optional stick deadzone; no personal racing data is sent elsewhere.

## Exact acceptance to execute with a real browser and physical controller

1. Keyboard steering after clicking AUDIO/CAMERA, paused/resumed, menus, focus blur, modifiers Ctrl/Alt/Meta + arrows/Space. No stuck throttle/boost after focus loss.
2. Standard Gamepad axis[0] directional correctness in both camera modes. Verify 10/15/20/25% deadzone settings with jittered and deliberate analog movements, stored choice surviving refresh.
3. **Conflict:** hold keyboard A while pushing analog right: deliberate analog should command right. Release the stick: keyboard should command left again. D-pad 14/15 explicitly overrides the stick while held.
4. **Triggers:** just-under-8% rest noise should be neutral; 25/50/100% pressure should smoothly accelerate/brake, including with keyboard/touch input active.
5. **Reconnect:** attach with held left stick, D-pad, gas, brake, boost, Start; no phantom actions until a neutral handshake and a subsequent deliberate input. Disconnect **never-used** controller during keyboard Space: must NOT pause. Disconnect actually-used controller during race: pause and clear controls. Restart a keyboard race after a previous controller race: stale ownership must not pause.
6. Keyboard actions: P/Escape pause, R reset, V camera, T earned-sector recovery. Gamepad Start/Y/X/LB mirrored correctly; no duplicate edges on held actions.
7. Finish three genuine laps with keyboard and controller, including earned quarter gates, stored best lap, boost pad, rail collision, checkpoint recovery and full direction continuity. Test actual mobile dual-thumb controls remain unaffected.
8. Capture genuine Chromium desktop/mobile screenshots, event traces, console errors, actual mobile/physical controller interaction, WebGL restart and frame times.

## Verification and release gates

Authenticated GitHub exact parent, new branch, source changes, and exact SHA verification may be reported as **PASS** when observed. The project's Cloudflare Pages automatic preview qualifies **build/deploy only** if final-head status reports completed success.

The local tool environment has Node and Chromium, but **no mounted exact-head ION checkout**, and DNS lookup for GitHub/Cloudflare preview fails. Genuine playable Chromium/browser acceptance, device input, controller behavior, screenshots, frame times, WebGL and full 3-lap results are therefore **BLOCKED / NOT_TESTED**, never PASS based only on source inspection or preview build.

Preserve parent, historical PR stack, `main`, live `ion.thiepn.dev`, licensed 14 Kenney CC0 GLBs, owner-only local records, all original racing authorities. No manual deployments, merges, credentials, paid resources or broad CI.
