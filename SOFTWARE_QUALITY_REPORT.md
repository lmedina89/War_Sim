# War Sim v0.4.1 — Software Quality Report

## Executive result

**PASS — release candidate approved for live iPhone validation.**

The interrupted v0.4.1 worktree was treated as untrusted. It was compared against the known-good v0.4.0.3 package, repaired, completed, then subjected to source-level and behavioral verification before packaging. No interrupted artifact was assumed valid simply because it existed.

## Release identity

- Runtime version: **0.4.1**
- Save format: **3**
- World schema: **13**
- Primary views: **5** — Career, Unit, Personnel, Orders, More
- JavaScript runtime/test architecture remains plain ES modules with no production dependencies

## Recovery / integrity procedure

1. Re-extracted the known-good v0.4.0.3 ZIP as a comparison baseline.
2. Compared the interrupted v0.4.1 worktree file-by-file against the baseline.
3. Identified incomplete UI/version/documentation state rather than trusting partial generated files.
4. Repaired DOM requirements, release identity, tests, and the new gameplay systems.
5. Ran syntax, smoke, quality, deterministic-world, migration, long-run simulation, and stress-index checks.
6. Package verification is performed again after final ZIP creation by extracting that exact archive to a clean directory and rerunning the test suites.

## Static integrity

**PASS**

Checks include:
- every JS/MJS source/test file passes `node --check`
- every relative static import resolves
- no duplicate DOM IDs
- every `app.js` `#id` dependency exists in `index.html`
- all five primary views remain present
- Unit and Personnel selection states remain independent
- military visual components from v0.4.0.3 remain present
- fixed-navigation safe-area and reduced-motion contracts remain present

## Data-definition integrity

**PASS**

Validated registry references include:
- branches/ranks/roles/billets/equipment
- specialties/components/contracts
- organization/generation profiles
- career-start scenarios
- skills/activities/event tables/events
- feedback/performance/relationship/status/document presentation definitions
- duties/schedule templates
- readiness models
- career opportunities/objectives
- command authorities

Additional v0.4.1 definition checks verify:
- schedule entries reference valid duty definitions
- readiness weights are numeric and sum to 1
- opportunity school/presentation references resolve
- role authority IDs resolve through the authority registry
- career-start schedule/readiness/starting-skill references resolve
- generation profiles reference a valid readiness model
- generic effect targets/fields are validated, including unit-training effects

## Runtime state validation

**PASS**

Schema-13 validation covers the existing canonical world plus:
- exactly one valid unit-training profile per unit
- readiness-model references
- bounded training components
- schedule person/unit/duty/template references
- valid schedule intervals/statuses
- opportunity person/definition/order references and lifecycle states
- objective person/definition references and states

Existing billet/person/unit, contract, service-period, assignment, qualification, award, relationship, order, skill-profile, activity, performance, and gameplay-event integrity checks remain enabled.

## Soldier / unit gameplay integration

**PASS**

Behavioral tests verify:
- new careers receive a rolling schedule
- new careers receive the configured career objectives
- the initial assignment objective completes from real assignment state
- unit-training profiles exist for every generated unit
- starting rifleman billet has no command authority
- calculated readiness components remain bounded 0–100
- PT creates fatigue and improves the unit physical-training component
- completed activity history completes the training objective
- Recovery reduces fatigue
- focused activities are blocked when they overlap mandatory scheduled duty
- unavailable activities expose a meaningful availability state/reason

## Canonical scheduler

**PASS**

Tests verify:
- schedule records are generated from the configured scenario/template
- schedule coverage extends as the world advances
- scheduled duties progress through scheduled/in-progress/completed states
- duty effects modify canonical player/unit data
- activity conflict detection prevents double-booking
- accepted school windows replace/cancel conflicting personal duty participation rather than silently overlapping it
- monthly training decay is applied by elapsed-world-time boundaries
- passive recovery occurs on unscheduled days

## Career opportunities / actionable orders

**PASS**

End-to-end Airborne opportunity test verifies:
- eligibility appears after the configured service threshold
- accepting the opportunity creates canonical orders
- report delay is honored
- order state progresses pending → executing → completed
- opportunity state progresses open → accepted → in_progress → completed
- player status changes to/from training appropriately
- completion uses the existing school pipeline
- Airborne qualification is awarded from the real school definition
- resulting world validates after completion

## Decisions / deadlines

**PASS**

- blocking decisions stop time advancement
- definition-driven non-blocking decisions can advance to an expiry deadline
- expiry resolves through the definition's default choice
- deadline-default resolution is recorded
- decision effects use the same generic effect engine

