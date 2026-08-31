# War Sim v0.4.3.2 — Software Quality Report

## Release scope

v0.4.3.2 is a narrow mobile-polish and legacy-award compatibility hotfix built from the packaged v0.4.3.1 baseline. The intended code changes are limited to version normalization, Soldier Identity tab sizing, Situation Feed compaction/disclosure behavior, and Army Service Ribbon legacy-save normalization.

- Runtime: **0.4.3.2**
- World schema: **16**
- Save format: **3**
- Generator: **v3**

## Result

**PASS for packaged automated/static QA.**

One environment limitation remains: an attempted Chromium headless smoke at 390×844 timed out with container DBus/environment errors, so no browser smoke pass is claimed.

## Automated regression suite

**17/17 test scripts pass.**

Passing suites:

1. `availability-qualification-history.mjs`
2. `awards-soldier-identity.mjs`
3. `capability-foundation.mjs`
4. `career-continuity.mjs`
5. `living-career-polish.mjs`
6. `living-unit.mjs`
7. `migration-qualification-hotfix.mjs`
8. `mobile-app-navigation.mjs`
9. `mobile-polish-compatibility.mjs`
10. `mobile-ux-consolidation.mjs`
11. `quality.mjs`
12. `save-storage.mjs`
13. `service-record-foundation.mjs`
14. `smoke.mjs`
15. `stability-hotfix.mjs`
16. `training-consolidation.mjs`
17. `unit-interaction-integrity.mjs`

## Core quality/stress results

`tests/quality.mjs` result: **PASS**.

- Source modules audited by quality suite: **91**
- Generated-world seeds validated: **300**
- Stress population: **10,000 people**
- Primary views: **5**
- Deterministic RNG audit: PASS
- Runtime/concrete ID audit: PASS
- DOM integrity: PASS
- Import graph integrity: PASS
- Render containment: PASS
- Selector/index audit: PASS
- Schema-13 migration: PASS
- Direct schema-12 migration: PASS
- Same-schema hotfix normalization: PASS
- Remembered disclosure UI state: PASS
- Reduced-motion support: PASS
- Current-situation presentation: PASS
- Personnel/unit cross-navigation: PASS

The measured 10,000-person index-build run completed in approximately **10.93 ms** in this QA environment. This is a local benchmark, not a device performance guarantee.

## Syntax/static checks

All **108 JS/MJS files** under `src/` and `tests/` pass `node --check`.

The existing static-quality suite continues to enforce DOM/import integrity and unsafe rendering constraints. No new dynamic-code or HTML-injection mechanism was introduced by this patch.

## v0.4.3.2 targeted verification

### Soldier Identity tab sizing

PASS.

The identity sub-navigation now uses:

- five explicit equal-width grid columns;
- `minmax(0,1fr)` so labels can shrink with the card;
- no horizontal overflow requirement for the normal five-tab set;
- tighter <=420px spacing/font sizing while preserving the existing active-tab visual treatment.

This specifically addresses the narrower nested Soldier card seen on iPhone, where the earlier `minmax(70px/72px,1fr)` auto-columns could exceed the available inner width.

### Situation Feed compaction

PASS.

The Home Situation Feed now:

- lives in a native `<details>` disclosure using the project's persisted disclosure system;
- shows a three-record preview by default while expanded;
- shows the total feed count in the summary;
- exposes `Show All (N)` and `Show Recent` controls when more than three records exist;
- preserves all feed records instead of discarding or archiving them.

### Legacy Army Service Ribbon backfill

PASS.

Regression cases verify that:

- a qualifying legacy Army player career with canonical enlistment + initial-assignment evidence and no ASR receives exactly one ASR record;
- the backfilled award date is historical, based on the original career-start evidence rather than the load date;
- the current ASR prestige value is applied once when no historical award existed;
- running migration again creates no duplicate;
- a retired `award_basic_training` record is upgraded in place to the current ASR ID;
- upgrading the legacy record does not add prestige a second time;
- the resulting world passes `validateWorldState`.

The migration is intentionally quiet: it does not create a present-day award notification for an award that was historically earned before the feature existed.

## Scope-control verification

`src/core/saveSystem.js` SHA-256 in v0.4.3.2:

`b67d3d64caecbe2cd32f2e8d683fd28174326439485f629be0f7fad2a4eb0c43`

The packaged v0.4.3.1 baseline has the identical hash. Therefore the previously deferred save-recovery behavior was not modified in this patch.

## Known deferred issues

The earlier v0.4.2.2 full audit findings remain applicable where not superseded:

- corrupted save-index reconstruction is still unresolved;
- manual-save backups are still written without automatic fallback/restore behavior;
- validator completeness for some canonical stores still warrants future hardening;
- broader state-store transaction/error resilience remains future stability work.

These items were intentionally outside v0.4.3.2 scope.

## Browser smoke limitation

A local HTTP server plus headless Chromium was attempted at **390×844**. Chromium did not complete within the timeout and emitted DBus/environment errors from the container. Because the attempt did not produce a reliable rendered result, browser smoke is recorded as **NOT VERIFIED**, not PASS.

## Release assessment

Within the requested hotfix scope, v0.4.3.2 is suitable for packaging. The changes are small, backward-compatible at schema level, regression-covered, and preserve the v0.4.3.1 UI/gameplay architecture.
