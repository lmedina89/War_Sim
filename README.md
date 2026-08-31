# War Sim v0.3.2.1 — Starting World Diversity & Generation Integrity

This checkpoint keeps the working v0.3.2 military-administration foundation and fixes the static new-career world problem without abandoning the project's data-driven architecture.

## What changed

Fresh careers are now generated from data definitions instead of being permanently tied to one hard-coded 2nd Squad roster. The generation layer uses:

- `careerStartScenarioDefinitions` for valid career-start combinations and rules.
- `generationProfileDefinitions` for organization templates and billet/rank generation policy.
- canonical organization, billet, rank, specialty, component, and contract registries.
- a dedicated `worldGeneration` service rather than stuffing population logic into `initialState.js`.
- the centralized seeded RNG only; direct `Math.random()` calls are prohibited by the smoke suite.

The currently enabled scenario is **Active Army · 11B · New Enlistee**. Other branches, components, and MOS pipelines remain data definitions to be enabled only when their organizations/training pipelines exist.

## Starting-world diversity

Every new career receives a world seed. The seed determines the generated company roster, personnel attributes, unit conditions, and which eligible 11B rifleman billet is left vacant for the player.

- Same seed → same generated company, NPC roster, and starting billet.
- Different seed → different deterministic roster and starting assignment.
- The player can begin in any valid rifleman billet across the nine squads in the current infantry company rather than always starting in 2nd Squad.
- Generated full names are unique within the company.
- NPC time-in-service, experience, morale, readiness, health, fatigue, equipment condition, and unit conditions vary deterministically.

The New Career screen exposes the seed and includes **New Seed**, making generated worlds reproducible when desired.

## Generation integrity

Fresh generation creates the canonical unit hierarchy and derives runtime billets from organization definitions. Structural validation checks unit parent/child links, billet echelon compatibility, person/billet/unit consistency, duplicate assignments, rank minimums, and generation metadata before saves are accepted.

The smoke suite currently validates 120 independent generated seeds and checks that every generated world remains structurally valid. It also verifies meaningful assignment/roster diversity, same-seed reproducibility, unique generated identities, full 9-person squads after player creation, and that the player appears in exactly one squad.

## Save compatibility

World schema is now **11**. Existing v0.3.2/schema-10 careers migrate forward without regenerating their organization or moving the player. They receive legacy generation metadata only, preserving the exact existing career and unit assignment.

## Preserved systems

v0.3.2.1 retains the working systems from earlier checkpoints, including:

- Company → platoon → squad organization and browsing.
- Canonical billets and personnel assignments.
- Squad roster integrity and player `YOU` marker.
- NPC progression.
- Service contracts, ETS, reenlistment offers, bonuses, and orders.
- Career history, schools, awards, relationships, Career Inbox, and timeline.
- Multi-slot save/load and migration pipeline.
- Military Administration: personnel actions, vacancies, replacement requests, ETS/separation, and replacement arrival pipeline.
- Deterministic RNG, canonical world clock, indexed selectors, simulation tiers, and developer diagnostics.

## Roadmap

- v0.3.2.1 — Starting World Diversity & Generation Integrity (this release)
- v0.4.x — MOS, Training & Career Expansion
- v0.5.x — Installations, Locations & PCS
- v0.6.x — Equipment & Logistics
- v0.7.x — Skills & Individual Capability
- v0.8.x — Unit Training & Readiness
- v0.9.x — Military AI
- v1.0 — Nation & Economy
- v1.1 — World & Geography
- v1.2 — Diplomacy & Geopolitics
- v1.3 — Operational Warfare
- v1.4 — Tactical Combat

The architectural rule remains: immutable definitions/registries describe what can exist; runtime entities describe what currently exists; commands/services mutate authoritative state; selectors/indexes read it; UI does not own simulation logic.
