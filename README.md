# War Sim v0.4.3.9 — UI Architecture Refactor Phase 5

War Sim v0.4.3.9 is built directly from the verified v0.4.3.8 UI Architecture Refactor Phase 4 checkpoint. This release continues the conservative `src/app.js` decomposition by extracting reusable presentation primitives, relationship-card rendering, and presentation-only history archive controls into focused UI modules.

Runtime **0.4.3.9**, world schema **16**, save format **3**, generator **v3**.

## Phase 5 scope

- Added `src/ui/presentation.js` for shared DOM presentation primitives and formatting helpers used across the UI.
- Added `src/ui/render/relationships.js` for relationship-card and trust/respect/rapport meter rendering.
- Added `src/ui/historyArchive.js` for presentation-only archive/show-more controls backed by the existing resilient UI-storage layer.
- Added `src/ui/render/inbox.js` for dispatch-card, badge, and Inbox action presentation while canonical notification selection/mutation remains injected from `app.js`.
- Kept `src/app.js` as the composition root. It injects registries, DOM targets, callbacks, and canonical actions rather than moving simulation ownership into the extracted modules.
- Added `tests/presentation-modules.mjs` and strengthened UI architecture checks around the new module boundaries.
- Updated older structural tests to verify behavior at the new module locations instead of assuming those helpers live physically inside `app.js`.

## Compatibility

No gameplay rules, world schema, save format, generator, commands, services, selectors, or save-system behavior were redesigned. Existing schema-16/save-format-3 careers remain compatible and normalize to runtime version 0.4.3.9 through the existing same-schema migration path.

## QA

See `SOFTWARE_QUALITY_REPORT.md` for exact packaged verification results.
