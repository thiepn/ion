# ION V5 — Circuit Fidelity, Handling and Rendering Recovery

Stacked parent: `feature/ion-v4-cc0-models-and-visuals` at exactly `8f90d0944efb1c1a4a4b9d427fff9870d67f1f96`.

## Implemented

**Renderer, geometry and race visibility**

- Original multi-layer twilight horizon and industrial environment shader; three procedurally modeled rocky escarpment rings and instanced communications structures in the distance.
- Real track-spline-aligned lane shoulders, upcoming corner lights, physical brake marker boards, and colored sector pillars that derive their state from the authoritative `RaceEngine.checkpoints` value.
- Quality/performance material and environment lighting differentiation with a smaller shadow projection and correct shadow-only quality path.
- Single-instanced draw calls replacing 115 independent track dash meshes and the original 32 individually modeled bridge supports.
- Maintains the V4 high-fidelity Kestrel/Rift craft, all 14 manifest-verified CC0 Kenney GLB scenery assets and the original highway/track collider.

**Gameplay and feel**

- Independent `ChaseRig` with frame-rate-independent positional damping, filtered heading, authentic look-ahead from the course spline, boost/velocity field-of-view response, stable garage orbit and reduced-motion camera behavior.
- Guardrail collisions now resolve one speed-dependent impact per contact cooldown and steer the ship toward the tangent rather than repeatedly crushing speed on every frame.
- Boost pads only grant energy when crossed forward at speed inside their actual visibly marked lateral strip, with progression-based anti-farming protection.
- Keyboard controls respect focused buttons/inputs; gamepad polling safely falls back if browser privacy or sandbox restrictions deny it.
- Rift's 3D flame geometry and animation axes now agree, so exhaust scale responds along the visual thruster axis.

**Runtime and user recoverability**

- `RuntimeBoundary` catches render-mount failures, a WebGL context-loss handler pauses an active race when possible, and users can retry the renderer or switch to lower-cost performance mode without reloading the page.
- Existing native UI and keyboard/gamepad/touch controls, garage, quality settings, stored best laps, fixed 60 Hz simulation, collisions and timers all remain authoritative.
- No additional accounts, stores, engines or third-party gameplay code were introduced.

## Asset provenance

No additional external 3D models, images, audio or textures were imported in V5. The industrial environment, signs, sky and shader are original TypeScript / GLSL source. The existing CC0 Kenney model manifest, pinned hash validations, and V4 license documentation remain unchanged.

## Verification and limitations

Only the requested essential Cloudflare preview build and any focused compile repairs should be performed. Passing TypeScript / Vite compilation is not evidence of a full playable three-lap race, visual correctness on actual GPUs, specific device framerate or accessibility acceptance.

Visual fidelity is still stylized. The ION-01 Kestrel uses authored geometry rather than a professional artist-produced baked asset. Audio, new tracks, fully audited touch/gamepad control behavior, in-browser 3D screenshots, and responsive GPU benchmarking are still outstanding.

Preserve the V4 parent, V3/V2 stacks, production `main`, and `ion.thiepn.dev`. No merge or production deployment is part of V5.
