# War Sim v0.1.1 — Personnel & Career Foundation

This checkpoint hardens the military-career architecture while preserving the project's core rule: gameplay content should be data-driven and runtime access paths should be designed for future scale.

## Engineering rules

1. Gameplay definitions are immutable registry data.
2. Runtime state is normalized and stores references by stable ID.
3. The player is a normal `Person` entity referenced by `playerPersonId`; player-only duplicate models are prohibited.
4. UI never mutates canonical state directly.
5. State changes go through commands/services.
6. UI reads selectors/view models rather than owning business logic.
7. Historical records are append-only and separated from hot-path Person records.
8. Common queries use derived indexes rather than repeated global scans.
9. Indexes are derived and never serialized into saves.
10. Commands refresh only relevant index groups instead of rebuilding every index for every small mutation.
11. Saveable schemas are versioned and validated before activation.
12. Definitions and runtime instances are separate; equipment definitions are not duplicated into inventories.
13. Deceased/historical people are preserved, never deleted merely because they are inactive.
14. Systems compare stable IDs/metadata, not display names.
15. Relative ES-module paths keep the build portable to GitHub Pages.
16. Early releases remain dependency-free: plain HTML/CSS/JavaScript modules.
17. Simulation detail is tiered so future large populations do not require full per-person processing every tick.

## v0.1.1 additions

- New Career screen with custom first/last name and data-driven branch selection.
- Player creation through `createPlayerCareer()` rather than a hard-coded player object.
- Person schema v2 with simulation tier.
- Canonical ServiceRecord, AssignmentRecord, PromotionRecord, AwardRecord, QualificationRecord, DeploymentRecord, CasualtyRecord, MemorialRecord, RelationshipRecord, EquipmentInstance, and Loadout stores.
- Vacant unit slot filled when a career begins.
- Separate qualification definitions from schools and awards.
- Airborne School creates an Airborne qualification plus Parachutist Badge award record.
- Promotion eligibility service separates requirements evaluation from promotion execution.
- Promotion requirements are definition-driven by rank.
- Training/time controls exist only to exercise the foundation before a full time simulation is added.
- Persistent squad relationships are indexed by person.
- Equipment definitions are immutable while owned equipment is stored as lightweight instances.
- Fatal casualty command preserves the Person and creates a memorial record.
- Stronger cross-reference validation.
- Grouped derived indexes for people, units, history, equipment, and memorials.
- Stable save key and save-format version 2.
- Node smoke test for player creation, indexes, promotion, school/award records, casualty/memorial behavior, and validation.

## Current simulation tiers

- Tier 0: player / highest-detail personnel.
- Tier 1: immediate important NPCs such as the current squad.
- Higher aggregate tiers are reserved for later population/military scaling.

## Running

Use GitHub Pages or any static HTTP server. ES modules generally should not be run by opening `index.html` directly through a `file://` URL.

## Test

With Node.js installed:

```text
node tests/smoke.mjs
```

## Next milestone candidate — v0.2.0 Nation & Economy Foundation

- Nation canonical entity/state.
- Nation definitions vs nation runtime state.
- Population cohorts and labor pools.
- Treasury, income, expenses, military payroll, and pay tables.
- Simulation clock/tick scheduler.
- Resource/industrial-capacity foundations.
- Region/geography contracts in preparation for the world map.
