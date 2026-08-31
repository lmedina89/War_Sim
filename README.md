# War Sim v0.3.2.3 — Military Interface & Unit Browsing Hotfix

War Sim v0.3.2.3 fixes Unit/Personnel browsing state and adds the first deliberate military presentation layer while preserving the tested v0.3.2.2 simulation foundation.

## What changed

### Unit and Personnel browsing fix
- Unit browsing owns its own `selectedOrganizationUnitId`.
- The roster directly under the Unit browser follows the unit actually selected: squad, platoon, or company.
- `My Assignment` remains tied to the player’s real billet and never changes while browsing.
- Personnel uses an independent `personnelFilterUnitId`; browsing Unit no longer silently changes Personnel.
- `View in Personnel`, `Return to My Unit`, and `My Unit` make scope changes explicit.
- Scoped personnel collection uses derived unit indexes and de-duplicates IDs once per selected organization.

### Military presentation
- personnel profiles include a dog-tag-style identification plate built only from canonical branch, rank, specialty, and unit data
- Personnel cards are presented as personnel files
- Orders use an official-orders treatment with a headquarters masthead and effective-date metadata
- Unit roster rows are interactive and open the canonical personnel profile
- steel/olive accents, subtle grid texture, section rails, and stronger hierarchy add military character without coupling presentation to simulation logic

### Real gameplay navigation
The old bottom bar only scrolled around one very long page. v0.3.2.3 introduces five actual primary views:

- Career
- Unit
- Personnel
- Orders
- More

Only the active view is shown. The layout is denser, more game-like, and designed around mobile use rather than one giant developer dashboard.

### UI/UX cleanup
- stronger career header and visual hierarchy
- compact status chips and promotion progress meters
- recent career activity feed
- dedicated Unit roster/manpower presentation
- Personnel and Orders separated into their own views
- save/load/new-career utilities moved to More
- Developer Diagnostics kept out of normal gameplay
- improved iPhone safe-area support and bottom navigation
- larger tap targets, clearer disabled states, less dead space, and reusable CSS design tokens
- top-level render error containment so a display failure does not mutate canonical game state

### Data-driven runtime cleanup
The normal runtime no longer contains concrete Army/11B/rank/weapon IDs for personnel generation and replacement behavior.

- billet definitions now own their primary-equipment references
- generation profiles own billet-to-rank, billet-to-specialty, and rank service-year generation policy
- replacement personnel derive nation, branch, component, specialty, rank, and equipment from definitions/profile data
- NPC promotion progression resolves ranks and promotion requirements from rank definitions instead of hardcoded rank maps
- fresh player equipment derives from the assigned billet definition
- legacy hardcoded organization seeding remains isolated to migration/repair code only

### Personnel/simulation fixes
- ETS now takes effect on the contract end date rather than one day late
- monthly NPC lifecycle simulation is step-independent: 30 × 1-day advances and 1 × 30-day advance produce the same personnel progression outcome
- replacement identities use the centralized deterministic RNG
- vacancy/open-replacement selectors use derived indexes instead of rescanning those collections

### Supporting specialty definitions
The current generated infantry company now distinguishes non-playable framework specialties used by NPC billets:

- 11A Infantry Officer
- 42A Human Resources Specialist

11B remains the enabled player career in this release. These definitions exist so company leadership and administrative replacements do not have to be mislabeled or hardcoded by runtime logic.

### Save metadata
Save slots now retain and display more useful context including specialty and current unit while stable IDs remain authoritative.

## Compatibility
- World schema remains **11**.
- Existing v0.3.2.1 schema-11 saves do not require destructive migration.
- Loaded saves are normalized to game version **0.3.2.3** by the save migration pipeline.
- Existing v0.3.2 and older supported saves continue through the existing migration chain.

## Verification
Two independent test passes are included:

- `tests/smoke.mjs` — gameplay/regression coverage
- `tests/quality.mjs` — separate software-quality audit

The quality pass checks import integrity, DOM/controller matching, duplicate DOM IDs, deterministic RNG use, runtime concrete-ID leakage, dynamic-code/HTML-injection hazards, definition validity, 300 generated seeds, save/checksum round trip, and 10,000-person index scaling.

See `SOFTWARE_QUALITY_REPORT.md` for the full audit results.

## Architecture rules
- immutable definition registries are separate from runtime entities
- display strings never drive authoritative game logic
- stable IDs drive all references
- UI does not own simulation state
- selectors/view models read; commands/services mutate
- indexes are derived and never serialized
- seeded deterministic RNG is centralized
- legacy migration code stays isolated from normal runtime generation
- new branches, specialties, ranks, billets, equipment, and starting scenarios should be definition/profile additions rather than runtime conditionals

## Roadmap
- **v0.3.2.3** — Military Interface & Unit Browsing Hotfix (current)
- **v0.4.x** — MOS, Training & Career Expansion
- **v0.5.x** — Locations, Installations & PCS
- **v0.6.x** — Equipment & Logistics
- **v0.7.x** — Skills & Individual Capability
- **v0.8.x** — Unit Training & Readiness
- **v0.9.x** — Military AI
- **v1.0** — Nation & Economy
- **v1.1** — World & Geography
- **v1.2** — Diplomacy & Geopolitics
- **v1.3** — Operational Warfare
- **v1.4** — Tactical Combat
