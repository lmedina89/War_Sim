# War Sim v0.4.3.11 — Software Quality Report

## Release scope

v0.4.3.11 is UI Architecture Refactor Phase 7, built from the verified v0.4.3.10.3 baseline. Runtime **0.4.3.11**, world schema **16**, save format **3**, generator **v3**.

Scope is intentionally limited to extracting Unit / Personnel DOM presentation from `src/app.js` into `src/ui/render/unitPersonnel.js`, plus tests and release-version metadata. Canonical gameplay/state mutation remains outside the new renderer.

## Verification results

- 33 / 33 test suites: PASS
- 141 / 141 JS/MJS files parsed under explicit ES-module grammar: PASS
- 108 runtime JS modules
- 240 relative-import references checked by package import-closure QA: PASS
- 0 circular runtime imports
- 300 deterministic generated worlds validated by the quality harness
- 10,000-person index/stress audit: PASS
- unsafe runtime scan (`eval`, `new Function`, `document.write`, `innerHTML =`): PASS through the quality suite
- save/migration compatibility suites: PASS
- career-boundary integrity suites: PASS
- mobile navigation/UI regression suites: PASS
- startup composition and runtime-binding regression suites: PASS
- Unit/Personnel presentation-boundary regression: PASS

## Refactor containment

The new `src/ui/render/unitPersonnel.js` has no direct imports from commands, services, state, core, or selectors. Dependencies and canonical actions are supplied through the composition root.

`src/app.js` remains the owner of:

- selected Unit state
- Personnel filter state
- state store and indexes
- Unit duty command invocation
- primary-view navigation
- Person Profile opening
- UI-history controller composition

## Size change

- v0.4.3.10.3 `src/app.js`: 80,411 bytes / 722 lines
- v0.4.3.11 `src/app.js`: 67,134 bytes / 678 lines
- new `src/ui/render/unitPersonnel.js`: 19,850 bytes / 442 lines

## Save-system invariant

`src/core/saveSystem.js` SHA-256 remains:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`

No world-schema, save-format, or generator-version bump was required.
