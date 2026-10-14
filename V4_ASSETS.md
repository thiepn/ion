# ION V4 — Verified CC0 Models and Circuit Visual Depth

**Parent:** `feature/ion-v2-v3-visual-quality` at `396da4cd27602440e7427cbaff955f758db204e5`. V4 is a separate stacked development branch. No merge, production update or change to existing V2/V3 source branches.

## Exactly what is integrated

ION V4 integrates 14 self-contained GLB models from **Kenney Space Kit (CC0-1.0)**, distributed through the public Tiny Game Engine CC0 model catalog. They are used as circuit scenery, hangars, signal equipment, elevated industrial structures, aerial traffic and the optional Rift hovercraft. The original Kestrel craft and existing single authoritative ION `RaceEngine` are retained.

- Original creator / authoritative license page: https://kenney.nl/assets/space-kit
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Mirror with self-contained, repackaged GLB files: https://github.com/Hidencod/tge-assets
- Mirror `LICENSE`: https://github.com/Hidencod/tge-assets/blob/main/LICENSE
- **Immutable mirror commit:** `2c8950b716e6765930b2b51409c59adf3d66fd5c`
- Individual file IDs, byte lengths and SHA-1 Git *blob hashes*: `scripts/cc0-space-kit.json`
- Build-time verification: `scripts/sync-cc0-assets.mjs`

The build script downloads only the selected model files from the pinned revision, verifies both exact byte length and the actual Git object hash (`SHA-1("blob <size>\\0" + bytes)`), then writes them to `public/assets/kenney/`. It **fails the build** if a file is unavailable or altered. No unverified third-party assets, live third-party client/CDN calls or silently substituted models are permitted. The generated assets are kept out of Git history; Cloudflare publishes the verified bytes in the static build. `npm run dev` also initializes the assets before starting Vite.

The source mirror's export conversion does not provide new exclusive game content rights; Kenney's own CC0 declaration governs the originals. Voluntary credit is preserved in `public/ion/credits.html`.

## Substantial source additions

- `src/visuals/KenneyAssets.tsx`: native GLTFLoader integration, normalized scalable model instances with ground alignment and PBR treatment, geographically spaced circuit districts, air-lane decorative traffic, two selectable craft geometries.
- `src/App.tsx`: garage selection between original Kestrel and Kenney-adapted Rift, persisted locally; unchanged authoritative race handling/performance.
- `src/World.tsx`: draws terrain-aligned detailed props independently of race/physics authorities, with performance mode rendering fewer background models.
- `src/styles.css`: garage variant selector and responsive styling.
- `scripts/build.sh` and `package.json`: pinned, hash-checked CC0 asset build integration.

## Known limitations and next priorities

These are professionally authored **stylized low-poly** models, not a turnkey AAA photorealistic scene. Larger-scale bespoke track geometry, carefully art-directed HDR environment, physically authored high-resolution materials, improved game-feel, sound and performance are still needed. The current proof-of-concept uses a built-in mesh scene with procedural PBR enhancements and one circuit.

Rendered model scale, orientation, occlusion, collision visual alignment and real-device FPS require interactive browser verification; successful deployment alone does not qualify gameplay. CC0 scenery is **visual only** and does not alter checkpoint or collision truth.

V4 should remain a draft child of V3 until it genuinely outperforms the existing playable V2/V3 previews and passes real-device acceptance.
