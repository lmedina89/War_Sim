# War Sim v0.4.1.1 — Software Quality Report

## Executive result

**PASS — release candidate approved for live iPhone/Safari validation.**

This update was rebuilt from the verified v0.4.1 codebase and treated as untrusted until source checks, deterministic simulation tests, migration tests, living-unit tests, packaging checks, and exact-ZIP re-extraction tests passed.

## Release identity

- Runtime version: **0.4.1.1**
- Save format: **3**
- World schema: **14**
- Generator version: **2**
- Primary views: **5**
- JavaScript source modules: **79**
- JavaScript source lines: approximately **4,647**

## v0.4.1.1 scope verified

The release includes the data-driven living-unit and training-tempo changes requested for the hotfix:

- five immutable training phases: Garrison / Normal, Elevated Readiness, Pre-Deployment Train-Up, Post-Deployment / Reset, and Operational
- Garrison as the default new-career phase
- separate schedule templates and planning horizons per phase
- routine PT retained as canonical background duty while being removed from the major-event calendar
- more widely spaced normal-garrison significant events; dense training remains available in pre-deployment/elevated templates
- need-aware schedule entries for readiness deficiencies and qualification timing
- weekday/weekend-aware placement, priority metadata, conflict avoidance, and firm/tentative planning status
- prevention of retroactive creation of skipped need-aware duties in the past
- renewable service-rifle qualification records with completion date, result band, expiry date, and expiry elapsed-day
- detailed immediate-unit NPC participation in scheduled training, including persistent performance records and selected skill/readiness/fatigue/equipment/relationship effects
- explicit player-proximity simulation tiers with squad/platoon personnel simulated at higher detail than less-immediate personnel
- durable significant unit-event history
- durable unit-readiness snapshots and readiness trend calculation
- NPC promotion, separation, replacement, and training activity surfaced through durable records where applicable
- non-destructive 30/90/365-day NPC progression audit controls in Developer Diagnostics
- current replacement personnel are picked up by future unit duties through stable billet indexes rather than stale player-start personnel lists
- schema 13 → 14 migration plus preserved schema 12 → 13 → 14 migration path

## Automated test suites

### `tests/smoke.mjs`

PASS. Regression coverage includes deterministic world generation, schema migration, personnel generation, exact ETS handling, time-step-independent NPC lifecycle behavior, activities/AARs, decisions, opportunities/orders, readiness, schedule conflicts, billet authority, and the existing military UI/controller integration.

### `tests/living-unit.mjs`

PASS. Dedicated v0.4.1.1 coverage verifies:

- default Garrison phase
- background PT is simulated but excluded from the visible major-event schedule
- normal-garrison significant events are not back-to-back
- weekday-only entries begin on weekdays
- squad NPCs use detailed simulation tier 1 while less-immediate company personnel can remain tier 2
- NPC experience continues as world time advances
- NPC unit-duty performance records are durable
- weapons qualification includes eligible squad NPC participants
- player weapon qualification receives a durable renewable result and future expiry
- significant training creates unit history
- readiness snapshots persist
- training-phase changes preserve cancelled schedule history rather than deleting it
- Pre-Deployment Train-Up produces a denser significant-event schedule
- need-aware schedule generation does not create new duties retroactively in the past

### `tests/quality.mjs`

PASS. Full software-quality suite validates:

- **300** generated worlds
- **10,000-person** index stress fixture
- index construction well below the **2,000 ms** failure threshold
- deterministic RNG audit
- no concrete runtime-ID hacks
- DOM integrity
- import-graph integrity
- render containment
- independent Unit/Personnel browsing state
- military presentation DOM
- gameplay definition registries
- soldier/unit gameplay integration
- canonical scheduler
- actionable opportunity/orders pipeline
- readiness model integration
- conflict/recovery rules
- billet authority definitions
- deterministic activities
- selector/index audit
- schema 13 migration
- direct schema 12 migration
- semantic time-advance summaries
- transient UI feedback
- relationship/performance presentation definitions
- reduced-motion support
- indexed scoped command lookups
- archived notification history
- same-schema hotfix version normalization
- military status/document presentation definitions
- stable record references
- Current Situation display
- personnel↔unit cross-navigation
- remembered disclosure UI state

## Additional stress and static checks

- **1,000-seed generated-world validation sweep:** PASS, 0 failures
- syntax check over all JS/MJS files: PASS
- forbidden runtime pattern audit: PASS for `Math.random`, `eval`, `new Function`, `document.write`, and runtime `.innerHTML =`
- deterministic centralized RNG remains the only simulation randomness source
- canonical records remain authoritative; indexes remain derived/rebuilt rather than serialized

## Issues caught and fixed during QA

QA found several issues before packaging:

1. The partially produced UI referenced new v0.4.1.1 elements that were missing from `index.html`. The Training Phase summary, Unit Activity history, and NPC audit controls were restored and DOM-integrity tested.
2. Background PT records used `calendarVisibility`, while the selector initially checked an obsolete `visibility` field. This would have kept routine PT on the visible calendar. The selector now uses the canonical field.
3. A need-aware entry skipped earlier in the planning horizon could be reconsidered later and accidentally scheduled into the past. Schedule generation now rejects nominal occurrences at or before the current elapsed day.
4. Qualification-due evaluation initially compared expiry to the current day rather than the nominal future occurrence. It now evaluates against the occurrence being planned.
5. Conflict displacement could move a weekday-only event onto a weekend. The conflict finder now re-validates the entry's calendar constraint while searching for an open slot.
6. Unit-duty participant lists could become stale during long advances after replacements. Current assigned personnel are now resolved through the already-indexed stable billet set when each duty is processed.
7. School opportunities could fail to appear on the exact eligibility day if the soldier happened to be in ordinary training status. Opportunity definitions now allow both active and training status.
8. The old v0.4.1 smoke assertion expected at least six *visible* schedule rows, conflicting with the new requirement that routine duties remain background simulation. The regression now separately verifies a meaningful visible schedule and a richer canonical schedule.

## Compatibility

Schema-12 v0.4.0.3 saves and schema-13 v0.4.1 saves are migrated to schema 14. Migration preserves player identity, assignment, contracts, existing history, generated personnel, and prior canonical records while layering in the v0.4.1.1 stores and scheduler metadata.

## Packaging verification

The final release ZIP is re-extracted into a clean directory and syntax, smoke, living-unit, and full quality suites are rerun against that extracted copy. Packaging is not considered complete until those tests pass.

## Remaining limitation

Automated/static QA cannot prove pixel-perfect iPhone Safari rendering, safe-area behavior, text wrapping, or touch ergonomics. The exact packaged build still requires live GitHub Pages validation on the user's iPhone before it becomes the long-term visual/gameplay checkpoint.
