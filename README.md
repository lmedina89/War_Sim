# War Sim v0.4.2.2 — Living Career & Unit Life

War Sim v0.4.2.2 focuses on making the existing career and unit simulation feel less like a button-driven dashboard and more like a living military organization. It preserves the proven v0.4.2.1 controller/UI architecture and capability foundation while adding contextual NPC initiative, relationship differentiation, visible unit life, future-event anticipation, and mobile-save hardening.

## v0.4.2.2 changes

- Runtime **0.4.2.2**, world schema **16**, save format **3**, generator **v3**.
- Adds deterministic, definition-driven NPC personality profiles. Generated personnel receive one or two stable traits such as Dependable, Ambitious, Competitive, Reserved, Sociable, Demanding, Mentor, or Cautious.
- Personality data is simulation-facing rather than cosmetic only: initiative weighting influences which nearby Soldier is more likely to initiate an interaction.
- Adds intermittent **NPC-initiated unit-life events** during time progression. Teammates can request help and leaders can initiate performance counseling; strong recent performance can trigger leader recognition.
- Contextual events query real state first. Performance counseling uses recent performance records; recognition requires strong recent performance; participants come from the actual current unit and chain-of-command context.
- Adds canonical **relationship memory records** so interpersonal decisions can leave durable context that later systems can reference.
- Expands relationships with **rapport** while retaining familiarity, trust, respect, and bond. Personnel relationship cards now surface Trust, Respect, Rapport, stable NPC traits, and a recent remembered interaction when available.
- Fixes uniform squad trust growth. Collective training no longer increments every player relationship in lockstep; relationship effects are deterministically scoped to specific interpersonal connections.
- Adds a **Next 30 Days** career panel for significant duties, accepted/in-progress school dates, and qualification expirations.
- Adds a **Situation Feed** showing recent unit-life and training events so background simulation is visible instead of silently accumulating in records.
- Keeps quiet periods: living-career events are intermittent and have spacing guards instead of firing every day.
- Fixes the unexplained browser **quota reached** behavior in the save path. Autosave no longer stores a redundant full autosave backup, same-slot backups are dropped and retried if storage is exhausted, and persistent quota failure is converted to a clear in-game message telling the player to delete an older manual save.
- Preserves v0.4.2.1 school-attendance activity blocking, grouped school achievements, archiveable personnel history, mobile Current Situation wrapping, and the Unit Capability Inventory foundation.

## Living-career event model

The new layer follows a reusable simulation pipeline:

**state trigger → eligibility/context → real participants → situation → player decision → scoped effects → relationship memory → future follow-up potential**

This release deliberately does not use free-form generated dialogue. Events remain deterministic, definition-driven, testable, and tied to canonical simulation state.

## Compatibility

- Runtime: **0.4.2.2**
- World schema: **16**
- Save format: **3**
- Generator: **v3**

Schema-15 v0.4.2/v0.4.2.1 careers migrate to schema 16 without regenerating the player, unit, service history, qualifications, awards, education, schedule, or capability records. Migration initializes rapport, personality profiles, relationship-memory storage, and living-career scheduler metadata.

See `SOFTWARE_QUALITY_REPORT.md` for exact release-gate results.
