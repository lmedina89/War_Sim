# War Sim v0.1.0 — Core Data & State Foundation

This checkpoint establishes the professional, data-driven architecture for the military-career side of War Sim.

## Design rules

1. Gameplay content belongs in immutable definition data, not hard-coded systems.
2. Runtime world state contains only mutable state.
3. UI never mutates simulation state directly.
4. State changes go through commands.
5. UI consumes selectors/view-models rather than raw state.
6. Entities reference one another through stable IDs.
7. Historical records are append-only and separate from hot-path entities.
8. Common lookups use indexes rather than repeated full scans.
9. Save files are schema-versioned and validated before loading.
10. Definitions and runtime instances are not duplicated.
11. Historical/deceased entities are preserved.
12. Systems should own only their domain.
13. Relative paths are used for GitHub Pages portability.
14. Keep the early project dependency-free: plain HTML/CSS/ES modules.

## What v0.1.0 proves

- Immutable data registries
- Stable entity IDs
- Canonical Person and Unit structures
- Unit-slot roster model
- Runtime state store
- Runtime indexes
- Command layer
- Selector layer
- Career-event history
- Qualification records
- Save/load versioning
- Validation
- Minimal debug UI
- One small test squad

## Run

Serve the repository with any static web server or GitHub Pages. ES modules normally will not run correctly by opening `index.html` directly from a `file://` URL.

## Next milestone

v0.2.0 should extend the canonical model with:
- Nation
- Region
- Branch / rank structure refinements
- Economy/time foundation
- Pay and payroll
- Assignment / promotion eligibility rules
- More robust save migrations
