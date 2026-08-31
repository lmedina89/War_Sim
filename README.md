# War Sim v0.3.1.2 — Organization Integrity Hotfix

This checkpoint is built directly on the tested v0.3.1.1 package. It preserves the living-company, contracts, reenlistment, orders, saves, career progression, organization repair, and mobile UX while correcting the remaining unit-navigation and personnel-identity issues and strengthening world-state integrity checks.

## Fixed in v0.3.1.2

- Fixed squad browsing so selecting a sibling squad no longer snaps back to the player's own assignment chain.
- Organization breadcrumbs now follow the unit currently being browsed, while My Assignment continues to show the player's actual chain of command.
- Squad roster scope is exact: a squad shows its own personnel; platoon/company views aggregate descendants.
- Player rows are explicitly marked `YOU`, and the player can appear in only the squad containing the player's billet.
- Replaced the old NPC surname-block formula that generated long runs of personnel with the same surname. Generated names remain deterministic but are now distributed across the seeded company.
- Added schema 8 → 9 migration to repair previously generated `pers_org_*` NPC names without changing the player or non-generated personnel.
- Strengthened validation for duplicate billet assignments, person/billet unit mismatches, duplicate child units, and parent/child organization inconsistencies.
- Fresh worlds now use world schema 9 and game version 0.3.1.2.
- Retains the v0.3.1.1 schema 7 → 8 repair for the migrated 17-person squad bug, so older saves can still migrate through the full chain.

## Regression coverage

The smoke suite now checks:

- every DOM ID queried by `app.js` exists in `index.html`;
- legacy 17-person squad migration repairs to exactly 9 billets;
- schema-8 saves migrate to schema 9 and repair generated NPC names;
- every seeded squad contains exactly 9 assigned personnel;
- the player appears in exactly one squad;
- generated company personnel have unique deterministic display names with varied surnames;
- sibling squad browsing is not restricted to the player assignment chain;
- company/platoon hierarchy, contracts, reenlistment, NPC progression, and validation still pass.

## Current roadmap

- v0.3.2 — Military Administration & Personnel Lifecycle
- v0.4.x — MOS, Training & Career Expansion
- v0.5.x — Locations, Installations & PCS
- v0.6.x — Equipment & Logistics
- v0.7.x — Skills & Individual Capability
- v0.8.x — Unit Training & Readiness
- v0.9.x — Military AI
- v1.0 — Nation & Economy
- v1.1 — World & Geography
- v1.2 — Diplomacy & Geopolitics
- v1.3 — Operational Warfare
- v1.4 — Tactical Combat
