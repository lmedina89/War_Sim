# War Sim v0.4.3.1 — Software Quality Report

## Release identity

Runtime: **0.4.3.1**  
World schema: **16**  
Save format: **3**  
Generator: **v3**  
Release focus: **Mobile App UX Overhaul**

## Scope reviewed

This release was reviewed as a presentation/navigation refactor on top of the exact packaged v0.4.3 baseline. The intended constraint was to preserve the existing military art direction and canonical simulation architecture while reducing excessive mobile scrolling and browser-like page length.

Production changes are narrowly limited to `index.html`, `src/app.js`, `src/ui/styles.css`, plus runtime-version normalization in `src/state/initialState.js` and `src/core/migrations.js`. No award, equipment, qualification, career-rule, world-generation, scheduler, persistence-format, or combat-profile logic was redesigned for this release.

## UX implementation reviewed

Career content is partitioned into Home, Actions, Soldier, Records, and Inbox screens. Unit content is partitioned into Unit, Roster, Ready, and Admin screens. Personnel is partitioned into Roster and Bonds. These are presentation-only visibility states; the original DOM targets remain mounted exactly once so existing render functions continue to update the same canonical views.

Soldier Identity received a second-level focused navigation layer: Uniform, Loadout, Awards, Catalog, and Record. Existing v0.4.3 uniform artwork, SVG insignia, award cards, loadout profile, catalog, and DD214-style preview are preserved and are now shown one view at a time instead of being vertically stacked.

Sub-screen choices use local UI state only. Opportunity navigation resolves the target's owning Career screen before focusing it, and Unit-to-Personnel navigation explicitly opens the Roster screen. New careers reset to Career Home.

## QA results

**PASS — 16/16 test scripts.**

The dedicated `mobile-app-navigation.mjs` suite verifies:

- all Career, Unit, Personnel, and Soldier Identity navigation targets exist;
- every major legacy render target remains mounted exactly once;
- DOM IDs remain unique after regrouping;
- presentation screen state is handled outside canonical world state;
- Soldier Identity contains Uniform/Loadout/Awards/Catalog/Record focused views;
- sticky app-style tab navigation and 44px touch targets are present;
- hidden screens are actually removed from layout;
- reduced-motion support remains present;
- no unsafe `innerHTML` assignment was introduced.

The existing full suite also passes, including:

- 300 deterministic generated-world validations;
- 10,000-person index stress audit;
- deterministic RNG audit;
- import graph integrity;
- DOM integrity;
- selector/index audit;
- world migration and same-schema runtime normalization;
- save-storage regression coverage;
- awards/soldier-identity progression and display integration;
- service-record and qualification-history regression coverage;
- living-career, living-unit, training, capability, and gameplay smoke tests;
- existing mobile disclosure and cross-navigation tests.

All **107 JS/MJS files** under `src/` and `tests/` pass `node --check`.

Static source audit found no `eval`, `new Function`, `innerHTML` assignment, or `document.write` usage in source JavaScript.

## Compatibility assessment

World schema remains **16** and save format remains **3**. The release changes runtime version metadata to 0.4.3.1 but does not require canonical-record migration for the UI refactor. Existing v0.4.3 saves remain structurally compatible and normalize through the existing same-schema migration path.

## Known deferred issues

The known v0.4.2.2 persistence-resilience findings were intentionally not addressed in this release per product direction. In particular, corrupted save-index reconstruction and automatic manual-backup recovery remain unresolved. Previously identified validator-hardening and transaction-safety items also remain future stability scope.

## Environment note

The automated Node-based suites and static audits completed successfully. A supplementary Chromium headless smoke attempt could not complete in the current container because the browser process did not terminate under the available headless environment; it produced no application-specific failure signal and was not counted as a passed browser test. Release approval therefore rests on the deterministic application regression suite, DOM/static integrity checks, and syntax/import audits listed above rather than claiming a browser automation pass that did not occur.

## Release decision

**Approved for v0.4.3.1 packaging.** The refactor substantially reduces top-level mobile page length while preserving the v0.4.3 visual identity and canonical simulation architecture. The change set is isolated to presentation/navigation plus version normalization, and all 16 application regression suites pass.
