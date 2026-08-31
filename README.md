# War Sim v0.3.1.1 — Organization Repair & Gameplay UX Hotfix

This hotfix is built directly on v0.3.1 and preserves the living-company, contracts, reenlistment, orders, saves, career progression, and personnel systems while correcting the migrated 17-person squad bug and improving the mobile gameplay presentation.

## Fixed in v0.3.1.1

- Fixed the legacy-save organization migration that could create 17 assigned personnel in the player's 9-billet squad.
- Organization seeding now respects an already-complete player squad regardless of whether its billet IDs are the fresh canonical IDs or older `billet_from_*` migration IDs.
- Added schema 7 → 8 repair migration that removes only the v0.3.1-generated duplicate squad billets/NPCs while preserving the original migrated personnel, player, career, contracts, orders, promotions, schools, awards, and save history.
- Updated fresh worlds to world schema 8 and game version 0.3.1.1.
- Added a regression test specifically reproducing the migrated-squad duplication path.

## Gameplay UX pass

- Added a compact career overview with rank/name, MOS/component, chain of command, readiness, morale, XP, prestige, and world date.
- Removed Simulation Tier and World Seed from the normal Player Career card; those remain available in Developer Diagnostics.
- Reframed the oversized Current Squad section as Current Assignment / Career Actions.
- Added a mobile sticky navigation bar for Career, Unit, Orders, Personnel, and More.
- Added compact status chips and improved mobile action layout.
- Preserved the existing controller and authoritative state architecture rather than replacing the working UI layer.

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
