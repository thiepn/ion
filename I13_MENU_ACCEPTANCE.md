# ION Improvement Phase 13 — Original Menu, Garage, Pause & Results

## Provenance and preservation

- Verified source parent: draft PR #28 `fix/ion-i12-source-telemetry-hud-hierarchy`, exact `c9c12c7cac406a089ab9501c553759c2ec5ebee1`.
- Distinct child development branch: `fix/ion-i13-native-menu-garage-race-lifecycle`.
- Original single React `App.tsx`, consolidated Phase 11 `styles.css`, original `RaceEngine`, `InputController`, `v17.css`, Nightshift spline, Kestrel/Rift, 14 licensed Kenney CC0 models, original gamepad/graphics/paint local preferences and legitimate record persistence all preserved.

## Implemented original-source defects

1. **Accidental destructive run reset via R or pause menu** — original `onKeyAction('reset')` called `start()` immediately, and the pause screen's Restart and Return to Menu buttons discarded an active, legitimately earned race without an intermediate indication. The native App now routes these through `requestRaceAction('restart'|'menu')`. For an active race, it clears input, pauses the authoritative `RaceEngine`, and shows an inline, explicit confirmation describing which in-run data will be lost; the saved personal-best record remains. Cancel preserves the paused run, including source-earned gates and time; resume uses the original countdown. Finished-race **RACE AGAIN** remains one click with no redundant prompt.
2. **Stuck touch appearance/input ownership after pause/restart** — previous App cleared `InputController` but retained the React `TouchZone` captured pointer set until pointers were released. Now pause/resume, start, and Return to Menu all bump the original `touchResetSerial`, remounting original zones to clear their held-key display and stale pointer ownership. The existing recovery code already used this pattern. No additional touch engine/gesture system.
3. **Keyboard confirmation focus** — the new in-place confirm moves keyboard focus to the Confirm button; cancellation returns focus to Resume when the original race is still paused. Original high-contrast focus and minimum 44px button rules retained. The existing pilot manual now can be opened from garage and pause; global race keyboard shortcuts are not dispatched while it is open, and the existing Escape/Tab/focus-restoring manual mechanism remains unchanged.
4. **Controller preference difficult to find** — original stick dead-zone choice was reachable only inside the pilot manual, or via a blind “cycle” action in pause. A single `DeadzoneSetting` React control, with unique per-view accessible IDs, now supplies the same original persisted `InputController.setStickDeadzone` preference in garage, paused settings and manual. Existing four options 10/15/20/25% and all original neutral/reconnect guarantees unchanged. Current craft, paint and QUALITY/PERFORMANCE settings and saved preferences still use their native owners.
5. **Failed run showed no results** — results and sector histories were rendered only when `reason==='complete'`; any shield-disabled run discarded the usefulness of its already **legitimately completed** laps. The same existing final results now list original elapsed time, last source-earned gate, current attempted lap and pad count, already completed authentic lap/split histories, saved PB and recovery penalties. No fabricated completion or fake split for the unfinished lap.
6. **Paused context** — pause screen now shows the actual frozen lap, next required checkpoint distance and original elapsed race time instead of generic placeholder copy.
7. **UI integration** — slim amber-bordered confirm panel, scroll-safe garage controller settings and adaptable portrait/short-landscape rules in canonical `styles.css` only. No new CSS layer or independent navigation/confirmation framework.

## Automatic original-source and lifecycle qualification

`scripts/i13-menu-lifecycle-smoke.mjs`, added to existing automatic `scripts/build.sh`, uses already installed Node/esbuild/React and original `App.tsx`, `RaceEngine`, `InputController` and `track.ts`:
- server-render actual default React App menu with stored true prior-lap record, confirm original menu actions (not a synthetic markup copy);
- persist original 20% stick deadzone, press physical input pointer ownership, then confirm `InputController.clear()` releases it;
- physically drive original 60 Hz engine until **real S1** earned, pause, verify split/progress/record preservation, legally recover to earned gate with original +5s/time and penalty, resume through native countdown, restart and menu with saved PB preserved;
- source-check that R and pause menu route through the two-step confirmation, the three dead-zone views use distinct IDs, modal keyboard actions do not reset game while open, source touch reset serial covers interruption, and failed results display true incomplete-race progress;
- existing I05–I12 source-engine 3-lap/geometry/collision/telemetry/accessibility checks and exact-head TypeScript/Vite remain mandatory.

**Evidence status:** automatic Cloudflare branch checks may be queued as commits arrive; verify the exact final-head commit separately. Do not claim I13 executable PASS until its Cloudflare build and real test logs actually report PASS.

## Remaining browser release gates

- Actual desktop Chromium and phone Chrome, iOS WebKit 320px portrait/short landscape: real interactive screenshot and measured hitbox/focus tests for menu → garage craft/paint/quality/deadzone → menu, pause and recovery, interrupt R and no-loss cancel vs explicit destructive confirm, finished and failed results with live source data.
- Focus of confirmation buttons, Escape cancel/resume, pilot manual Tab/Shift+Tab containment and focus return, native gamepad Start/X/trigger behavior during dialogs, rapid reentry into race and original touch pointer capture.
- Kestrel/Rift GLB visual customization, real QUALITY/PERFORMANCE effects, graphics retry, sound and controller preference lifecycle.
- No proof of actual rendered layout, FPS or human gameplay satisfaction from Node SSR or source checks alone. Local Chromium installed but exact authenticated source checkout and resolvable preview DNS absent, so desktop/mobile screenshots and real devices remain **BLOCKED / NOT_TESTED**.

No merges, manual production deployments, paid services, credentials, migrations, alternate scoring, artificial races, duplicated engines, or changes to prior stacked PRs/main/production. Automatic Git-triggered Cloudflare previews are allowed.
