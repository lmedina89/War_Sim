# War Sim v0.4.1.6 — Software Quality Report

- Runtime version: **0.4.1.6**
- Save format: **3**
- World schema: **14**
- Scope: training-result consistency, schedule clarity, non-blocking routine PT, causal readiness presentation

## Dedicated v0.4.1.6 release gates

The new `tests/training-consolidation.mjs` verifies:

- regular weekday background PT generation without duplicate Monday stacking
- routine PT is explicitly non-blocking and does not grey out unrelated focused training
- significant mandatory training still blocks overlapping activities and exposes the exact conflict date
- solo PT does not directly alter collective unit-training proficiency or claim causal unit-readiness/cohesion deltas
- poor training cannot independently receive positive breakthrough/recognition feedback
- qualification activity records/notifications lead with the actual native weapon qualification result
- UI source contains separate qualification-result and training-performance presentation

All prior migration, qualification-history, school-availability, collective-training, living-unit, career-continuity, smoke, stability, and full quality suites remain release gates.

## Visual limitation

Automated/static QA cannot prove iPhone Safari pixel rendering. Live-device visual and interaction validation remains a separate release check.
