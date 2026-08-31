# War Sim v0.2.1 — Unit & Chain of Command

Built directly on the verified v0.2.0.1 hotfix. This release surfaces the normalized military organization model without replacing the proven career UI controller.

## Added

- Player-facing **My Assignment** card with duty position, assignment date, and full chain of command.
- Browsable **Company → Platoon → Squad** organization UI with breadcrumb navigation.
- Aggregated authorized/assigned strength and vacancies for parent formations.
- Unit readiness and morale summaries.
- Personnel browser for the selected unit and subordinate units.
- Tap/click personnel profiles with rank, billet, status, health, morale, readiness, and experience.
- Canonical `orderRecords` foundation plus indexed `ordersByPersonId` lookup.
- Initial Assignment Orders generated for every new player career.
- World schema 5 with automatic schema 4 → 5 migration, preserving v0.2.0.1 saves.
- Corrected browser title/version labeling to v0.2.1.

## Architecture rules

UI remains selector-driven and read-only. Runtime state stays normalized and ID-referenced. Organization strength is derived from canonical billets instead of duplicated counters. Orders are permanent entities intended to support future PCS, deployment, reenlistment, MOS change, and inter-service transfer workflows.

## Next milestone

v0.3.0 — MOS, Contracts & Personnel Career System: generic military specialties (Army MOS / Navy Rating / Air Force AFSC presentation), enlistment contracts, components, service periods, reenlistment offers/bonuses, specialty changes, and inter-service transfer foundations.
