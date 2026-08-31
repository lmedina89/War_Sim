# War Sim v0.1.2 — Save Slots & Career Feedback Hotfix

v0.1.2 is the final infrastructure/UX hardening pass before the Nation & Economy foundation. It preserves the permanent project rule that new systems must be data-driven, normalized, modular, schema-versioned, and efficient for future scale.

## Permanent engineering rules

1. Definitions are immutable registry data; simulation systems do not hard-code content names.
2. Runtime state is normalized and cross-referenced by stable IDs.
3. The player is a normal `Person` entity referenced by `playerPersonId`.
4. UI never owns authoritative simulation state and never performs business rules.
5. State changes go through commands/services.
6. Commands return structured result objects with codes, data, and generated notification IDs.
7. UI consumes selectors/view models rather than scanning or mutating canonical stores directly.
8. Historical data is append-only and separate from hot-path Person records.
9. Common queries use derived indexes; indexes are never serialized into saves.
10. Commands refresh only relevant index groups.
11. Save and world schemas are versioned, validated, and migratable.
12. Definitions and runtime instances remain separate.
13. Historical/deceased people remain persistent.
14. Stable IDs/metadata drive logic, never display text.
15. Simulation detail is tiered for future large-population scaling.
16. Simulation randomness goes through a deterministic seeded RNG service; do not scatter `Math.random()` through systems.
17. The world owns the canonical game date and simulation clock.
18. Developer diagnostics remain available without being part of the normal player-facing UI.

## v0.1.2 additions

- Generic achievement/career popup UI for schools, qualifications, awards, promotions, and future milestone types.
- Persistent Career Inbox backed by normalized `NotificationRecord` entities.
- Runtime event bus separated from canonical state.
- Six manual save slots plus a reserved autosave slot.
- Lightweight save-slot metadata index so the save browser does not deserialize every world save.
- Save metadata: character, rank, branch, game date, game version, world schema, timestamp, and stable save ID.
- Save integrity checksum plus backup-before-overwrite behavior.
- Confirmation dialogs for overwrite, delete, load-over-current-session, and New Career.
- v0.1.1 single-save migration into the new save manager where possible.
- Formal save migration pipeline and world schema v3.
- Canonical world clock with elapsed days, pause state, and speed value.
- Centralized deterministic seeded RNG with persisted RNG state.
- State-owned entity ID sequence for canonical entity IDs.
- Structured command-result contract.
- Persistent player action records for debugging/replay-oriented tooling.
- Startup validation for static definition cross-references.
- Formal data definitions for simulation tiers 0–3.
- Developer diagnostics moved behind a collapsed disclosure panel.

## Save manager

Manual slots: `slot_01` through `slot_06`.

Reserved system slot: `autosave`.

Slot metadata is stored separately from full save payloads. This keeps save-menu rendering cheap when future world saves become large.

## Simulation tiers

- Tier 0: Player — full-detail persistent simulation.
- Tier 1: Immediate personnel — detailed persistent/event-driven simulation.
- Tier 2: Wider military personnel — lower-frequency event/aggregate simulation.
- Tier 3: Population cohort — statistical aggregate simulation.

## Test

```text
node tests/smoke.mjs
```

## Next milestone — v0.2.0 Nation & Economy Foundation

- Nation definitions and runtime nation state.
- Population cohorts and labor pools.
- Treasury, income, expenses, military payroll, and pay tables.
- Resource and industrial-capacity foundations.
- Simulation tick scheduler built on the canonical clock.
- Region/geography contracts preparing for the world map.
