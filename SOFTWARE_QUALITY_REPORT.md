# War Sim v0.4.1.2 — Software Quality Report

## Executive result

**PASS — release candidate approved for live iPhone/Safari validation after exact packaged-copy verification.**

v0.4.1.2 was built from the verified v0.4.1.1 checkpoint and treated as untrusted until syntax checks, regression suites, dedicated career-continuity/mobile checks, generated-world validation, migration checks, deterministic simulation checks, and packaged-copy re-extraction tests passed.

## Release identity

- Runtime version: **0.4.1.2**
- Save format: **3**
- World schema: **14**
- Generator version: **2**
- Primary views: **5**
- JavaScript source modules: **79**
- JavaScript source lines: approximately **4,847**

## v0.4.1.2 scope verified

The hotfix adds only data-driven continuity/mobile polish on top of v0.4.1.1:

- persistent world date + training/career phase context attached to primary navigation
- military-formatted canonical date with no duplicate UI-owned clock state
- data-driven short labels on all training-phase definitions
- explicit high-contrast Recent Unit Training grade/score styling
- onboarding objective group metadata and initial-career lifecycle
- fresh careers seed only the four onboarding objectives
- definition-driven continuity objectives generated only after onboarding completion
- repeatable objective definitions with definition-driven cooldowns
- continuity rules for personal readiness, unit readiness versus phase target, renewable service-rifle qualification, next-promotion preparation, and open career opportunities
- completed objective records retained as history rather than deleted
- no-active-objective fallback guidance
- player-facing simulation-detail labels and descriptions sourced from simulation-tier definitions
- objective-history narrow-screen layout and persistent-context mobile breakpoint
- existing safe-area/bottom-navigation content clearance preserved
- world schema remains 14; same-schema saves normalize runtime version to 0.4.1.2

## Automated test suites

### `tests/smoke.mjs`

PASS. Existing regression coverage remains green for deterministic world generation, personnel generation, assignments, save/migration behavior, exact ETS processing, time-step-independent lifecycle behavior, activities/AARs, decisions, opportunities/orders, readiness, conflicts, authority, and the stable military UI/controller architecture.

### `tests/living-unit.mjs`

PASS. Existing v0.4.1.1 living-unit coverage remains green for Garrison tempo, background PT visibility, spacing of significant events, weekday rules, NPC simulation tiers/progression, NPC unit-duty participation, renewable qualification results, readiness snapshots, training-phase changes, dense pre-deployment scheduling, and prevention of retroactive schedule generation.

### `tests/career-continuity.mjs`

PASS. Dedicated v0.4.1.2 coverage verifies:

- only onboarding objectives are seeded for a fresh career
- onboarding completion is detectable from canonical objective records
- follow-on qualification and promotion-preparation goals generate from canonical state
- completed onboarding objectives remain in objective history
- renewed qualification resolves its continuity objective
- repeatable objectives do not duplicate during cooldown
- readiness objectives can reactivate after cooldown when the need returns
- all training phases expose data-driven short labels
- all simulation tiers expose player-facing labels
- persistent world-context DOM exists
- permanent date rendering uses the canonical world date
- completed-objective archive and no-active fallback UI are present
- Recent Unit Training result text has explicit readable contrast
- bottom-navigation safe-area clearance remains present
- resulting world state validates successfully

### `tests/quality.mjs`

PASS. Full software-quality suite validates:

- **300 generated worlds**
- **10,000-person index stress fixture**
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
- transient status feedback
- archived notification history
- same-schema hotfix version normalization
- military status/document presentation definitions
- stable record references
- Current Situation display
- personnel↔unit cross-navigation
- remembered disclosure UI state

A representative pre-package full-quality run built the 10,000-person indexes in **29.44 ms**.

## Additional stress and static checks

- **1,000-seed generated-world sweep:** PASS, 0 failures
- all JS/MJS files checked with `node --check`: PASS
- forbidden runtime pattern audit remains PASS for `Math.random`, `eval`, `new Function`, `document.write`, and runtime `.innerHTML =`
- deterministic centralized RNG remains the simulation randomness source
- canonical state remains authoritative; indexes remain derived and non-serialized
- no schema bump was introduced because v0.4.1.2 adds optional definition/presentation metadata and new runtime records that fit the existing schema-14 entity stores

## Issues caught and fixed during v0.4.1.2 QA

1. Existing v0.4.1 tests assumed one runtime objective record per objective definition. That was incompatible with the new definition-driven continuity model. The tests now correctly verify that a fresh career seeds only onboarding objectives while continuity definitions remain dormant until canonical activation conditions are met.
2. The definition validator initially rejected the new generic completion/activation rules. Validation was expanded to whitelist the new rule vocabulary and verify referenced qualifications, repeatability metadata, cooldowns, and objective ordering.
3. Promotion continuity could have generated a meaningless goal at the top of a defined rank ladder. Activation now also verifies that a next rank actually exists.
4. Accepting or declining an opportunity could leave its continuity objective active until the next time advance. Opportunity commands now synchronize career objectives in the same canonical mutation.
5. Loading an existing schema-14 save could display completed onboarding with no follow-on goals until another action occurred. The load path now evaluates current promotion eligibility and synchronizes continuity objectives immediately after state replacement.
6. The live iPhone screenshot exposed a real contrast defect in Recent Unit Training outcome text. The result grade/score now explicitly uses the primary text color rather than inheriting the dark button foreground.

## Compatibility

- Schema-14 v0.4.1.1 saves load directly and normalize to runtime **0.4.1.2**.
- Schema-13 v0.4.1 and schema-12 v0.4.0.3 saves continue through the existing migration chain to schema 14.
- Player identity, assignment, contracts, personnel, schedule/history, qualification, activity, NPC, and living-unit records are preserved.
- No destructive migration or world regeneration is required for this hotfix.

## Packaging verification

The release ZIP is created only after the worktree suites pass. The exact ZIP is then extracted into a clean verification directory, all JS/MJS syntax checks are repeated, and smoke, living-unit, career-continuity, and full quality suites are rerun against that extracted copy. Packaging is not considered complete unless that exact copy passes.

## Remaining limitation

Automated/static QA cannot guarantee pixel-perfect Safari rendering, safe-area placement, text wrapping, or touch ergonomics. The packaged build still requires live GitHub Pages validation on the user's iPhone before becoming the long-term visual checkpoint.
