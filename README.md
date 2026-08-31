# War Sim v0.4.0 — Core Gameplay Systems

War Sim v0.4.0 is the first playable-career systems release built on the frozen v0.3.2.3 military organization foundation. The focus is not deployment or tactical combat yet; it is making time, training, skills, decisions, and performance into reusable gameplay systems that later deployment/combat systems can consume.

## Player-facing gameplay

- Replaces the old generic `Train +250 XP` action with data-defined activities.
- Adds five initial skills on a normalized 0–100 scale:
  - Fitness
  - Marksmanship
  - Fieldcraft
  - MOS Proficiency
  - Leadership
- Adds initial data-driven activities:
  - Physical Training
  - Weapons Qualification Range
  - MOS Training
  - Squad Drills
  - Leadership Development
- Activities consume world time and can affect skills, XP, prestige, fatigue, readiness, unit cohesion, and relationships.
- Adds 1-day / 7-day / 30-day free time advancement.
- Adds a recent training / after-action history.
- Personnel profiles now include their simulated skills.
- Adds the first reusable gameplay-event and decision framework. Some activities can produce weighted events, including an actionable leadership decision with definition-driven choices/effects.

## Architecture

### Data definitions

New definition registries:

- `skills`
- `activities`
- `gameplayEvents`
- `eventTables`

Normal runtime systems do not contain concrete branch/MOS/rank/weapon content IDs. Activities and events describe effects; generic engines execute them.

### Generic effect engine

Activity/event definitions use standardized effects such as:

- skill changes
- person stat changes
- unit-condition changes
- relationship changes

The effect engine owns clamping and mutation semantics. Future schools, injuries, equipment, deployments, weather, logistics, and combat can reuse the same mechanism rather than adding one-off mutation logic.

### Canonical gameplay records

World schema 12 introduces:

- `skillProfiles`
- `activityRecords`
- `performanceRecords`
- `gameplayEventRecords`

These records are authoritative and saved. Derived indexes are rebuilt from canonical state and are never serialized.

### Determinism and efficiency

- Gameplay-event rolls use the centralized seeded RNG; no runtime `Math.random()`.
- Activity history, skill profiles, gameplay events, personnel, units, billets, relationships, orders, career records, and admin records use derived indexes for normal query paths.
- Unit relationship effects use the existing relationship index rather than scanning all relationship records in the normal activity command.
- Career creation uses the existing unit personnel index to seed squad relationships.
- Recent personnel actions are prepared by the admin index rather than sorted from the full collection every render.
- World generator version is now **2** because generated NPC skill profiles are part of fresh generated worlds.

## Data-integrity correction included

During the v0.4 audit, the fresh-world generator was found to have a legacy inconsistency: generated NPCs were receiving the player scenario's specialty even though the generation profile already defined billet-specific specialty mappings. v0.4.0 corrects this. Company/platoon officers and administrative billets now resolve specialty through `billetSpecialtyIdsByDefinitionId`, while infantry billets resolve to the infantry specialty.

## Compatibility

- Save format remains **3**.
- World schema: **12**.
- v0.3.2.3 schema-11 saves migrate to schema 12 without regenerating the world, changing names, or moving personnel.
- Migration creates a skill profile for every existing person and initializes the new canonical gameplay collections.

## Quality gates

Before packaging, v0.4.0 passed:

- JavaScript syntax validation across all source/test modules
- full gameplay/regression smoke suite
- independent software-quality suite
- definition-reference validation
- 300-seed generated-world validation in the formal QA suite
- additional 1,000-seed generated-world validation sweep
- same-seed deterministic world generation
- same-seed deterministic repeated-activity simulation
- exact squad/player assignment checks
- schema-11 → schema-12 migration preservation
- save/checksum round trip and corruption rejection
- static import-graph validation
- DOM/controller ID validation
- duplicate DOM-ID audit
- direct `Math.random()` audit
- dynamic-code / `innerHTML` assignment audit
- runtime concrete-content-ID audit
- selector global-people-scan guard
- 10,000-person index build stress benchmark

See `SOFTWARE_QUALITY_REPORT.md` for the separate QA report.

## Roadmap

The v0.4 series remains intentionally staged:

- **v0.4.0** — Core Gameplay Systems (current)
- **v0.4.1** — Training & Readiness Gameplay
- **v0.4.2** — Career & Personnel Gameplay
- **v0.4.3** — Unit Events & Decision Gameplay
- **v0.4.4** — Deployment Preparation Foundation
- **v0.5.x** — Actual Deployment Gameplay

The project remains definition/registry driven: definitions describe content, generic services execute rules, canonical records preserve history, indexes serve queries, and UI code does not own simulation state.
