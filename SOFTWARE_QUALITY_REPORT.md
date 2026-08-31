# War Sim v0.4.2.2 — Software Quality Report

Release focus: Living Career & Unit Life, relationship-scope correction, contextual NPC initiative, visible upcoming/unit activity, and mobile localStorage quota hardening. Runtime 0.4.2.2; world schema 16; save format 3; generator v3.

## Implemented and audited

- Deterministic personality profiles exist for generated people and reference immutable personality definitions.
- NPC-initiated events use actual unit membership, rank context, relationship records, and recent player performance.
- Strong performance can produce contextual leader recognition; weaker recent performance can produce counseling; peers can initiate help requests.
- Relationship effects support deterministic one-relationship scope so squad trust no longer rises uniformly across every relationship.
- Canonical rapport and relationship-memory records are migrated and validated.
- Next 30 Days derives significant duties, school windows, and qualification expirations from existing canonical records.
- Situation Feed derives from durable unit-event records rather than UI-owned state.
- Autosave no longer creates a redundant full autosave backup. Quota failures retry after removing same-slot backup storage and return a player-readable storage message if space is still exhausted.
- v0.4.2.1 school availability, service-record grouping, mobile history controls, and unit-capability behavior remain regression-covered.

## Release gates

- **14 automated suites PASS**: availability/qualification history, capability foundation, career continuity, living career polish, living unit, migration/qualification hotfix, mobile UX, quality, save storage, service-record foundation, smoke, stability hotfix, training consolidation, and unit interaction integrity.
- **102 JS/MJS files** pass `node --check`.
- Runtime forbidden-pattern audit passes for `Math.random`, `eval`, `new Function`, `document.write`, and `.innerHTML =` assignment.
- Standard quality suite: **PASS**, 88 runtime source modules, 300 generated worlds validated, 10,000-person index stress case, exact observed index build **24.3 ms** on the exact extracted-package run.
- Dedicated living-career QA verifies deterministic personality seeding, non-uniform relationship effects, contextual NPC-initiated events, relationship memory, and schema-15 → 16 migration.
- Dedicated save-storage QA verifies autosave does not retain a duplicate autosave backup and quota errors are converted into a contextual in-game message.
- Extended deterministic generation sweep: **5,000 worlds / 450,000 NPCs / 0 validation failures**.
- 365-day career simulation: **2046-02-10 → 2047-02-10**, 365 elapsed days, **0 validation errors**, 27 living-career events, 12 relationship memories, serialized state size about **1.51 MB** in that run.

Static QA validates DOM references, module imports, data integrity, deterministic behavior, migrations, and state invariants. It cannot certify exact iPhone Safari pixel rendering, touch behavior, or the device-specific localStorage quota, so live mobile validation is still required.
