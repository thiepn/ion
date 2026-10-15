# ION Improvement Phase 05 — Native Driving-Feel Rework

**Exact stack parent:** Phase 04 draft PR #20, branch `fix/ion-i04-keyboard-gamepad-input-coherence`, SHA `b036d57cda26154fdcb0763125462ef45f2e683d`.

**Scope:** Original `src/simulation.ts` / `RaceEngine.update`, a focused real-engine Node smoke runner, and the existing exact-head branch build. Not another physics engine, track, mode or UI subsystem.

## Substantive functional corrections

1. **Acceleration and stopping.** Preserve source `speed` units (m/s) and existing caps: 86 m/s drive, 112 m/s pad surge, 115 m/s engaged boost. Smoothly taper motor thrust with speed; strengthen proportional braking, passive drag and acceleration responsiveness. Explicit brake priority scales down power when both pedals are down. Engaged braking (`brake>=.3`) prevents consuming boost against the brakes. Original boost refill policy and physical pad eligibility still own scoring/usage.
2. **Physical grip, not instant heading snap.** Previously source position was always advanced along new vehicle heading every 60 Hz step, creating perfectly instant steering traction. A single engine-private `motionHeading` now follows the player's existing vehicle heading via a bounded exponential response dependent on speed and braking. Vehicle yaw still responds immediately with correct V17 screen-relative left/right direction; momentum follows within a small readable slip angle. The original road projector still determines real position and checkpoints, with no fabricated progress.
3. **Steering response and visual body feedback.** Tune existing digital/analog smoothing, progressive speed-limited steering and braking corner response. Keep zero-speed no-spin behavior from I02. Physical grip/yaw discrepancy contributes a bounded `roll` response. `pitch` also reflects the **actual canonical course elevation** ahead, rather than simply static speed, and hover vertical position uses time-continuous smoothing.
4. **Rail grazing versus head-on hit.** Previously every sufficiently fast new guardrail contact cut scalar speed by a flat 31%, regardless of whether barely scraping or striking near perpendicular. Now momentum-to-road incidence determines retained speed and damage; collision contacts still retain original one-hit/cooldown, shield destruction, and last-impact state. After a collision the craft center is placed 0.3 m *inside* the existing wing-safe boundary, and both visual yaw and physical travel direction return toward the real rail tangent, preventing one remaining into-wall vector from continuously pinning the craft.
5. **Projection, pause and recovery continuity.** The existing discontinuous-track-projection fallback resets the new motion heading along with canonical heading. Restart/recovery reset it too. Pausing and restarting countdown neutralizes stale grip yaw without rearming controls or granting an unearned checkpoint.
6. **Actual pad-surge bug.** The original pad interaction did `speed=Math.min(112,speed+16)`, causing a craft already traveling 115 m/s under boost to decelerate to 112 m/s when *rewarded*. The corrected pad raises lower speeds toward 112 m/s but never lowers an already faster craft. No change to one-use pads, forward crossing or anti-farming checks.

## Executed qualification path

Added `scripts/i05-physics-smoke.mjs` using Node.js + the existing installed `esbuild` dependency to bundle **the actual original TypeScript RaceEngine and track module** without copying equations. Added its execution to the existing automatic `scripts/build.sh` after dependency installation and before the TypeScript/Vite production-equivalent build; the shell's `set -euo pipefail` fails the preview if any check fails.

Focused checks:
- stationary steering does not spin;
- screen-relative right/left yaw compared with neutral on the authentic curve;
- throttle acceleration and braking priority over simultaneous boost;
- bounded grip lag between true motion and body heading;
- legitimate forward boost-pad crossing cannot slow faster active boost;
- earned-gate recovery (+5 seconds, cooldown, no free checkpoint);
- reset cancels speed, lap/sector state and motion-heading drift.

A successful **exact-head Cloudflare Pages preview build** validates this Node smoke gate and TypeScript/Vite, *not* actual Chromium gameplay. When final head check is not complete or fails, report that accurately.

## Browser / physical-device acceptance remains mandatory

- **Keyboard**: A/D, arrows, throttle/brake, Space boost, off-road collision, wall scraping, pause, restart, recovery, camera V and focus loss; validate direction in CHASE/NEAR.
- **Controller**: D-pad, analog steering, adjustable 10/15/20/25% deadzone, triggers and simultaneous brake/boost. No stale controller ownership on reconnect. Check actual handling response with multiple speed ranges.
- **Mobile Android/iOS**: dual-touch GO/steer, slide to BRAKE/BOOST, multi-pointer release, safe area rotation, recovering while fingers down.
- **Honest complete 3-lap race**: all canonical forward quarter gates and seam per lap, sector sums, best-lap accuracy, projection warning and no physics softlock, pad anti-farming, 5-second recovery, Kestrel/Rift.
- **Graphics/sound/performance**: actual Chromium screenshots, FPS/frame-time traces, HUD visibility, camera response, WebGL loss/retry and synthesized audio mute lifecycle.
- **Human feel criteria**: braking visibly wins over gas/boost; vehicle cannot spin in place; intentional low-speed turn and high-speed cornering are controllable; rubbing the guardrail releases naturally; elevation and banking are convincing without jitter. These require playtesting, not source claims.

## Release restrictions

The current working container contains Chromium and Node but no executable exact-head ION checkout or dependencies, and GitHub/Cloudflare preview hostnames do not resolve from it. A Cloudflare preview build does **not** establish genuine browser screenshot, physics tuning satisfaction, FPS or full 3-lap playability PASS. Mark those **BLOCKED/NOT_TESTED**.

Keep earlier stacked refs, PRs, main and production unchanged; preserve original RaceEngine/Track/World authority, lap/checkpoint/scoring, unchanged source IDs and personal-best storage, Kestrel/Rift, 14 licensed Kenney CC0 assets, user privacy and all Phase 01–04 fixes. No production deployment, merge, paid service or credentials.
