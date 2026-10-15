# ION Improvement Phase 02 — Native Steering and Control Consistency

**Stack:** P01 draft PR #17 `fix/ion-i01-playability-source-baseline`, source-verified head `1dabb964915ac2f893deaaf4669c71ad96712811`. Separate child `fix/ion-i02-steering-motion-and-thumb-transfer`. No modification to the parent ref, main or production.

## Source-backed defects and original-code implementation

### 1. Unnatural stationary turning and opposite banking (original `src/simulation.ts`)

The V17 `RaceEngine.update` integrated **nonzero steering yaw while speed was zero**:
`steeringRate=(.70+speedFactor*.92)*brakeFactor`.
The heading could change while a nonmoving hovercraft was held at the grid or against a rail. This is a deterministic source fact, not an impression from browser playtesting.

V17 simultaneously used `bank=-this.steering*speedFactor*...`. The original Kestrel and Rift face along local +Z; with the chase camera behind and the V17 corrected right input applying *negative* Y yaw, the screen-right side is local -X. Its negative roll banks the opposite wing down from the expected turn direction.

I02 implements velocity-coupled yaw authority `(.40+speedFactor*1.20)*min(1,speed/6)` with the existing brake-turn multiplier (rebalanced to 1.35). It stays **zero when stationary**, permits turns at low speeds and preserves right input = negative yaw and left input = positive yaw. Positive roll now lowers the correct visual wing on right turns. No duplicate physics authority or second vehicle.

### 2. Sliding touch-steer gesture would stay locked to old direction (original `src/App.tsx`)

`TouchButton` captured a pointer, stored its `pointerId` against the button's initial `code`, and ignored `pointermove`. Sliding a thumb from LEFT to RIGHT without lifting would continue to hold LEFT because the first button retained pointer capture. This is a source-proven input defect; whether the resulting controls are comfortable is still a real-device question.

I02 tracks each active pointer's **currently held** action in a map. For left/right steering only, pointer moves across the existing parent steering zone transfer authority from ArrowLeft to ArrowRight or vice versa **without lifting**. Leaving the zone by more than 12 px releases steering; returning permits rearming. PointerUp, PointerCancel, LostPointerCapture and unmount all release whichever action is currently held. Existing `InputController.press/release(code,pointerId)` remains sole owner; independent GO/BOOST/BRAKE touches remain unchanged. Keyboard and gamepad semantics unchanged.

### 3. Gamepad D-pad ignored and reconnect not disarmed for held D-pad (`src/simulation.ts`)

The original standardized left-stick path read `axes[0]` with a .15 dead zone but not standard D-pad buttons 14/15. D-pad steering requests were entirely ignored. The reconnect neutral handshake likewise excluded 14/15.

I02 maps standard D-pad left/right to the **same** original steering value as the dead-zoned analog stick when a D-pad direction is pressed. It includes D-pad buttons in the reconnect neutral handshake so a controller reconnecting with a direction held cannot immediately take steering authority. Existing stick, keyboard, touch, trigger and gamepad action edge protections are retained.

## Required exact-head acceptance — not yet executed

1. **Actual desktop Chromium, both cameras:** start race, verify LEFT/A moves to screen-left and RIGHT/D to screen-right while accelerating; from rest, holding left/right without throttle must not yaw or shift the craft. Repeat after pause and recovery. Compare steering response at 10/40/80 km/h, braking, deliberate opposite steering and mid-turn release; inspect orientation/roll (bank inward).
2. **Touch Android Chrome and iOS WebKit:** hold GO, initiate steering LEFT, slide the same finger to RIGHT and back without releasing GO; verify live physical direction and release on exit/cancel; simulate simultaneous two-finger steer+BOOST and independent pointer IDs. Test actual portrait 320/360/390/430 px, landscape 667/812/932 px, short viewport, safe areas and rotation.
3. **Actual controller:** check analog axis low/high travel and dead zone, D-pad 14/15, keyboard+controller conflicts, Start/Y/X/LB actions, disconnect/reconnect while left/right held, Start held, neutral re-arming, no unintended pause/restart.
4. **Racing integrity:** finish three physical laps, all 3 forward quarter sectors and each finish seam. Confirm records, 5-second recovery, boost pad credit, collision against actual Kestrel/Rift rail envelope, projection continuity and proper resets.
5. **Visual/runtime/performance:** real screenshots of menu/HUD/straight/turn/garage/pause/finish at desktop and mobile breakpoints; frame timings and device metrics; verify quality presets, WebGL context loss and synthesized audio lifecycle.

## Verification scope

- Parent exact SHA, separate branch, original-source diff and PR stack: verified via authenticated GitHub.
- Local environment: Chromium and Node available **but there is no complete ION checkout and neither GitHub nor hosted Cloudflare preview DNS resolves**, so the browser **cannot load the actual executable app**. No genuine game screenshots, playable input response, real 3-lap race, frame-time data or real touch/gamepad/WebGL confirmation has been obtained.
- An automatic Cloudflare Pages SUCCESS means the exact head can compile and preview-deploy; it is **not a playability PASS**.
- Source analysis establishes bugs and changes; the corrected handling must not be declared qualitatively good until physical acceptance.

## Preservation

Preserved canonical `RaceEngine`, source checkpoint/lap/best-time contract, Kestrel/Rift, 14 Kenney CC0 GLBs, existing camera modes/asset rights, P01 collision/input/touch work, original branches, main and production. No new persistence, grader, secondary input service, changes to histories, merges, paid resources, credentials, broad CI or intentional production deployment.
