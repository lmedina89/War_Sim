# War Sim v0.4.3.4 — UI Architecture Refactor Phase 1

War Sim v0.4.3.4 is a refactor-only release built directly from the verified v0.4.3.3.2 Career Boundary Integrity Hotfix. It keeps world schema **16**, save format **3**, and generator **v3**. No canonical gameplay rules, career progression, world generation, save format, combat/deployment systems, MOS starts, or interactive-duty features were added in this release.

Runtime **0.4.3.4**, world schema **16**, save format **3**, generator **v3**.

## v0.4.3.4 changes

### UI architecture Phase 1

- Centralized static DOM lookups in `src/ui/dom.js`; existing HTML IDs and mounted DOM targets are unchanged.
- Centralized best-effort UI-only persistence in `src/ui/uiStorage.js`, including disclosure state, archive state, and Soldier Identity tab persistence. Storage failures remain non-fatal and cannot modify canonical world state.
- Extracted primary-view and Career/Unit/Personnel subscreen navigation to `src/ui/navigation.js`. The module owns only presentation state and does not import commands, services, canonical state, or core mutation infrastructure.
- `src/app.js` remains the composition/controller root and continues to own gameplay orchestration and rendering. Phase 1 reduces it from roughly 133 KB to roughly 126 KB without changing its canonical simulation contract.
- Existing navigation tests were updated to verify the new module boundary rather than requiring navigation functions to physically remain inside `app.js`.
- Added `tests/ui-module-integrity.mjs` to guard DOM-registry integrity, UI-module dependency boundaries, resilient storage behavior, navigation behavior, and an `app.js` size-regression ceiling.

## Compatibility

- World schema remains **16**.
- Save format remains **3**.
- Existing v0.4.3.3.2 saves load through the same same-schema normalization path and are stamped with the current runtime version on migration/load normalization.
- `index.html` retains the same application DOM contract; no gameplay-render target was renamed or removed.

## Preserved v0.4.3.3.2 fixes

The Career Boundary Integrity protections remain intact: active-service guards, ETS/activity boundary enforcement, correct pending-to-active reenlistment transitions, cumulative bonus accounting, ownership/invariant validation, terminal-status cleanup, and same-schema repair of older career-boundary states.

## QA summary

See `SOFTWARE_QUALITY_REPORT.md` for the exact-package results. This release is accepted only if every legacy suite plus the new UI architecture suite passes from the final packaged tree.

## Still intentionally out of scope

This release does not add deployments/combat, new MOS career starts, Ranger/Special Forces selection pipelines, deep equipment, interactive schools, campaign generation, or the reusable interactive duty/event framework planned for a later feature release.
