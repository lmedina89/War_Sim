# War Sim v0.3.2 — Military Administration & Personnel Lifecycle

War Sim is a data-driven browser military-career and future war-simulation project designed for GitHub Pages.

## v0.3.2 focus

This release builds directly on the stable v0.3.1.2 organization-integrity checkpoint. It adds the canonical personnel-administration layer needed before expanding MOS, locations, logistics, AI, and combat.

### Added

- World schema 10 with migration from schema 9.
- Canonical `personnelActionRecords` for status changes, reassignments, replacement arrivals, separations, and later PCS/TDY/deployment actions.
- Canonical `replacementRequestRecords` with a 30-day in-world replacement pipeline for vacant billets.
- Standard personnel statuses: active, training, leave, TDY, deployed, hospitalized, wounded, missing, POW, separated, retired, and deceased.
- Administrative reassignment service that closes the old assignment, vacates/fills billets, creates the new assignment record, creates orders, and preserves history.
- ETS processing: an expired active contract can transition the member to separated status while retaining the person's permanent career history.
- Separation preserves last-unit context but removes the member from active unit indexes because they no longer hold a billet.
- Unit Manpower / Personnel Administration UI showing active strength, vacancies, open replacement requests, separated personnel, and recent personnel actions.
- Replacement arrivals are generated as normal persistent Person entities and are assigned through the same billet/assignment architecture.
- New admin indexes so UI and simulation do not repeatedly scan unrelated global collections.
- Fixed the latent `assignPersonToBillet` command bug that referenced a nonexistent `store.transact()` API.
- Existing contracts, reenlistment, squad browsing, organization integrity, save migration, deterministic identities, and mobile UI remain intact.

## Architecture rule

Contract state answers **how long a person serves**. Personnel administration answers **where they serve, what billet they hold, and their current duty status**. Reenlistment does not automatically move a person; reassignment/PCS must be a separate personnel action/order.

## Roadmap

- v0.3.2 — Military Administration & Personnel Lifecycle (this release)
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
