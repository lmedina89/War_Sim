# War Sim v0.4.3.13 — Software Quality Report

## Release scope

v0.4.3.13 is UI Architecture Refactor Phase 9, built directly from the verified v0.4.3.12 baseline. Runtime **0.4.3.13**, world schema **16**, save format **3**, generator **v3**.

Scope is intentionally limited to extracting Service Career / retention DOM presentation into `src/ui/render/serviceCareer.js` and updating structural regression coverage and release metadata. Canonical gameplay, state mutation, save behavior, RNG, progression, and simulation rules are unchanged.

## Verification results

- 35 / 35 automated test suites: PASS
- 145 / 145 JS/MJS files parsed with browser `.js` checked under explicit ES-module grammar: PASS
- 110 runtime JS modules
- 242 relative-import references checked: PASS
- 0 missing relative-import targets
- 0 circular runtime imports
- 300 deterministic generated worlds validated
- 10,000-person stress/index audit: PASS
- static unsafe-runtime scan (`eval`, `new Function`, `document.write`, `innerHTML =`): PASS
- save/migration compatibility suites: PASS
- career-boundary integrity suites: PASS
- mobile navigation/UI regression suites: PASS
- startup composition/runtime-binding suites: PASS
- Service Career presentation-boundary regression: PASS

The current container's direct headless-Chromium screenshot command did not terminate reliably, so this report does **not** claim a new automated browser-screenshot pass for Phase 9. The source/package startup protections, ES-module/import-closure checks, and automated suites all pass; the release still requires the normal real-device acceptance check before Phase 10 begins.

## Refactor containment

`src/ui/render/serviceCareer.js` has no direct imports from commands, services, state, core, or selectors. Dependencies are supplied through `src/app.js`.

`src/app.js` remains responsible for canonical store/index access, render orchestration, commands, save/autosave, navigation, and state mutation. The extracted renderer only builds Service Career and reenlistment presentation and calls an injected acceptance callback.

## Size change

- v0.4.3.12 `src/app.js`: 63,706 bytes / 641 lines
- v0.4.3.13 `src/app.js`: 61,666 bytes / 627 lines

## Save-system invariant

`src/core/saveSystem.js` SHA-256 remains:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`

No world-schema, save-format, or generator-version bump was required.
