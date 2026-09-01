# War Sim v0.4.3.3.2 — Career Boundary Integrity Hotfix

War Sim v0.4.3.3.2 is a narrowly scoped stability release built directly from the exact packaged v0.4.3.3.1 checkpoint. It keeps world schema **16**, save format **3**, and generator **v3**. No v0.4.4 interactive-duty framework, deployments/combat, new MOS starts, Ranger/Special Forces pipelines, deep equipment, interactive schools, or campaign-generation work is included.

Runtime **0.4.3.3.2**, world schema **16**, save format **3**, generator **v3**.

## v0.4.3.3.2 changes

### Career/service lifecycle integrity

- Promotion eligibility now includes canonical service-state validation. Separated, retired, deceased, or otherwise non-active-service personnel cannot be promoted through the normal promotion command.
- Shared active-service guards protect focused activities, school requests/completions, career-opportunity acceptance, command-scheduled duties, manual training XP, and normal assignment/reassignment commands.
- Focused activities perform a non-mutating contract/service preflight before schedule generation and require continuous contractual coverage through the activity completion date.
- Activity completion rechecks service state after time advancement/personnel administration but before applying XP, skills, qualifications, performance records, awards, or completion notifications. State-store transaction semantics ensure interruption rolls back the whole attempted activity.
- Separation closes open assignments and now also cancels scheduled/in-progress duty plus expires open/accepted/in-progress career opportunities; associated pending/executing school orders are cancelled.

### Reenlistment correctness

- Accepting a reenlistment before its effective date leaves the current contract active and creates the successor as `pending`.
- The successor contract activates at the prior contract's ETS date before separation logic runs, preserving continuous service.
- Reenlistment accepted exactly on the ETS date activates immediately.
- Multiple accepted reenlistments for the same current contract are prevented.
- Reenlistment bonuses now accumulate into `person.career.bonusEarnings` consistently with initial-enlistment bonus accounting.
- Multi-day activities can cross the original ETS only when a valid accepted successor contract provides continuous coverage.

### Validation and save normalization

- `service.currentContractId` must reference a contract belonging to the same person.
- Active service with a current contract requires that contract to be active.
- Contract statuses, dates, and bonuses receive semantic validation.
- Multiple active contracts for one person, future-dated active contracts, stale active contracts beyond ETS, and already-effective pending contracts are rejected.
- Service-period ownership and opportunity/order ownership are validated.
- Open assignments must match current affiliation and cannot belong to terminal-status personnel.
- Terminal-status personnel cannot retain active scheduled duty or active career opportunities.
- Same-schema v0.4.3.3.1 saves are normalized on load: premature future reenlistment activation is repaired, cumulative contract bonus earnings are backfilled, and terminal-status schedule/opportunity leftovers are cleaned up.

## Preserved v0.4.3.3.1 foundation

The on-device career polish, DD214 mobile containment, Promotion Progress UI, relationship provenance, Tier-1 NPC Soldier Identity, award provenance, save-index recovery, transactional state mutation, deterministic generation, Army service records, military education/school pipeline, named formations, rank SVG library, unit readiness, relationships, personnel/orders navigation, and current mobile-app structure remain intact.

## QA summary

- **22/22** test scripts pass, including new `tests/career-boundary-integrity.mjs` adversarial regression coverage.
- **300** deterministic generated-world seeds validate successfully.
- **10,000-person** stress/index audit passes.
- **94** production JavaScript source files are included.
- **116/116** JS/MJS files pass `node --check` (94 production + 22 tests).
- Static production-source sweep finds no `eval`, `new Function`, `.innerHTML =`, or `document.write` usage.
- `src/core/saveSystem.js` remains byte-identical to v0.4.3.3.1 and the stabilized v0.4.3.3 save baseline: SHA-256 `c10353acf52a3156264154b1b80c5eaeead840fb9a112271879a610ec848a3d9`.
- World schema remains **16** and save format remains **3**; compatibility repair is handled through same-schema load normalization rather than an unnecessary schema bump.

## Still intentionally out of scope

v0.4.3.3.2 does not add deployments/combat, new MOS career starts, Ranger/Special Forces selection pipelines, deep equipment, interactive schools, campaign generation, or the reusable interactive duty/event framework planned for v0.4.4.
