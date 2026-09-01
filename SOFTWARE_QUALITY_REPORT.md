# War Sim v0.4.3.3.1 — Software Quality Report

## Scope

v0.4.3.3.1 was built from the exact packaged `War-Sim-v0.4.3.3-GitHub.zip` baseline (SHA-256 `dd715ee3f2e8ace042e9ccf2dcd27ed5839ed72bda795fd5d90515c14ef53a3c`). It is a narrow on-device polish release for issues observed during iPhone testing. No v0.4.4 gameplay framework or deployment/combat work is included.

- Runtime: **0.4.3.3.1**
- World schema: **16**
- Save format: **3**
- World generator: **v3**

## Implemented changes reviewed

- DD214-style long values use mobile-safe wrapping/containment.
- Promotion Progress now exposes current/next rank, eligibility state, experience/TIS/TIG gates, required qualifications/PME, and blockers; Career Home links directly to the promotion section.
- Signed Trust/Respect/Rapport meters now make small values visually distinguishable while keeping canonical -100..100 data unchanged.
- Relationship-memory presentation exposes recorded trust/respect/rapport deltas and source summaries.
- Every Digital Personnel Record renders canonical SVG rank insignia.
- Tier-1 NPC Digital Personnel Records provide a View Uniform control driven only by that NPC's canonical Soldier Identity records.
- Award records/selectors/presentation surface `reason` provenance where present.
- New award notifications include the recorded reason.
- AAM progression was audited: teammate-help does not directly award an AAM; AAM remains tied to sustained qualifying performance records.

## Regression and targeted test results

**21/21 test scripts PASS.**

The new `tests/on-device-polish.mjs` specifically verifies:
- runtime/version normalization to 0.4.3.3.1;
- DD214 mobile wrapping source rules;
- promotion qualification/PME gate exposure;
- distinct relationship values and relationship-memory deltas;
- canonical rank-insignia and Tier-1 NPC uniform wiring;
- AAM sustained-performance generation;
- canonical award reason selection and notification provenance.

All prior v0.4.3.3 regression tests also pass, including save recovery, transaction rollback, formation/start rules, rank insignia, awards/Soldier Identity, career continuity, mobile navigation, scheduler/readiness, service record, migrations, and save storage.

## World generation / stress validation

`tests/quality.mjs` PASS:
- **300 generated-world seeds validated**
- **10,000 stress personnel**
- deterministic RNG audit PASS
- runtime ID audit PASS
- DOM/import/render containment audits PASS
- canonical scheduler/readiness integration PASS
- selector/index audit PASS
- same-schema hotfix normalization PASS

Final quality-run index build: approximately **15.31 ms** for the 10,000-person stress fixture in this container.

## Syntax and static-source checks

- **114/114 JS/MJS files** passed `node --check`.
- Static production-source sweep found no:
  - `eval(...)`
  - `new Function(...)`
  - `.innerHTML = ...`
  - `document.write(...)`

## Save-system containment

`src/core/saveSystem.js` is byte-identical to the exact packaged v0.4.3.3 baseline.

SHA-256 in both builds:

`c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`

Therefore the save-recovery and backup-restoration implementation that was stabilized in v0.4.3.3 was not rewritten during this polish pass.

## Award-provenance audit

Current AAM behavior was traced through `evaluateCommendationAwardsInDraft`:
- AAM target count is `floor(excellentPerformanceRecords / 8)` where qualifying performance records have score >= 90.
- Teammate-help decisions modify leadership skill, relationship Trust/Rapport, and fatigue; they do not directly call award granting.
- Generated AAM records use reason: `Sustained excellent duty and training performance.`

The v0.4.3.3.1 UI now surfaces that reason so the player can distinguish award cause from coincident nearby events.

## Browser-render smoke

A local HTTP server and Chromium headless launch were attempted at **390×844**. Chromium timed out after 25 seconds with DBus/headless container-environment errors and did not produce a reliable screenshot. This check is **NOT PASSED / environment-limited** and is not counted among successful QA checks.

Actual iPhone/GitHub Pages verification remains recommended for the exact overflow/rank/uniform presentation issues that motivated this patch.

## Result

Within the approved v0.4.3.3.1 scope, targeted tests, the complete regression suite, deterministic generation, stress/index validation, syntax validation, static-source checks, version normalization, and save-system containment all pass. No known automated regression remains from this patch. The only unverified item is automated headless visual rendering because of the container environment.
