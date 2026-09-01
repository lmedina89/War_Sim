# War Sim v0.4.3.3.2 — Software Quality Report

## Release assessment

**Result: PASS — recommended stable checkpoint**

v0.4.3.3.2 is a targeted career-boundary integrity hotfix built from the exact uploaded v0.4.3.3.1 GitHub package. Runtime is **0.4.3.3.2**, world schema **16**, save format **3**, generator **v3**.

The release addresses adversarial QA findings that were not detected by the prior 21-script suite: promotion after separation, activity completion across ETS without continued service, premature reenlistment contract activation, missing reenlistment bonus accumulation, and insufficient semantic ownership checks in world-state validation.

## Confirmed fixes

### 1. Promotion after separation — FIXED

`evaluatePromotionEligibility()` now includes a canonical active-service guard. Terminal or non-active service state is a promotion blocker, so the command layer cannot promote a Soldier merely because XP/TIS/TIG/qualification gates are satisfied.

Regression test deliberately separates an otherwise promotion-eligible E-1 and verifies both eligibility and `promotePerson()` reject the promotion while rank remains unchanged.

### 2. Activity crossing ETS without continued service — FIXED

`performActivity()` now verifies active-service state and continuous contract coverage through the activity completion date before any schedule-generation mutation occurs. It also rechecks service state after advancing time/personnel administration and before any benefits or completion records are applied.

A one-day activity ending on ETS is rejected without a successor contract. A three-day MOS activity beginning immediately before the original ETS succeeds only after an accepted successor contract supplies continuous service, and completion occurs with the Soldier still active.

### 3. Reenlistment contract semantics — FIXED

Accepting early reenlistment no longer prematurely completes the current contract or makes a future contract current/active. The successor is `pending` until its effective date. Personnel administration transitions current→completed and successor→active before ETS separation logic. Reenlistment on the exact ETS date activates immediately.

The command also prevents a second accepted reenlistment against the same current contract.

### 4. Reenlistment bonus accounting — FIXED

Accepted reenlistment bonuses are added to `person.career.bonusEarnings`. Same-schema load normalization backfills cumulative contract bonus earnings for older v0.4.3.3.1 saves without decreasing any pre-existing larger value.

### 5. Contract/service ownership validation — FIXED

The validator now rejects a `service.currentContractId` that points to another person's contract. It also validates service-period ownership and career-opportunity/order ownership.

Additional contract invariants reject invalid statuses, invalid dates/bonuses, multiple active contracts per person, future active contracts, stale active contracts at/past ETS, and pending contracts whose effective date has already arrived.

## Additional lifecycle hardening incorporated

A shared `serviceLifecycle.js` layer centralizes terminal-status and active-service checks. Normal gameplay paths for activities, promotions, school requests/completions, opportunity acceptance, scheduled duty, manual training XP, unit assignment, and administrative reassignment now use the shared guard rather than independently assuming the Soldier is still in service.

Separation now closes/cancels incompatible future state: open assignments are closed, scheduled/in-progress duty is cancelled, active career opportunities are expired, and pending/executing linked school orders are cancelled. The validator enforces the corresponding terminal-status invariants.

Same-schema v0.4.3.3.1 load normalization repairs the old early-reenlistment representation and terminal-state leftovers before validation. World schema remains 16 because the entity shape did not require a structural schema change.

## Regression and stress results

- Test scripts: **22/22 PASS**
- New adversarial suite: `tests/career-boundary-integrity.mjs` — **PASS**
- Deterministic worlds validated by `quality.mjs`: **300**
- Stress population: **10,000 personnel**
- Additional adversarial ETS/reenlistment matrix: **100/100 scenarios PASS**
- Production JS files: **94**
- JS/MJS syntax validation: **116/116 PASS**
- Import graph integrity: **PASS**
- DOM integrity: **PASS**
- Deterministic RNG audit: **PASS**
- Canonical scheduler/readiness/opportunity integration: **PASS**
- Existing save/migration tests: **PASS**
- Static production-source sweep for `eval`, `new Function`, `.innerHTML =`, and `document.write`: **clean**

The final `quality.mjs` run reported a **9.53 ms** index build for the 10,000-person stress case in this container. Timing is environment-dependent and is treated as informational rather than a fixed performance guarantee.

## Save-system containment

`src/core/saveSystem.js` was not modified by this hotfix and remains SHA-256:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`

This matches the stabilized v0.4.3.3/v0.4.3.3.1 save-system file.

## Scope containment

No v0.4.4 feature work was introduced. Deployments/combat, additional MOS career starts, Ranger/Special Forces selection, deep equipment, interactive schools, campaign generation, and the reusable interactive duty/event framework remain out of scope.

## Residual risk / manual QA

Automated state, migration, syntax, deterministic-generation, stress, and static-source checks pass. Device-level visual/touch QA remains appropriate after GitHub Pages deployment because browser automation cannot fully substitute for real iPhone/Android safe-area, viewport, keyboard, dialog, and touch behavior.

## Recommendation

Promote **v0.4.3.3.2 — Career Boundary Integrity Hotfix** as the new stable development checkpoint and use it as the baseline for subsequent v0.4.4 work.
