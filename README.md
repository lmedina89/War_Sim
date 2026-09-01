# War Sim v0.4.3.5 — UI Architecture Refactor Phase 2

War Sim v0.4.3.5 is a refactor-only release built directly from the verified v0.4.3.4 UI Architecture Refactor Phase 1 checkpoint. It keeps world schema **16**, save format **3**, and generator **v3**. No canonical gameplay rules, career progression, world generation, save format, combat/deployment systems, MOS starts, or interactive-duty features were added in this release.

Runtime **0.4.3.5**, world schema **16**, save format **3**, generator **v3**.

## v0.4.3.5 changes

### UI architecture Phase 2 — Save Manager extraction

- Added `src/ui/dialogs/saveManager.js` as a presentation-only controller for the Save Manager dialog.
- The extracted module owns Save/Load mode presentation, save-slot card construction, button wiring, confirmation flow delegation, dialog opening/closing, and re-rendering after successful save/delete actions.
- Canonical persistence behavior remains in the composition root: `src/app.js` still owns world validation, calls to `saveToSlot`, `loadFromSlot`, and `deleteSaveSlot`, state replacement, post-load career-objective refresh, and status/error reporting.
- The Save Manager module receives persistence actions through injected callbacks and does **not** import commands, services, state, core persistence, or validation infrastructure.
- `src/app.js` shrank from **126,116 bytes** in v0.4.3.4 to **124,688 bytes** in v0.4.3.5. Its physical line count increases because the retained persistence callbacks are now expanded into readable multi-line code instead of compressed one-line handlers.
- Added `tests/save-manager-module.mjs` for isolated Save Manager presentation/interaction regression coverage.
- Expanded `tests/ui-module-integrity.mjs` with Phase-2 dependency-boundary checks and a tighter `app.js` size ceiling.

## Compatibility

- World schema remains **16**.
- Save format remains **3**.
- Generator remains **v3**.
- Existing v0.4.3.4 and earlier schema-16 saves continue through the existing same-schema normalization path.
- `src/core/saveSystem.js` is byte-identical to the stabilized baseline; the refactor does not alter save payloads, keys, checksums, slots, or migration semantics.
- `index.html` retains the same DOM contract. Only visible runtime version text changes from v0.4.3.4 to v0.4.3.5.

## QA summary

The final package is accepted only after all legacy suites plus the new Save Manager/module-boundary tests pass from a freshly extracted ZIP. See `SOFTWARE_QUALITY_REPORT.md` for exact-package verification results.

## Still intentionally out of scope

This release does not add deployments/combat, new MOS career starts, Ranger/Special Forces selection pipelines, deep equipment, interactive schools, campaign generation, or the reusable interactive duty/event framework planned for a later feature release.
