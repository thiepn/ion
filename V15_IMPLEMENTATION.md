# ION V15 — Opt-in race audio from original game state

**Parent:** V14 draft PR #13, branch `feature/ion-v14-lap-credit-course-recovery`, exact SHA `6c77d72608964254b4d680b23fd0428edf94bd00`. Implemented separately on `feature/ion-v15-optional-race-audio-cues`.

## Implementation

- Adds `src/audio.ts`: a small Web Audio synthesizer activated **only by a deliberate AUDIO ON click**; sound starts off on every browser session and uses neither third-party samples nor web requests.
- The original `RaceEngine.snapshot()` continues to determine all outcomes. Its speed, boost state, earned sector, credited lap, temporary pad surge, rail impact, and actual finish/destruction drive subtle motor pitch/volume and brief audio cues. No second lap timer, collision model, checkpoint writer, authoritative state store, or record is created.
- An explicit AUDIO ON/OFF header control with `aria-pressed` works in the menu and race, and an unavailable-audio notice leaves the game playable. The help panel explains the opt-in mode; the footer no longer advertises audio as merely planned.
- Start/restart, pause, tab visibility, graphics interruption and return to menu update the synthesized motor through existing `refresh` snapshots; non-racing state is silent. The synthesizer cleans up its context on unmount and can reactivate after React StrictMode development effect cleanup.
- Synthesized output is bounded to low gain; no external dependency, new artwork, telemetry, persistent permission or global keyboard shortcut is introduced. The original 14 pinned Kenney CC0 spacecraft/environment assets, Kestrel/Rift, all three laps and quarter-sector authority remain unchanged.

## Constraints / verification

Only repository source was accessible through the GitHub connector. No exact native checkout, TypeScript compiler, Vite, WebGL browser, headphones, physical controller, mobile touch browser or frame-time profiler was available here. Do not claim that live audio or a three-lap race was tested. At most, hosted branch previews may run a real build; inspect preview status before release.

Audio cues are driven by the existing 10 Hz published race snapshots. Very closely spaced events may coalesce between snapshots; a dedicated authenticated physics event queue would be needed for sample-accurate cue delivery, but is outside this scope. No merges, production deployments, main changes, credentials or paid resources.
