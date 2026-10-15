# ION Improvement Phase 14 — Craft Identity, Licensed Paint & Garage Showcase

**Exact verified parent:** draft PR #29 `fix/ion-i13-native-menu-garage-race-lifecycle` at `f32791ba0fd3e3610bad052130be2549aa2305b0`. **Child:** `fix/ion-i14-authentic-craft-showcase-materials`. Main and earlier draft branches remain unchanged.

## Source/provenance audit — no unapproved artwork

- `src/visuals/Craft.tsx`: ION's original Kestrel is hand-authored Three.js extruded geometry with split wings, fins, cockpit, twin engines, distinct trim and real paint-colored body/wings. No external craft model or texture was added.
- `src/visuals/KenneyAssets.tsx`: Rift uses `KenneyModel asset="craft-racer" width={7.7}`, loaded from the existing `/assets/kenney/craft-racer.glb` and normalized to 7.7 local units. Original engine nacelles, exhaust and boost light are source-authored separate additions; the race engine is shared with Kestrel.
- `scripts/cc0-space-kit.json`: immutable pinned upstream Git revision `2c8950b716e6765930b2b51409c59adf3d66fd5c` and **14 individual Git blob SHA1s and byte lengths**. The existing `scripts/sync-cc0-assets.mjs` verifies bytes and hashes during normal builds; asset IDs, source, revision and hashes are unchanged by I14.
- The official original Kenney Space Kit page `https://kenney.nl/assets/space-kit` explicitly identifies the model pack as **Creative Commons CC0**, and the original GLB repackager `https://github.com/Hidencod/tge-assets` identifies the pinned Kenney packs as CC0. The game's existing `public/ion/credits.html` preserves attribution and legacy HexGL license caveats. **No downloaded/generated/unapproved art, new third-party model or modified licensed source binary.**

## Implemented in the *original* Three/React runtime

1. **Rift finish used weak uncontrolled blanket tint** — original `KenneyModel` copied and lerped all GLB material colors by .38, including dark mechanical sections, potentially glass and mapped surfaces, and changed metal/roughness. New pure `src/visuals/craftPaint.ts` clones (never mutates shared GLTFLoader materials), selectively blends selected paint onto opaque untextured light panels, and retains original emissive/window/map/dark cavities and native PBR metal/roughness. Existing cloned-material cleanup continues on unmount/change. This improves live color selection while protecting authored model details; actual per-mesh visual quality still requires real rendered screenshots.
2. **Rift silhouette and paint identity** — the existing ION engine nacelle shells now use the same selected physical paint with clearcoat and the previously native modeled torus/drive exhaust becomes warm amber. Kestrel's twin engines remain electric cyan. The **two source materials** now have distinguishable vehicle cues without touching physics, GLBs or source dimensions.
3. **Kestrel painted finish** — authored additional nose-spine and symmetric wing-edge panels to visually repeat the selected material on original split-wing hard-surface geometry. All pieces remain within the existing vehicle envelope, with ordinary Three geometries and no external artwork/texture assets.
4. **Deliberate native garage view** — previous `ChaseRig` automatically made full 360° menu orbit every ~30 s with no inspection controls. Now the existing camera has source-owned `THREE_QUARTER`, `SIDE`, `REAR` poses selectable in the original garage. Positions are computed relative to **actual vehicle heading**, not world north; camera target is shifted on wide screens so the real craft sits to the right of customization text; portrait receives a modest balanced shift. A tiny reduced-motion-aware sway avoids uncontrolled rotation. The original chase/near cameras, collision clearance and player view are unchanged outside `showcase && game.phase==='menu'`.
5. **Garage lighting** — `World.tsx` adds three modest point lights around the source-owned player craft **only in the garage**; quality preset changes intensity. Reuses same Canvas, scene, light/material system, `World` and `RaceStage`; never adds second scene or renderer.
6. **Usable original garage UI** — `App.tsx` exposes three labeled, `aria-pressed` inspection buttons and live, truthful Kestrel/Rift/paint/angle status next to the original swatches, native craft selector and graphics/deadzone settings. `styles.css` adds matching angular 44 px targets, keyboard focus and portrait/short-landscape layouts, not a third CSS cascade or redundant screen. Original selection/paint/quality/localStorage keys unchanged.

## Authentic executable verification and known limits

`scripts/i14-craft-showcase-smoke.mjs` runs in existing automatic `scripts/build.sh`, after all Phase I05–I13 engine/geometry/collision/3-lap/keyboard/menu checks and before exact-head TypeScript/Vite:

- Bundles **real** `repaintLicensedMaterial`, original `ChaseRig` and actual `RaceEngine` using the project's installed Three.js. Tests real `MeshStandardMaterial` cloning, source immutability, observed RGB color change, preserved rough/metal and unmodified glass/dark/textured material behavior.
- Creates **real** `PerspectiveCamera` objects, runs original ChaseRig in each garage mode and checks rightward onscreen framing, distinct source positions, yaw relative to actual craft heading and no motion under reduced-motion settings.
- Parses unchanged manifest for **exact 14 IDs, pinned revision, 14 hashes/byte sizes and CC0 license**, plus checks actual garage/state/CSS wiring, original GLB loader and no duplicate canvas.
- Source engine, scoring, checkpoints and circuit never mutate, and no photo or artistic render is fabricated by this code.

**Verification history:** First integrated I14 build at `25c8e02` failed in the test harness because `three` was externalized to an OS temp directory outside Node package resolution. The harness was moved to a temporary directory **inside the authenticated checkout**. Authenticated Cloudflare build at `3bcd963` **PASSED five I14 checks, all inherited I05–I13 gates, TypeScript and Vite (4.90 s)**. Then the showroom yaw bug was repaired in `98cdf90` and stricter source craft-relative camera test committed at `a865813`; these and final report SHA require their *own* exact-head build check, never inherit a PASS automatically.

## Release gates remaining

- Desktop/mobile Chromium and real WebGL screenshots for each **craft × paint × view × graphics preset**, direct pixel/visibility assessment of nose, wing and Rift nacelles, glTF material/textures, garage highlights and actual craft silhouette.
- Real 320×568 portrait/667×375 landscape layout, hitbox/focus checks; touch/manual operation while changing selected craft and paint; test fallback if Kenney GLB is unavailable; verify no renderer leaks after many changes.
- Physical keyboard/gamepad/multitouch interaction and actual performance/GPU memory/frame-time data. Validate point-light cost and canvas WebGL under PERFORMANCE and QUALITY presets.
- Pixel-level screenshots, actual model shape and human subjective visual quality **BLOCKED/NOT_TESTED** because this local runtime has no full executable exact-head checkout and cannot resolve hosted preview DNS. Real Node/Three camera calculations or Cloudflare branch builds are **not** browser appearance acceptance.

## Preservation

No modifications to RaceEngine, original physics/finish/best lap/checkpoint/clean/pads scoring, 1,820.8 m Nightshift, historical branches, original Kestrel/Rift GLB source or all Kenney CC0 assets; original optional audio, touch, gamepad and privacy untouched. No merges, migrations, manual production deploy, credentials or paid services. Automatic Git-integrated Cloudflare branch preview builds only.
