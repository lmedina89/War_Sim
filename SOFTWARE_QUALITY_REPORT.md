# War Sim v0.4.1.4 — Software Quality Report

## Release identity
- Runtime version: **0.4.1.4**
- Save format: **3**
- World schema: **14**
- Release type: **Migration, Qualification & Collective Training Hotfix**

## Scope
v0.4.1.4 is a narrowly scoped follow-up to v0.4.1.3 based on live iPhone findings. It fixes schema-13 schedule-template compatibility, makes weapons qualification a durable weapon-specific Army-style record independent from the generic activity-performance grade, and ensures player-initiated Squad Drills create NPC participation history through the existing living-unit engine. No deployment/combat system or broad content expansion is introduced.

## Fixed defects
1. **Schema-13 save migration:** historical schedule records that reference the retired `schedule_standard_training_cycle` (or another unavailable template ID) are normalized to a valid current phase template. The previous source ID is retained in `legacySourceTemplateId` for audit/history.
2. **Manual weapons qualification:** `activity_range` now resolves a separate qualification result and creates/renews a canonical qualification record when the Soldier actually qualifies.
3. **Qualification data model:** service-rifle/carbine records now persist rating, score, maximum score, weapon definition, badge clasp, source, completion date, and expiration. The definition is renewable for 365 days and uses a 40-target scoring model.
4. **Manual Squad Drills:** player-initiated collective training now calls the same NPC participation service used by scheduled unit duties, producing durable NPC performance history and a unit event.
5. **Presentation:** qualification rows show rating/score/expiration, and activity AARs display a distinct weapon-qualification result instead of implying that a generic performance grade is the qualification itself.

## Qualification standard encoded
The current service-rifle/carbine definition uses a 40-target record:
- Expert: 36–40
- Sharpshooter: 30–35
- Marksman: 23–29
- Unqualified: below 23

The qualification is modeled as valid for 365 days. Generic activity performance remains a separate 0–100 simulation metric and is converted deterministically to the weapon qualification's native 40-point score for the current prototype.

## Automated QA
The release must pass all of the following from the exact extracted package:
- `tests/smoke.mjs`
- `tests/living-unit.mjs`
- `tests/career-continuity.mjs`
- `tests/stability-hotfix.mjs`
- `tests/migration-qualification-hotfix.mjs`
- `tests/quality.mjs`

Dedicated v0.4.1.4 regression coverage includes:
- schema-13 migration with completed historical rows using `schedule_standard_training_cycle`
- canonical normalization to current valid schedule-template IDs
- preservation of the retired template ID for audit
- player-initiated rifle/carbine qualification creation
- 40-target result storage and marksmanship rating
- 365-day qualification expiration
- unqualified attempts not creating a credential
- player-initiated Squad Drills including same-squad NPCs
- durable NPC performance records from manual Squad Drills

Existing v0.4.1.3 stability gates remain in force, including 1,000 deterministic generated worlds, assignment/rank/billet validation, new-career→advance→save→load→advance, schema-13 migration execution, same-schema legacy rank repair, legacy affiliation repair, and migration idempotency.

## Additional audits
- **5,000 deterministic fresh-world sweep:** required to complete with zero validation failures.
- **All JS/MJS syntax:** `node --check` required to pass.
- **Forbidden runtime pattern audit:** no `Math.random`, `eval`, `new Function`, `document.write`, or runtime `.innerHTML =` assignment.
- **10,000-person index stress:** retained in `tests/quality.mjs`.
- **Deterministic RNG, DOM integrity, import graph, render containment, scheduler, readiness, opportunities, objectives, save/migration and UI-state regressions:** retained in the full quality suite.

## Manual validation still required
Static/container QA cannot reproduce iPhone Safari pixels or browser-local save slots. The live release should be checked on the user's device for:
1. loading the previously failing v0.4.1/schema-13 save,
2. starting a fresh career,
3. manually completing Weapons Qualification Range and verifying that the AAR displays a separate qualification rating/score,
4. verifying a successful 23+/40 result appears in Qualifications & Awards with expiration,
5. manually completing Squad Drills and checking squadmate Recent Career Activity/performance history,
6. save/reload after those records exist.

## Architecture impact
The change remains definition-driven and preserves the canonical state/controller architecture. Qualification identity is based on stable `qualificationId`, so multiple different weapon/skill qualifications can coexist as separate records. This is intentional groundwork for the later Army Service Record & Career Achievement system (schools, badges/tabs, ribbons, awards, campaign/service records, and multiple weapon qualifications) without introducing that larger feature set in this hotfix.
