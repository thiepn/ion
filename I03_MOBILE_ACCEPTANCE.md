# ION Improvement Phase 03 — Mobile Touch Controls and Interruption Recovery

**Stack parent:** `fix/ion-i02-steering-motion-and-thumb-transfer` at exact SHA `4c750799bbb5a4b2de88d207ac1a84bad380db70`, draft PR #18. Independent I03 child branch `fix/ion-i03-mobile-thumb-control-ownership`.

## Implemented in the original React/InputController system

### A. Unify pointer ownership and true feedback

Original I02 `TouchButton` set pointer capture on a single button and reassigned the held code if a thumb slid to the other button. React/button CSS still used `:active` on the original captured button, so the displayed pressed control could disagree with the code currently held. The same per-button handler provided no controlled GO/BRAKE/BOOST sliding.

I03 replaces those two isolated button handlers with two instances of one `TouchZone` React control family, **not a new game engine**. Each zone tracks a mapping `pointerId -> held action | null`, and calls only the original `InputController.press/release(code,pointerId)`. Pointer capture is owned by the zone. A thumb sliding between adjacent buttons transfers the original action immediately, including between BOOST, GO and BRAKE; moving outside releases input, and returning while capture is retained rearms the nearest button. Separate pointer IDs remain independent, including two-finger steering + acceleration/boost. Visual `is-held`/ARIA pressed state derives from this identical pointer map rather than the misleading initial DOM `:active` pseudo-state.

### B. Cancel without ghost controls

On `pointerup`, `pointercancel`, lost capture, blur, document hide, pagehide, orientationchange and zone unmount, current actions are released. For an earned-gate recovery, the original `RaceEngine.recover` retains authority, but successful recovery clears held input and remounts zones so an old finger cannot accelerate immediately after teleport.

Buttons remain actual semantic buttons. Focused touch buttons support Space/Enter through the same `InputController` ownership with negative reserved action-specific pointer IDs; keyup and blur release their action. Desktop keyboard gameplay, the original gamepad neutral handshake, pause/menu behavior and native scoring are unchanged.

### C. Consolidate old mobile CSS and improve target reach

Remove obsolete V2–V8 `.touch-bar`, `.touch-control`, `.touch-group`, `.touch-recover` rule blocks from `src/styles.css`; preserve the separate `.secondary-action:disabled` selector and all unrelated authored styling. Existing `src/v17.css` now owns the only actual touch-control rules, including `.is-held`, focus-visible outline, safe-area offset and short portrait/landscape breakpoints.

Recovery buttons on touch screens have at least a 44 px target in portrait and 40 px in short landscape (optional secondary action), with labels and keyboard focus. Header SOUND/CAMERA/PAUSE tap targets increase in portrait and landscape. Meters/speed HUD are moved upward to provide separation from touch/recovery zones; actual pixel quality requires Chromium screenshots.

**Source-CSS dimensional calculations only, not rendered measurements:**

| CSS viewport | Steering per button | GO/BRAKE per button | Notes |
|---|---:|---:|---|
| 320×568 portrait | ~64.2 px wide | ~68.5 × 66.5 px | Short-portrait override |
| 360×640 portrait | ~73.4 px wide | ~78.3 × 66.5 px | Short-portrait override |
| 390×844 portrait | ~80.3 px wide | ~85.7 × 69.5 px | Portrait rule |
| 667×375 landscape | ~112 px wide | ~98 × 88 px | Three horizontally distributed drive buttons |
| 812×375 landscape | ~119 px wide | ~98 × 88 px | Three horizontally distributed drive buttons |

Calculated source dimensions assume corresponding media queries, no browser font inflation, no UA overrides and the declared CSS box sizing. They are **not proof of usability or a passed browser layout audit**.

## Verifications performed

- Authenticated GitHub exact-parent verification and original source/branch writes.
- Source CSS brace balance for `styles.css` and `v17.css`: PASS (syntactic brace scan only, not browser stylesheet parse).
- Obsolete legacy touch block count in `styles.css`: 0 after consolidation.
- CSS-rule arithmetic listed above: completed and appropriately labeled as calculations.
- Automatic Cloudflare Pages exact-head build/check: report separately when final-head status is known. PASS there covers build/deployment of a **branch preview only**, not actual gameplay.

## Required genuine executable release gates (NOT_TESTED if browser unavailable)

1. Desktop Chromium at 1440×900 and 1920×1080: start, UI navigation, no unwanted touch controls, keyboard arrow/WASD after SOUND/CAMERA; keep original pause/help/recover.
2. Android Chrome 320×568, 360×640, 390×844, 430×932 portrait: real `getBoundingClientRect` sizes, screenshots in game with canvas visible, touch heatmap/overlap, thumb reach and safe-area. Actual touch press/slide GO→BRAKE, GO→BOOST, LEFT→RIGHT, exit/reentry and finger release. Held button's artwork, `aria-pressed` and engine action must match on every transfer.
3. Landscape 667×375, 812×375, 932×430, tablet coarse-pointer: concurrent steering and GO/BOOST using separate pointers, no overlap of controls/recovery with racing HUD, clear tap feedback, no offscreen targets, orientation change without ghost inputs.
4. Blur/pagehide/visibilitychange/pointercancel/lost capture: no lingering acceleration/boost, visual pressed state, or post-recovery steer. Recover only when original earned-gate permission is granted and retains canonical penalty.
5. Complete **actual three-lap** driving, forward sector gates, best-lap record preservation, boost and rail collision, pause/resume, Kestrel/Rift, actual controller and frame times.
6. WebGL startup/loss, audio lifecycle, mobile reduced-motion and focus-visible accessibility. Capture real screenshots/videos, console errors and FPS where executable.

## Environmental limitation and safeguards

The container has Node and Chromium but **no actual mounted ION GitHub checkout**. GitHub repo and Cloudflare preview DNS both fail inside this container; authenticated GitHub source and exact-head build checks are available through connectors. Thus no authentic browser screenshot or executed gameplay can be claimed from a source-only edit.

No production/main merge, deliberate deployment, new services/storage, fabricated gameplay scores, paid resources, credentials, source license changes or modifications to earlier stacked branches. Preserve all canonical race/lap/recovery scoring, I01–I02 fixes, Kestrel/Rift and the 14 Kenney CC0 GLBs.
