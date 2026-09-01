# War Sim v0.4.3.11 — UI Architecture Refactor Phase 7

War Sim v0.4.3.11 is built directly from the verified v0.4.3.10.3 startup-recovery baseline. Runtime **0.4.3.11**, world schema **16**, save format **3**, generator **v3**.

This is a refactor-only release. It does not intentionally change gameplay, simulation rules, save data, career progression, world generation, or canonical records.

## Phase 7: Unit / Personnel presentation boundary

The Unit and Personnel presentation layer is now extracted to `src/ui/render/unitPersonnel.js`.

The extracted renderer owns DOM presentation for:

- Unit organization browsing and breadcrumbs
- selected-unit command header and formation identity
- Unit roster presentation
- Personnel browser cards and readiness indicators
- readiness-component and capability presentation
- Unit history presentation and UI-only archiving controls
- command-authority presentation and schedule-duty buttons
- order-card presentation and Unit cross-navigation

`src/app.js` remains the composition/controller root. It still owns `selectedOrganizationUnitId` and `personnelFilterUnitId`, canonical store access, navigation composition, and all state-changing commands. The renderer receives selectors, services, presentation helpers, and mutation/navigation callbacks through dependency injection rather than importing canonical command/state infrastructure directly.

## Architecture result

`src/app.js` changed from **80,411 bytes / 722 lines** in v0.4.3.10.3 to **67,134 bytes / 678 lines** in v0.4.3.11.

A new `tests/unit-personnel-module.mjs` protects the extracted presentation boundary. A new `tests/module-import-closure.mjs` verifies that every relative runtime module import resolves to an actual packaged source file.

The previous browser-startup regression protections remain in place, including the startup composition and runtime-binding tests.

## Compatibility

World schema remains **16**. Save format remains **3**. Generator remains **v3**. `src/core/saveSystem.js` is unchanged and retains SHA-256:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`
