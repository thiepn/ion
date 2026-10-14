# ION V6 — Racing Dynamics, Presentation and Startup

Stacked parent `3ada2277b5809cdc00fdfd68e866c8aa3953d6db` from V5 draft PR #4. Source is a separate stacked child branch and draft PR. The established `main`/V2–V5 refs and production domain are intentionally preserved.

## Changes implemented

**Native race simulation and input**
- Filter digital/analog steering, adjust yaw response and braking, ease banking/pitch and quadratic aerodynamic drag entirely inside the original `RaceEngine`. The fixed 60 Hz step, original race timers, shield, collision, checkpoint and boost-pad authority are preserved.
- Add a local bounded search around the prior authoritative spline position to avoid two 480-segment global collision projections per driving step. Falls back to a full search when the craft is far from the course; no track duplicate.
- Edge-trigger gamepad Start/Y/X for pause, camera, and restart, including pause-state polling. The keyboard and touch controls remain in the same `InputController`; focus-protection stays active.
- Provide an accessible camera switch button during races on touch devices, plus compact landscape controls.

**Rendering and craft behavior**
- An original instanced 3D magnetic wake responds directly to real speed and boost state, with lower-cost quality tiers; no fabricated gameplay telemetry or imported effect assets.
- Kestrel and Rift exhaust geometry now point rearward. The engine exhaust transparency and light intensities are updated from actual game state in the render loop rather than remaining frozen at initial JSX evaluation.
- The cinematic race renderer moves to a lazily imported `RaceStage`, with UI-rendered initialization feedback, actual WebGL error recovery, and lower maximum rendering pixel ratio.
- Scene props independently suspend as their original CC0 GLBs resolve instead of blanking the entire district until every model is ready.

## Provenance and constraints

No additional external game source, models, audio or textures were introduced. Kenney's 14 pinned, hash-verified CC0 spacecraft and infrastructure files remain the only third-party model assets used. Existing licence records in `V4_ASSETS.md` are preserved.

The only race-state writer remains `RaceEngine`. `track.ts` continues to own the original spline. UI, gamepad and graphics systems only invoke the existing native authority.

## Remaining limitations

A successful Cloudflare Pages build verifies bundling and publishing, **not** real-browser performance, visual quality, complete three-lap finish, handling fairness, mobile gesture ergonomics, or actual FPS. Test those before merging. The Kestrel remains a detailed procedurally authored craft rather than an artist-made AAA GLB; professional sound design and additional courses have not been created.

Production `main`, `ion.thiepn.dev`, and parent draft stacks must remain unchanged.
