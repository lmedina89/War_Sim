# War Sim v0.4.3.8 — Software Quality Report

## Release identity

- Version: **0.4.3.8 — UI Architecture Refactor Phase 4**
- Baseline: exact verified **v0.4.3.7** package
- World schema: **16**
- Save format: **3**
- Generator: **v3**

## Scope

This is a refactor-only release. It extracts the generic result/AAR, achievement notification, and confirmation dialog responsibilities from `src/app.js` into isolated UI controllers:

- `src/ui/dialogs/resultDialog.js`
- `src/ui/dialogs/achievementDialog.js`
- `src/ui/dialogs/confirmDialog.js`

No gameplay feature, canonical career rule, scheduler rule, world-generation rule, command/service behavior, save format, schema, definition content, or mobile CSS behavior was redesigned.

`src/app.js` remains the composition root and injects state/registry/presentation dependencies into the new UI controllers. The extracted dialog modules do not directly import commands, services, state, core, or selectors.

## app.js reduction

- v0.4.3.7 baseline: **115,299 bytes / 809 physical lines**
- v0.4.3.8: **103,524 bytes / 785 physical lines**
- Reduction: **11,775 bytes** from the controller hotspot

The extracted code is not deleted; it is reorganized into focused modules with explicit dependency injection.

## Automated QA

- **27/27 test suites PASS**
- **129/129 JS/MJS files pass `node --check`**
- Quality harness: **PASS**
- Runtime source modules reported by quality harness: **102**
- Deterministic generated worlds: **300 PASS**
- Synthetic index stress: **10,000 people PASS**
- Import graph integrity: **PASS**
- DOM integrity: **PASS**
- Deterministic RNG audit: **PASS**
- Selector/index audit: **PASS**
- Schema 12/13 and same-schema migration checks: **PASS**
- Canonical scheduler/opportunity/orders/readiness checks: **PASS**
- Static source scan rejects `eval`, `new Function`, `document.write`, and runtime `.innerHTML =`: **PASS**
- Circular relative-import audit across `src/`: **0 cycles**
- Extracted dialog canonical-layer boundary audit: **PASS**

The dedicated `tests/dialog-controllers-module.mjs` suite exercises:

- confirmation-dialog resolution through native dialog `returnValue`;
- achievement filtering, queueing, mark-read behavior, and opportunity handoff;
- time-advance result presentation;
- focused-activity AAR presentation;
- scheduled-duty AAR presentation;
- decision-outcome presentation;
- absence of direct canonical-layer imports and unsafe `innerHTML` assignment in the new dialog modules.

Existing regression tests that formerly asserted AAR/achievement presentation strings inside `app.js` were redirected to the extracted modules. The checks were preserved rather than removed.

## Baseline diff review

Recursive comparison against the exact v0.4.3.7 baseline found runtime changes only in the intended files:

- `src/app.js`
- `src/ui/dialogs/resultDialog.js` (new)
- `src/ui/dialogs/achievementDialog.js` (new)
- `src/ui/dialogs/confirmDialog.js` (new)
- runtime-version normalization/display files: `src/core/migrations.js`, `src/state/initialState.js`, `index.html`

Commands, services, selectors, data definitions, CSS, save implementation, and the remaining runtime modules are unchanged from v0.4.3.7.

`src/core/saveSystem.js` SHA-256 remains:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`

## Release assessment

**PASS.** v0.4.3.8 is suitable as the next UI-architecture checkpoint, subject to the normal quick real-device smoke test of result/AAR, achievement, and confirmation dialogs on the target iPhone browser.
