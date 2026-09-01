# War Sim v0.4.3.10.2 — Software Quality Report

## Scope
Startup Composition Hotfix, built directly from the exact v0.4.3.10 UI Architecture Refactor Phase 6 package.

The v0.4.3.9 Phase 5 Inbox extraction accidentally removed `scrollToCareerTarget()` and `openOpportunityRecord()` from `src/app.js` while the achievement and Inbox controllers still referenced `openOpportunityRecord` during module initialization. That produced a startup `ReferenceError` before the initial render, leaving only the static HTML/CSS shell visible. v0.4.3.10 inherited the same defect because it was built on v0.4.3.9.

v0.4.3.10.2 preserves the restored composition-layer navigation callbacks from 0.4.3.10.1 and fixes the remaining browser-blocking startup defect: Phase 5 also imported `formatMilitaryDate` from the presentation toolkit while leaving the old same-name function declaration in `src/app.js`. Because `app.js` is loaded as an ES module, browsers reject that duplicate binding before any application code executes. The hotfix removes the stale duplicate and strengthens startup QA to parse `app.js` explicitly as an ES module. It preserves all Phase 5 and Phase 6 architecture work.

Runtime **0.4.3.10.2**, world schema **16**, save format **3**, generator **v3**.

## Containment
- No gameplay rule changes.
- No schema, save-format, generator, command, service, selector, or canonical-record changes.
- `src/app.js` keeps the two restored presentation/navigation callbacks required by existing controllers and removes only the stale duplicate `formatMilitaryDate` declaration.
- No Soldier Identity, Inbox, relationship, dialog, save, or simulation behavior is redesigned in this hotfix.
- `src/core/saveSystem.js` remains byte-identical with SHA-256 `c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`.
- All v0.4.3.10 Soldier Identity extraction work remains intact.

## Regression results
- 30/30 test suites PASS.
- 137/137 JS/MJS syntax checks PASS.
- `tests/startup-composition.mjs` PASS and now verifies both required opportunity-navigation wiring and explicit ES-module parsing of `app.js`.
- The previous classic-script-only syntax gate is supplemented by ES-module syntax validation, which catches duplicate module bindings before packaging.
- Quality harness PASS.
- 300 deterministic generated worlds PASS.
- 10,000-person stress/index audit PASS.
- Import graph, DOM integrity, deterministic RNG, save/storage, migrations, career-boundary, mobile UI, awards/identity, and architecture checks PASS.

## Device verification target
On iPhone/GitHub Pages, confirm the initial New Career screen renders immediately instead of showing only the header/background shell. Then create or load a career and open Career → Inbox / an opportunity notification to verify the restored navigation callback works in its intended path.
