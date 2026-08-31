# War Sim v0.2.0.1 — Military Organization UI Hotfix

This hotfix repairs a regression introduced in v0.2.0 where the new organization model was integrated by replacing the proven v0.1.2 UI controller. That caused the career content to remain hidden and also removed the incremental-index API expected by the state store.

## Fixes

- Restores the complete v0.1.2 new-career, training, promotion, school/award popup, Career Inbox, and multi-slot save/load UI.
- Preserves the v0.2.0 military-organization architecture:
  - company → platoon → squad hierarchy
  - persistent Billet entities
  - billet definitions separate from Person
  - authorized vs assigned strength
  - parent/child units
- Restores grouped incremental index refreshing and adds a dedicated `billets` index group.
- Adapts player creation and reassignment to fill canonical billets.
- Adapts career/squad selectors to resolve roles through billets.
- Strengthens definition and runtime cross-reference validation.
- Adds v0.1.2 world-schema 3 → v0.2.0.1 world-schema 4 migration while retaining compatible career history.
- Keeps save format v3 so existing multi-slot save metadata remains compatible.

## Permanent engineering rules

Definitions remain immutable and data-driven. Runtime state is normalized. Stable IDs, indexed lookups, command-controlled mutation, selectors/view models, schema migrations, and modular domain boundaries remain mandatory.

## Next milestone

After this hotfix is verified in GitHub Pages, continue to v0.3.0 — MOS & Career Contract Foundation.
