# War Sim v0.4.2.1 — Software Quality Report

Release focus: school-availability integrity, service-record consolidation, personnel-history/mobile cleanup, and the first derived unit combat-capability inventory foundation. Runtime 0.4.2.1; world schema 15; save format 3; generator v3.

## Implemented and audited

- Active military-school attendance blocks player-selected home-station activities in both selector and command layers.
- School graduation, linked qualification, and linked badge are consolidated in presentation while remaining separate canonical records.
- Personnel-profile Recent Career Activity is bounded, archiveable, and restorable without deleting durable history.
- Current Situation long-text wrapping is hardened for narrow mobile screens.
- New immutable registries define capability categories, platform classes across land/air/sea domains, and a light-infantry doctrine profile.
- Unit capability is derived by selector/service logic rather than UI-owned state. Current small-arms capability traces to real equipment instances, equipment condition, assigned/available operators, and operator skill.
- Capability output keeps provenance to the contributing person/equipment records and reports assigned/operational/crewed counts.
- Battle outcomes, casualties, opposing-force resolution, detailed supply, vehicles, explosives, aviation, and maritime equipment are intentionally not simulated in this release.

## Release gates

- All regression suites pass.
- All JS/MJS files pass `node --check`.
- Runtime forbidden-pattern audit passes for `Math.random`, `eval`, `new Function`, `document.write`, and `.innerHTML =` assignment.
- Standard quality suite validates 300 generated worlds and a 10,000-person index stress case.
- Dedicated capability QA verifies school blocking, provenance, and degraded-equipment effectiveness.
- 5,000 deterministic generated worlds / 450,000 NPCs validate with zero capability-foundation failures.
- A 365-day career simulation completes with zero world-validation errors.
- Existing save/migration, training, qualification, Unit, Career, service-record, and mobile regressions remain green.

Static QA cannot certify exact Safari pixel rendering or touch behavior; live iPhone Safari validation remains required.
