# ION V3 — Circuit Visual Quality Layer

Development branch `feature/ion-v2-v3-visual-quality` stacked on `feature/ion-v2-modern-racing-foundation` at `817eb6cbd5b3bd034accb6b96d5e5fba5f4b6b43`.

## Source changes

### Redesigned craft

`src/visuals/Craft.tsx` replaces the original V2 boxes/cones craft. The ION-01 Kestrel has a bevelled polygonal multi-part fuselage, tapered wings, nested fins, a treated cockpit canopy, layered panel and hull materials, ventilation ribs, trim lights, side-mounted housings and separately animated thrusters. Paint selection still comes from the native garage and updates the actual geometry's physically lit paint.

It has no external meshes, textures or proprietary source assets. All geometry is authored in TypeScript with `ExtrudeGeometry` and native Three.js primitives.

### Materials and light

`src/visuals/Rendering.tsx` generates deterministic tiled roadway base-color, roughness and small-scale tangent-space normal maps using a canvas. The high-quality preset adds a prefiltered, built-in reflection environment and the standard Three.js `EffectComposer` / `UnrealBloomPass` / `OutputPass` chain; the performance preset retains the direct renderer and no postprocessing.

Careful bloom thresholds are used to affect bright emissive trim without excessively blurring the whole scene. Device-dependent visual and performance QA remains necessary.

### Circuit dressing

`src/visuals/CircuitDressing.tsx` adds original physically built trackside barriers, evenly distributed instanced road edge posts, luminous warning bands, multiple heavy signaling bridges with runtime-painted in-world ION typography, corner-direction indicators and industrial energy towers.

All new elements use the existing original course spline from `src/track.ts` so markers and gantries track the same geometry as the simulator.

## Boundaries

- The new visuals **do not** change authoritative lap, boost, wall collision, steering or replay logic.
- No third-party model, game track, sound or texture has been imported.
- This is a strong step beyond primitive placeholders, **not** a claim of photorealistic or AAA art.
- Texture maps are procedurally generated on page load; there is no external download.
- User-controlled PERFORMANCE vs QUALITY settings remain in place.
- The established Cloudflare Pages `main` branch and `ion.thiepn.dev` production version remain unchanged.

## Before promoting

1. Play through a complete three-lap race and verify visible course alignment, camera usability and collision correspondence.
2. Measure real mid-range desktop and mobile GPU/VRAM/performance for both settings.
3. Add properly vetted original or CC0 high-detail 3D models and high-quality baked materials/texture sets where they measurably improve the scene.
4. Implement audio, loading states, accessibility improvements and postprocessing fallbacks as necessary.
5. Keep the original HexGL branch as a known working baseline until production acceptance.

No real-device frame-rate results, completed playtests, or user acceptance are claimed by this development file.
