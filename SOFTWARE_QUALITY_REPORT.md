# War Sim v0.4.1.3 — Software Quality Report

## Release identity

- Runtime version: **0.4.1.3**
- Save format: **3**
- World schema: **14**
- Source modules: **79 JavaScript modules**
- Source size: **4,910 JavaScript lines**
- Automated suites: smoke, living-unit/training-tempo, career-continuity/mobile, stability-hotfix, full quality

## Release purpose

v0.4.1.3 is a stability/save-integrity hotfix built from the verified v0.4.1.2 checkpoint. It intentionally adds no new gameplay system. The release fixes two defects confirmed in live code and adds release gates designed to prevent the same classes of failure from shipping again.

## Confirmed defects fixed

### Schema-13 → schema-14 migration reference failure
`migrateWorldV13ToV14` called `setTrainingPhaseInDraft` and `ensureScheduleCoverageInDraft` without importing them. The migration now imports the existing data-driven helpers from `careerGameplay.js`. A dedicated regression test executes the schema-13 migration path and verifies Garrison phase/schedule initialization and final world validation.

### Legacy Company XO rank mismatch
The legacy `ensureInfantryCompanyStructure` path created the Company Executive Officer as O1/2LT even though `billet_executive_officer` requires hierarchy level 8, whose lowest valid Army officer rank is O2/1LT. The legacy generator now creates the XO as `rank_army_o2`. The validator remains strict.

## Save-integrity hardening

- same-schema schema-14 saves are normalized before validation when an occupied billet holder is below the billet minimum
- repair selects only the lowest valid rank in the **same branch and rank category**; it does not globally weaken billet rules
- legacy personnel missing component/specialty fields are repaired from canonical service data, generation-profile billet mappings, or the career-start scenario where available
- service-record affiliation fields are synchronized when legacy records omitted them
- improved validator errors include person ID, billet name/ID, required rank, and assigned rank
- migration normalization is regression-tested for idempotency

## Assignment/generation release gates

The dedicated v0.4.1.3 stability suite validates **1,000 deterministic fresh worlds** and checks every occupied billet for:

- assigned-person existence
- one-person/one-billet occupancy
- person↔billet back-reference consistency
- unit consistency
- billet minimum-rank compliance
- generation-profile specialty mapping where defined
- loadout existence
- primary equipment existence/ownership
- billet-defined primary equipment compatibility

The suite also explicitly verifies both the modern generation-profile Company XO and the legacy `pers_org_002` Company XO are O2/1LT.

## Career/save release gate

The dedicated stability suite executes:

`fresh world → Begin Career → advance 1 day → advance 7 days → advance 30 days → validate → save → load → compare canonical state → advance another 30 days → validate`

Blocking decisions are resolved deterministically during the gate. Browser save/load uses the same in-memory `localStorage` stand-in used by the existing quality suite.

## Migration coverage

Automated tests cover:

- schema 12 → 13 → 14
- schema 13 → 14 with the newly fixed training-phase helper path
- schema 14 same-schema runtime normalization
- legacy rank/billet repair
- missing legacy affiliation-field repair
- repeated migration/idempotency
- save/checksum round-trip and corruption rejection

An additional compatibility audit migrated an actual **v0.3.1.1/schema-8 generated world** through the current migration chain. Its legacy `pers_org_002` XO changed from O1 to O2, missing legacy affiliation fields were normalized, and the resulting schema-14 world passed current validation with **0 errors**.

## Regression suites

Pre-package verification:

- JavaScript/MJS syntax checks: **PASS**
- `tests/smoke.mjs`: **PASS**
- `tests/living-unit.mjs`: **PASS**
- `tests/career-continuity.mjs`: **PASS**
- `tests/stability-hotfix.mjs`: **PASS**
- `tests/quality.mjs`: **PASS**
- full quality generated-world validation: **300 seeds PASS**
- dedicated stability generated-world integrity: **1,000 seeds PASS**
- 10,000-person index stress: **PASS**
- pre-package index build: **12.99 ms**

The existing quality suite also continues to pass deterministic RNG, DOM integrity, import-graph integrity, render containment, independent Unit/Personnel navigation state, military presentation definitions, canonical scheduler behavior, opportunity/order flow, readiness integration, recovery/conflict rules, billet authority, selector/index audits, notification history, stable document references, current-situation display, personnel/unit cross-navigation, and remembered disclosure-state checks.

## Static safety/integrity checks

Production source remains free of:

- direct `Math.random()` simulation use
- `eval`
- `new Function`
- `document.write`
- runtime `.innerHTML =` mutation

The release does not replace the stable UI controller, does not alter deterministic RNG architecture, and does not bump the world schema.

## Final packaged-copy verification

The release candidate ZIP was extracted into a clean directory and all syntax/regression/stability/quality suites passed again. Packaged-copy quality runs observed the 10,000-person index build well below the 2,000 ms guardrail (pre-package/draft-package observations: 12.99–42.36 ms).

The final release ZIP is re-extracted and retested once more after this report is embedded. Static/browser rendering QA cannot substitute for live iPhone Safari validation, so on-device testing remains the final presentation check.
