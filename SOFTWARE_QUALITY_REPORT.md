# War Sim v0.4.1.5 — Software Quality Report

- Runtime version: **0.4.1.5**
- Save format: **3**
- World schema: **14**
- Scope: availability, qualification history, school effects, activity-scope integrity

## Release checks

v0.4.1.5 adds a dedicated regression suite for: (1) preserving every weapons qualification attempt while retaining a better still-current active credential, (2) definition-driven school skill effects, and (3) preventing a Soldier attending military school from simultaneously receiving home-unit scheduled-duty credit while allowing the home unit/NPCs to continue training.

The existing migration, qualification, collective-training, living-unit, career-continuity, smoke, stability, and full quality suites remain release gates. The package must also pass syntax checks, forbidden runtime-pattern checks, a deterministic multi-seed generated-world validation sweep, and exact extracted-ZIP retesting.

## Visual limitation

Automated/static QA cannot prove iPhone Safari pixel rendering. Live-device visual and interaction validation remains a separate release check.
