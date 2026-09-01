# War Sim v0.4.3.12 — Software Quality Report

## Release scope

v0.4.3.12 is UI Architecture Refactor Phase 8, built directly from the verified v0.4.3.11 baseline. Runtime **0.4.3.12**, world schema **16**, save format **3**, generator **v3**.

Scope is intentionally limited to extracting Current Situation / persistent world-context DOM presentation into `src/ui/render/situation.js`, removing redundant Unit/Personnel helper copies left in `src/app.js`, and updating structural regression tests and release metadata. Canonical gameplay and state mutation are unchanged.

## Verification results

- 34 / 34 test suites: PASS
- 143 / 143 JS/MJS files parsed under explicit ES-module grammar: PASS
- 109 runtime JS modules
- 241 relative-import references checked by import-closure QA: PASS
- 0 circular runtime imports
- 300 deterministic generated worlds validated by the quality harness
- 10,000-person index/stress audit: PASS
- unsafe runtime scan (`eval`, `new Function`, `document.write`, `innerHTML =`): PASS
- save/migration compatibility suites: PASS
- career-boundary integrity suites: PASS
- mobile navigation/UI regression suites: PASS
- startup composition and runtime-binding regression suites: PASS
- Situation / world-context presentation-boundary regression: PASS
- browser-runtime New Career startup: PASS
- browser-runtime career creation and Current Situation render: PASS

The browser-runtime gate executed the complete 103-module application graph in Chromium using the real `index.html` DOM. Before career creation it verified that **Start Your Service** was visible and the app error surface remained hidden. It then created a New Career and verified that the career UI became visible, the Current Situation strip rendered personnel/readiness/morale data, the persistent military date/training-phase context rendered, and the app error surface remained hidden.

## Refactor containment

`src/ui/render/situation.js` has no direct imports from commands, services, state, core, or selectors. Dependencies are supplied through the `src/app.js` composition root.

`src/app.js` remains responsible for:

- canonical store/index access
- overall render orchestration
- navigation and commands
- Unit/Personnel selection state
- UI-controller composition

The Situation renderer owns only the DOM construction and local read-only aggregation necessary to present the situation strip.

## Size change

- v0.4.3.11 `src/app.js`: 67,134 bytes / 678 lines
- v0.4.3.12 `src/app.js`: 63,706 bytes / 641 lines
- new `src/ui/render/situation.js`: 4,229 bytes / 103 lines

## Save-system invariant

`src/core/saveSystem.js` SHA-256 remains:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`

No world-schema, save-format, or generator-version bump was required.
