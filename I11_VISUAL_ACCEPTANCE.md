# ION Improvement Phase 11 — Professional Visual Foundation

**Parent:** Phase 10 draft PR #26, exact `fix/ion-i10-authentic-lap-challenges` head `ee52c338dd1a0b70a2b28eeaf8c1860339ac727c`. **Stacked child:** `fix/ion-i11-professional-visual-foundation`. Main and original PR branches stay untouched.

## Actual original-source implementation

- **Canonical stylesheet ownership:** original `src/styles.css` now owns top-level Nightshift desktop UI, primary/secondary actions, menus, cockpit HUD and typography. The former V17 desktop override block was **moved out of** `src/v17.css`, not copied into another third CSS layer. `v17.css` retains touch-specific and genuinely contextual racing guidance/responsive styles, with explicit desktop `.touch-bar{display:none}`. The two existing stylesheet imports, earlier runtime class names and all React engine components remain.
- **Shared professional tokens:** a single `:root` declares ink, muted, cyan, coral, background, panel/border/focus colors, and Inter, Space Grotesk and IBM Plex Mono functional stacks (body/display/telemetry). Removed duplicate V17 root. Retained dark, angular Nightshift cockpit style instead of gradient cards, oversized pill buttons or an unrelated generic app design. Primary/secondary button states have keyboard-visible high-contrast focus and pressed feedback; disabled buttons are distinguishable.
- **Menu/garage/responsive geometry:** added restrained editorial left rail and clearer typographic hierarchy to existing menu; bounded menu, garage and pause viewport height and enabled internal scrolling in short portrait/landscape. Preserved available full-screen game canvas and footer. Scroll controls do not affect original keyboard/touch driving.
- **Cockpit information hierarchy:** strengthened lap/time numeric stability, meter track visibility, split/result readability, stage typography and full 3-lap result grid. On narrow portrait results, real individual lap splits stack as readable rows instead of squeezing into a single tiny horizontal line. Keep original I09/I10 scored split/clean lap/pad evidence unchanged.
- **Touch/accessibility:** removed round-corner styling from thumb keys to match angular visual language, retained 44px high primary actions, increased short-landscape recovery from 40→44px, short-landscape first-run dismiss from 28→44px, and short-landscape header actions from 40→44px. Respect top and bottom safe-area insets. Preserve I01–I10 touch ownership, simultaneous fingers and original steer/brake authority.
- **Original semantic controls:** HUD shield and boost bars now expose actual `role=meter`, their existing label and source `aria-valuenow` 0–100. The existing in-app manual is a properly labeled `aria-modal` dialog: focus moves to the close button on open, Escape dismisses, Tab/Shift+Tab stay within the modal, and focus restores to the original triggering element if it still exists. No second overlay engine or accessibility store.

## Verification levels

The original `scripts/build.sh` now runs `scripts/i11-visual-source-smoke.mjs` **after I05–I10 genuine original-engine race tests**. This checks source CSS balancing, single canonical root, presence of token definitions, actual 4.5:1 color contrasts of text/accent tokens against the solid cockpit background, desktop-hidden thumb controls, touch safe areas and 44px targets, viewport scroll constraints, real meter semantics and source-level modal keyboard/focus wiring. It is source qualification only, not a substitute for browser/assistive-tech evaluation.

**Prior intermediate GitHub branch builds:** earlier styles and React source commits produced successful preview deployments, but the definitive final-head Cloudflare status must be retrieved independently. Do not claim a browser or visual appearance PASS from those builds.

## Still mandatory for release

- **Chromium desktop at 1440×900 and 1920×1080:** genuine screenshots and interactive QA of menu/garage/manual/cockpit/finish, styles cascade/computed layout, three-lap records, font loading, focus restoration, Tab trapping and no unwanted desktop touch controls.
- **Android Chrome, iOS WebKit, 320×568 portrait and 667×375 landscape:** verify actually rendered touch hit rectangles (not merely CSS declarations), header/recovery hit sizes, phone insets, landscape collisions, keyboard focus and visible source-derived splash/coach; screenshots and contrast on complex WebGL backgrounds.
- **Normal/reduced motion, keyboard/gamepad, screen reader:** manual labels and focus trap, all primary controls, sound/camera/pause, actual touch ownership during racing and real results text.
- **Runtime/performance:** verify responsive layout shifts, safe-area changes, loaded Google fonts or system fallbacks, GPU costs, all 14 licensed Kenney CC0 assets, WebGL context recovery and real-frame timing.
- **Human usability acceptance:** actual legibility and craft visibility on all displays. Declaring quality or design a numeric score without browser render would be fabricated.

**Environment:** Chromium and Node exist but no complete executable, authenticated exact-head ION checkout and Cloudflare/GitHub browser preview hostnames did not resolve in the runtime. Therefore actual screenshots, computed pixel measurements, physical controllers and WebGL acceptances are **BLOCKED / NOT_TESTED**, never PASS from source-based checks.

## Preservation and restrictions

Original RaceEngine and Nightshift 1,820.8 m track untouched, real scoring/checkpoint/recovery/sector/PB/clean/pad authority, Kestrel/Rift, all 14 Kenney CC0 models, original user privacy and previous Phase I01–I10 controls. No merges, production deployments, migrations, paid services or credentials. Automatic Git-triggered *branch previews* may build during verification but production stays unchanged.