## Billet command authority

**PASS**

- command-authority labels are registry definitions
- role definitions reference authority IDs
- an unauthorized player/rifleman command is rejected
- a generated leader with the matching billet authority can execute the supported schedule command
- authority is determined from billet → role → authority metadata, not from rank-specific UI logic

## Readiness consistency fixes found during audit

The audit found and fixed a subtle modeling issue: some event effects directly changed `unit.condition.readiness/cohesion`, while calculated readiness was derived from `unitTrainingProfiles`. A later sync could therefore erase the event's apparent effect.

Fix:
- generic effect engine now supports a validated `unitTraining` target
- cohesion/equipment setbacks update the canonical training model
- readiness is synchronized after event resolution
- fresh person IDs are derived from the scoped billet set before readiness sync, preventing stale replacement/personnel membership from contaminating the calculation

## Data-driven cleanup found during audit

Additional fixes:
- player starting skill values moved from runtime skill-ID conditionals into career-start scenario definitions
- focused recovery detection uses the activity category rather than a concrete activity ID
- schedule template is selected from the career-start scenario rather than "first registry entry"
- generated units carry their configured readiness-model ID
- authority labels no longer derive from string manipulation of IDs
- activity completion refreshes the promotion-eligibility career objective immediately

## Determinism / safety hygiene

**PASS**

Runtime source contains no:
- direct `Math.random()`
- `eval()`
- `new Function()`
- `document.write()`
- runtime `.innerHTML =`

Same seed + same actions remain deterministic under the tested paths.

## Generated-world testing

**PASS**

Formal quality suite:
- **300 generated seeds** validated

Additional release sweep:
- **1,000 generated seeds**
- **0 failures**
- approximately **0.8 seconds** in the verification environment

Each generated world validates organization/billet/person/specialty/skills/unit-training integrity.

## Long-run scheduler simulation

**PASS**

Additional behavioral sweep:
- **20 independent seeds**
- **180 simulated days per career**
- blocking decisions resolved deterministically through a valid choice
- **0 validation failures**

This exercises repeated schedule generation, scheduled duties, events, opportunity generation/expiration, personnel lifecycle, replacement processing, readiness changes, and ongoing world validation.

## Time-step / existing gameplay regression

**PASS**

Existing smoke coverage still verifies:
- exact-date ETS
- reenlistment
- vacancy/replacement pipeline
- deterministic activity outcomes
- one skill profile per person
- generated specialty matches billet-profile mapping
- generic gameplay decision resolution
- low-level billet assignment
- 30×1-day vs 1×30-day NPC personnel progression consistency
- squad/player organization integrity

## Save / migration integrity

**PASS**

- direct schema **12 → 13** migration preserves player identity, unit assignment, active contract, and prior gameplay history while adding scheduler/training/opportunity/objective scaffolding
- schema **11 → 13** chain remains valid
- migrated careers are not regenerated or reassigned
- browser save/load round trip preserves canonical state
- checksum corruption rejection remains enabled
- derived indexes are rebuilt rather than serialized

## Index / performance stress

**PASS**

Quality suite synthetic index population:
- **10,000 people**
- index build remains far below the existing 2,000 ms guardrail (single-run results vary by environment; typical verification is in the low tens of milliseconds)

Scoped hot paths continue to use derived indexes for Unit/Personnel browsing and other established command/selectors. New scheduler indexes include person, unit, start-day, and status lookup maps.

## Deliberate scope boundary

v0.4.1 does not implement:
- deployment simulation
- combat
- enemy AI
- strategic geography/world map
- national economy/geopolitics
- large playable MOS/branch expansion

The purpose is to make soldier/unit life playable and to provide the reusable scheduling/readiness/opportunity/authority systems those later milestones will consume.

## Manual live validation recommended

On iPhone, verify:
1. Existing v0.4.0.3 save loads and remains in the correct unit/squad.
2. Career Objectives / Current Duty / Duty Schedule / Opportunities render without clipping.
3. Try a focused activity that conflicts with an upcoming mandatory duty and confirm the reason is clear.
4. Advance time through scheduled PT/range/drills and inspect SITREPs/AARs/readiness changes.
5. Confirm fatigue rises with training and Recovery lowers it.
6. Advance past the first school-opportunity threshold and test accept → Orders → report → completion.
7. Check Unit → Readiness Breakdown.
8. Save/reload after schedule/opportunity progression and verify the same dates/statuses remain.

## Final assessment

**Approved for live mobile validation after packaged-copy verification.**
