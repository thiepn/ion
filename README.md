# ION — Anti-Gravity Racing

ION is being rebuilt as an independently authored, modern browser-based anti-gravity racing game.

**Production:** https://ion.thiepn.dev — still runs the original HexGL-derived bootstrap on the `main` branch.

**V2 development:** [`feature/ion-v2-modern-racing-foundation`](https://github.com/thiepn/ion/tree/feature/ion-v2-modern-racing-foundation) — a separate playable new racing prototype, without any production changes.

## ION V2 features

- React 19, React Three Fiber 9, Three.js, Vite, TypeScript
- Procedurally built elevated original 3D circuit, road geometry, lighting, architecture and a custom hovercraft
- Acceleration, air braking, steering, boost, shield damage, wall collisions and checkpoints
- Three-lap time trials, countdown, pause/resume/restart and locally stored best lap
- Keyboard, gamepad and mobile touch controls; animated camera and HUD
- Static Cloudflare Pages hosting; no required database, sign-in or API

See [V2.md](V2.md) for development status, legal provenance, current limitations and next steps.

## Local development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

Cloudflare Pages is configured to call `bash scripts/build.sh` and publish `dist/`. In V2, this invokes the modern application build. On `main`, the original separate build script and HexGL experience are preserved.

## Racing controls

| Action | Desktop |
|---|---|
| Accelerate | W / Up arrow |
| Brake | S / Down arrow |
| Steer | A / D or Left / Right arrows |
| Boost | Space / Shift |
| Pause | Esc / P |
| Camera | V |
| Restart | R |

Gamepads and touch controls are supported. Time trial completion requires three forward laps and checkpoint progression.

## Credits and licensing

The V2 racing simulation, circuit and original scene assets were newly created for ION. Source libraries have their respective open-source licenses; see [credits](ion/credits.html).

ION began as a fork-like customization of [HexGL](https://github.com/BKcore/HexGL), by Thibaut Despoulain (BKcore). The legacy version remains accessible via production `main` and retains the original MIT and file-level Creative Commons notices, including CC BY-NC 3.0 notices in original engine files. **V2 does not incorporate HexGL's engine or 3D assets.**

This V2 branch is **not ready to merge into production** until a hands-on browser playthrough and device assessment confirm genuine gameplay and graphics quality.
