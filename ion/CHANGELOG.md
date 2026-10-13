# ION development status

## Initial Cloudflare Pages bootstrap — 2026-10-14

- Production hostname: `ion.thiepn.dev`
- Pages project: `ion` (`ion-1fe.pages.dev`)
- Source repository: `thiepn/ion` (`main`)
- Upstream engine: `BKcore/HexGL` commit `6addc95a2fce3bf05f4d751823cc054c61a16d68`
- Build: `bash scripts/build.sh`; output: `dist`
- Presentation: ION wordmark, menu theme, page title, icon, site metadata, credits, removal of original Google Analytics tracking
- Original game systems: unchanged; no claim of new tracks/vehicles/physics
- Upstream files are fetched and copied during build; the full upstream source is not yet vendored in GitHub

## Known work before calling this game complete

1. Verify a successful Cloudflare Pages production build and the custom-domain certificate.
2. Play in current desktop browsers and document actual WebGL/runtime failures.
3. Audit asset-specific terms (especially CC BY-NC notices, third-party vehicle/track resources and sound attributions) before wider redistribution or commercial plans.
4. Vendor the complete permitted game source and assets for substantial engine/track/vehicle work.
5. Improve controls, performance, pause/retry flow, records and mobile quality after measuring actual gameplay.

No multiplayer, database, accounts, or analytics are required for this initial single-player build.
