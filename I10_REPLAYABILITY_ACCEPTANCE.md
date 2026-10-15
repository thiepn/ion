# ION Improvement Phase 10 — Authentic Replayability and Personal Bests

**Verified parent:** Phase 09 draft PR #25 `fix/ion-i09-original-race-events-splits`, exact `cbf8205e46d2c446a8832fa8778e90bdd77a019e`. **Child:** `fix/ion-i10-authentic-lap-challenges`. No merge or manual production deploy.

## Implemented in original source

1. **False personal-best event repaired:** I09 compared each completed lap with the *start-of-run* best, so a slower lap 2 could incorrectly say PERSONAL BEST if it beat yesterday's record while losing to lap 1. The original `RaceEngine` now compares against the **current official `bestLap` before updating it**; the record remains stored only under original `ion-i06-nightshift-best-lap`. A separate race-local baseline provides truthful difference-versus-prior-record comparisons without affecting the official scorer.
2. **Real clean-lap challenge:** A completed lap is marked clean only when the original engine recorded no qualifying guardrail shield hit and no successful checkpoint recovery during that lap. Real recovery after a physically earned S1 marks that lap unclean; the flag resets naturally when the original forward finish transitions to the next lap. It is deliberately described as “no rail damage/recovery,” not a certified perfect racing line.
3. **Real boost-strip challenge:** The only way `lapEarnedPads` increases is within the **existing canonical physical source-pad award branch** after source projector, forward travel, position, anti-farming and speed checks. It resets only after an officially completed lap. A displayed 3/3 is from three physically earned strips, never a synthetic reward/score.
4. **Race-local results:** `completedLapChallenges` captures a shallow immutable snapshot of clean/pad/record difference when the same original three-lap scorer finishes a lap; it is deep-copied into `RaceSnapshot`. No persistent challenge records, new online service, alternate grades, speculative time targets or guessed ghosts.
5. **Real interface:** Existing menu states challenge choices (beat the *real* stored PB, a clean lap, 3 earned strips). During play, the current lap displays “clean so far” and actual pad count; earned original lap event banners celebrate clean and pad status; results present all three lap statuses and actual signed differences from the record before the run. Existing I09 split timings, source-owned lap times, finish record and mobile scrollable view stay authoritative.
6. **No ghost:** Current source has no verified, privacy-reviewed complete-lap trajectory recording. A ghost is intentionally **NOT_IMPLEMENTED**, rather than inventing a path or adding uncontrolled storage.

## Executed exact-source evidence

`scripts/i10-authentic-replayability.mjs` executes the actual original `RaceEngine` and `track.ts` using the project's existing esbuild, then issues only normal racing inputs and a genuinely authorized `recover()` after physically earning S1. It directly reads official state and **never sets** checkpoint, lap, official score, boost reward or personal-best fields.

At code commit `e5118848242ef484a56390f77d1d204ac0e7ad3c`, authenticated Cloudflare branch build logs showed:

- **PASS** actual S1 recovery affects only one lap's cleanliness.
- **PASS** physical pad awards 3/3/3 and official lap times **113.15 / 130.80 / 107.45 seconds**.
- **PASS** intentionally slower lap 2 (130.80 s vs lap 1 113.15 s) did **not** claim PB, despite beating a real 240 s starting record; only **two** legitimately faster PB events.
- **PASS** result snapshot cannot mutate authoritative challenge state.
- **PASS** restart clears run-local challenge state but retains legitimate persisted best; **20,785** physics updates.
- **PASS** inherited original I05–I09 engine/geometry/collision/recovery/legitimate three-lap/scoring/guidance tests.
- **PASS** TypeScript and Vite build (3.63 s).

**Failure history preserved:** the first I10 Cloudflare attempt at `56f53cd` cloned the source but returned a generic build-command error without any build-command log output. The later `77b14a4` build executed all I10 gameplay checks PASS but correctly **FAILED** TypeScript with `App.tsx:688 TS1005 '}' expected`. The missing JSX close was fixed in `e511884`, which passed original-engine checks and TypeScript/Vite. Final report-only head must be checked separately.

## Still not tested

- Actual authenticated desktop/mobile Chromium and WebGL gameplay, screenshots, HUD and finish visual usability, real two-thumb steering, mouse/keyboard/controller, actual GPU frame time, touch focus.
- Human feel of the three-lap course, difficulty and fairness of challenges, replay incentive, actual collision/boost legibility and assistive technology.
- There is Chromium on the local runtime, but **no executable exact-head ION checkout/dependencies in `/mnt/data` and no resolvable GitHub/Cloudflare preview** from this runtime. Headless Node `RaceEngine` tests are not browser screenshot or physical-controller acceptance. Mark **BLOCKED/NOT_TESTED**, not PASS.

## Preservation

Original Kestrel/Rift, 14 Kenney CC0 GLB assets, original `RaceEngine`, road projector, 1,820.8 m circuit, lap/scoring and best-lap authorities, no extra storage/services, all Phase I01–I09 improvements, historical source IDs and PRs. `main` and production stay unchanged; no merges, credentials, paid services or intentional production deploys.
