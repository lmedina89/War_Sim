# War Sim v0.4.1.7 — Software Quality Report

- Runtime version: **0.4.1.7**
- Save format: **3**
- World schema: **14**
- Scope: mobile UX, history presentation, opportunity navigation, responsive layout. No intended simulation-model expansion.

## Dedicated v0.4.1.7 release gate

`tests/mobile-ux-consolidation.mjs` verifies:
- collapsible Activities presentation exists;
- recent-history preview limits and UI-only archive storage are present;
- restore/archive controls exist without adding world-schema state;
- major `career_opportunity` notifications enter the popup path;
- opportunity records retain concrete navigation references;
- Open Opportunity routing exists;
- routine PT presentation is summarized;
- dialogs use dynamic-viewport bounds and internal scrolling support;
- narrow-screen Current Duty stacking and long-text wrapping rules are present;
- generated eligible school opportunities still produce valid referenced records.

## Regression suites

The existing v0.4.1.x suites remain release gates:
- smoke
- living-unit / training tempo
- career continuity
- stability hotfix
- migration / qualification
- availability / qualification history / school effects
- training results / schedule clarity
- full quality audit

## Mobile validation boundary

Static/Node QA can validate DOM contracts, responsive CSS rules, state integrity, migration behavior, deterministic simulation, and command/selectors. It **cannot certify actual iPhone Safari pixels, touch scrolling, or visual fit**. Live-device validation remains required before freezing the v0.4.1.x line.

## Pre-package observed QA

- JS/MJS syntax check: **PASS — 89 files**
- Forbidden runtime pattern audit (`Math.random`, `eval`, `new Function`, `document.write`, runtime `.innerHTML =`): **PASS**
- All 9 test suites: **PASS**
- `tests/quality.mjs`: **PASS**
  - source files: 80
  - generated world seeds validated: 300
  - 10,000-person index stress: PASS
  - observed index build in this run: 13.61 ms
- Additional deterministic fresh-career sweep: **5,000 seeds, 0 failures**
- 365-day career progression validation: **2047-02-10, 0 world-validation errors**

The final release package is re-extracted and these gates are rerun from the extracted copy before delivery.
