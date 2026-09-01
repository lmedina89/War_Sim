# War Sim v0.4.3.15 — Software Quality Report

## Release

v0.4.3.15 is UI Architecture Refactor Phase 11, built directly from the verified v0.4.3.14 baseline. Runtime **0.4.3.15**, world schema **16**, save format **3**, generator **v3**.

## Scope containment

The only architectural feature change is extraction of Career Gameplay / Actions presentation into `src/ui/render/careerGameplay.js`.

State mutation and gameplay behavior remain in canonical command/service/store layers. The new renderer receives presentation helpers, selectors, UI-archive functions, and command callbacks by dependency injection. It has no direct imports from commands, services, state, or the state store.

## Source-tree verification

- JS/MJS test suites: **37/37 PASS**
- ES-module syntax checks: **149/149 PASS**
- Relative import targets checked: **447**, missing: **0**
- Runtime source modules: **112**
- Circular imports: **0**
- Deterministic generated worlds validated: **300**
- Stress population: **10,000 people**
- Unsafe runtime-code scan (`eval`, `new Function`, `document.write`, `innerHTML =`): **0 hits**
- Save-system SHA-256: `c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9` (unchanged)

## Browser regression

App-wide Chromium regression on the Phase 11 worktree: **74/74 PASS**.

Coverage includes:

- startup and New Career creation
- Career Home / Actions / Soldier / Records / Inbox
- all Soldier Identity tabs
- Unit / Personnel / Orders / More navigation
- Personnel profile dialog and Unit→Personnel navigation
- Save Manager and Load Manager presentation
- focused activity execution and AAR
- 1-day, 7-day, and 30-day advancement
- achievement dialogs
- Inbox acknowledge/archive/open-opportunity/mark-all-read/clear-read actions
- contract/reenlistment presentation
- Career Record / Promotion / Education & Awards / Service Record
- Phase 11 Career Gameplay presentation: objectives, current duty, next-30-days, duty schedule, opportunities, school catalog, skills, activity cards
- app-error surface hidden
- browser page exceptions: **0**
- browser console errors: **0**

## app.js reduction

- v0.4.3.14: **52,148 bytes / 609 lines**
- v0.4.3.15: **33,373 bytes / 495 lines**

## Package verification

The final release ZIP must be extracted to a fresh directory and the full test, syntax/import, deterministic/stress, security, save-hash, and browser-regression gates rerun against that exact extracted artifact before release acceptance.
