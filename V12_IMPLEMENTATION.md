# ION V12 — Authoritative Track Continuity, Controller Neutrality and Asset Retry

**Exact parent:** `feature/ion-v11-race-proof-input-render-recovery`, commit `9becf2b28cb4be78898ac41ba5a1a7e31fbe8b84` (stacked draft PR #10). This implementation is an independent V11 child branch.

## Player-visible implementation

- **InputController:** Both gamepad actions (Start/Y/X/LB) and driving input share the same *actual neutral* handshake after blur, pause, gamepad disconnect and reconnect. Until axes, triggers, throttle/brake/boost and action buttons are released, no newly activated gamepad actions or driving values enter the original engine. Edge-button baseline is still refreshed while locked, preventing held Start from firing when the lock clears. Existing keyboard and multi-touch controls remain usable.
- **Original RaceEngine only:** When the spline projector selects an implausibly distant segment, it no longer overwrites the previous trusted spline position. The craft is stabilized at its immediately preceding local course projection and speed is reduced. No lap, elapsed clock, shield, sector or earned checkpoint is fabricated. A distinct, brief *COURSE ALIGNMENT* warning distinguishes an ambiguous projection from actually missing a sector.
- **Race guidance:** The existing source-grounded wrong-way and missed-checkpoint signals remain. Projection recovery has its own short timer, reset on race start, manual recovery or completion of a lap. No new progress engine or store was introduced.
- **Licensed GLB retry:** Isolated `AssetBoundary` first clears React Three Fiber's failed GLTF cache for the exact local Kenney GLB and retries **once** after a short delay. Permanently missing or corrupt scenery stays omitted; the Kenney Rift retains the procedural Kestrel fallback. No unbounded retry, external URL or substitute licensed material.
- **Performance graphics:** Source-created signal banners gracefully degrade if the Canvas 2D API is unavailable instead of aborting the entire scene. Instanced road-barrier posts and energy bands calculate bounding spheres and re-enable legitimate frustum culling. PERFORMANCE reduces secondary bridge signage, corner decoration and cooling towers while QUALITY preserves the full V2–V11 presentation. The original authoritative track, 3D vehicle models, race state and full graphics preset remain.
- **No new dependencies/assets:** Existing 14 pinned SHA-verified Kenney Space Kit CC0 GLBs, manifest/license, local best-lap storage, 60 Hz simulation, Kestrel/Rift choice, original RaceEngine, React and React Three Fiber are reused unchanged in ownership.

## Verification and release constraints

Only the essential automatic Cloudflare Pages preview TypeScript/Vite build and hash verification are requested here. A successful compile/deploy is not a real three-lap browser playthrough, physical gamepad reconnect test, Android multi-touch acceptance or measured GPU FPS. Keep V12 draft/unmerged and never promote to `ion.thiepn.dev` without actual acceptance.

The previously stacked V2–V11 branches, `main` and production must not change.
