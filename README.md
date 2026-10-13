# ION — Anti-Gravity Racing

**ION** is a standalone browser racing game based on [HexGL](https://github.com/BKcore/HexGL) by Thibaut Despoulain (BKcore).

- Site: https://ion.thiepn.dev
- Hosting: Cloudflare Pages
- Source of original game: `BKcore/HexGL`, pinned to commit `6addc95a2fce3bf05f4d751823cc054c61a16d68`
- Production branch: `main`
- Pages build command: `bash scripts/build.sh`
- Pages output directory: `dist`
- Root directory: repository root

## How it works

The Pages build fetches an **exact pinned upstream revision** of HexGL, copies its complete static browser game to `dist/`, then applies the ION UI/metadata overrides from `ion/`. There is no database and no external gameplay service needed for the original racing experience. The game's original source and asset files are **not yet checked in to this repository**. Keeping an immutable pinned upstream is a temporary bootstrap mechanism; future work should vendor the vetted assets/source into the repository to make original-game changes directly.

This setup is intended to make the existing game playable, not to claim that ION is a rewritten engine or that its modern-browser compatibility has been verified.

## Licensing and credits

HexGL's README states that code and resources are MIT **unless specified in an individual file**. Some files contain different notices, for example `bkcore/hexgl/HexGL.js` names **CC BY-NC 3.0**, and `audio/LICENSE` documents CC BY 3.0 samples and public-domain effects. Original vehicle, texture, and font rights must be reviewed before commercial use or asset redistribution beyond the permissions their authors granted.

The generated site retains the original `LICENSE`, `audio/LICENSE`, source headers, and in-game creator credits, and adds `ion/credits.html`. Do not strip original notices. **Do not assume the complete game is cleared for commercial use.**

## Local build

Requires Git, Node.js, Bash, and tar, with internet access to fetch the pinned upstream:

```bash
bash scripts/build.sh
npx serve dist
```

Open the local address printed by the server. Do not use the `file://` protocol for the game because WebGL assets load over HTTP.

## Development

- Edit `ion/ion.css` for styling.
- Edit `scripts/brand.mjs` for changes to the HTML shell.
- For gameplay/physics modification, first vendor the complete upstream source and assets instead of continuing to layer brittle string patches.
- On each push to `main`, Pages should deploy automatically after GitHub integration is enabled.

