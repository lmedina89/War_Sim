# War Sim v0.4.3.13 — UI Architecture Refactor Phase 9

War Sim v0.4.3.13 is built directly from the verified v0.4.3.12 Phase 8 baseline. Runtime **0.4.3.13**, world schema **16**, save format **3**, generator **v3**.

This is a refactor-only release. It does not intentionally change gameplay, simulation rules, save data, career progression, world generation, RNG behavior, or canonical records.

## Phase 9: Service Career / retention presentation boundary

The Service Career contract and reenlistment-offer DOM presentation has been extracted from `src/app.js` into:

- `src/ui/render/serviceCareer.js`

The extracted renderer owns presentation for:

- component / MOS / career-field contract summary
- contract start / ETS / days remaining / bonus fields
- reenlistment-window button presentation
- open reenlistment offer cards
- service-period history list

Canonical selectors and mutations remain outside the renderer. `src/app.js` injects `selectServiceCareer`, presentation helpers, registries, and the callback that ultimately invokes the canonical reenlistment command. The module imports no commands, services, state, core, or selectors directly.

## Architecture result

`src/app.js` changed from **63,706 bytes / 641 lines** in v0.4.3.12 to **61,666 bytes / 627 lines** in v0.4.3.13.

A new `tests/service-career-module.mjs` protects the extraction boundary.

## Verification policy

The release gate includes:

- all automated test suites
- explicit ES-module parsing for browser-loaded `.js`
- relative-import closure checks
- circular-import detection
- deterministic 300-world quality validation
- 10,000-person stress/index audit
- static unsafe-runtime scan
- clean extraction of the final ZIP followed by the same automated verification

Real-device acceptance remains part of the checkpoint process before beginning the next refactor phase.

## Compatibility

World schema remains **16**. Save format remains **3**. Generator remains **v3**. `src/core/saveSystem.js` is unchanged and retains SHA-256:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`
