# War Sim v0.4.2 — Software Quality Report

## Release scope

v0.4.2 is the Army Service Record & Career Achievement Foundation. It advances the world schema to 15 and generator to v3 while keeping save format 3. The stable v0.4.1.8 controller/UI foundation is extended, not replaced.

## Major implementation checks

- Canonical military education records are separate from qualifications and awards.
- School eligibility and opportunity sources are definition-driven.
- Player school requests use the existing opportunity/orders/school-completion pipeline.
- NPC prior-service generation is deterministic and excludes the player.
- Schema-14 migration backfills school-linked education and seeds deterministic NPC prior history.
- Career and personnel service records expose categorized education, qualifications, badges, ribbons/medals, and counts.
- Capability-contribution metadata is data only in this release; no combat system or arbitrary badge combat bonus was added.

## Pre-package automated QA

All JS/MJS syntax checks passed. The complete test set passed:

- availability / qualification-history / school-effects
- career continuity
- living unit / training tempo
- migration / qualification / collective activity
- mobile UX consolidation
- quality suite
- Army Service Record foundation
- smoke suite
- stability regression
- training consolidation
- Unit interaction integrity

Quality suite result: PASS; 84 runtime source modules; 300 generated worlds validated; 10,000-person index stress passed; deterministic RNG, import graph, DOM integrity, render containment, scheduler, readiness, migration, indexing, and presentation audits passed. Pre-package index build observed: 12.78 ms.

Additional pre-package generation sweep: 5,000 deterministic worlds / 450,000 NPCs, 0 validation failures. Airborne prior-service incidence was approximately 7.65% in the generated conventional infantry population. A 365-day career simulation also completed with 0 world-validation errors.

## Static QA limitation

Automated/static QA cannot certify iPhone Safari pixel layout, touch behavior, or the subjective realism of every generated career. Live device validation remains required.
