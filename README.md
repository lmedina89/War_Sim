# War Sim v0.2.0 — Military Organization & Personnel Foundation

This checkpoint expands the v0.1.2 career/personnel foundation into a scalable military-organization model.

## Permanent engineering rules

1. Gameplay content belongs in immutable definitions.
2. Mutable runtime state is normalized.
3. Entities use stable IDs and references rather than duplicated nested objects.
4. UI consumes selectors/view models and never owns simulation logic.
5. State changes occur through commands/services.
6. Common lookups are indexed.
7. Historical records are preserved.
8. Saves are schema-versioned and migrated forward.
9. Simulation systems are modular and domain-bounded.
10. Scaling concerns are addressed through access-path optimization, aggregate simulation tiers, and explicit indexes.

## v0.2.0 adds

- Canonical military-organization hierarchy
- Branch-aware organization definitions
- Unit echelon definitions
- Billet/position definitions separate from Person
- Authorized strength vs assigned strength
- Persistent Unit and Billet runtime entities
- Parent/child unit relationships
- Personnel-to-billet assignment model
- Derived unit readiness/manpower view models
- Indexes for:
  - units by parent
  - units by branch
  - billets by unit
  - billet by assigned person
  - person by billet
- Player assignment through a billet rather than role baked into Person
- Data-driven initial force package:
  - 1 company
  - 1 platoon
  - 1 squad with 9 authorized billets
- v0.1.2 → v0.2.0 save migration support
- Stronger cross-reference validation
- Node smoke test coverage for organization structure

## Why this comes before MOS and reenlistment

MOS/job systems, branch transfers, reenlistment bonuses, and manpower shortages become meaningful only when personnel occupy real positions inside a real organization. v0.2.0 establishes that structure first.

## Next likely milestone

v0.3.0 — MOS & Career Contract Foundation
- MOS/job definitions
- MOS eligibility
- enlistment contracts
- reenlistment windows
- branch transfer compatibility
- manpower shortage signals
