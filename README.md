# War Sim v0.4.3.10.2 — Startup Composition Hotfix

War Sim v0.4.3.10.2 is built directly from the exact v0.4.3.10 UI Architecture Refactor Phase 6 package. It preserves all Phase 5 and Phase 6 architecture work while repairing a startup regression introduced in v0.4.3.9.

Runtime **0.4.3.10.2**, world schema **16**, save format **3**, generator **v3**.

## Hotfix scope

- Restored the composition-layer `scrollToCareerTarget()` and `openOpportunityRecord()` callbacks that were accidentally removed during the Phase 5 Inbox extraction.
- Those callbacks are required by the achievement and Inbox controllers during `app.js` initialization; their absence caused a `ReferenceError` before the initial render, leaving the HTML/CSS shell visible with a blank game body.
- Preserved the v0.4.3.10 Soldier Identity renderer extraction and all earlier modular UI work.
- Added a startup-composition regression test that verifies the required opportunity-navigation callbacks exist and remain wired into both controllers.

## Compatibility

No gameplay rules, world schema, save format, generator behavior, commands, services, selectors, canonical records, or save-system behavior changed. Existing schema-16/save-format-3 careers remain compatible and normalize to runtime version 0.4.3.10.2 through the existing same-schema migration path.

## QA

See `SOFTWARE_QUALITY_REPORT.md` for final exact-package verification.
