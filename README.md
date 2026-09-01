# War Sim v0.4.3.12 — UI Architecture Refactor Phase 8

War Sim v0.4.3.12 is built directly from the verified v0.4.3.11 Phase 7 baseline. Runtime **0.4.3.12**, world schema **16**, save format **3**, generator **v3**.

This is a refactor-only release. It does not intentionally change gameplay, simulation rules, save data, career progression, world generation, or canonical records.

## Phase 8: Situation / world-context presentation boundary

The top-level current-situation and persistent world-context presentation has been extracted from `src/app.js` into:

- `src/ui/render/situation.js`

The extracted renderer owns DOM presentation for:

- the persistent military date / training-phase context
- the Current Situation identity header
- formation insignia presentation
- duty, personnel strength, readiness, and morale metrics
- local presentation-only unit-strength aggregation used by the Situation strip

Selectors, registries, insignia factories, and presentation primitives are injected by `src/app.js`; the renderer imports no commands, services, state, core, or selectors directly.

Phase 8 also removes stale Unit/Personnel helper copies left behind in `src/app.js` after Phase 7. `app.js` now reuses `unitPersonnelRenderer.playerAssignmentUnitId` rather than maintaining a second assignment helper.

## Architecture result

`src/app.js` changed from **67,134 bytes / 678 lines** in v0.4.3.11 to **63,706 bytes / 641 lines** in v0.4.3.12.

`src/ui/render/situation.js` is **4,229 bytes / 103 lines**.

A new `tests/situation-module.mjs` protects the extraction boundary, and existing situation/smoke tests were updated to follow the code to its canonical module rather than weakening coverage.

## Verification policy

The release gate retains the startup protections added after the Phase 5/6 startup regression:

- explicit ES-module parsing
- relative-import closure checks
- circular-import detection
- full deterministic/stress quality harness
- browser-runtime startup execution
- browser-runtime New Career creation with a rendered Current Situation strip
- clean extraction of the final ZIP followed by the same verification

## Compatibility

World schema remains **16**. Save format remains **3**. Generator remains **v3**. `src/core/saveSystem.js` is unchanged and retains SHA-256:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`
