# War Sim v0.4.3.8 — UI Architecture Refactor Phase 4

War Sim v0.4.3.8 is built directly from the verified v0.4.3.7 consolidated mobile-hardening checkpoint. This release continues the conservative `src/app.js` decomposition by extracting the generic result/AAR, achievement notification, and confirmation dialog controllers into isolated UI modules.

Runtime **0.4.3.8**, world schema **16**, save format **3**, generator **v3**.

## Refactor scope

New UI modules:

- `src/ui/dialogs/resultDialog.js` — activity AARs, unit-duty AARs, decision outcomes, and time-advance summaries.
- `src/ui/dialogs/achievementDialog.js` — high-visibility career/award/promotion notification queue and opportunity handoff.
- `src/ui/dialogs/confirmDialog.js` — native confirmation-dialog promise contract.

`src/app.js` remains the composition root. It still owns the state store, canonical selectors/commands/services, save/load behavior, command execution, autosave, and preparation of registry/state dependencies injected into the dialog controllers.

The extracted dialog modules do not import commands, services, selectors, state, or core simulation modules directly. They receive presentation data and callbacks through controller construction.

## Compatibility

There is no world-schema change and no save-format change. Existing schema-16/save-format-3 careers remain compatible and normalize to runtime version 0.4.3.8 through the existing same-schema migration path.

No gameplay feature, career rule, scheduler rule, promotion rule, reenlistment behavior, definition content, world generation, persistence format, or mobile layout redesign is included in this refactor.

## QA

The package includes a dedicated `tests/dialog-controllers-module.mjs` suite that exercises confirmation resolution, achievement filtering/queueing/read handling/opportunity handoff, time-advance summaries, focused-activity AAR rendering, unit-duty AAR rendering, and decision outcome rendering using a minimal DOM contract.

The complete packaged QA results are documented in `SOFTWARE_QUALITY_REPORT.md`.
